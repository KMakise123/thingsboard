/**
 * Global alarms data channel (spec 3.6): AlarmData WS subscriptions with an
 * entityType filter — the global page has no single entity, so the
 * singleEntity filter the entity tabs use cannot apply.
 *
 * Technical decision (the entityFilter question): the backend AlarmDataQuery
 * has no "all my entities" filter and REST /v2/alarms cannot stream, so the
 * page runs TWO subscriptions — EntityTypeFilter(DEVICE) and
 * EntityTypeFilter(ASSET) — and merges the buffers client-side (dedupe by
 * alarm id, sort createdTime desc). A single DEVICE channel would hide asset
 * alarms (assets carry first-class alarm rules in this fork), and a third
 * ENTITY_VIEW channel buys nothing for v1 (entity views mirror device
 * telemetry; they are not alarm targets in scope) at the cost of WS budget.
 *
 * Contract pins (verified against TbAlarmDataSubCtx during M1): sort key
 * must be ALARM_FIELD createdTime, pageLink.timeWindow must be a positive
 * number, latestValues must be an array. searchPropagatedAlarms only exists
 * on this WS page link (the REST seed endpoint has no such parameter).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ALARM_FIELDS,
  ENTITY_FIELDS,
} from '@/components/entities/detail/use-alarm-data-subscription';
import { getDefaultWsManager } from '@/core/ws/hooks';
import type { WsStatus } from '@/core/ws/manager';
import type { AlarmSearchStatus } from '@/services/tb/alarm';
import { type AlarmData, type AlarmSeverity, EntityType } from '@/types/tb';

/** Full filter shape of the WS AlarmDataQuery page link (spec 3.6 set). */
export interface GlobalAlarmFilter {
  statusList: Array<AlarmSearchStatus>;
  severityList: Array<AlarmSeverity>;
  typeList: Array<string>;
  assigneeId?: string;
  searchPropagatedAlarms: boolean;
  textSearch?: string;
  /** Preset realtime window; undefined = for-all-time. */
  timeWindowMs?: number;
}

/** Backend needs a positive timeWindow; "for all time" uses a 20y window. */
export const ALL_TIME_WINDOW_MS = 20 * 365 * 24 * 60 * 60 * 1000;

/** Entity types streamed as alarm originators for the global page. */
export const ALARM_CHANNEL_ENTITY_TYPES: Array<EntityType> = [
  EntityType.DEVICE,
  EntityType.ASSET,
];

export function buildGlobalAlarmDataQuery(
  entityType: EntityType,
  filter: GlobalAlarmFilter,
  options: { pageSize?: number } = {},
): Record<string, unknown> {
  const pageLink: Record<string, unknown> = {
    pageSize: options.pageSize ?? 100,
    page: 0,
    sortOrder: {
      key: { type: 'ALARM_FIELD', key: 'createdTime' },
      direction: 'DESC',
    },
    timeWindow: filter.timeWindowMs ?? ALL_TIME_WINDOW_MS,
    searchPropagatedAlarms: filter.searchPropagatedAlarms,
  };
  if (filter.textSearch) {
    pageLink.textSearch = filter.textSearch;
  }
  if (filter.typeList.length) {
    pageLink.typeList = filter.typeList;
  }
  if (filter.statusList.length) {
    pageLink.statusList = filter.statusList;
  }
  if (filter.severityList.length) {
    pageLink.severityList = filter.severityList;
  }
  if (filter.assigneeId) {
    pageLink.assigneeId = filter.assigneeId;
  }
  return {
    entityFilter: { type: 'entityType', entityType },
    pageLink,
    entityFields: ENTITY_FIELDS,
    alarmFields: ALARM_FIELDS,
    latestValues: [],
  };
}

/** Merge the per-type channel buffers: dedupe by alarm id, newest first. */
export function mergeAlarmChannels(buffers: Array<AlarmData[]>): AlarmData[] {
  const byId = new Map<string, AlarmData>();
  for (const buffer of buffers) {
    for (const row of buffer) {
      byId.set(row.id.id, row);
    }
  }
  return [...byId.values()].sort((a, b) => b.createdTime - a.createdTime);
}

/** Worst-of statuses: auth-error / reconnecting / connecting win over open. */
function mergeStatuses(statuses: Array<WsStatus>): WsStatus {
  if (statuses.includes('auth-error')) {
    return 'auth-error';
  }
  if (statuses.includes('reconnecting')) {
    return 'reconnecting';
  }
  if (statuses.some((status) => status !== 'open')) {
    return 'connecting';
  }
  return 'open';
}

export interface GlobalAlarmSubscriptionResult {
  rows: AlarmData[];
  status: WsStatus;
}

/**
 * Primitive filter key: the query objects (and with them the WS
 * subscriptions) only rebuild when a filter value actually changes.
 */
function filterToKey(filter: GlobalAlarmFilter): string {
  return [
    filter.statusList.join(','),
    filter.severityList.join(','),
    filter.typeList.join(','),
    filter.assigneeId ?? '',
    filter.searchPropagatedAlarms ? '1' : '0',
    filter.textSearch ?? '',
    filter.timeWindowMs?.toString() ?? 'all',
  ].join('|');
}

export function useGlobalAlarmData(params: {
  filter: GlobalAlarmFilter;
  pageSize?: number;
  /** REST /v2/alarms snapshot shown until the first WS snapshots arrive. */
  seed?: AlarmData[];
}): GlobalAlarmSubscriptionResult {
  const { pageSize, seed } = params;
  const manager = getDefaultWsManager();
  const filterKey = filterToKey(params.filter);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the primitive filterKey covers every field of params.filter
  const queries = useMemo(
    () =>
      ALARM_CHANNEL_ENTITY_TYPES.map((entityType) =>
        buildGlobalAlarmDataQuery(entityType, params.filter, { pageSize }),
      ),
    [filterKey, pageSize],
  );

  // seed rides along like the entity-tab hook: a refetch replaces the seed
  // and re-issues the subscription (buffers are replaced by the next
  // snapshot anyway).
  const subscriptions = useMemo(
    () => queries.map((query) => manager.subscribeAlarmData({ query, seed })),
    [manager, queries, seed],
  );

  useEffect(
    () => () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    },
    [subscriptions],
  );

  // Plain state fed from the subscription listeners: the merged rows/status
  // identity changes only when a channel pushes or the socket status flips.
  // (Merging inside a getSnapshot would return a fresh array per render and
  // loop React.)
  const [result, setResult] = useState<{
    rows: Array<AlarmData>;
    status: WsStatus;
  }>({ rows: [], status: 'idle' });

  useEffect(() => {
    const update = () => {
      setResult({
        rows: mergeAlarmChannels(
          subscriptions.map((subscription) => subscription.getSnapshot()),
        ),
        status: mergeStatuses(
          subscriptions.map((subscription) => subscription.getStatus()),
        ),
      });
    };
    update();
    const disposers = subscriptions.map((subscription) =>
      subscription.subscribe(update),
    );
    return () => {
      for (const dispose of disposers) {
        dispose();
      }
    };
  }, [subscriptions]);

  return result;
}
