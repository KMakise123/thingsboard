/**
 * JS-library URL state (devices/library url-state 范式): page/pageSize/
 * sort/textSearch/resourceSubType in the URL. resourceType is FIXED to
 * JS_MODULE by the page itself — never part of the URL state.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';
import { ResourceSubType } from '@/types/tb/resource';

export const JS_LIBRARY_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  resourceSubType: 'resourceSubType',
} as const;

/** The JS-library script types (ui-ngx js-resource.component.ts:46). */
export const JS_RESOURCE_SUB_TYPES: Array<ResourceSubType> = [
  ResourceSubType.EXTENSION,
  ResourceSubType.MODULE,
];

export interface JsLibraryUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  resourceSubType?: ResourceSubType;
}

const DEFAULT_STATE: JsLibraryUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  resourceSubType: undefined,
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

export function parseJsLibraryUrlState(search: string): JsLibraryUrlState {
  const params = new URLSearchParams(search);
  const subType = params.get(JS_LIBRARY_URL_KEYS.resourceSubType);
  return {
    page: clampPage(params.get(JS_LIBRARY_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(JS_LIBRARY_URL_KEYS.pageSize)),
    sortProperty:
      params.get(JS_LIBRARY_URL_KEYS.sortProperty) ??
      DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(JS_LIBRARY_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(JS_LIBRARY_URL_KEYS.textSearch) ?? '',
    resourceSubType: JS_RESOURCE_SUB_TYPES.includes(subType as ResourceSubType)
      ? (subType as ResourceSubType)
      : undefined,
  };
}

export function serializeJsLibraryUrlState(state: JsLibraryUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(JS_LIBRARY_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(JS_LIBRARY_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(JS_LIBRARY_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(JS_LIBRARY_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(JS_LIBRARY_URL_KEYS.textSearch, state.textSearch);
  }
  if (state.resourceSubType) {
    params.set(JS_LIBRARY_URL_KEYS.resourceSubType, state.resourceSubType);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: JsLibraryUrlState): PageLink {
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
export function useJsLibraryUrlState(): {
  state: JsLibraryUrlState;
  patch: (partial: Partial<JsLibraryUrlState>) => void;
} {
  const [state, setState] = useState<JsLibraryUrlState>(() =>
    parseJsLibraryUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseJsLibraryUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<JsLibraryUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeJsLibraryUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
