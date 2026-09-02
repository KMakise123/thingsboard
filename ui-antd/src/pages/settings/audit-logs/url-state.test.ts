/**
 * Audit-logs URL state: parse/serialize round trip (bookmark restore of
 * pagination, sort, text search, timewindow and actionTypes) and the
 * default fallbacks for garbage input.
 */
import { describe, expect, it } from 'vitest';

import {
  parseAuditLogsUrlState,
  serializeAuditLogsUrlState,
} from './url-state';

describe('audit-logs url state', () => {
  it('falls back to defaults for an empty or invalid query', () => {
    const state = parseAuditLogsUrlState(
      '?page=abc&pageSize=7&sortProperty=nope',
    );
    expect(state).toMatchObject({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
      actionTypes: [],
    });
    expect(state.startTime).toBeUndefined();
    expect(state.endTime).toBeUndefined();
  });

  it('restores the full filter set from the query string', () => {
    const state = parseAuditLogsUrlState(
      '?page=3&pageSize=50&sortProperty=userName&sortOrder=ASC' +
        '&textSearch=dev&startTime=1000&endTime=2000&actionTypes=LOGIN,LOGOUT',
    );
    expect(state).toMatchObject({
      page: 3,
      pageSize: 50,
      sortProperty: 'userName',
      sortDirection: 'ASC',
      textSearch: 'dev',
      startTime: 1000,
      endTime: 2000,
      actionTypes: ['LOGIN', 'LOGOUT'],
    });
    // Round trip: serializing the parsed state yields the same query.
    expect(serializeAuditLogsUrlState(state)).toBe(
      'page=3&pageSize=50&sortProperty=userName&sortOrder=ASC' +
        '&textSearch=dev&startTime=1000&endTime=2000&actionTypes=LOGIN%2CLOGOUT',
    );
  });

  it('omits default values when serializing', () => {
    expect(serializeAuditLogsUrlState(parseAuditLogsUrlState(''))).toBe('');
  });
});
