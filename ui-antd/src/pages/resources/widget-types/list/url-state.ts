/**
 * Widget-types list URL state (devices/list/url-state.ts 范式): page,
 * pageSize, sort, textSearch and the deprecated filter live in the URL —
 * bookmark/refresh restores them. Server pages are 0-based; UI pages are
 * 1-based and convert in toPageLink() only.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

export const WIDGET_TYPES_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  deprecatedFilter: 'deprecatedFilter',
} as const;

const DEFAULT_STATE: WidgetTypesUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'name',
  sortDirection: 'ASC',
  textSearch: '',
  deprecatedFilter: 'ALL',
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];
const ALLOWED_DEPRECATED = ['ALL', 'ACTUAL', 'DEPRECATED'] as const;

export type DeprecatedFilterState = (typeof ALLOWED_DEPRECATED)[number];

export interface WidgetTypesUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  deprecatedFilter: DeprecatedFilterState;
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
export function parseWidgetTypesUrlState(search: string): WidgetTypesUrlState {
  const params = new URLSearchParams(search);
  const deprecated = params.get(WIDGET_TYPES_URL_KEYS.deprecatedFilter);
  return {
    page: clampPage(params.get(WIDGET_TYPES_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(WIDGET_TYPES_URL_KEYS.pageSize)),
    sortProperty:
      params.get(WIDGET_TYPES_URL_KEYS.sortProperty) ??
      DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(WIDGET_TYPES_URL_KEYS.sortDirection) === 'DESC'
        ? 'DESC'
        : 'ASC',
    textSearch: params.get(WIDGET_TYPES_URL_KEYS.textSearch) ?? '',
    deprecatedFilter: ALLOWED_DEPRECATED.includes(
      deprecated as DeprecatedFilterState,
    )
      ? (deprecated as DeprecatedFilterState)
      : DEFAULT_STATE.deprecatedFilter,
  };
}

/** Serialize to a query string, omitting default values to keep URLs clean. */
export function serializeWidgetTypesUrlState(
  state: WidgetTypesUrlState,
): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(WIDGET_TYPES_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(WIDGET_TYPES_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(WIDGET_TYPES_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(WIDGET_TYPES_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(WIDGET_TYPES_URL_KEYS.textSearch, state.textSearch);
  }
  if (state.deprecatedFilter !== DEFAULT_STATE.deprecatedFilter) {
    params.set(WIDGET_TYPES_URL_KEYS.deprecatedFilter, state.deprecatedFilter);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: WidgetTypesUrlState): PageLink {
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
export function useWidgetTypesUrlState(): {
  state: WidgetTypesUrlState;
  patch: (partial: Partial<WidgetTypesUrlState>) => void;
} {
  const [state, setState] = useState<WidgetTypesUrlState>(() =>
    parseWidgetTypesUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseWidgetTypesUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<WidgetTypesUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeWidgetTypesUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
