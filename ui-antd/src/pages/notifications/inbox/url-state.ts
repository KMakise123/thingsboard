/**
 * Inbox URL state (js-library/devices url-state 范式): page/pageSize/sort/
 * textSearch/unreadOnly in the URL. unreadOnly defaults to true (ui-ngx
 * inbox parity) so the bare URL means "unread only"; toggling to all writes
 * `unreadOnly=false` explicitly and resets the filters.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

export const INBOX_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  unreadOnly: 'unreadOnly',
} as const;

export interface InboxUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  unreadOnly: boolean;
}

const DEFAULT_STATE: InboxUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  unreadOnly: true,
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

export function parseInboxUrlState(search: string): InboxUrlState {
  const params = new URLSearchParams(search);
  const unreadOnly = params.get(INBOX_URL_KEYS.unreadOnly);
  return {
    page: clampPage(params.get(INBOX_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(INBOX_URL_KEYS.pageSize)),
    sortProperty:
      params.get(INBOX_URL_KEYS.sortProperty) ?? DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(INBOX_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(INBOX_URL_KEYS.textSearch) ?? '',
    unreadOnly: unreadOnly === null ? true : unreadOnly === 'true',
  };
}

export function serializeInboxUrlState(state: InboxUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(INBOX_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(INBOX_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(INBOX_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(INBOX_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(INBOX_URL_KEYS.textSearch, state.textSearch);
  }
  if (state.unreadOnly !== DEFAULT_STATE.unreadOnly) {
    params.set(INBOX_URL_KEYS.unreadOnly, String(state.unreadOnly));
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: InboxUrlState): PageLink {
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
 * URL-backed state hook (devices/list parity): history.replaceState writes,
 * popstate re-reads.
 */
export function useInboxUrlState(): {
  state: InboxUrlState;
  patch: (partial: Partial<InboxUrlState>) => void;
} {
  const [state, setState] = useState<InboxUrlState>(() =>
    parseInboxUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseInboxUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<InboxUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeInboxUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
