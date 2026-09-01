/**
 * Customer-domain list URL state factory: page / pageSize / sort /
 * textSearch live in the query string so a bookmark or refresh restores
 * them (spec 3.11). Same window.history mechanics as the devices list
 * (pages/devices/list/url-state.ts) minus the device-specific filter keys —
 * the customer domain has no profile/active filters.
 *
 * Server pages are 0-based, UI pages 1-based; toPageLink() converts.
 */
import { useEffect, useState } from 'react';

import type { Direction, PageLink } from '@/types/tb';

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export interface ListUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
}

export interface ListUrlStateApi {
  parse: (search: string) => ListUrlState;
  serialize: (state: ListUrlState) => string;
  toPageLink: (state: ListUrlState) => PageLink;
  useListUrlState: () => {
    state: ListUrlState;
    patch: (partial: Partial<ListUrlState>) => void;
  };
}

export function createListUrlState(defaults: {
  sortProperty: string;
  sortDirection: Direction;
}): ListUrlStateApi {
  const DEFAULT_STATE: ListUrlState = {
    page: 1,
    pageSize: 10,
    sortProperty: defaults.sortProperty,
    sortDirection: defaults.sortDirection,
    textSearch: '',
  };

  function clampPage(raw: string | null): number {
    const value = Number(raw);
    return Number.isInteger(value) && value >= 1 ? value : 1;
  }

  function clampPageSize(raw: string | null): number {
    const value = Number(raw);
    return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
  }

  function parse(search: string): ListUrlState {
    const params = new URLSearchParams(search);
    return {
      page: clampPage(params.get('page')),
      pageSize: clampPageSize(params.get('pageSize')),
      sortProperty: params.get('sortProperty') ?? DEFAULT_STATE.sortProperty,
      sortDirection:
        params.get('sortOrder') === 'ASC'
          ? 'ASC'
          : params.get('sortOrder') === 'DESC'
            ? 'DESC'
            : DEFAULT_STATE.sortDirection,
      textSearch: params.get('textSearch') ?? '',
    };
  }

  function serialize(state: ListUrlState): string {
    const params = new URLSearchParams();
    if (state.page !== DEFAULT_STATE.page) {
      params.set('page', String(state.page));
    }
    if (state.pageSize !== DEFAULT_STATE.pageSize) {
      params.set('pageSize', String(state.pageSize));
    }
    if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
      params.set('sortProperty', state.sortProperty);
    }
    if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
      params.set('sortOrder', state.sortDirection);
    }
    if (state.textSearch) {
      params.set('textSearch', state.textSearch);
    }
    return params.toString();
  }

  function toPageLink(state: ListUrlState): PageLink {
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

  function useListUrlState() {
    const [state, setState] = useState<ListUrlState>(() =>
      parse(window.location.search),
    );

    useEffect(() => {
      const onPopState = () => {
        setState(parse(window.location.search));
      };
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const patch = (partial: Partial<ListUrlState>) => {
      setState((previous) => {
        const next = { ...previous, ...partial };
        const query = serialize(next);
        const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
        window.history.replaceState(window.history.state, '', url);
        return next;
      });
    };

    return { state, patch };
  }

  return { parse, serialize, toPageLink, useListUrlState };
}
