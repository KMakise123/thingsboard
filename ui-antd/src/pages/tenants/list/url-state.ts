/**
 * Tenants-list URL state: page/pageSize/sortProperty/sortOrder/textSearch
 * live in the query string so a bookmark or refresh restores them (spec
 * 3.11). Same window.history mechanics as the users list; the conversion to
 * the 0-based server PageLink happens in toPageLink().
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

/** Sort properties behind the ui-ngx tenants-table columns. */
export const TENANTS_SORT_PROPERTIES: ReadonlySet<string> = new Set([
  'createdTime',
  'title',
  'tenantProfileName',
  'email',
  'country',
  'city',
]);

export interface TenantsListUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
}

const DEFAULT_STATE: TenantsListUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

function clampPage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
}

/** Parse the bookmarkable tenant-list query string (missing keys = defaults). */
export function parseTenantsListUrlState(search: string): TenantsListUrlState {
  const params = new URLSearchParams(search);
  const sortProperty = params.get('sortProperty');
  return {
    page: clampPage(params.get('page')),
    pageSize: clampPageSize(params.get('pageSize')),
    // A hand-edited or foreign sortProperty falls back to the default instead
    // of reaching the server and failing the sort.
    sortProperty:
      sortProperty && TENANTS_SORT_PROPERTIES.has(sortProperty)
        ? sortProperty
        : DEFAULT_STATE.sortProperty,
    sortDirection: params.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get('textSearch') ?? '',
  };
}

/** Serialize to a query string, omitting default values to keep URLs clean. */
export function serializeTenantsListUrlState(
  state: TenantsListUrlState,
): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set('page', String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set('pageSize', String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set('sortProperty', state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set('sortOrder', state.sortDirection);
  }
  if (state.textSearch) {
    params.set('textSearch', state.textSearch);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: TenantsListUrlState): PageLink {
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
 * URL-backed state hook. Writes use history.replaceState (no router noise);
 * browser back/forward (popstate) re-reads the URL so navigation restores
 * filters.
 */
export function useTenantsListUrlState(): {
  state: TenantsListUrlState;
  patch: (partial: Partial<TenantsListUrlState>) => void;
} {
  const [state, setState] = useState<TenantsListUrlState>(() =>
    parseTenantsListUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseTenantsListUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<TenantsListUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeTenantsListUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
