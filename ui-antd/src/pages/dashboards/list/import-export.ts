/**
 * Dashboard export/import (ui-ngx import-export parity, v1 adjudications):
 *
 * - export: fetch the full dashboard with `includeResources=true` (v1 never
 *   prompts — registered omission), validate/normalize the configuration,
 *   strip the server-owned fields (prepareDashboardExport) and download
 *   `{title}.json`.
 * - import: read a JSON file, validate the minimal shape (title +
 *   configuration — ui-ngx validateImportedDashboard), prepare and POST
 *   /api/dashboard. v1 never opens the missing-entity-aliases dialog
 *   (registered omission: the alias resolver renders unresolved aliases as
 *   an empty dataset instead).
 */

import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { exportDashboard, saveDashboard } from '@/services/tb/dashboard';
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

// ---------------------------------------------------------------------------
// Import (unit ②)
// ---------------------------------------------------------------------------

/** Error carrying the locale key the import dialog should render. */
export class DashboardImportError extends Error {
  /** dashboards.list.* locale key describing the failure. */
  localeKey: string;

  constructor(localeKey: string) {
    super(localeKey);
    this.name = 'DashboardImportError';
    this.localeKey = localeKey;
  }
}

/** ui-ngx validateImportedDashboard parity: title + configuration present. */
export function parseDashboardImport(text: string): Dashboard {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DashboardImportError('dashboards.list.importParseError');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Dashboard).title !== 'string' ||
    !(parsed as Dashboard).title.trim() ||
    typeof (parsed as Dashboard).configuration !== 'object' ||
    (parsed as Dashboard).configuration === null
  ) {
    throw new DashboardImportError('dashboards.list.importInvalidError');
  }
  return parsed as Dashboard;
}

/** prepareImport parity + create semantics: never reuse a carried identity. */
function prepareImport(dashboard: Dashboard): Dashboard {
  const clone = JSON.parse(JSON.stringify(dashboard)) as Record<
    string,
    unknown
  >;
  delete clone.id;
  delete clone.externalId;
  return clone as Dashboard;
}

/**
 * Full import pipeline: validate -> normalize (legacy widgets arrays etc.)
 * -> strip identity -> POST /api/dashboard (create). Returns the saved row.
 */
export async function importDashboardFromFile(file: File): Promise<Dashboard> {
  const text = await file.text();
  const parsed = parseDashboardImport(text);
  return saveDashboard(validateAndUpdateDashboard(prepareImport(parsed)));
}
