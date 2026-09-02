/**
 * User-list URL state: parse/serialize the bookmarkable query string and
 * keep it in sync while the user searches/pages/sorts (same contract as the
 * device list, minus the profile/active filters users don't have).
 *
 * page/pageSize/sortProperty/sortOrder/textSearch live in the URL; a refresh
 * or bookmark restores them. Server pages are 0-based, UI pages 1-based —
 * the conversion happens in toPageLink(), never here.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

export const USERS_LIST_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
} as const;

/** Sort properties the backend accepts on GET /api/users (UserController). */
export const USERS_SORT_PROPERTIES: ReadonlySet<string> = new Set([
  'createdTime',
  'firstName',
  'lastName',
  'email',
]);

export interface UsersListUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
}

const DEFAULT_STATE: UsersListUrlState = {
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

/** Parse the bookmarkable user-list query string (missing keys = defaults). */
export function parseUsersListUrlState(search: string): UsersListUrlState {
  const params = new URLSearchParams(search);
  const sortProperty = params.get(USERS_LIST_URL_KEYS.sortProperty);
  return {
    page: clampPage(params.get(USERS_LIST_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(USERS_LIST_URL_KEYS.pageSize)),
    // A hand-edited or foreign sortProperty falls back to the default instead
    // of reaching the server and failing the sort.
    sortProperty:
      sortProperty && USERS_SORT_PROPERTIES.has(sortProperty)
        ? sortProperty
        : DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(USERS_LIST_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(USERS_LIST_URL_KEYS.textSearch) ?? '',
  };
}

/** Serialize to a query string, omitting default values to keep URLs clean. */
export function serializeUsersListUrlState(state: UsersListUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(USERS_LIST_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(USERS_LIST_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(USERS_LIST_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(USERS_LIST_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(USERS_LIST_URL_KEYS.textSearch, state.textSearch);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: UsersListUrlState): PageLink {
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
 * filters. Same window.history approach as the device list — umi's router
 * reads window.location at navigation time, so the two never diverge.
 */
export function useUsersListUrlState(): {
  state: UsersListUrlState;
  patch: (partial: Partial<UsersListUrlState>) => void;
} {
  const [state, setState] = useState<UsersListUrlState>(() =>
    parseUsersListUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseUsersListUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<UsersListUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeUsersListUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
