/**
 * Sent-list URL state (js-library/recipients url-state 范式): page/pageSize/
 * sort in the URL; defaults never serialize. No textSearch — the sent list
 * has no search box (ui-ngx sent-table-config searchEnabled=false).
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

export const SENT_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
} as const;

/** react-query root for the sent-request list (list page + wizard share it). */
export const SENT_REQUESTS_QUERY_KEY = ['notifications', 'requests'] as const;

export interface SentUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
}

export const SENT_DEFAULT_STATE: SentUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value)
    ? value
    : SENT_DEFAULT_STATE.pageSize;
}

function clampPage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

export function parseSentUrlState(search: string): SentUrlState {
  const params = new URLSearchParams(search);
  return {
    page: clampPage(params.get(SENT_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(SENT_URL_KEYS.pageSize)),
    sortProperty:
      params.get(SENT_URL_KEYS.sortProperty) ?? SENT_DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(SENT_URL_KEYS.sortDirection) === 'ASC'
        ? 'ASC'
        : SENT_DEFAULT_STATE.sortDirection,
  };
}

export function serializeSentUrlState(state: SentUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== SENT_DEFAULT_STATE.page) {
    params.set(SENT_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== SENT_DEFAULT_STATE.pageSize) {
    params.set(SENT_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== SENT_DEFAULT_STATE.sortProperty) {
    params.set(SENT_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== SENT_DEFAULT_STATE.sortDirection) {
    params.set(SENT_URL_KEYS.sortDirection, state.sortDirection);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toSentPageLink(state: SentUrlState): PageLink {
  return {
    pageSize: state.pageSize,
    page: state.page - 1,
    sortOrder: {
      property: state.sortProperty,
      direction: state.sortDirection,
    },
  };
}

/**
 * URL-backed state hook (recipients parity): history.replaceState writes,
 * popstate re-reads.
 */
export function useSentUrlState(): {
  state: SentUrlState;
  patch: (partial: Partial<SentUrlState>) => void;
} {
  const [state, setState] = useState<SentUrlState>(() =>
    parseSentUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseSentUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<SentUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeSentUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
