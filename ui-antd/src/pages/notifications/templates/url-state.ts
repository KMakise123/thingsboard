/**
 * Templates URL state (recipients/js-library url-state 范式): page/pageSize/
 * sort/textSearch in the URL; defaults never serialize.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

export const TEMPLATES_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
} as const;

export interface TemplatesUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
}

export const TEMPLATES_QUERY_KEY = ['notifications', 'templates'] as const;

const DEFAULT_STATE: TemplatesUrlState = {
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

export function parseTemplatesUrlState(search: string): TemplatesUrlState {
  const params = new URLSearchParams(search);
  return {
    page: clampPage(params.get(TEMPLATES_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(TEMPLATES_URL_KEYS.pageSize)),
    sortProperty:
      params.get(TEMPLATES_URL_KEYS.sortProperty) ?? DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(TEMPLATES_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(TEMPLATES_URL_KEYS.textSearch) ?? '',
  };
}

export function serializeTemplatesUrlState(state: TemplatesUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(TEMPLATES_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(TEMPLATES_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(TEMPLATES_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(TEMPLATES_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(TEMPLATES_URL_KEYS.textSearch, state.textSearch);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: TemplatesUrlState): PageLink {
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
 * URL-backed state hook (recipients parity): history.replaceState writes,
 * popstate re-reads.
 */
export function useTemplatesUrlState(): {
  state: TemplatesUrlState;
  patch: (partial: Partial<TemplatesUrlState>) => void;
} {
  const [state, setState] = useState<TemplatesUrlState>(() =>
    parseTemplatesUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseTemplatesUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<TemplatesUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeTemplatesUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
