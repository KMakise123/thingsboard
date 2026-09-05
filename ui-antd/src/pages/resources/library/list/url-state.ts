/**
 * Resources-library URL state (devices/list/url-state.ts 范式): page/page
 * size/sort/textSearch/resourceType live in the URL so refresh/bookmark
 * restores everything, including the type filter (ui-ngx
 * resources-table-header parity). Server pages stay 0-based; the UI keeps
 * 1-based coordinates and converts in toPageLink().
 */
import { useEffect, useState } from 'react';
import type { Direction, PageLink } from '@/types/tb';
import { type ResourceListFilter, ResourceType } from '@/types/tb/resource';

export const LIBRARY_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  resourceType: 'resourceType',
} as const;

/** The file-library filter set (ui-ngx resources-table-header.component.ts:32). */
export const LIBRARY_RESOURCE_TYPES: Array<ResourceType> = [
  ResourceType.LWM2M_MODEL,
  ResourceType.PKCS_12,
  ResourceType.JKS,
  ResourceType.GENERAL,
];

export interface LibraryUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  resourceType?: ResourceType;
}

const DEFAULT_STATE: LibraryUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  resourceType: undefined,
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

export function parseLibraryUrlState(search: string): LibraryUrlState {
  const params = new URLSearchParams(search);
  const resourceType = params.get(LIBRARY_URL_KEYS.resourceType);
  return {
    page: clampPage(params.get(LIBRARY_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(LIBRARY_URL_KEYS.pageSize)),
    sortProperty:
      params.get(LIBRARY_URL_KEYS.sortProperty) ?? DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(LIBRARY_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(LIBRARY_URL_KEYS.textSearch) ?? '',
    resourceType: LIBRARY_RESOURCE_TYPES.includes(resourceType as ResourceType)
      ? (resourceType as ResourceType)
      : undefined,
  };
}

export function serializeLibraryUrlState(state: LibraryUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(LIBRARY_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(LIBRARY_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(LIBRARY_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(LIBRARY_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(LIBRARY_URL_KEYS.textSearch, state.textSearch);
  }
  if (state.resourceType) {
    params.set(LIBRARY_URL_KEYS.resourceType, state.resourceType);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: LibraryUrlState): PageLink {
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

export function toLibraryFilter(state: LibraryUrlState): ResourceListFilter {
  return { resourceType: state.resourceType || undefined };
}

/**
 * URL-backed state hook (devices/list parity): writes go through
 * history.replaceState; popstate re-reads the URL.
 */
export function useLibraryUrlState(): {
  state: LibraryUrlState;
  patch: (partial: Partial<LibraryUrlState>) => void;
} {
  const [state, setState] = useState<LibraryUrlState>(() =>
    parseLibraryUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseLibraryUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<LibraryUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeLibraryUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
