/**
 * Dialog-side EditorSession seam (P wave).
 *
 * The frozen dialog props (`{open, payload?, onClose}`) carry no session and
 * the DialogHost seam must not change, so the P-wave dialogs obtain the
 * editor session through this feature-memory registry — the same in-module
 * singleton pattern the editor clipboard uses (M7 brief §2). The publisher
 * is the BreakpointSwitcher toolbar mount (the one surgical shell mount),
 * which is rendered by the editor shell for the whole edit session.
 *
 * `useDialogSession` also subscribes the calling dialog to the session, so
 * lists rendered inside a dialog refresh after each committed transaction.
 */
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';

let activeSession: EditorSession<DashboardConfiguration> | null = null;

/** Publishes the edit-session the dialogs operate on (BreakpointSwitcher). */
export function publishDialogSession(
  session: EditorSession<DashboardConfiguration>,
): void {
  activeSession = session;
}

/** Test / unmount hygiene. */
export function clearDialogSession(): void {
  activeSession = null;
}

/**
 * The session for editor dialogs + a live subscription (re-renders on every
 * committed transaction group).
 */
export function useDialogSession(): EditorSession<DashboardConfiguration> {
  const session = activeSession;
  if (!session) {
    throw new Error(
      'no editor session published — mount BreakpointSwitcher in the shell',
    );
  }
  useEditorSession(session);
  return session;
}
