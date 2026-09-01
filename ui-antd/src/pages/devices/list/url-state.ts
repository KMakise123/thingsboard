/**
 * Device-list URL state: parse/serialize the bookmarkable query string and
 * keep it in sync while the user filters/pages/sorts.
 *
 * Contract (spec 3.3): page/pageSize/sortOrder/textSearch/deviceProfileId/
 * active live in the URL; a refresh or bookmark restores filters AND page.
 * Server pages are 0-based, UI pages are 1-based — the conversion happens
 * in toPageLink(), never here (state stays in UI coordinates).
 */
import { useEffect, useState } from 'react';

import type { DeviceListFilter } from '@/services/tb/device';
import type { Direction, PageLink } from '@/types/tb';

export const DEVICE_LIST_URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  deviceProfileId: 'deviceProfileId',
  active: 'active',
} as const;

const DEFAULT_STATE: DeviceListUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  deviceProfileId: undefined,
  active: undefined,
};

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export interface DeviceListUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  deviceProfileId?: string;
  /** 'true' | 'false' — string so it round-trips the URL untouched. */
  active?: 'true' | 'false';
}

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
}

function clampPage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

/** Parse the bookmarkable device-list query string (missing keys = defaults). */
export function parseDeviceListUrlState(search: string): DeviceListUrlState {
  const params = new URLSearchParams(search);
  const sortDirection =
    params.get(DEVICE_LIST_URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC';
  const active = params.get(DEVICE_LIST_URL_KEYS.active);
  return {
    page: clampPage(params.get(DEVICE_LIST_URL_KEYS.page)),
    pageSize: clampPageSize(params.get(DEVICE_LIST_URL_KEYS.pageSize)),
    sortProperty:
      params.get(DEVICE_LIST_URL_KEYS.sortProperty) ??
      DEFAULT_STATE.sortProperty,
    sortDirection,
    textSearch: params.get(DEVICE_LIST_URL_KEYS.textSearch) ?? '',
    deviceProfileId:
      params.get(DEVICE_LIST_URL_KEYS.deviceProfileId) ?? undefined,
    active: active === 'true' || active === 'false' ? active : undefined,
  };
}

/** Serialize to a query string, omitting default values to keep URLs clean. */
export function serializeDeviceListUrlState(state: DeviceListUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set(DEVICE_LIST_URL_KEYS.page, String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set(DEVICE_LIST_URL_KEYS.pageSize, String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set(DEVICE_LIST_URL_KEYS.sortProperty, state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set(DEVICE_LIST_URL_KEYS.sortDirection, state.sortDirection);
  }
  if (state.textSearch) {
    params.set(DEVICE_LIST_URL_KEYS.textSearch, state.textSearch);
  }
  if (state.deviceProfileId) {
    params.set(DEVICE_LIST_URL_KEYS.deviceProfileId, state.deviceProfileId);
  }
  if (state.active) {
    params.set(DEVICE_LIST_URL_KEYS.active, state.active);
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort) + list filter from URL state. */
export function toPageLink(state: DeviceListUrlState): PageLink {
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

export function toDeviceListFilter(
  state: DeviceListUrlState,
): DeviceListFilter {
  return {
    deviceProfileId: state.deviceProfileId || undefined,
    active: state.active === undefined ? undefined : state.active === 'true',
  };
}

/**
 * URL-backed state hook. Writes use history.replaceState (no router noise);
 * browser back/forward (popstate) re-reads the URL so navigation restores
 * filters. Plain window.history keeps this vitest-friendly — umi's router
 * reads window.location at navigation time, so the two never diverge.
 */
export function useDeviceListUrlState(): {
  state: DeviceListUrlState;
  patch: (partial: Partial<DeviceListUrlState>) => void;
} {
  const [state, setState] = useState<DeviceListUrlState>(() =>
    parseDeviceListUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseDeviceListUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<DeviceListUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeDeviceListUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
