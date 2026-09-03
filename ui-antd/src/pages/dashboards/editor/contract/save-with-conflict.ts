/**
 * Save path for the dashboard editor — C wave ships the NAIVE branch
 * (direct POST, no conflict dialog); D wave replaces the internals with the
 * full §3.8 409 three-option flow (load server / overwrite with mine /
 * export local and give up). Signature is frozen.
 *
 * Baseline discipline: the draft is only committed to the session baseline
 * AFTER a 2xx (session.current IS the wire object — the dashboard session's
 * serializer is identity), so a failed/conflicted POST leaves the undo
 * stack and dirty state untouched.
 */

import type { EditorSession } from '@/core/editor/session';
import { saveDashboard } from '@/services/tb/dashboard';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

/** ThingsBoard errorCode for an optimistic-locking version conflict. */
export const VERSION_CONFLICT_ERROR_CODE = 35;

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
    if (errorCodeOf(error) === VERSION_CONFLICT_ERROR_CODE) {
      return { status: 'conflict', serverDashboard: null };
    }
    return { status: 'error', error };
  }
}
