import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  parseUsersListUrlState,
  serializeUsersListUrlState,
  toPageLink,
  useUsersListUrlState,
} from './url-state';

describe('parseUsersListUrlState', () => {
  it('falls back to defaults for a bare query string', () => {
    expect(parseUsersListUrlState('')).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
    });
  });

  it('reads every bookmarkable key from the URL', () => {
    const state = parseUsersListUrlState(
      '?page=3&pageSize=30&sortProperty=email&sortOrder=ASC&textSearch=admin',
    );
    expect(state).toEqual({
      page: 3,
      pageSize: 30,
      sortProperty: 'email',
      sortDirection: 'ASC',
      textSearch: 'admin',
    });
  });

  it('clamps hostile page/pageSize values and unknown sort properties', () => {
    const state = parseUsersListUrlState(
      '?page=-2&pageSize=7&sortProperty=tenantTitle&sortOrder=sideways',
    );
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10);
    expect(state.sortProperty).toBe('createdTime');
    expect(state.sortDirection).toBe('DESC');
  });
});

describe('serializeUsersListUrlState', () => {
  it('omits default values so clean states keep a clean URL', () => {
    expect(serializeUsersListUrlState(parseUsersListUrlState(''))).toBe('');
  });

  it('round-trips a fully-populated state', () => {
    const search =
      '?page=4&pageSize=20&sortProperty=lastName&sortOrder=ASC&textSearch=cu';
    expect(serializeUsersListUrlState(parseUsersListUrlState(search))).toBe(
      search.slice(1),
    );
  });
});

describe('toPageLink', () => {
  it('converts the 1-based UI page to the 0-based server page and trims search', () => {
    const state = parseUsersListUrlState('?page=2&textSearch=%20%20cu%20');
    expect(toPageLink(state)).toEqual({
      pageSize: 10,
      page: 1,
      textSearch: 'cu',
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });
});

describe('useUsersListUrlState', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/users');
  });

  it('patches state and mirrors it into the query string', () => {
    const { result } = renderHook(() => useUsersListUrlState());

    act(() => {
      result.current.patch({ page: 2, pageSize: 30, textSearch: 'cu' });
    });

    expect(result.current.state.page).toBe(2);
    expect(window.location.search).toBe('?page=2&pageSize=30&textSearch=cu');
  });

  it('initializes from the URL (bookmark restores filters and page)', () => {
    window.history.replaceState(
      {},
      '',
      '/users?sortProperty=email&sortOrder=ASC&page=5',
    );
    const { result } = renderHook(() => useUsersListUrlState());
    expect(result.current.state).toMatchObject({
      sortProperty: 'email',
      sortDirection: 'ASC',
      page: 5,
    });
  });

  it('re-reads the URL on popstate (back/forward restores filters)', () => {
    const { result } = renderHook(() => useUsersListUrlState());
    act(() => {
      result.current.patch({ textSearch: 'abc' });
    });

    window.history.replaceState({}, '', '/users?textSearch=zzz');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.state.textSearch).toBe('zzz');
  });
});
