/**
 * Asset-profile-list URL state tests: defaults, hostile-value fallbacks and
 * the 1-based UI / 0-based server page conversion.
 */
import { describe, expect, it } from 'vitest';

import {
  parseAssetProfileListUrlState,
  serializeAssetProfileListUrlState,
  toPageLink,
} from './url-state';

describe('asset profile list url state', () => {
  it('falls back to defaults for missing or hostile values', () => {
    const state = parseAssetProfileListUrlState('?page=0&pageSize=999');
    expect(state).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
    });
  });

  it('parses a bookmarked query string', () => {
    const state = parseAssetProfileListUrlState(
      '?page=2&pageSize=30&sortProperty=description&sortOrder=ASC&textSearch=shop',
    );
    expect(state).toEqual({
      page: 2,
      pageSize: 30,
      sortProperty: 'description',
      sortDirection: 'ASC',
      textSearch: 'shop',
    });
  });

  it('omits default values when serializing', () => {
    expect(
      serializeAssetProfileListUrlState({
        page: 1,
        pageSize: 10,
        sortProperty: 'createdTime',
        sortDirection: 'DESC',
        textSearch: '',
      }),
    ).toBe('');
  });

  it('converts the UI page to the 0-based server page', () => {
    expect(
      toPageLink({
        page: 1,
        pageSize: 10,
        sortProperty: 'createdTime',
        sortDirection: 'DESC',
        textSearch: '',
      }).page,
    ).toBe(0);
    expect(
      toPageLink({
        page: 5,
        pageSize: 10,
        sortProperty: 'createdTime',
        sortDirection: 'DESC',
        textSearch: '',
      }).page,
    ).toBe(4);
  });
});
