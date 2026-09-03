/**
 * §3.8 export — the editor toolbar exports the CURRENT DRAFT (what the user
 * sees), not the server copy. Stripping follows the same prepareExport rule
 * as pages/dashboards/list/import-export.ts (id/createdTime/tenantId/
 * customerId/version/externalId/assignedCustomers) — that helper is
 * module-private to the list page, so the rule is restated here; both sites
 * must stay in lockstep with ui-ngx prepareDashboardExport. No query
 * invalidation, no POST — export is a pure download.
 */
import type {
  Dashboard,
  DashboardConfiguration,
} from '@/types/tb/dashboard';

/** prepareExport parity: drop identity/audit fields the import reassigns. */
export function prepareDraftExport(
  dashboard: Dashboard,
  configuration: DashboardConfiguration,
): Dashboard {
  const clone = JSON.parse(
    JSON.stringify({ ...dashboard, configuration }),
  ) as Record<string, unknown>;
  for (const field of [
    'id',
    'createdTime',
    'tenantId',
    'customerId',
    'version',
    'externalId',
    // ui-ngx prepareDashboardExport also drops the assignment set: the
    // importing tenant rebuilds its own.
    'assignedCustomers',
  ]) {
    delete clone[field];
  }
  return clone as Dashboard;
}

/** Downloads the draft as a portable `{title}.json` Blob. */
export function exportDraftDashboard(args: {
  dashboard: Dashboard;
  configuration: DashboardConfiguration;
}): void {
  const { dashboard, configuration } = args;
  const data = prepareDraftExport(dashboard, configuration);
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${dashboard.title}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
