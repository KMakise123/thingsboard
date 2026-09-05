/**
 * Edge import mapping helpers: header auto-detection over the ngx edge
 * column set and the JSON wire request (raw CSV text rides in `file`).
 */
import { describe, expect, it } from 'vitest';

import {
  buildEdgeColumnDrafts,
  toEdgeBulkImportRequest,
} from './import-dialog';

const PARSED = {
  headers: ['name', 'type', 'routing_key', 'server_attribute'],
  rows: [
    ['gw1', 'default', 'abc', 'temp'],
    ['gw2', 'default', 'def', 'temp2'],
  ],
};

describe('buildEdgeColumnDrafts', () => {
  it('auto-detects edge column types from header names', () => {
    const drafts = buildEdgeColumnDrafts(PARSED, true);
    expect(drafts.map((draft) => draft.type)).toEqual([
      'NAME',
      'TYPE',
      'ROUTING_KEY',
      'SERVER_ATTRIBUTE',
    ]);
    expect(drafts[3].key).toBe('server_attribute');
    expect(drafts[0].key).toBeUndefined();
    expect(drafts[0].sample).toBe('gw1');
  });

  it('falls back to NAME/TYPE for undetected headers', () => {
    const drafts = buildEdgeColumnDrafts(
      { headers: ['a', 'b', 'c'], rows: [['1', '2', '3']] },
      false,
    );
    expect(drafts.map((draft) => draft.type)).toEqual(['NAME', 'TYPE', 'NAME']);
  });
});

describe('toEdgeBulkImportRequest', () => {
  it('carries the raw CSV text plus the column mapping', () => {
    const drafts = buildEdgeColumnDrafts(PARSED, true);
    const request = toEdgeBulkImportRequest('name,type\ngw1,default', drafts, {
      delimiter: ',',
      header: true,
      update: false,
    });
    expect(request.file).toBe('name,type\ngw1,default');
    expect(request.mapping.columns).toEqual([
      { type: 'NAME', key: undefined },
      { type: 'TYPE', key: undefined },
      { type: 'ROUTING_KEY', key: undefined },
      { type: 'SERVER_ATTRIBUTE', key: 'server_attribute' },
    ]);
    expect(request.mapping.header).toBe(true);
    expect(request.mapping.update).toBe(false);
  });

  it('converts the TAB option into the wire tab character', () => {
    const request = toEdgeBulkImportRequest('x', [], {
      delimiter: 'TAB',
      header: false,
      update: true,
    });
    expect(request.mapping.delimiter).toBe('\t');
  });
});
