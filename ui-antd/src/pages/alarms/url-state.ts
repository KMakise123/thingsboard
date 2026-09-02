/**
 * Global alarms page URL state (spec 3.6: every filter bookmarkable).
 *
 * tab/page/pageSize/all filters live in the query string; a refresh or
 * bookmark restores the exact view. Follows the asset-list pattern
 * (replaceState writes, popstate reads, UI stays 1-based).
 *
 * Sorting note: the WS AlarmData contract only supports the createdTime sort
 * key (TbAlarmDataSubCtx), and both channel buffers stream newest-first — so
 * sort is pinned to createdTime DESC and carries no URL key.
 */
import { useEffect, useState } from 'react';

import type { AlarmSearchStatus } from '@/services/tb/alarm';
import { AlarmSeverity } from '@/types/tb';

export type AlarmsTab = 'alarms' | 'alarm-rules';

export const ALARMS_TABS: ReadonlyArray<AlarmsTab> = ['alarms', 'alarm-rules'];

/** Timewindow presets (sliding windows; 'all' = for-all-time). */
export const TIMEWINDOW_PRESETS = [
  { id: '5m', ms: 5 * 60_000 },
  { id: '15m', ms: 15 * 60_000 },
  { id: '30m', ms: 30 * 60_000 },
  { id: '1h', ms: 3_600_000 },
  { id: '3h', ms: 3 * 3_600_000 },
  { id: '6h', ms: 6 * 3_600_000 },
  { id: '12h', ms: 12 * 3_600_000 },
  { id: '24h', ms: 24 * 3_600_000 },
  { id: '2d', ms: 2 * 86_400_000 },
  { id: '7d', ms: 7 * 86_400_000 },
  { id: '30d', ms: 30 * 86_400_000 },
] as const;

export type TimewindowPresetId = (typeof TIMEWINDOW_PRESETS)[number]['id'];

const ALARM_STATUSES: ReadonlyArray<AlarmSearchStatus> = [
  'ACTIVE',
  'UNACK',
  'ACK',
  'CLEARED',
];
const ALARM_SEVERITIES = Object.values(AlarmSeverity);

const ALLOWED_PAGE_SIZES = [10, 20, 30, 50, 100];

export interface AlarmsPageUrlState {
  tab: AlarmsTab;
  /** 1-based client page over the merged live buffer. */
  page: number;
  pageSize: number;
  statusList: Array<AlarmSearchStatus>;
  severityList: Array<AlarmSeverity>;
  typeList: Array<string>;
  /** 'me' = assigned to the session user. */
  assigneeId?: string;
  searchPropagatedAlarms: boolean;
  textSearch: string;
  tw: TimewindowPresetId | 'all';
}

const DEFAULT_STATE: AlarmsPageUrlState = {
  tab: 'alarms',
  page: 1,
  pageSize: 10,
  // ui-ngx alarm table default: active alarms only.
  statusList: ['ACTIVE'],
  severityList: [],
  typeList: [],
  searchPropagatedAlarms: false,
  textSearch: '',
  tw: 'all',
};

function clampPage(raw: string | null): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : DEFAULT_STATE.page;
}

function clampPageSize(raw: string | null): number {
  const value = Number(raw);
  return ALLOWED_PAGE_SIZES.includes(value) ? value : DEFAULT_STATE.pageSize;
}

function parseList(raw: string | null): Array<string> {
  return raw ? raw.split(',').filter(Boolean) : [];
}

/**
 * `?status=` missing → default [ACTIVE]; empty value → any status (the
 * filter deliberately cleared); otherwise the whitelisted subset.
 */
function parseStatusList(raw: string | null): Array<AlarmSearchStatus> {
  if (raw === null) {
    return DEFAULT_STATE.statusList;
  }
  return raw
    .split(',')
    .filter((value): value is AlarmSearchStatus =>
      (ALARM_STATUSES as ReadonlyArray<string>).includes(value),
    );
}

export function parseAlarmsPageUrlState(search: string): AlarmsPageUrlState {
  const params = new URLSearchParams(search);
  const tab = (ALARMS_TABS as ReadonlyArray<string>).includes(
    params.get('tab') ?? '',
  )
    ? (params.get('tab') as AlarmsTab)
    : DEFAULT_STATE.tab;
  const tw = params.get('tw') ?? DEFAULT_STATE.tw;
  const statusList = parseStatusList(params.get('status'));
  const severityList = parseList(params.get('severity')).filter((value) =>
    (ALARM_SEVERITIES as Array<string>).includes(value),
  ) as Array<AlarmSeverity>;
  return {
    tab,
    page: clampPage(params.get('page')),
    pageSize: clampPageSize(params.get('pageSize')),
    statusList,
    severityList,
    typeList: parseList(params.get('types')),
    assigneeId: params.get('assigneeId') || undefined,
    searchPropagatedAlarms: params.get('propagated') === '1',
    textSearch: params.get('textSearch') ?? '',
    tw: (TIMEWINDOW_PRESETS.some((preset) => preset.id === tw) ? tw : 'all') as
      | TimewindowPresetId
      | 'all',
  };
}

export function serializeAlarmsPageUrlState(state: AlarmsPageUrlState): string {
  const params = new URLSearchParams();
  if (state.tab !== DEFAULT_STATE.tab) {
    params.set('tab', state.tab);
  }
  if (state.page !== DEFAULT_STATE.page) {
    params.set('page', String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set('pageSize', String(state.pageSize));
  }
  if (state.statusList.join(',') !== DEFAULT_STATE.statusList.join(',')) {
    if (state.statusList.length) {
      params.set('status', state.statusList.join(','));
    } else {
      params.set('status', '');
    }
  }
  if (state.severityList.length) {
    params.set('severity', state.severityList.join(','));
  }
  if (state.typeList.length) {
    params.set('types', state.typeList.join(','));
  }
  if (state.assigneeId) {
    params.set('assigneeId', state.assigneeId);
  }
  if (state.searchPropagatedAlarms) {
    params.set('propagated', '1');
  }
  if (state.textSearch) {
    params.set('textSearch', state.textSearch);
  }
  if (state.tw !== DEFAULT_STATE.tw) {
    params.set('tw', state.tw);
  }
  return params.toString();
}

/**
 * URL-backed page state. Writes use history.replaceState; popstate re-reads
 * the URL so back/forward restores filters (asset-list pattern).
 */
export function useAlarmsPageUrlState(): {
  state: AlarmsPageUrlState;
  patch: (partial: Partial<AlarmsPageUrlState>) => void;
} {
  const [state, setState] = useState<AlarmsPageUrlState>(() =>
    parseAlarmsPageUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseAlarmsPageUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<AlarmsPageUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeAlarmsPageUrlState(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  };

  return { state, patch };
}
