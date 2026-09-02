/**
 * Audit-logs page URL state (settings domain): page/pageSize/sort/
 * textSearch + the timewindow (startTime/endTime ms) and the selected
 * actionTypes (comma-joined in the URL, expanded for the wire) all live in
 * the query string — a refresh or bookmark restores the full filter state
 * (spec 3.11 list-page contract). Same window.history approach as the
 * asset list (assets/list/url-state.ts).
 */
import { useEffect, useState } from 'react';

import type { AuditActionType } from '@/services/tb/audit-log';
import type { Direction } from '@/types/tb';

const URL_KEYS = {
  page: 'page',
  pageSize: 'pageSize',
  sortProperty: 'sortProperty',
  sortDirection: 'sortOrder',
  textSearch: 'textSearch',
  startTime: 'startTime',
  endTime: 'endTime',
  actionTypes: 'actionTypes',
} as const;

export const AUDIT_SORT_PROPERTIES = [
  'createdTime',
  'entityType',
  'entityName',
  'userName',
  'actionType',
  'actionStatus',
] as const;

/** Page sizes offered in the table (kept in sync with the other lists). */
const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
}

export interface AuditLogsUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: (typeof AUDIT_SORT_PROPERTIES)[number];
  sortDirection: Direction;
  textSearch: string;
  startTime?: number;
  endTime?: number;
  actionTypes: AuditActionType[];
}

const DEFAULT_STATE: AuditLogsUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  startTime: undefined,
  endTime: undefined,
  actionTypes: [],
};

function positiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : fallback;
}

export function parseAuditLogsUrlState(search: string): AuditLogsUrlState {
  const params = new URLSearchParams(search);
  const sortProperty = params.get(URL_KEYS.sortProperty);
  const startTime = params.get(URL_KEYS.startTime);
  const endTime = params.get(URL_KEYS.endTime);
  return {
    page: positiveInt(params.get(URL_KEYS.page), DEFAULT_STATE.page),
    pageSize: clampPageSize(params.get(URL_KEYS.pageSize)),
    sortProperty: (AUDIT_SORT_PROPERTIES as readonly string[]).includes(
      sortProperty ?? '',
    )
      ? (sortProperty as AuditLogsUrlState['sortProperty'])
      : DEFAULT_STATE.sortProperty,
    sortDirection:
      params.get(URL_KEYS.sortDirection) === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get(URL_KEYS.textSearch) ?? '',
    startTime: startTime ? positiveInt(startTime, 0) || undefined : undefined,
    endTime: endTime ? positiveInt(endTime, 0) || undefined : undefined,
    actionTypes: (params.get(URL_KEYS.actionTypes) ?? '')
      .split(',')
      .filter(Boolean) as AuditActionType[],
  };
}

export function serializeAuditLogsUrlState(state: AuditLogsUrlState): string {
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
  if (state.startTime) {
    params.set(URL_KEYS.startTime, String(state.startTime));
  }
  if (state.endTime) {
    params.set(URL_KEYS.endTime, String(state.endTime));
  }
  if (state.actionTypes.length > 0) {
    params.set(URL_KEYS.actionTypes, state.actionTypes.join(','));
  }
  return params.toString();
}

/** URL-backed state hook (replaceState writes, popstate re-reads). */
export function useAuditLogsUrlState(): {
  state: AuditLogsUrlState;
  patch: (partial: Partial<AuditLogsUrlState>) => void;
} {
  const [state, setState] = useState<AuditLogsUrlState>(() =>
    parseAuditLogsUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseAuditLogsUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<AuditLogsUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeAuditLogsUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
