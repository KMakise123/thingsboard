/**
 * Recipients URL-state unit tests: defaults never serialize, page/pageSize
 * clamp, direction normalizes, toPageLink shifts to the 0-based server page.
 */
import {
  parseRecipientsUrlState,
  serializeRecipientsUrlState,
  toPageLink,
} from './url-state';

describe('recipients url state', () => {
  it('parses defaults from an empty query', () => {
    expect(parseRecipientsUrlState('')).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
    });
  });

  it('clamps bogus page values and rejects unknown page sizes', () => {
    expect(parseRecipientsUrlState('?page=0&page-Size=33&pageSize=33')).toEqual(
      {
        page: 1,
        pageSize: 10,
        sortProperty: 'createdTime',
        sortDirection: 'DESC',
        textSearch: '',
      },
    );
    expect(parseRecipientsUrlState('?page=3&pageSize=50').page).toBe(3);
  });

  it('round-trips a non-default state without the defaults', () => {
    const state = parseRecipientsUrlState(
      '?page=2&pageSize=20&sortProperty=name&sortOrder=ASC&textSearch=ops',
    );
    expect(state).toEqual({
      page: 2,
      pageSize: 20,
      sortProperty: 'name',
      sortDirection: 'ASC',
      textSearch: 'ops',
    });
    expect(serializeRecipientsUrlState(state)).toBe(
      'page=2&pageSize=20&sortProperty=name&sortOrder=ASC&textSearch=ops',
    );
    expect(serializeRecipientsUrlState(parseRecipientsUrlState(''))).toBe('');
  });

  it('builds the 0-based server PageLink with trimmed search', () => {
    expect(toPageLink(parseRecipientsUrlState('?page=3'))).toEqual({
      pageSize: 10,
      page: 2,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(
      toPageLink(parseRecipientsUrlState('?textSearch=%20ops%20')).textSearch,
    ).toBe('ops');
  });
});
