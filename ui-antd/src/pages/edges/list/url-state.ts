/**
 * Edge instances list URL state (js-library url-state 范式): page/pageSize/
 * sort/textSearch/type ride the URL. The default sort is an explicit
 * createdTime DESC because the backend default is `id ASC` with no time
 * meaning; lists ride the edgeInfos family only (spec §5.0).
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

export const EDGE_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  type: 'type',
} as const;

/**
 * Table column key -> sortable server property (EdgeInfo fields; the public
 * column is display-only — ui-ngx marks it non-sortable, edges-table-config
 * .resolver.ts:161-166).
 */
export const EDGE_SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  type: 'type',
  label: 'label',
  customerTitle: 'customerTitle',
};

export interface EdgeListUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  /** Edge type filter (GET /api/edge/types values; undefined = all). */
  type?: string;
}

const DEFAULT_STATE: EdgeListUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
}

function clampPage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

export function parseEdgeListUrlState(search: string): EdgeListUrlState {
  const params = new URLSearchParams(search);
  const sortProperty = params.get(EDGE_URL_KEYS.sortProperty);
  const type = params.get(EDGE_URL_KEYS.type);
  return {
    page: clampPage(params.get(EDGE_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(EDGE_URL_KEYS.pageSize)),
    sortProperty:
      sortProperty && sortProperty in EDGE_SORTABLE_COLUMNS
        ? sortProperty
        : DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(EDGE_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(EDGE_URL_KEYS.textSearch) ?? '',
    type: type || undefined,
  };
}

export function serializeEdgeListUrlState(state: EdgeListUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(EDGE_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(EDGE_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(EDGE_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(EDGE_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(EDGE_URL_KEYS.textSearch, state.textSearch);
  }
  if (state.type) {
    params.set(EDGE_URL_KEYS.type, state.type);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: EdgeListUrlState): PageLink {
  const text = state.textSearch.trim();
  return {
    pageSize: state.pageSize,
    page: state.page - 1,
    textSearch: text || undefined,
    sortOrder: {
      property: state.sortProperty,
      direction: state.sortDirection,
    },
  };
}

/**
 * URL-backed state hook (js-library parity): history.replaceState writes,
 * popstate re-reads.
 */
export function useEdgeListUrlState(): {
  state: EdgeListUrlState;
  patch: (partial: Partial<EdgeListUrlState>) => void;
} {
  const [state, setState] = useState<EdgeListUrlState>(() =>
    parseEdgeListUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseEdgeListUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<EdgeListUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeEdgeListUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
