/**
 * Asset-profile-list URL state (device-profile list pattern, domain keys
 * swapped): page/pageSize/sortOrder/textSearch live in the URL so a refresh
 * or bookmark restores filters AND page. Server pages are 0-based, UI pages
 * 1-based — the conversion happens in toPageLink().
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

export const ASSET_PROFILE_LIST_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
} as const;

const DEFAULT_STATE: AssetProfileListUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export interface AssetProfileListUrlState {
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

/** Parse the bookmarkable asset-profile-list query string. */
export function parseAssetProfileListUrlState(
  search: string,
): AssetProfileListUrlState {
  const params = new URLSearchParams(search);
  const sortDirection =
    params.get(ASSET_PROFILE_LIST_URL_KEYS.sortDirection) === 'ASC'
      ? 'ASC'
      : 'DESC';
  return {
    page: clampPage(params.get(ASSET_PROFILE_LIST_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(ASSET_PROFILE_LIST_URL_KEYS.pageSize)),
    sortProperty:
      params.get(ASSET_PROFILE_LIST_URL_KEYS.sortProperty) ??
      DEFAULT_STATE.sortProperty,
    sortDirection,
    textSearch: params.get(ASSET_PROFILE_LIST_URL_KEYS.textSearch) ?? '',
  };
}

/** Serialize, omitting default values to keep URLs clean. */
export function serializeAssetProfileListUrlState(
  state: AssetProfileListUrlState,
): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(ASSET_PROFILE_LIST_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(ASSET_PROFILE_LIST_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(ASSET_PROFILE_LIST_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(ASSET_PROFILE_LIST_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(ASSET_PROFILE_LIST_URL_KEYS.textSearch, state.textSearch);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: AssetProfileListUrlState): PageLink {
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
 * URL-backed state hook (list-page mechanics): writes use
 * history.replaceState (no router noise); popstate re-reads the URL.
 */
export function useAssetProfileListUrlState(): {
  state: AssetProfileListUrlState;
  patch: (partial: Partial<AssetProfileListUrlState>) => void;
} {
  const [state, setState] = useState<AssetProfileListUrlState>(() =>
    parseAssetProfileListUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseAssetProfileListUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<AssetProfileListUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeAssetProfileListUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
