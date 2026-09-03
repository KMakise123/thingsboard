/**
 * Dashboard binding of the generic save-with-conflict core (M8 wave F
 * hoist). The flow logic (version-carrying POST / 409 fetch / Option-B
 * retry loop) lives in core/editor/contract/save-with-conflict.ts; this
 * shim only injects the dashboard transport hooks and keeps the public API
 * frozen: `saveDashboardDraft({session, dashboard}) → SaveOutcome` with the
 * `dashboard`/`serverDashboard` outcome keys, `overwriteWithLocalDraft`,
 * `loadServerVersion`, VERSION_CONFLICT_ERROR_CODE, MAX_OVERWRITE_ATTEMPTS.
 *
 * Behavior parity is pinned by save-with-conflict.test.ts (unchanged).
 */
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import {
  type DraftConflictHooks,
  loadServerDraft,
  overwriteDraftWithLocalDraft,
  type SaveDraftOutcome,
  saveDraftWithConflict,
} from '@/core/editor/contract/save-with-conflict';
import type { EditorSession } from '@/core/editor/session';
import { getDashboard, saveDashboard } from '@/services/tb/dashboard';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

export {
  MAX_OVERWRITE_ATTEMPTS,
  VERSION_CONFLICT_ERROR_CODE,
} from '@/core/editor/contract/save-with-conflict';

/** §3.8 save outcome with the frozen dashboard-flavored key names. */
export type SaveOutcome =
  | { status: 'saved'; dashboard: Dashboard }
  | { status: 'conflict'; serverDashboard: Dashboard | null }
  | { status: 'error'; error: unknown };

/** Transport binding of the dashboard editor (core hooks implementation). */
const dashboardHooks: DraftConflictHooks<Dashboard, DashboardConfiguration> = {
  save: saveDashboard,
  fetchEntity: getDashboard,
  entityId: (entity) => entity.id?.id,
  versionOf: (entity) => entity.version,
  withDraft: (entity, draft, version) => ({
    ...entity,
    configuration: draft,
    ...(version !== undefined ? { version } : {}),
  }),
  draftOf: (entity, fallback) => entity.configuration ?? fallback,
};

function mapOutcome(outcome: SaveDraftOutcome<Dashboard>): SaveOutcome {
  switch (outcome.status) {
    case 'saved':
      return { status: 'saved', dashboard: outcome.entity };
    case 'conflict':
      return { status: 'conflict', serverDashboard: outcome.serverEntity };
    default:
      return outcome;
  }
}

export interface SaveDashboardDraftArgs {
  session: EditorSession<DashboardConfiguration>;
  /**
   * Current server entity meta (id / title / version). Its configuration
   * field is ignored — the draft is authoritative.
   */
  dashboard: Dashboard;
}

/**
 * POSTs the local draft against the optimistic-locking `version` carried by
 * the entity meta. 409 → GET the server dashboard and report the conflict.
 */
export async function saveDashboardDraft(
  args: SaveDashboardDraftArgs,
): Promise<SaveOutcome> {
  const outcome = await saveDraftWithConflict({
    session: args.session,
    entity: args.dashboard,
    hooks: dashboardHooks,
  });
  return mapOutcome(outcome);
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
 * the server's latest `version` before each POST (retry capped, exhaustion
 * degrades to `conflict`).
 */
export async function overwriteWithLocalDraft(
  args: OverwriteWithLocalDraftArgs,
): Promise<SaveOutcome> {
  const { maxAttempts, ...rest } = args;
  const outcome = await overwriteDraftWithLocalDraft({
    session: rest.session,
    entity: rest.dashboard,
    hooks: dashboardHooks,
    ...(maxAttempts !== undefined ? { maxAttempts } : {}),
  });
  return mapOutcome(outcome);
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
  loadServerDraft(
    session,
    (normalized.configuration ?? {
      widgets: {},
      states: {},
      entityAliases: {},
    }) as DashboardConfiguration,
  );
}
