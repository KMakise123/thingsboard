/**
 * Save path for the dashboard editor — §3.8 409 三选项闭环 (ADR 0004 §2).
 * Signature `saveDashboardDraft({session, dashboard}) → SaveOutcome` is
 * frozen; the internals implement the full conflict flow:
 *
 *  - happy path: POST the serialized draft WITH `version` (from the entity
 *    meta), then re-anchor the session baseline to the server truth. The
 *    undo stack SURVIVES the save — post-save undo still steps pre-save
 *    groups (§3.9 contract test pins this).
 *  - 409 (`ServerErrorError.errorCode === 35` VERSION_CONFLICT): the server
 *    dashboard is fetched (GET) and surfaced through
 *    `{status:'conflict', serverDashboard}`; the shell opens the three-
 *    option ConflictDialog with it (load server / overwrite with mine /
 *    export local and give up). A failed GET still returns conflict with
 *    `serverDashboard: null` — the dialog renders an honest "unknown
 *    server state" note and export-local stays available.
 *
 * Overwrite semantics (Option B, `overwriteWithLocalDraft`): re-GET the
 * latest server version, POST `{...localDraft, version: fresh}`; if THAT
 * 409s again, retry — capped at MAX_OVERWRITE_ATTEMPTS (= 3, ADR "二次 409
 * 上限 3 次回落"). On exhaustion the outcome falls back to `conflict` (NOT
 * an error): the dialog stays open with a refreshed server snapshot and the
 * shell toasts the exhaustion note, forcing the user onto Option A or C.
 *
 * Baseline discipline: the draft is only committed to the session baseline
 * AFTER a 2xx (session.current IS the wire object — the dashboard session's
 * serializer is identity), so a failed/conflicted POST leaves the undo
 * stack and dirty state untouched.
 */

import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import type { EditorSession } from '@/core/editor/session';
import { getDashboard, saveDashboard } from '@/services/tb/dashboard';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

/** ThingsBoard errorCode for an optimistic-locking version conflict. */
export const VERSION_CONFLICT_ERROR_CODE = 35;

/** ADR 0004 §2: a second 409 retries at most this many overwrite attempts. */
export const MAX_OVERWRITE_ATTEMPTS = 3;

export type SaveOutcome =
  | { status: 'saved'; dashboard: Dashboard }
  | { status: 'conflict'; serverDashboard: Dashboard | null }
  | { status: 'error'; error: unknown };

export interface SaveDashboardDraftArgs {
  session: EditorSession<DashboardConfiguration>;
  /**
   * Current server entity meta (id / title / version). Its configuration
   * field is ignored — the draft is authoritative.
   */
  dashboard: Dashboard;
}

function errorCodeOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'errorCode' in error) {
    return (error as { errorCode?: unknown }).errorCode as number | undefined;
  }
  return undefined;
}

function isVersionConflict(error: unknown): boolean {
  return errorCodeOf(error) === VERSION_CONFLICT_ERROR_CODE;
}

/**
 * POSTs the local draft against the optimistic-locking `version` carried by
 * the entity meta. 409 → GET the server entity and report the conflict.
 */
export async function saveDashboardDraft(
  args: SaveDashboardDraftArgs,
): Promise<SaveOutcome> {
  const { session, dashboard } = args;
  const serialized = session.current;
  try {
    const server = await saveDashboard({
      ...dashboard,
      configuration: serialized,
    });
    // Re-anchor to the server truth (also backfills server-side mutations).
    session.save(server.configuration ?? serialized);
    return { status: 'saved', dashboard: server };
  } catch (error) {
    if (!isVersionConflict(error)) {
      return { status: 'error', error };
    }
    let serverDashboard: Dashboard | null = null;
    try {
      serverDashboard = await getDashboard(dashboard.id?.id ?? '');
    } catch {
      // server state unknown — the dialog degrades to Option C only
    }
    return { status: 'conflict', serverDashboard };
  }
}

export interface OverwriteWithLocalDraftArgs extends SaveDashboardDraftArgs {
  /**
   * Test seam: override how many attempts the loop may use (defaults to
   * MAX_OVERWRITE_ATTEMPTS).
   */
  maxAttempts?: number;
}

/**
 * 409 Option B — 用我的版本覆盖: force-save the local draft by re-reading
 * the server's latest `version` before each POST. Retry on further 409s up
 * to `maxAttempts` (3); exhaustion degrades back to `conflict` with the
 * latest observed server snapshot.
 */
export async function overwriteWithLocalDraft(
  args: OverwriteWithLocalDraftArgs,
): Promise<SaveOutcome> {
  const { session, dashboard, maxAttempts = MAX_OVERWRITE_ATTEMPTS } = args;
  let lastServer: Dashboard | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let freshVersion: number | undefined;
    try {
      lastServer = await getDashboard(dashboard.id?.id ?? '');
      freshVersion = lastServer?.version ?? dashboard.version;
    } catch (error) {
      // Cannot learn the fresh version — refusing to blind-POST.
      return { status: 'error', error };
    }
    try {
      const server = await saveDashboard({
        ...dashboard,
        configuration: session.current,
        version: freshVersion,
      });
      session.save(server.configuration ?? session.current);
      return { status: 'saved', dashboard: server };
    } catch (error) {
      if (!isVersionConflict(error)) {
        return { status: 'error', error };
      }
      // version raced again — fall through to the next attempt
    }
  }
  return { status: 'conflict', serverDashboard: lastServer };
}

/**
 * 409 Option A — 加载服务器版: adopt the server entity as the new editing
 * baseline (fresh `enter()` — F-contract: enter re-anchors, history
 * resets). Kept here so all three conflict options live beside each other
 * and the shell wiring stays declarative.
 */
export function loadServerVersion(
  session: EditorSession<DashboardConfiguration>,
  serverDashboard: Dashboard,
): void {
  const normalized = validateAndUpdateDashboard(serverDashboard);
  session.enter(
    (normalized.configuration ?? {
      widgets: {},
      states: {},
      entityAliases: {},
    }) as DashboardConfiguration,
  );
}
