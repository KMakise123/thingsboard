/**
 * Leave guard for the editor — C wave placeholder. Signature frozen; the
 * D wave fills the real §3.8 behavior: route blocker + beforeunload +
 * sessionStorage crash protection (truncated stack serialization).
 *
 * The placeholder registers a plain beforeunload prompt while dirty; it
 * does NOT intercept umi route changes yet.
 */
import { useEffect } from 'react';
import type { EditorSession } from '@/core/editor/session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';

export interface UseLeaveGuardOptions {
  session: EditorSession<DashboardConfiguration>;
  /** Guard is active only while the editor face is mounted. */
  enabled: boolean;
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
      if (!session.dirty) {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [session, enabled]);
}
