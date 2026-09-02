/**
 * useEntityTimeseries — the widget timeseries data hook (brief §1.8).
 *
 * One WS subscription per entityList group: realtime windows stream via
 * tsCmd, history windows read once via historyCmd; optional latest-value
 * columns (chart thresholds) ride the same cmd through latestCmd. The
 * 10-cmd frame budget is enforced by the manager, not here.
 *
 * Rows are keyed per group and concatenated; a group re-resolving (alias
 * change / state entity swap) resubscribes only that group's effect.
 * Status changes arrive through the same listener channel (the manager
 * notifies on both snapshot and status transitions).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ResolvedEntity } from '@/core/dashboard/alias-resolver';
import {
  type ResolvedTimewindow,
  resolveTimewindow,
} from '@/core/dashboard/timewindow';
import {
  type EntityTimeseriesRow,
  getDefaultWsManager,
  type WsStatus,
} from '@/core/ws';
import type { Timewindow } from '@/types/tb/timewindow';
import { toEntityListFilters, WIDGET_ENTITY_PAGE_SIZE } from './entity-filter';

/** Latest-value columns requested beside the timeseries keys. */
export interface LatestKeyRef {
  type: string;
  key: string;
}

export interface EntityTimeseriesRequest {
  /** alias-expanded entities across ALL datasources of the widget. */
  entities: Array<ResolvedEntity>;
  timeseriesKeys: Array<string>;
  latestKeys?: Array<LatestKeyRef>;
  effectiveTimewindow: Timewindow;
}

export interface EntityTimeseriesResult {
  rows: Array<EntityTimeseriesRow>;
  status: WsStatus;
  /** resolved window (realtime bounds/agg) the subscription was built from. */
  window: ResolvedTimewindow;
}

/**
 * Build the ts/history cmd payload pair for a resolved window. Exported for
 * the widgets' tests + the timeseries table (same channel).
 */
export function buildTsCmdPayload(
  window: ResolvedTimewindow,
  keys: Array<string>,
) {
  const limit = window.limit ?? 25_000;
  const base = {
    keys,
    intervalType: 'MILLISECONDS' as const,
    interval: window.aggIntervalMs ?? 0,
    limit,
    agg: window.aggType as string,
  };
  if (window.tab === 'HISTORY') {
    return {
      historyCmd: { ...base, startTs: window.startTs, endTs: window.endTs },
      tsCmd: undefined,
    };
  }
  return {
    historyCmd: undefined,
    tsCmd: {
      ...base,
      startTs: window.startTs,
      timeWindow: window.endTs - window.startTs,
    },
  };
}

export function useEntityTimeseries(
  request: EntityTimeseriesRequest,
): EntityTimeseriesResult {
  const manager = getDefaultWsManager();
  const { entities, timeseriesKeys, latestKeys } = request;

  const window = useMemo<ResolvedTimewindow>(
    () => resolveTimewindow(request.effectiveTimewindow),
    // the timewindow object identity flips on every toolbar edit — that is
    // exactly when the subscription must be rebuilt
    [request.effectiveTimewindow],
  );

  const groups = useMemo(() => toEntityListFilters(entities), [entities]);

  const keysKey = timeseriesKeys.join(',');
  const latestKey =
    latestKeys?.map((k) => `${k.type}:${k.key}`).join(',') ?? '';

  const [rows, setRows] = useState<Array<EntityTimeseriesRow>>([]);
  const [status, setStatus] = useState<WsStatus>('idle');
  const buffers = useRef<Array<Array<EntityTimeseriesRow>>>([]);

  useEffect(() => {
    if (groups.length === 0 || timeseriesKeys.length === 0) {
      buffers.current = [];
      setRows([]);
      setStatus('idle');
      return;
    }
    buffers.current = groups.map(() => []);
    setRows([]);
    const { tsCmd, historyCmd } = buildTsCmdPayload(window, timeseriesKeys);
    const latestCmd = latestKeys?.length
      ? { keys: latestKeys.map((k) => ({ type: k.type, key: k.key })) }
      : undefined;

    const subscriptions = groups.map((group) =>
      manager.subscribeEntityTimeseries({
        query: {
          entityFilter: group as unknown as Record<string, unknown>,
          pageLink: { pageSize: WIDGET_ENTITY_PAGE_SIZE, page: 0 },
        },
        tsCmd,
        historyCmd,
        latestCmd,
      }),
    );

    const publish = () => {
      setRows([...buffers.current.flat()]);
      setStatus(combineStatus(subscriptions.map((s) => s.getStatus())));
    };
    const disposers = subscriptions.map((subscription, index) =>
      subscription.subscribe(() => {
        buffers.current[index] = subscription.getSnapshot();
        publish();
      }),
    );

    return () => {
      for (const dispose of disposers) {
        dispose();
      }
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: keysKey/latestKey are the stable projections of the key arrays
  }, [manager, groups, keysKey, latestKey, window]);

  return { rows, status, window };
}

function combineStatus(statuses: Array<WsStatus>): WsStatus {
  if (statuses.some((s) => s === 'auth-error')) {
    return 'auth-error';
  }
  if (statuses.some((s) => s === 'reconnecting')) {
    return 'reconnecting';
  }
  if (statuses.every((s) => s === 'open')) {
    return 'open';
  }
  return statuses[0] ?? 'idle';
}
