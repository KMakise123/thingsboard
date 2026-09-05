/**
 * Widgets-bundle export / import pipelines (M11 wave 1B, spec §3.1).
 * ui-ngx import-export.service.ts parity:
 *
 * - export: the by-id read with `inlineImages=true` (relative images come
 *   back inlined as data URLs). The include-widgets choice picks the
 *   payload channel: full `widgetTypes` details (each with its resource
 *   payloads) vs the by-reference `widgetTypeFqns` list — the portable
 *   WidgetsBundleItem shape both ways;
 * - import: validate (bundle title + at least one widget channel) → save
 *   the bundle (create; identity stripped) → save each carried widget type
 *   through the `updateExistingByFqn` channel (fqn fallback:
 *   `{bundleAlias}.{typeAlias|slugified name}`) → replace the bundle's
 *   membership with the merged fqn list (carried types + carried fqns).
 */

import { downloadBlob } from '@/components/shared/download-blob';
import { saveWidgetType } from '@/services/tb/widget-type';
import {
  exportWidgetsBundle,
  getBundleWidgetTypeFqns,
  getBundleWidgetTypesDetails,
  saveWidgetsBundle,
  updateWidgetsBundleWidgetFqns,
} from '@/services/tb/widgets-bundle';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';
import type {
  WidgetsBundle,
  WidgetsBundleExportItem,
} from '@/types/tb/widgets-bundle';

/** prepareExport parity: drop identity/audit fields the import reassigns. */
function prepareExport<T>(data: T): T {
  const clone = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
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
  return clone as T;
}

/** Upstream slug: lowercase, non-word chars → `_`. */
export function slugifySegment(value: string): string {
  return value.toLowerCase().replace(/\W/g, '_');
}

/**
 * Bundle export. `includeWidgets=true` embeds the full member widget types;
 * otherwise the membership exports as fqn references only.
 */
export async function exportWidgetsBundleToFile(
  widgetsBundleId: string,
  title: string,
  includeWidgets: boolean,
): Promise<void> {
  const bundle = prepareExport(await exportWidgetsBundle(widgetsBundleId));
  let item: WidgetsBundleExportItem;
  if (includeWidgets) {
    const widgetTypes = await getBundleWidgetTypesDetails(
      widgetsBundleId,
      true,
    );
    item = {
      widgetsBundle: bundle,
      widgetTypes: widgetTypes.map((details) => prepareExport(details)),
    };
  } else {
    item = {
      widgetsBundle: bundle,
      widgetTypeFqns: await getBundleWidgetTypeFqns(widgetsBundleId),
    };
  }
  downloadBlob(
    new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' }),
    `${title}.json`,
  );
}

/** Error carrying the locale key the import dialog should render. */
export class WidgetsBundleImportError extends Error {
  localeKey: string;

  constructor(localeKey: string) {
    super(localeKey);
    this.name = 'WidgetsBundleImportError';
    this.localeKey = localeKey;
  }
}

/** validateImportedWidgetsBundle parity: title + one widget channel. */
export function parseWidgetsBundleImport(
  text: string,
): WidgetsBundleExportItem {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new WidgetsBundleImportError(
      'pages.resources.widgetsBundles.importParseError',
    );
  }
  const item = parsed as WidgetsBundleExportItem | null;
  const bundle = item?.widgetsBundle;
  const hasTypes = Array.isArray(item?.widgetTypes);
  const hasFqns = Array.isArray(item?.widgetTypeFqns);
  if (
    typeof bundle !== 'object' ||
    bundle === null ||
    typeof bundle.title !== 'string' ||
    !bundle.title.trim() ||
    (!hasTypes && !hasFqns)
  ) {
    throw new WidgetsBundleImportError(
      'pages.resources.widgetsBundles.importInvalidError',
    );
  }
  return item;
}

/** Upstream prepareWidgetType: fqn fallback from the bundle alias. */
function withFqnFallback(
  details: WidgetTypeDetails,
  bundleAlias: string,
): WidgetTypeDetails {
  if (details.fqn) {
    return details;
  }
  const segment =
    (details as { alias?: string }).alias ??
    slugifySegment(details.name ?? 'widget');
  return { ...details, fqn: `${bundleAlias}.${segment}` };
}

/**
 * Full import pipeline: validate → create the bundle → import carried
 * widget types (updateExistingByFqn) → replace membership with the merged
 * fqn set. Returns the saved bundle.
 */
export async function importWidgetsBundleFromFile(
  file: File,
): Promise<WidgetsBundle> {
  const text = await file.text();
  const item = parseWidgetsBundleImport(text);

  const bundleClone = JSON.parse(JSON.stringify(item.widgetsBundle)) as Record<
    string,
    unknown
  >;
  delete bundleClone.externalId;
  const savedBundle = await saveWidgetsBundle(bundleClone as WidgetsBundle);

  const savedFqns: string[] = [];
  for (const details of item.widgetTypes ?? []) {
    const clone = JSON.parse(
      JSON.stringify(withFqnFallback(details, savedBundle.alias ?? '')),
    ) as Record<string, unknown>;
    delete clone.externalId;
    const saved = await saveWidgetType(clone as WidgetTypeDetails, true);
    if (saved.fqn) {
      savedFqns.push(saved.fqn);
    }
  }
  const mergedFqns = [...savedFqns, ...(item.widgetTypeFqns ?? [])];
  if (mergedFqns.length > 0) {
    await updateWidgetsBundleWidgetFqns(savedBundle.id?.id ?? '', mergedFqns);
  }
  return savedBundle;
}
