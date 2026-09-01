/**
 * Asset-list URL state: parse/serialize the bookmarkable query string and
 * keep it in sync while the user filters/pages/sorts (device-list pattern,
 * keys swapped for the asset domain).
 *
 * Contract (spec 3.4, device list parity): page/pageSize/sortOrder/
 * textSearch/assetProfileId live in the URL; a refresh or bookmark restores
 * filters AND page. Server pages are 0-based, UI pages are 1-based — the
 * conversion happens in toPageLink(), never here (state stays in UI
 * coordinates).
 *
 * Note: assets have NO active flag (unlike devices — AssetInfo carries no
 * online/offline concept and the assetInfos endpoints accept no `active`
 * parameter, openapi snapshot), so no state segmented here.
 */
import { useEffect, useState } from 'react';

import type { AssetListFilter } from '@/services/tb/asset';
import type { Direction, PageLink } from '@/types/tb';

export const ASSET_LIST_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  assetProfileId: 'assetProfileId',
} as const;

const DEFAULT_STATE: AssetListUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  assetProfileId: undefined,
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export interface AssetListUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  assetProfileId?: string;
}

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
}

function clampPage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

/** Parse the bookmarkable asset-list query string (missing keys = defaults). */
export function parseAssetListUrlState(search: string): AssetListUrlState {
  const params = new URLSearchParams(search);
  const sortDirection =
    params.get(ASSET_LIST_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC';
  return {
    page: clampPage(params.get(ASSET_LIST_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(ASSET_LIST_URL_KEYS.pageSize)),
    sortProperty:
      params.get(ASSET_LIST_URL_KEYS.sortProperty) ??
      DEFAULT_STATE.sortProperty,
    sortDirection,
    textSearch: params.get(ASSET_LIST_URL_KEYS.textSearch) ?? '',
    assetProfileId: params.get(ASSET_LIST_URL_KEYS.assetProfileId) ?? undefined,
  };
}

/** Serialize to a query string, omitting default values to keep URLs clean. */
export function serializeAssetListUrlState(state: AssetListUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(ASSET_LIST_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(ASSET_LIST_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(ASSET_LIST_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(ASSET_LIST_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(ASSET_LIST_URL_KEYS.textSearch, state.textSearch);
  }
  if (state.assetProfileId) {
    params.set(ASSET_LIST_URL_KEYS.assetProfileId, state.assetProfileId);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) + list filter from URL state. */
export function toPageLink(state: AssetListUrlState): PageLink {
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

export function toAssetListFilter(state: AssetListUrlState): AssetListFilter {
  return {
    assetProfileId: state.assetProfileId || undefined,
  };
}

/**
 * URL-backed state hook. Writes use history.replaceState (no router noise);
 * browser back/forward (popstate) re-reads the URL so navigation restores
 * filters. Plain window.history keeps this vitest-friendly — umi's router
 * reads window.location at navigation time, so the two never diverge.
 */
export function useAssetListUrlState(): {
  state: AssetListUrlState;
  patch: (partial: Partial<AssetListUrlState>) => void;
} {
  const [state, setState] = useState<AssetListUrlState>(() =>
    parseAssetListUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseAssetListUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<AssetListUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeAssetListUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
