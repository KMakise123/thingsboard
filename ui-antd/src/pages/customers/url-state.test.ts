/**
 * Customer-domain URL state: the list factory (page/pageSize/sort/
 * textSearch round-trip, 0-based server conversion) and the detail tab
 * constants (default attributes, TA-only trio, serialize omission).
 */
import { describe, expect, it } from 'vitest';
import {
  DETAIL_TABS,
  isTaOnlyDetailTab,
  TA_ONLY_DETAIL_TABS,
} from './detail/url-state';
import { createListUrlState } from './list-url-state';

const listState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

describe('customer list url state', () => {
  it('parses defaults when the query string is empty', () => {
    expect(listState.parse('')).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
    });
  });

  it('restores filters, page and sort from a bookmarked URL', () => {
    expect(
      listState.parse(
        '?page=3&pageSize=50&sortProperty=title&sortOrder=ASC&textSearch=工厂',
      ),
    ).toEqual({
      page: 3,
      pageSize: 50,
      sortProperty: 'title',
      sortDirection: 'ASC',
      textSearch: '工厂',
    });
  });

  it('clamps hostile values back to defaults', () => {
    const state = listState.parse('?page=0&pageSize=17&sortOrder=WEIRD');
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10);
    expect(state.sortDirection).toBe('DESC');
  });

  it('serializes with defaults omitted to keep URLs clean', () => {
    expect(
      listState.serialize({
        page: 1,
        pageSize: 10,
        sortProperty: 'createdTime',
        sortDirection: 'DESC',
        textSearch: '',
      }),
    ).toBe('');
    expect(
      listState.serialize({
        page: 2,
        pageSize: 10,
        sortProperty: 'title',
        sortDirection: 'DESC',
        textSearch: 'a',
      }),
    ).toBe('page=2&sortProperty=title&textSearch=a');
  });

  it('converts the UI page to the 0-based server page with an explicit sort', () => {
    expect(
      listState.toPageLink({
        page: 4,
        pageSize: 20,
        sortProperty: 'title',
        sortDirection: 'ASC',
        textSearch: '  工厂  ',
      }),
    ).toEqual({
      pageSize: 20,
      page: 3,
      textSearch: '工厂',
      sortOrder: { property: 'title', direction: 'ASC' },
    });
  });
});

describe('customer detail tab url state', () => {
  it('pins the seven-tab set without a details tab', () => {
    expect(DETAIL_TABS).toHaveLength(7);
    expect(DETAIL_TABS).not.toContain('details');
    expect(DETAIL_TABS[0]).toBe('attributes');
  });

  it('marks exactly the ui-ngx TA-only trio', () => {
    expect(TA_ONLY_DETAIL_TABS).toHaveLength(3);
    expect(isTaOnlyDetailTab('alarm-rules')).toBe(true);
    expect(isTaOnlyDetailTab('audit-logs')).toBe(true);
    expect(isTaOnlyDetailTab('version-control')).toBe(true);
    expect(isTaOnlyDetailTab('attributes')).toBe(false);
    expect(isTaOnlyDetailTab('latest-telemetry')).toBe(false);
    expect(isTaOnlyDetailTab('alarms')).toBe(false);
    expect(isTaOnlyDetailTab('relations')).toBe(false);
  });
});
