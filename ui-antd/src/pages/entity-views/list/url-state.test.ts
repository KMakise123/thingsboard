/**
 * Entity-view list URL state tests: parse/serialize round-trip, defaults
 * (no profile/active keys here — entity views have neither), page clamping
 * and the server PageLink conversion (0-based page, explicit sort).
 */
import { describe, expect, it } from 'vitest';
import {
  parseEntityViewListUrlState,
  serializeEntityViewListUrlState,
  toEntityViewListFilter,
  toPageLink,
} from './url-state';

describe('parseEntityViewListUrlState', () => {
  it('falls back to defaults on an empty query string', () => {
    expect(parseEntityViewListUrlState('')).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
      type: undefined,
    });
  });

  it('restores filters, page and sort from a bookmarked URL', () => {
    const state = parseEntityViewListUrlState(
      '?page=3&pageSize=20&sortProperty=name&sortOrder=ASC&textSearch=room&type=Thermometer',
    );
    expect(state).toEqual({
      page: 3,
      pageSize: 20,
      sortProperty: 'name',
      sortDirection: 'ASC',
      textSearch: 'room',
      type: 'Thermometer',
    });
  });

  it('clamps hostile page and pageSize values', () => {
    const state = parseEntityViewListUrlState('?page=-2&pageSize=999');
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10);
    // Non-'ASC' values normalize to DESC (the server default).
    expect(parseEntityViewListUrlState('?sortOrder=BOGUS').sortDirection).toBe(
      'DESC',
    );
  });
});

describe('serializeEntityViewListUrlState', () => {
  it('round-trips and omits defaults to keep URLs clean', () => {
    const parsed = parseEntityViewListUrlState(
      '?page=2&pageSize=30&type=Wall&textSearch=hall',
    );
    const serialized = serializeEntityViewListUrlState(parsed);
    expect(serialized).toBe('page=2&pageSize=30&textSearch=hall&type=Wall');
    expect(parseEntityViewListUrlState(`?${serialized}`)).toEqual(parsed);
  });

  it('serializes the default state to an empty string', () => {
    expect(
      serializeEntityViewListUrlState(parseEntityViewListUrlState('')),
    ).toBe('');
  });
});

describe('server conversion', () => {
  it('builds a 0-based PageLink with an explicit sort', () => {
    expect(
      toPageLink({
        page: 4,
        pageSize: 20,
        sortProperty: 'name',
        sortDirection: 'ASC',
        textSearch: ' room ',
        type: undefined,
      }),
    ).toEqual({
      page: 3,
      pageSize: 20,
      textSearch: 'room',
      sortOrder: { property: 'name', direction: 'ASC' },
    });
  });

  it('passes the type filter through (empty string dropped)', () => {
    expect(toEntityViewListFilter({ type: 'Thermometer' })).toEqual({
      type: 'Thermometer',
    });
    expect(toEntityViewListFilter({ type: '' })).toEqual({ type: undefined });
  });
});
