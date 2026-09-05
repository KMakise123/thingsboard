/**
 * OTA packages list URL state (js-library url-state 范式): page/pageSize/
 * sort/textSearch ride the URL. There is deliberately NO type filter in the
 * URL (nor in the UI) — type is display-only on this page (spec §5.5 「无」
 * list). The default sort is explicit createdTime DESC because the backend
 * default is `id ASC` with no time meaning.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

export const OTA_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
} as const;

/**
 * Table column key -> sortable server property. Matches the backend sort
 * whitelist on GET /api/otaPackages (OtaPackageController).
 */
export const OTA_SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
  version: 'version',
  tag: 'tag',
  type: 'type',
  url: 'url',
  fileName: 'fileName',
  dataSize: 'dataSize',
  checksum: 'checksum',
};

export interface OtaPackagesUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
}

const DEFAULT_STATE: OtaPackagesUrlState = {
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

export function parseOtaPackagesUrlState(search: string): OtaPackagesUrlState {
  const params = new URLSearchParams(search);
  const sortProperty = params.get(OTA_URL_KEYS.sortProperty);
  return {
    page: clampPage(params.get(OTA_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(OTA_URL_KEYS.pageSize)),
    sortProperty:
      sortProperty && sortProperty in OTA_SORTABLE_COLUMNS
        ? sortProperty
        : DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(OTA_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(OTA_URL_KEYS.textSearch) ?? '',
  };
}

export function serializeOtaPackagesUrlState(
  state: OtaPackagesUrlState,
): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(OTA_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(OTA_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(OTA_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(OTA_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(OTA_URL_KEYS.textSearch, state.textSearch);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: OtaPackagesUrlState): PageLink {
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
 * URL-backed state hook (js-library parity): history.replaceState writes,
 * popstate re-reads.
 */
export function useOtaPackagesUrlState(): {
  state: OtaPackagesUrlState;
  patch: (partial: Partial<OtaPackagesUrlState>) => void;
} {
  const [state, setState] = useState<OtaPackagesUrlState>(() =>
    parseOtaPackagesUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseOtaPackagesUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<OtaPackagesUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeOtaPackagesUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
