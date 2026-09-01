/**
 * Asset-list URL state tests: bookmark round-trip, default clamping and the
 * server coordinate conversion (UI 1-based pages -> server 0-based).
 */
import { describe, expect, it } from 'vitest';

import {
  parseAssetListUrlState,
  serializeAssetListUrlState,
  toAssetListFilter,
  toPageLink,
} from './url-state';

describe('asset list url state', () => {
  it('falls back to defaults on an empty query string', () => {
    expect(parseAssetListUrlState('')).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
      assetProfileId: undefined,
    });
  });

  it('parses filters, sort and page from the URL', () => {
    const state = parseAssetListUrlState(
      'page=3&pageSize=30&sortProperty=name&sortOrder=ASC&textSearch=hall&assetProfileId=prof-1',
    );
    expect(state).toEqual({
      page: 3,
      pageSize: 30,
      sortProperty: 'name',
      sortDirection: 'ASC',
      textSearch: 'hall',
      assetProfileId: 'prof-1',
    });
  });

  it('clamps hostile values instead of throwing', () => {
    const state = parseAssetListUrlState(
      'page=0&pageSize=777&sortOrder=DIAGONAL',
    );
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10);
    expect(state.sortDirection).toBe('DESC');
  });

  it('omits defaults when serializing to keep URLs clean', () => {
    expect(serializeAssetListUrlState(parseAssetListUrlState(''))).toBe('');
    expect(
      serializeAssetListUrlState(
        parseAssetListUrlState('page=2&assetProfileId=p1&textSearch=a'),
      ),
    ).toBe('page=2&textSearch=a&assetProfileId=p1');
  });

  it('converts UI state into the 0-based server page link', () => {
    const state = parseAssetListUrlState(
      'page=4&pageSize=20&textSearch=%20room%20&sortProperty=label&sortOrder=ASC',
    );
    expect(toPageLink(state)).toEqual({
      pageSize: 20,
      page: 3,
      textSearch: 'room',
      sortOrder: { property: 'label', direction: 'ASC' },
    });
  });

  it('builds the profile filter and drops empty values', () => {
    expect(toAssetListFilter(parseAssetListUrlState(''))).toEqual({
      assetProfileId: undefined,
    });
    expect(
      toAssetListFilter(parseAssetListUrlState('assetProfileId=prof-9')),
    ).toEqual({ assetProfileId: 'prof-9' });
  });
});
