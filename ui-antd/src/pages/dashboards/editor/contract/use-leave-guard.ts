/**
 * Leave guard for the editor — §3.8 离开确认.
 *
 * dirty 精确判定: the guard keys off `session.dirty`, which is an O(1)
 * REFERENCE compare (draft !== baseline). After edits followed by undo all
 * the way to the bottom, the drained stack re-anchors the draft reference
 * to the baseline (core/editor/session.ts 引用复位锚定) ⇒ dirty false ⇒ NO
 * leave prompt. NOT-in-stack state (selection / viewport / panel open /
 * timewindow runtime tweaks) never reaches the session writer (no raw
 * setter exists on the class), so it can never trip the guard — asserted
 * by the session-API-surface contract test.
 *
 * Degraded-precision edge (documented): when the patch budget truncated
 * history, draining the stack can no longer reconstruct the baseline, so a
 * real drift could hide behind a stale reference — the guard treats
 * `historyTruncated` conservatively and ALWAYS prompts while latched.
 *
 * Router blocker availability (researched, 2026-09-03): @umijs/max 4.7
 * exports its renderer surface through `src/.umi/exports.ts` on
 * react-router 6.3.0 — `unstable_useBlocker` landed in react-router 6.7 and
 * `usePrompt` is not re-exported either. There is NO clean in-app route
 * blocker. Therefore the in-app leave confirm is enforced at the two
 * toolbar exit buttons (取消退出 shows a discard Modal.confirm while
 * dirty; 保存退出 saves first), and this hook covers hard navigation via
 * `beforeunload`. The PageContainer back arrow on the editor route is a
 * known gap (index.tsx is outside wave D ownership) — reported.
 */
import { useEffect } from 'react';
import type { EditorSession } from '@/core/editor/session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';

export interface UseLeaveGuardOptions {
  session: EditorSession<DashboardConfiguration>;
  /** Guard is active only while the editor face is mounted. */
  enabled: boolean;
}

/**
 * §3.8 prompt condition — exported for tests and the shell exit confirm.
 * Conservative on truncated history: the reference compare can no longer
 * prove cleanliness, so the guard fails closed.
 */
export function shouldPromptLeave(
  session: EditorSession<DashboardConfiguration>,
): boolean {
  return session.dirty || session.historyTruncated;
}

export function useLeaveGuard({
  session,
  enabled,
}: UseLeaveGuardOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldPromptLeave(session)) {
        return;
      }
      event.preventDefault();
      // Chrome legacy (returnValue string triggers the dialog too).
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [session, enabled]);
}
