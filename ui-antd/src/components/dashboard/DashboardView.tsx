/**
 * DashboardView — the embed mounting surface (parity with ui-ngx
 * dashboard-view.component: a validated dashboard in, read-only render out).
 *
 * Consumers (W3): `/usage` (frontend asset api_usage.json) and
 * `/entities/gateways` (GET /api/resource/dashboard/system/
 * gateways_dashboard.json). Embedded ⇒ readonly, no export/fullscreen
 * chrome, hidden from any shell navigation.
 */
import type { Dashboard } from '@/types/tb/dashboard';
import { DashboardPage } from './DashboardPage';

export interface DashboardViewProps {
  /** validated dashboard (run validateAndUpdateDashboard before passing). */
  dashboard: Dashboard;
  isTenantAdmin?: boolean;
}

export function DashboardView({
  dashboard,
  isTenantAdmin,
}: DashboardViewProps) {
  return (
    <DashboardPage
      dashboard={dashboard}
      embedded
      isTenantAdmin={isTenantAdmin}
    />
  );
}
