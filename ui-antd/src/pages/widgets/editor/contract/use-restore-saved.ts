/**
 * useRestoreSaved — 恢复上次保存 (spec §5.2): enabled while the draft is
 * dirty; confirm resets the draft back to the most recently SAVED state.
 *
 * Transaction-semantics choice (brief §3 wave-3 D: 复位是一组事务或不入栈):
 * M7/M8's abandon path (entry checkpoint rollback + re-anchor) reverts to
 * the ENTRY state — which diverges from the last SAVE once a mid-session
 * save moved the baseline. The widget editor therefore restores to the
 * last-saved SNAPSHOT as ONE ordinary transaction group (`restore:lastSaved`)
 * followed by the documented no-POST re-anchor (`session.save(current)` so
 * the reference-compare dirty reads honest — same trick as
 * use-editor-entry-checkpoint). Consequences, deliberately chosen:
 *   - the restore itself is UNDOABLE — one ctrl+z brings the user's edits
 *     back (enter()/history-reset was rejected for exactly this loss);
 *   - undo of the restore leaves dirty true (fresh reference) — honest;
 *   - the snapshot is tracked by observing the session: whenever a
 *     notification reports a clean session, `current` IS the baseline
 *     (last saved), so the hook needs no coupling into the save path.
 */
import { useEffect, useRef } from 'react';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import type { WidgetEditorDoc } from '../draft-convert';

export interface UseRestoreSavedResult {
  /** restore affordance availability: only a dirty draft can restore. */
  canRestore: boolean;
  /**
   * Rewinds the draft to the last-saved snapshot as ONE undoable group.
   * No-op when the session is clean (nothing to rewind).
   */
  restore: () => void;
}

export function useRestoreSaved({
  session,
}: {
  session: EditorSession<WidgetEditorDoc>;
}): UseRestoreSavedResult {
  const { dirty, current } = useEditorSession(session);
  // clean notifications carry the baseline itself — keep the latest one
  const lastSavedRef = useRef<WidgetEditorDoc>(current);

  useEffect(() => {
    if (!dirty) {
      lastSavedRef.current = current;
    }
  }, [dirty, current]);

  const restore = () => {
    if (session.dirty) {
      const saved = lastSavedRef.current;
      session.write('restore:lastSaved', (doc) => {
        const restored = structuredClone(saved);
        doc.widgetTypeId = restored.widgetTypeId;
        doc.fqn = restored.fqn;
        doc.name = restored.name;
        doc.source = restored.source;
        doc.settingsForm = restored.settingsForm;
        doc.defaultConfig = restored.defaultConfig;
        doc.meta = restored.meta;
        doc.version = restored.version;
        doc.descriptorPassthrough = restored.descriptorPassthrough;
        doc.entityPassthrough = restored.entityPassthrough;
      });
      // content now equals the baseline but sits on a fresh reference —
      // re-anchor (no POST) so dirty reads honest (M7/M8 parity)
      if (session.dirty) {
        session.save(session.current);
      }
    }
  };

  return { canRestore: dirty, restore };
}
