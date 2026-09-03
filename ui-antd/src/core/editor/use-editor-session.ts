/**
 * React adapter for EditorSession — a thin useSyncExternalStore binding.
 *
 * Kept out of session.ts so the session core stays framework-light (ADR 0004
 * §2 "不引库"; the ws/hooks.ts React-in-core precedent applies equally here).
 * The snapshot object is cached inside the session and only rebuilt on
 * change, so useSyncExternalStore's referential-stability contract holds.
 */

import { useSyncExternalStore } from 'react';

import type { EditorSession, EditorSnapshot } from './session';

export function useEditorSession<T extends object>(
  session: EditorSession<T>,
): EditorSnapshot<T> {
  return useSyncExternalStore(session.subscribe, session.getSnapshot);
}
