/**
 * Device-profile-list URL state tests: defaults, hostile-value fallbacks
 * and the 1-based UI / 0-based server page conversion.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  parseDeviceProfileListUrlState,
  serializeDeviceProfileListUrlState,
  toPageLink,
} from './url-state';

describe('device profile list url state', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/deviceProfiles');
  });

  it('falls back to defaults for missing or hostile values', () => {
    const state = parseDeviceProfileListUrlState(
      '?page=-3&pageSize=7&sortOrder=WAT',
    );
    expect(state).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
    });
  });

  it('parses a bookmarked query string', () => {
    const state = parseDeviceProfileListUrlState(
      '?page=3&pageSize=20&sortProperty=name&sortOrder=ASC&textSearch=sensor',
    );
    expect(state).toEqual({
      page: 3,
      pageSize: 20,
      sortProperty: 'name',
      sortDirection: 'ASC',
      textSearch: 'sensor',
    });
  });

  it('omits default values when serializing', () => {
    expect(
      serializeDeviceProfileListUrlState({
        page: 1,
        pageSize: 10,
        sortProperty: 'createdTime',
        sortDirection: 'DESC',
        textSearch: '',
      }),
    ).toBe('');
    expect(
      serializeDeviceProfileListUrlState({
        page: 2,
        pageSize: 30,
        sortProperty: 'name',
        sortDirection: 'ASC',
        textSearch: 'x',
      }),
    ).toBe('page=2&pageSize=30&sortProperty=name&sortOrder=ASC&textSearch=x');
  });

  it('converts the UI page to the 0-based server page', () => {
    const link = toPageLink({
      page: 4,
      pageSize: 20,
      sortProperty: 'name',
      sortDirection: 'ASC',
      textSearch: ' pump ',
    });
    expect(link).toEqual({
      page: 3,
      pageSize: 20,
      textSearch: 'pump',
      sortOrder: { property: 'name', direction: 'ASC' },
    });
  });
});
