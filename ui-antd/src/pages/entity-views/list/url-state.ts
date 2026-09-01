/**
 * Entity-view list URL state: parse/serialize the bookmarkable query string
 * and keep it in sync while the user filters/pages/sorts.
 *
 * Contract (spec 3.11 bookmark restore; ui-ngx entity-views-table): page/
 * pageSize/sortOrder/textSearch/type live in the URL. Entity views have no
 * profile and no active concept — the only domain filter is the free-tag
 * `type` (ui-ngx entityViewType from the table header). Server pages are
 * 0-based, UI pages 1-based; the conversion happens in toPageLink().
 */
import { useEffect, useState } from 'react';

import type { EntityViewListFilter } from '@/services/tb/entity-view';
import type { Direction, PageLink } from '@/types/tb';

export const ENTITY_VIEW_LIST_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  type: 'type',
} as const;

const DEFAULT_STATE: EntityViewListUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  type: undefined,
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export interface EntityViewListUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  /** Entity-view type name (free tag, ui-ngx entityViewType). */
  type?: string;
}

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
}

function clampPage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

/** Parse the bookmarkable entity-view list query string. */
export function parseEntityViewListUrlState(
  search: string,
): EntityViewListUrlState {
  const params = new URLSearchParams(search);
  const sortDirection =
    params.get(ENTITY_VIEW_LIST_URL_KEYS.sortDirection) === 'ASC'
      ? 'ASC'
      : 'DESC';
  return {
    page: clampPage(params.get(ENTITY_VIEW_LIST_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(ENTITY_VIEW_LIST_URL_KEYS.pageSize)),
    sortProperty:
      params.get(ENTITY_VIEW_LIST_URL_KEYS.sortProperty) ??
      DEFAULT_STATE.sortProperty,
    sortDirection,
    textSearch: params.get(ENTITY_VIEW_LIST_URL_KEYS.textSearch) ?? '',
    type: params.get(ENTITY_VIEW_LIST_URL_KEYS.type) ?? undefined,
  };
}

/** Serialize to a query string, omitting defaults to keep URLs clean. */
export function serializeEntityViewListUrlState(
  state: EntityViewListUrlState,
): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(ENTITY_VIEW_LIST_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(ENTITY_VIEW_LIST_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(ENTITY_VIEW_LIST_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(ENTITY_VIEW_LIST_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(ENTITY_VIEW_LIST_URL_KEYS.textSearch, state.textSearch);
  }
  if (state.type) {
    params.set(ENTITY_VIEW_LIST_URL_KEYS.type, state.type);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: EntityViewListUrlState): PageLink {
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

export function toEntityViewListFilter(state: {
  type?: string;
}): EntityViewListFilter {
  return { type: state.type || undefined };
}

/**
 * URL-backed state hook. Writes use history.replaceState (no router noise);
 * browser back/forward (popstate) re-reads the URL. Same window.history
 * approach as the device list (vitest-friendly, umi reads location at
 * navigation time so the two never diverge).
 */
export function useEntityViewListUrlState(): {
  state: EntityViewListUrlState;
  patch: (partial: Partial<EntityViewListUrlState>) => void;
} {
  const [state, setState] = useState<EntityViewListUrlState>(() =>
    parseEntityViewListUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseEntityViewListUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<EntityViewListUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeEntityViewListUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
