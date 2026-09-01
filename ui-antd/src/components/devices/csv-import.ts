/**
 * Client-side CSV reading for the device bulk-import wizard
 * (import-dialog-csv.component.ts parity: the file is parsed in the browser
 * to build the column mapping, then the RAW text is posted as JSON —
 * BulkImportRequest.file carries the CSV text itself).
 */
import type { BulkImportRequest, CsvDelimiter } from '@/types/tb';

export const CSV_DELIMITERS: Array<{
  value: CsvDelimiter;
  label: string;
}> = [
  { value: ',', label: ',' },
  { value: ';', label: ';' },
  { value: '|', label: '|' },
  { value: 'TAB', label: 'Tab' },
];

/** Wire enum values the device import offers (ImportEntityColumnType subset). */
export const DEVICE_COLUMN_TYPES = [
  'name',
  'type',
  'label',
  'description',
  'isGateway',
  'accessToken',
  'x509',
  'mqttClientId',
  'mqttUserName',
  'mqttPassword',
  'serverAttribute',
  'sharedAttribute',
  'timeseries',
] as const;

export type DeviceColumnType = (typeof DEVICE_COLUMN_TYPES)[number];

/** Column types that carry an attribute/telemetry key alongside the type. */
const KEYED_TYPES: ReadonlySet<string> = new Set([
  'serverAttribute',
  'sharedAttribute',
  'timeseries',
]);

/** Header-name -> column type auto-detection (ui-ngx createColumnsData). */
const HEADER_TO_TYPE: ReadonlyMap<string, DeviceColumnType> = new Map<
  string,
  DeviceColumnType
>([
  ['name', 'name'],
  ['type', 'type'],
  ['label', 'label'],
  ['description', 'description'],
  ['isgateway', 'isGateway'],
  ['access_token', 'accessToken'],
  ['x509', 'x509'],
  ['mqtt_client_id', 'mqttClientId'],
  ['mqtt_user_name', 'mqttUserName'],
  ['mqtt_password', 'mqttPassword'],
  ['server_attribute', 'serverAttribute'],
  ['shared_attribute', 'sharedAttribute'],
  ['timeseries', 'timeseries'],
]);

/** Wire values for the form-level column type (BulkImportColumnType enum). */
const TYPE_TO_WIRE: ReadonlyMap<DeviceColumnType, string> = new Map([
  ['name', 'NAME'],
  ['type', 'TYPE'],
  ['label', 'LABEL'],
  ['description', 'DESCRIPTION'],
  ['isGateway', 'IS_GATEWAY'],
  ['accessToken', 'ACCESS_TOKEN'],
  ['x509', 'X509'],
  ['mqttClientId', 'MQTT_CLIENT_ID'],
  ['mqttUserName', 'MQTT_USER_NAME'],
  ['mqttPassword', 'MQTT_PASSWORD'],
  ['serverAttribute', 'SERVER_ATTRIBUTE'],
  ['sharedAttribute', 'SHARED_ATTRIBUTE'],
  ['timeseries', 'TIMESERIES'],
]);

export interface ParsedCsv {
  headers: string[];
  /** Data rows (the header row is excluded when present). */
  rows: string[][];
}

export class CsvParseError extends Error {}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

/**
 * Split CSV text into records, honoring quoted delimiters and quoted
 * newlines. Trailing empty lines are dropped.
 */
function splitRecords(text: string): string[] {
  const records: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // collapse \r\n into one record break
      if (char === '\r' || !current.endsWith('\r')) {
        records.push(current.replace(/\r$/, ''));
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.replace(/\r$/, '').length > 0) {
    records.push(current.replace(/\r$/, ''));
  }
  return records.filter((record) => record.length > 0);
}

/** Parse with header/delimiter config; throws CsvParseError when unusable. */
export function parseCsv(
  text: string,
  options: { delimiter: CsvDelimiter; header: boolean },
): ParsedCsv {
  const delimiter = options.delimiter === 'TAB' ? '\t' : options.delimiter;
  const records = splitRecords(text);
  if (records.length === 0) {
    throw new CsvParseError('empty file');
  }
  const headerCells = splitLine(records[0], delimiter);
  if (headerCells.length < 2) {
    throw new CsvParseError('need at least two columns');
  }
  const dataRecords = options.header ? records.slice(1) : records;
  const headers = options.header
    ? headerCells
    : headerCells.map((_, index) => `Column ${index + 1}`);
  return {
    headers,
    rows: dataRecords.map((record) => splitLine(record, delimiter)),
  };
}

export interface ColumnMappingDraft {
  type: DeviceColumnType;
  /** Attribute/telemetry key (only meaningful for KEYED_TYPES). */
  key?: string;
  sample?: string;
  header: string;
}

/** Initial mapping for the wizard, auto-detecting types from headers. */
export function buildColumnDrafts(
  parsed: ParsedCsv,
  header: boolean,
): Array<ColumnMappingDraft> {
  return parsed.headers.map((headerName, index) => {
    const detected = header
      ? HEADER_TO_TYPE.get(headerName.trim().toLowerCase())
      : undefined;
    const type: DeviceColumnType = detected ?? 'serverAttribute';
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
export function toBulkImportRequest(
  fileText: string,
  drafts: Array<ColumnMappingDraft>,
  options: { delimiter: CsvDelimiter; header: boolean; update: boolean },
): BulkImportRequest {
  return {
    file: fileText,
    mapping: {
      columns: drafts.map((draft) => ({
        type: TYPE_TO_WIRE.get(draft.type) ?? 'SERVER_ATTRIBUTE',
        key: KEYED_TYPES.has(draft.type) ? draft.key : undefined,
      })),
      // TYPES GAP (reported): types/tb spells the tab delimiter 'TAB', but
      // the backend field is a plain java.lang.Character — Jackson rejects
      // multi-character strings, and ui-ngx sends '\t' (import-dialog-csv
      // delimiters array). Convert here until CsvDelimiter is fixed upstream.
      delimiter: (options.delimiter === 'TAB'
        ? '\t'
        : options.delimiter) as CsvDelimiter,
      header: options.header,
      update: options.update,
    },
  };
}
