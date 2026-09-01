import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  parseDeviceListUrlState,
  serializeDeviceListUrlState,
  toDeviceListFilter,
  toPageLink,
  useDeviceListUrlState,
} from './url-state';

describe('parseDeviceListUrlState', () => {
  it('falls back to defaults for a bare query string', () => {
    expect(parseDeviceListUrlState('')).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
      deviceProfileId: undefined,
      active: undefined,
    });
  });

  it('reads every bookmarkable key from the URL', () => {
    const state = parseDeviceListUrlState(
      '?page=3&pageSize=30&sortProperty=name&sortOrder=ASC' +
        '&textSearch=_sensor&deviceProfileId=prof-1&active=false',
    );
    expect(state).toEqual({
      page: 3,
      pageSize: 30,
      sortProperty: 'name',
      sortDirection: 'ASC',
      textSearch: '_sensor',
      deviceProfileId: 'prof-1',
      active: 'false',
    });
  });

  it('clamps hostile page/pageSize values and unknown active values', () => {
    const state = parseDeviceListUrlState(
      '?page=-2&pageSize=7&active=maybe&sortOrder=sideways',
    );
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10);
    expect(state.active).toBeUndefined();
    expect(state.sortDirection).toBe('DESC');
  });
});

describe('serializeDeviceListUrlState', () => {
  it('omits default values so clean states keep a clean URL', () => {
    expect(serializeDeviceListUrlState(parseDeviceListUrlState(''))).toBe('');
  });

  it('round-trips a fully-populated state', () => {
    const search =
      '?page=4&pageSize=20&sortProperty=label&sortOrder=ASC&textSearch=gw&deviceProfileId=prof-9&active=true';
    expect(serializeDeviceListUrlState(parseDeviceListUrlState(search))).toBe(
      search.slice(1),
    );
  });
});

describe('toPageLink / toDeviceListFilter', () => {
  it('converts the 1-based UI page to the 0-based server page and trims search', () => {
    const state = parseDeviceListUrlState('?page=2&textSearch=%20%20gw%20');
    expect(toPageLink(state)).toEqual({
      pageSize: 10,
      page: 1,
      textSearch: 'gw',
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('maps the URL state onto the device list filter', () => {
    expect(
      toDeviceListFilter(
        parseDeviceListUrlState('?deviceProfileId=prof-1&active=true'),
      ),
    ).toEqual({ deviceProfileId: 'prof-1', active: true });
    expect(toDeviceListFilter(parseDeviceListUrlState(''))).toEqual({
      deviceProfileId: undefined,
      active: undefined,
    });
  });
});

describe('useDeviceListUrlState', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/devices');
  });

  it('patches state and mirrors it into the query string', () => {
    const { result } = renderHook(() => useDeviceListUrlState());

    act(() => {
      result.current.patch({ page: 2, pageSize: 30, textSearch: 'gw' });
    });

    expect(result.current.state.page).toBe(2);
    expect(window.location.search).toBe('?page=2&pageSize=30&textSearch=gw');
  });

  it('initializes from the URL (deviceProfileId / active bookmarks)', () => {
    window.history.replaceState(
      {},
      '',
      '/devices?deviceProfileId=prof-7&active=false&page=5',
    );
    const { result } = renderHook(() => useDeviceListUrlState());
    expect(result.current.state).toMatchObject({
      deviceProfileId: 'prof-7',
      active: 'false',
      page: 5,
    });
  });

  it('re-reads the URL on popstate (back/forward restores filters)', () => {
    const { result } = renderHook(() => useDeviceListUrlState());
    act(() => {
      result.current.patch({ textSearch: 'abc' });
    });

    window.history.replaceState({}, '', '/devices?textSearch=zzz');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.state.textSearch).toBe('zzz');
  });
});
