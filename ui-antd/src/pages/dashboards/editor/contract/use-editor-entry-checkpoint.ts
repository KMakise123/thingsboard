/**
 * Entry checkpoint for the editor — §3.1 取消退出 (prevDashboard semantics).
 *
 * Takes a `session.checkpoint('editor entry')` once at editor entry, so the
 * cancel exit can revert the draft to the entry baseline in ONE rollback
 * group instead of `enter()` (which would also kill the history the user
 * could still inspect). The handle is INERT across `session.enter()` by
 * session contract — that is exactly right: after a 409 "load server
 * version" the user explicitly adopted the server baseline as their new
 * entry state, and cancel-exit must not resurrect the pre-conflict draft.
 *
 * Reference-dirty nuance: a rollback rebuilds the draft object, so right
 * after `rollbackToEntry()` the content equals the entry baseline but the
 * reference differs. We re-anchor with `session.save(current)` (the
 * documented caller-owned re-anchor path; no POST involved) so `dirty`
 * stays honest — a fully cancelled draft reads clean, matching §3.8's
 * reference-compare leave guarantee. Re-anchoring is skipped when the
 * rollback was a no-op (clean exit, or inert handle after enter()) so a
 * genuinely dirty state is never silently blessed.
 */
import { useEffect, useRef } from 'react';
import type { EditorSession } from '@/core/editor/session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';

export interface UseEditorEntryCheckpointOptions {
  session: EditorSession<DashboardConfiguration>;
  /** Checkpoint is taken only while the editor face is mounted. */
  enabled: boolean;
}

export interface EditorEntryCheckpoint {
  /**
   * Reverts every post-entry write still applied, then re-anchors the
   * baseline to the reverted content. No-op when the handle is inert (a
   * later `enter()` re-baselined the session) or nothing was written.
   */
  rollbackToEntry(): void;
}

export function useEditorEntryCheckpoint({
  session,
  enabled,
}: UseEditorEntryCheckpointOptions): EditorEntryCheckpoint {
  const handleRef = useRef<ReturnType<
    EditorSession<DashboardConfiguration>['checkpoint']
  > | null>(null);

  useEffect(() => {
    handleRef.current = enabled ? session.checkpoint('editor entry') : null;
    return () => {
      handleRef.current = null;
    };
  }, [session, enabled]);

  const rollbackToEntry = (): void => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }
    const groupsBefore = session.history.length;
    handle.rollback();
    if (
      session.history.length > groupsBefore &&
      session.dirty // content already equals the entry baseline; re-anchor
    ) {
      session.save(session.current);
    }
  };

  return { rollbackToEntry };
}
