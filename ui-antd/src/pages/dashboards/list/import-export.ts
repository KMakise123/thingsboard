/**
 * Dashboard export (ui-ngx import-export parity, v1 adjudication): fetch the
 * full dashboard with `includeResources=true` (v1 never prompts — registered
 * omission), validate/normalize the configuration, strip the server-owned
 * fields (prepareDashboardExport) and download `{title}.json`.
 */

import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { exportDashboard } from '@/services/tb/dashboard';
import type { Dashboard } from '@/types/tb/dashboard';

/** prepareExport parity: drop identity/audit fields the import reassigns. */
function prepareExport(dashboard: Dashboard): Dashboard {
  const clone = JSON.parse(JSON.stringify(dashboard)) as Record<
    string,
    unknown
  >;
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

/**
 * Export a dashboard as a portable JSON file named `{title}.json`.
 * Resources (images) are always inlined (v1: no includeResources prompt).
 */
export async function exportDashboardToFile(
  dashboardId: string,
): Promise<void> {
  const raw = await exportDashboard(dashboardId);
  const data = prepareExport(validateAndUpdateDashboard(raw));
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${raw.title}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
