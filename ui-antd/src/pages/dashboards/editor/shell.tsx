/**
 * EditorShell — edit-mode layout: toolbar top, canvas center, right config
 * panel slot, DialogHost bottom (M7 brief §2). Unit 1 lands the skeleton
 * seam; the toolbar / canvas / panel / dialogs land with their own units.
 */

import type { EditorSession } from '@/core/editor/session';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

export interface EditorShellProps {
  session: EditorSession<DashboardConfiguration>;
  /** loaded server entity (id / title / version for the save path). */
  dashboard: Dashboard;
}

export function EditorShell({ session, dashboard }: EditorShellProps) {
  return (
    <div
      data-testid="editor-shell"
      data-dashboard-id={dashboard.id?.id}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {dashboard.title}
      <span data-testid="editor-dirty">{String(session.dirty)}</span>
    </div>
  );
}
