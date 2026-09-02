/**
 * Asset CSV column-mapping tests: auto-detection from headers, keyed-column
 * handling and the wire request shape (BulkImportColumnType enums, 'TAB'
 * delimiter conversion).
 */
import { describe, expect, it } from 'vitest';

import { parseCsv } from '@/components/devices/csv-import';

import {
  ASSET_COLUMN_TYPES,
  buildAssetColumnDrafts,
  isKeyedAssetColumnType,
  toAssetBulkImportRequest,
} from './csv-import';

describe('asset csv import mapping', () => {
  it('offers the asset column vocabulary without credential columns', () => {
    expect(ASSET_COLUMN_TYPES).toEqual([
      'name',
      'type',
      'label',
      'description',
      'serverAttribute',
      'sharedAttribute',
      'timeseries',
    ]);
  });

  it('auto-detects asset headers and defaults unknown columns to server attributes', () => {
    const parsed = parseCsv('name,type,label,notes\nA,thermometer,L1,x', {
      delimiter: ',',
      header: true,
    });
    const drafts = buildAssetColumnDrafts(parsed, true);
    expect(drafts.map((draft) => draft.type)).toEqual([
      'name',
      'type',
      'label',
      'serverAttribute',
    ]);
    // Unknown header becomes a keyed server attribute carrying its key.
    expect(drafts[3].key).toBe('notes');
    expect(drafts[3].sample).toBe('x');
  });

  it('builds the wire request with BulkImportColumnType enums', () => {
    const parsed = parseCsv('name,label,server_attribute,timeseries', {
      delimiter: ',',
      header: true,
    });
    const drafts = buildAssetColumnDrafts(parsed, true);
    const request = toAssetBulkImportRequest('CSV,TEXT', drafts, {
      delimiter: ',',
      header: true,
      update: true,
    });
    expect(request).toEqual({
      file: 'CSV,TEXT',
      mapping: {
        columns: [
          { type: 'NAME', key: undefined },
          { type: 'LABEL', key: undefined },
          { type: 'SERVER_ATTRIBUTE', key: 'server_attribute' },
          { type: 'TIMESERIES', key: 'timeseries' },
        ],
        delimiter: ',',
        header: true,
        update: true,
      },
    });
  });

  it('converts the TAB delimiter to a real tab character for the wire', () => {
    const request = toAssetBulkImportRequest(
      'a',
      [{ type: 'name', header: 'name' }],
      { delimiter: 'TAB', header: true, update: false },
    );
    expect(request.mapping.delimiter).toBe('\t');
  });

  it('marks only attribute/telemetry columns as keyed', () => {
    expect(isKeyedAssetColumnType('serverAttribute')).toBe(true);
    expect(isKeyedAssetColumnType('sharedAttribute')).toBe(true);
    expect(isKeyedAssetColumnType('timeseries')).toBe(true);
    expect(isKeyedAssetColumnType('name')).toBe(false);
    expect(isKeyedAssetColumnType(undefined)).toBe(false);
  });
});
