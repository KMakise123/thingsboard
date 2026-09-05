/**
 * Widgets-bundles list URL state (devices/list/url-state.ts 范式): page,
 * pageSize, sort and textSearch live in the URL — bookmark/refresh restores
 * them. Server pages are 0-based; UI pages are 1-based and convert in
 * toPageLink() only.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

const URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
} as const;

const DEFAULT_STATE: WidgetsBundlesUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'title',
  sortDirection: 'ASC',
  textSearch: '',
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export interface WidgetsBundlesUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
}

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
}

function clampPage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

/** Parse the bookmarkable query string (missing keys = defaults). */
export function parseWidgetsBundlesUrlState(
  search: string,
): WidgetsBundlesUrlState {
  const params = new URLSearchParams(search);
  return {
    page: clampPage(params.get(URL_KEYS.page)),
    pageSize: clampPageSize(params.get(URL_KEYS.pageSize)),
    sortProperty:
      params.get(URL_KEYS.sortProperty) ?? DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(URL_KEYS.sortDirection) === 'DESC' ? 'DESC' : 'ASC',
    textSearch: params.get(URL_KEYS.textSearch) ?? '',
  };
}

/** Serialize to a query string, omitting default values to keep URLs clean. */
export function serializeWidgetsBundlesUrlState(
  state: WidgetsBundlesUrlState,
): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(URL_KEYS.textSearch, state.textSearch);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: WidgetsBundlesUrlState): PageLink {
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
 * URL-backed state hook (replaceState writes, popstate re-reads — the
 * devices-list hook semantics, kept vitest-friendly on window.history).
 */
export function useWidgetsBundlesUrlState(): {
  state: WidgetsBundlesUrlState;
  patch: (partial: Partial<WidgetsBundlesUrlState>) => void;
} {
  const [state, setState] = useState<WidgetsBundlesUrlState>(() =>
    parseWidgetsBundlesUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseWidgetsBundlesUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<WidgetsBundlesUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeWidgetsBundlesUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
