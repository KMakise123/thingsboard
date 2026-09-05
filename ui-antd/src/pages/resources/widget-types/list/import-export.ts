/**
 * Widget-type export / import pipelines for the library list page (M11 wave
 * 1B, spec §3.1 导入/导出). ui-ngx import-export.service.ts parity:
 *
 * - export (single): GET details with `?includeResources=` → strip the
 *   server-owned fields (prepareExport parity) → download `{name}.json`;
 * - export (batch): the SAME per-type read per selected row, packed as a
 *   store-method zip whose entries are slugified `{name}.json` files
 *   (upstream exportWidgetTypes + JSZip parity, hand-rolled zip);
 * - import: read a JSON file, validate the minimal shape (name + descriptor
 *   — upstream validateImportedWidgetTypeDetails) → strip externalId
 *   (prepareImport parity) → POST /api/widgetType with
 *   `updateExistingByFqn=true` (upsert by fqn — the import channel).
 */

import { downloadBlob } from '@/components/shared/download-blob';
import { getWidgetTypeById, saveWidgetType } from '@/services/tb/widget-type';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

import { zipTextFiles } from './zip';

/** prepareExport parity: drop identity/audit fields the import reassigns. */
export function prepareWidgetTypeExport(
  details: WidgetTypeDetails,
): WidgetTypeDetails {
  const clone = JSON.parse(JSON.stringify(details)) as Record<string, unknown>;
  for (const field of [
    'id',
    'createdTime',
    'tenantId',
    'customerId',
    'externalId',
    'version',
  ]) {
    delete clone[field];
  }
  return clone as WidgetTypeDetails;
}

/** Upstream slug: lowercase, non-word chars → `_` (entry file names). */
export function slugifyWidgetTypeName(name: string): string {
  return `${name.toLowerCase().replace(/\W/g, '_')}.json`;
}

/**
 * Single-type export. `includeResources` attaches the resource export
 * payloads so the file is self-contained (the export dialog's checkbox).
 */
export async function exportWidgetTypeToFile(
  widgetTypeId: string,
  name: string,
  includeResources: boolean,
): Promise<void> {
  const details = await getWidgetTypeById(widgetTypeId, {
    includeResources,
  });
  const data = prepareWidgetTypeExport(details);
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `${name}.json`,
  );
}

/**
 * Batch export: every selected type read with the same includeResources
 * choice, packed as `widget_types.zip` (upstream archive name).
 */
export async function exportWidgetTypesToZip(
  widgetTypes: Array<{ id: string; name: string }>,
  includeResources: boolean,
): Promise<void> {
  const detailsList = await Promise.all(
    widgetTypes.map(({ id }) => getWidgetTypeById(id, { includeResources })),
  );
  const files: Record<string, string> = {};
  for (const details of detailsList) {
    files[slugifyWidgetTypeName(details.name ?? 'widget')] = JSON.stringify(
      prepareWidgetTypeExport(details),
      null,
      2,
    );
  }
  downloadBlob(zipTextFiles(files), 'widget_types.zip');
}

/** Error carrying the locale key the import dialog should render. */
export class WidgetTypeImportError extends Error {
  localeKey: string;

  constructor(localeKey: string) {
    super(localeKey);
    this.name = 'WidgetTypeImportError';
    this.localeKey = localeKey;
  }
}

/** validateImportedWidgetTypeDetails parity: name + descriptor present. */
export function parseWidgetTypeImport(text: string): WidgetTypeDetails {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new WidgetTypeImportError(
      'pages.resources.widgetTypes.importParseError',
    );
  }
  const candidate = parsed as WidgetTypeDetails | null;
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    typeof candidate.name !== 'string' ||
    !candidate.name.trim() ||
    typeof candidate.descriptor !== 'object' ||
    candidate.descriptor === null
  ) {
    throw new WidgetTypeImportError(
      'pages.resources.widgetTypes.importInvalidError',
    );
  }
  return candidate;
}

/**
 * Full import pipeline: validate → strip externalId → POST with
 * `updateExistingByFqn=true` (create, or update the type matched by fqn).
 * Returns the saved details (server backfills id/version).
 */
export async function importWidgetTypeFromFile(
  file: File,
): Promise<WidgetTypeDetails> {
  const text = await file.text();
  const parsed = parseWidgetTypeImport(text);
  const clone = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
  delete clone.externalId;
  return saveWidgetType(clone as WidgetTypeDetails, true);
}
