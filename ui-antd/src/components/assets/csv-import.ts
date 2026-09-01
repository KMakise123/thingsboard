/**
 * Client-side CSV column mapping for the ASSET bulk-import wizard
 * (import-dialog-csv parity with the asset column set).
 *
 * The generic CSV reader is shared with the device domain (pure parsing, no
 * device semantics) and re-exported from here so the asset modal consumes a
 * single module. What differs is the column vocabulary: assets import
 * NAME/TYPE/LABEL/DESCRIPTION plus attribute/telemetry columns — no
 * credentials columns (ui-ngx asset import, BulkImportColumnType subset;
 * openapi snapshot L16926).
 */
import type { BulkImportRequest, CsvDelimiter } from '@/types/tb';

import type { ParsedCsv } from '@/components/devices/csv-import';

export {
  CSV_DELIMITERS,
  CsvParseError,
  type ParsedCsv,
  parseCsv,
} from '@/components/devices/csv-import';

/** Column types the asset import offers (ImportEntityColumnType subset). */
export const ASSET_COLUMN_TYPES = [
  'name',
  'type',
  'label',
  'description',
  'serverAttribute',
  'sharedAttribute',
  'timeseries',
] as const;

export type AssetColumnType = (typeof ASSET_COLUMN_TYPES)[number];

/** Column types that carry an attribute/telemetry key alongside the type. */
const KEYED_TYPES: ReadonlySet<string> = new Set([
  'serverAttribute',
  'sharedAttribute',
  'timeseries',
]);

/** Header-name -> column type auto-detection (ui-ngx createColumnsData). */
const HEADER_TO_TYPE: ReadonlyMap<string, AssetColumnType> = new Map<
  string,
  AssetColumnType
>([
  ['name', 'name'],
  ['type', 'type'],
  ['label', 'label'],
  ['description', 'description'],
  ['server_attribute', 'serverAttribute'],
  ['shared_attribute', 'sharedAttribute'],
  ['timeseries', 'timeseries'],
]);

/** Wire values for the column type (BulkImportColumnType enum). */
const TYPE_TO_WIRE: ReadonlyMap<AssetColumnType, string> = new Map([
  ['name', 'NAME'],
  ['type', 'TYPE'],
  ['label', 'LABEL'],
  ['description', 'DESCRIPTION'],
  ['serverAttribute', 'SERVER_ATTRIBUTE'],
  ['sharedAttribute', 'SHARED_ATTRIBUTE'],
  ['timeseries', 'TIMESERIES'],
]);

export interface AssetColumnMappingDraft {
  type: AssetColumnType;
  /** Attribute/telemetry key (only meaningful for KEYED_TYPES). */
  key?: string;
  sample?: string;
  header: string;
}

/** Initial mapping for the wizard, auto-detecting types from headers. */
export function buildAssetColumnDrafts(
  parsed: ParsedCsv,
  header: boolean,
): Array<AssetColumnMappingDraft> {
  return parsed.headers.map((headerName, index) => {
    const detected = header
      ? HEADER_TO_TYPE.get(headerName.trim().toLowerCase())
      : undefined;
    const type: AssetColumnType = detected ?? 'serverAttribute';
    const key = KEYED_TYPES.has(type)
      ? header
        ? headerName.trim().toLowerCase()
        : ''
      : undefined;
    return {
      type,
      key,
      header: headerName,
      sample: parsed.rows[0]?.[index],
    };
  });
}

/** Column-mapping form value -> BulkImportRequest (JSON wire contract). */
export function toAssetBulkImportRequest(
  fileText: string,
  drafts: Array<AssetColumnMappingDraft>,
  options: { delimiter: CsvDelimiter; header: boolean; update: boolean },
): BulkImportRequest {
  return {
    file: fileText,
    mapping: {
      columns: drafts.map((draft) => ({
        type: TYPE_TO_WIRE.get(draft.type) ?? 'SERVER_ATTRIBUTE',
        key: KEYED_TYPES.has(draft.type) ? draft.key : undefined,
      })),
      // TYPES GAP (device import, same wire): types/tb spells the tab
      // delimiter 'TAB', but the backend field is a plain java.lang.Character
      // — convert here until CsvDelimiter is fixed upstream.
      delimiter: (options.delimiter === 'TAB'
        ? '\t'
        : options.delimiter) as CsvDelimiter,
      header: options.header,
      update: options.update,
    },
  };
}

export function isKeyedAssetColumnType(
  type: AssetColumnType | undefined,
): boolean {
  return KEYED_TYPES.has(type ?? '');
}
