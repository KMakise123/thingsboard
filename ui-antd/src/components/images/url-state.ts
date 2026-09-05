/**
 * Image-gallery URL state (list-page url-state.ts 范式): page, pageSize,
 * sort, textSearch, view mode and the include-system toggle live in the URL
 * — bookmark/refresh restores them. Server pages are 0-based; UI pages are
 * 1-based and convert in toPageLink() only.
 *
 * The gallery is also embedded in Modals (selection mode); there the hook
 * runs URL-less (enabled=false): same state shape, no history writes, so
 * the picker never pollutes the host page's query string.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

const URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  mode: 'mode',
  includeSystemImages: 'includeSystemImages',
} as const;

const DEFAULT_STATE: ImageGalleryUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  mode: 'list',
  includeSystemImages: false,
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export type GalleryViewMode = 'list' | 'grid';

export interface ImageGalleryUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  mode: GalleryViewMode;
  includeSystemImages: boolean;
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
export function parseImageGalleryUrlState(
  search: string,
): ImageGalleryUrlState {
  const params = new URLSearchParams(search);
  return {
    page: clampPage(params.get(URL_KEYS.page)),
    pageSize: clampPageSize(params.get(URL_KEYS.pageSize)),
    sortProperty:
      params.get(URL_KEYS.sortProperty) ?? DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(URL_KEYS.textSearch) ?? '',
    mode:
      params.get(URL_KEYS.mode) === 'grid'
        ? ('grid' as const)
        : ('list' as const),
    includeSystemImages: params.get(URL_KEYS.includeSystemImages) === 'true',
  };
}

/** Serialize to a query string, omitting default values to keep URLs clean. */
export function serializeImageGalleryUrlState(
  state: ImageGalleryUrlState,
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
  if (state.mode !== DEFAULT_STATE.mode) {
    params.set(URL_KEYS.mode, state.mode);
  }
  if (state.includeSystemImages) {
    params.set(URL_KEYS.includeSystemImages, 'true');
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) from URL state. */
export function toPageLink(state: ImageGalleryUrlState): PageLink {
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
 * URL-backed state hook (replaceState writes, popstate re-reads). When
 * `enabled` is false (embedded selection form) the state starts from the
 * defaults and `patch` never touches window.history.
 */
export function useImageGalleryUrlState(enabled = true): {
  state: ImageGalleryUrlState;
  patch: (partial: Partial<ImageGalleryUrlState>) => void;
} {
  const [state, setState] = useState<ImageGalleryUrlState>(() =>
    enabled ? parseImageGalleryUrlState(window.location.search) : DEFAULT_STATE,
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const onPopState = () => {
      setState(parseImageGalleryUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [enabled]);

  const patch = (partial: Partial<ImageGalleryUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      if (enabled) {
        const query = serializeImageGalleryUrlState(next);
        const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
        window.history.replaceState(window.history.state, '', url);
      }
      return next;
    });
  };

  return { state, patch };
}
