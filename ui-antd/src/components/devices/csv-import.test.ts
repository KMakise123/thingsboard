import { describe, expect, it } from 'vitest';

import {
  buildColumnDrafts,
  CsvParseError,
  DEVICE_COLUMN_TYPES,
  parseCsv,
  toBulkImportRequest,
} from './csv-import';

describe('parseCsv', () => {
  it('splits on the configured delimiter and drops the header row', () => {
    const parsed = parseCsv('name,type,value\n Therm 1 ,default,42', {
      delimiter: ',',
      header: true,
    });
    expect(parsed.headers).toEqual(['name', 'type', 'value']);
    expect(parsed.rows).toEqual([[' Therm 1 ', 'default', '42']]);
  });

  it('honors quoted delimiters, escaped quotes and quoted newlines', () => {
    const csv = 'name,note\n"Therm, 1","line one\nline two ""quoted"" 2"';
    const parsed = parseCsv(csv, { delimiter: ',', header: true });
    expect(parsed.rows).toEqual([
      ['Therm, 1', 'line one\nline two "quoted" 2'],
    ]);
  });

  it('supports semicolon, pipe and TAB delimiters and CRLF files', () => {
    expect(parseCsv('a;b\n1;2', { delimiter: ';', header: true }).rows).toEqual(
      [['1', '2']],
    );
    expect(parseCsv('a|b\n1|2', { delimiter: '|', header: true }).rows).toEqual(
      [['1', '2']],
    );
    expect(
      parseCsv('a\tb\r\n1\t2', { delimiter: 'TAB', header: true }).rows,
    ).toEqual([['1', '2']]);
  });

  it('synthesizes Column N headers when the file has none', () => {
    const parsed = parseCsv('Therm 1,default,42', {
      delimiter: ',',
      header: false,
    });
    expect(parsed.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
    expect(parsed.rows).toHaveLength(1);
  });

  it('rejects empty files and single-column files as unusable', () => {
    expect(() => parseCsv('', { delimiter: ',', header: true })).toThrow(
      CsvParseError,
    );
    expect(() =>
      parseCsv('only-one-column', { delimiter: ',', header: true }),
    ).toThrow(/two columns/);
  });
});

describe('buildColumnDrafts', () => {
  it('auto-detects ui-ngx header conventions and keys from the header names', () => {
    const csv = [
      'name,type,access_token,isGateway,shared_attribute,sensor_temp',
      'Therm 1,thermo,tok-1,true,10,21.5',
    ].join('\n');
    const drafts = buildColumnDrafts(
      parseCsv(csv, { delimiter: ',', header: true }),
      true,
    );
    expect(drafts.map((draft) => draft.type)).toEqual([
      'name',
      'type',
      'accessToken',
      'isGateway',
      'sharedAttribute',
      'serverAttribute',
    ]);
    // Keyed types derive their key from the (lowercased) header.
    expect(drafts[4]?.key).toBe('shared_attribute');
    expect(drafts[5]?.key).toBe('sensor_temp');
    // The sample column previews the first data row.
    expect(drafts[0]?.sample).toBe('Therm 1');
  });

  it('defaults unknown headers to serverAttribute with empty keys when headerless', () => {
    const drafts = buildColumnDrafts(
      parseCsv('Therm 1,default', { delimiter: ',', header: false }),
      false,
    );
    expect(drafts.map((draft) => draft.type)).toEqual([
      'serverAttribute',
      'serverAttribute',
    ]);
    expect(drafts[0]?.key).toBe('');
  });

  it('covers the documented column vocabulary', () => {
    expect(DEVICE_COLUMN_TYPES).toContain('x509');
    expect(DEVICE_COLUMN_TYPES).toContain('mqttClientId');
    expect(DEVICE_COLUMN_TYPES).toContain('timeseries');
  });
});

describe('toBulkImportRequest (JSON wire contract)', () => {
  it('carries the RAW csv text in `file` (no multipart) and maps every column', () => {
    const csvText = 'name,access_token,shared_attribute\nTherm 1,tok-1,10';
    const drafts = buildColumnDrafts(
      parseCsv(csvText, { delimiter: ',', header: true }),
      true,
    );

    const request = toBulkImportRequest(csvText, drafts, {
      delimiter: ',',
      header: true,
      update: true,
    });

    expect(request.file).toBe(csvText);
    expect(request.mapping).toEqual({
      columns: [
        { type: 'NAME', key: undefined },
        { type: 'ACCESS_TOKEN', key: undefined },
        { type: 'SHARED_ATTRIBUTE', key: 'shared_attribute' },
      ],
      delimiter: ',',
      header: true,
      update: true,
    });
  });

  it('sends a literal tab for the TAB delimiter (backend binds java.lang.Character)', () => {
    const csvText = 'name\ttype\nTherm 1\tdefault';
    const drafts = buildColumnDrafts(
      parseCsv(csvText, { delimiter: 'TAB', header: true }),
      true,
    );
    const request = toBulkImportRequest(csvText, drafts, {
      delimiter: 'TAB',
      header: true,
      update: false,
    });
    expect(request.mapping?.delimiter).toBe('\t');
    expect(request.mapping?.update).toBe(false);
  });

  it('maps the credential column families to their wire enums', () => {
    const csvText = [
      'name,x509,mqtt_client_id,mqtt_user_name,mqtt_password,timeseries',
      'Therm 1,PEM,cid,user,pass,21.5',
    ].join('\n');
    const drafts = buildColumnDrafts(
      parseCsv(csvText, { delimiter: ',', header: true }),
      true,
    );
    const request = toBulkImportRequest(csvText, drafts, {
      delimiter: ',',
      header: true,
      update: true,
    });
    expect(request.mapping?.columns.map((column) => column.type)).toEqual([
      'NAME',
      'X509',
      'MQTT_CLIENT_ID',
      'MQTT_USER_NAME',
      'MQTT_PASSWORD',
      'TIMESERIES',
    ]);
    expect(request.mapping?.columns[5]?.key).toBe('timeseries');
  });
});
