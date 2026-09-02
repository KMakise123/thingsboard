/**
 * Dashboard timewindow pure logic (brief §1.6).
 *
 * Presets = ui-ngx time.models.ts defaultTimeIntervals (:1211-1337), all 25
 * "last X" entries. Quick-interval calendar presets and timezone selection
 * are v1 non-goals (registered omissions); unknown wire shapes fall back to
 * the dashboard default rather than crashing.
 *
 * Auto-refresh semantics (already-decided cut): realtime windows are WS
 * streaming subscriptions — there is no explicit auto-refresh interval
 * preset, matching ui-ngx CE.
 */

import { AggregationType } from '@/types/tb/telemetry';
import {
  createDefaultDashboardTimewindow,
  normalizeTimewindowTab,
  type Timewindow,
} from '@/types/tb/timewindow';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export interface DashboardTimewindowPreset {
  id: string;
  /** Window length in ms. */
  ms: number;
  labelKey: string;
  defaultMessage: string;
}

/** ui-ngx defaultTimeIntervals, complete (25 entries, in upstream order). */
export const TIMEWINDOW_PRESETS: Array<DashboardTimewindowPreset> = [
  {
    id: 's1',
    ms: SECOND,
    labelKey: 'dashboards.tw.preset.s1',
    defaultMessage: 'Last 1 second',
  },
  {
    id: 's5',
    ms: 5 * SECOND,
    labelKey: 'dashboards.tw.preset.s5',
    defaultMessage: 'Last 5 seconds',
  },
  {
    id: 's10',
    ms: 10 * SECOND,
    labelKey: 'dashboards.tw.preset.s10',
    defaultMessage: 'Last 10 seconds',
  },
  {
    id: 's15',
    ms: 15 * SECOND,
    labelKey: 'dashboards.tw.preset.s15',
    defaultMessage: 'Last 15 seconds',
  },
  {
    id: 's30',
    ms: 30 * SECOND,
    labelKey: 'dashboards.tw.preset.s30',
    defaultMessage: 'Last 30 seconds',
  },
  {
    id: 'm1',
    ms: MINUTE,
    labelKey: 'dashboards.tw.preset.m1',
    defaultMessage: 'Last 1 minute',
  },
  {
    id: 'm2',
    ms: 2 * MINUTE,
    labelKey: 'dashboards.tw.preset.m2',
    defaultMessage: 'Last 2 minutes',
  },
  {
    id: 'm5',
    ms: 5 * MINUTE,
    labelKey: 'dashboards.tw.preset.m5',
    defaultMessage: 'Last 5 minutes',
  },
  {
    id: 'm10',
    ms: 10 * MINUTE,
    labelKey: 'dashboards.tw.preset.m10',
    defaultMessage: 'Last 10 minutes',
  },
  {
    id: 'm15',
    ms: 15 * MINUTE,
    labelKey: 'dashboards.tw.preset.m15',
    defaultMessage: 'Last 15 minutes',
  },
  {
    id: 'm30',
    ms: 30 * MINUTE,
    labelKey: 'dashboards.tw.preset.m30',
    defaultMessage: 'Last 30 minutes',
  },
  {
    id: 'h1',
    ms: HOUR,
    labelKey: 'dashboards.tw.preset.h1',
    defaultMessage: 'Last 1 hour',
  },
  {
    id: 'h2',
    ms: 2 * HOUR,
    labelKey: 'dashboards.tw.preset.h2',
    defaultMessage: 'Last 2 hours',
  },
  {
    id: 'h5',
    ms: 5 * HOUR,
    labelKey: 'dashboards.tw.preset.h5',
    defaultMessage: 'Last 5 hours',
  },
  {
    id: 'h6',
    ms: 6 * HOUR,
    labelKey: 'dashboards.tw.preset.h6',
    defaultMessage: 'Last 6 hours',
  },
  {
    id: 'h8',
    ms: 8 * HOUR,
    labelKey: 'dashboards.tw.preset.h8',
    defaultMessage: 'Last 8 hours',
  },
  {
    id: 'h10',
    ms: 10 * HOUR,
    labelKey: 'dashboards.tw.preset.h10',
    defaultMessage: 'Last 10 hours',
  },
  {
    id: 'h12',
    ms: 12 * HOUR,
    labelKey: 'dashboards.tw.preset.h12',
    defaultMessage: 'Last 12 hours',
  },
  {
    id: 'd1',
    ms: DAY,
    labelKey: 'dashboards.tw.preset.d1',
    defaultMessage: 'Last 1 day',
  },
  {
    id: 'd7',
    ms: WEEK,
    labelKey: 'dashboards.tw.preset.d7',
    defaultMessage: 'Last 7 days',
  },
  {
    id: 'week',
    ms: WEEK,
    labelKey: 'dashboards.tw.preset.week',
    defaultMessage: 'Last week',
  },
  {
    id: 'weekIso',
    ms: WEEK,
    labelKey: 'dashboards.tw.preset.weekIso',
    defaultMessage: 'Last ISO week',
  },
  {
    id: 'd30',
    ms: 30 * DAY,
    labelKey: 'dashboards.tw.preset.d30',
    defaultMessage: 'Last 30 days',
  },
  {
    id: 'month',
    ms: 30 * DAY,
    labelKey: 'dashboards.tw.preset.month',
    defaultMessage: 'Last month',
  },
  {
    id: 'quarter',
    ms: 91 * DAY,
    labelKey: 'dashboards.tw.preset.quarter',
    defaultMessage: 'Last quarter',
  },
];

/**
 * Aggregation interval for binned reads: ~200 buckets over the window,
 * snapped to a "nice" step (same heuristic as the chart dialog's
 * computeAggregationInterval, kept local to avoid a cross-domain import).
 */
export function computeAggregationIntervalMs(windowMs: number): number {
  const target = Math.max(windowMs / 200, SECOND);
  const steps = [
    SECOND,
    5 * SECOND,
    10 * SECOND,
    30 * SECOND,
    MINUTE,
    5 * MINUTE,
    10 * MINUTE,
    15 * MINUTE,
    30 * MINUTE,
    HOUR,
    2 * HOUR,
    6 * HOUR,
    12 * HOUR,
    DAY,
    7 * DAY,
  ];
  for (const step of steps) {
    if (step >= target) {
      return step;
    }
  }
  return 30 * DAY;
}

/** Fully-resolved window handed to data subscriptions (W2) and the UI. */
export interface ResolvedTimewindow {
  tab: 'REALTIME' | 'HISTORY';
  /** realtime windows keep streaming (TS cmds keep pushing). */
  streaming: boolean;
  startTs: number;
  endTs: number;
  aggType: AggregationType;
  /** aggregation bucket ms; undefined for AggregationType.NONE. */
  aggIntervalMs?: number;
  /** max datapoints for aggregated reads (dashboard default 50000). */
  limit?: number;
}

/**
 * Resolve a dashboard/widget Timewindow JSON to concrete bounds + agg.
 * Unsupported wire shapes (quickInterval, FOR_ALL_TIME) degrade to the
 * default dashboard window.
 */
export function resolveTimewindow(
  tw: Timewindow | undefined,
  nowMs: number = Date.now(),
): ResolvedTimewindow {
  const effective = tw ?? createDefaultDashboardTimewindow();
  const tab = normalizeTimewindowTab(effective.selectedTab);
  const aggType = effective.aggregation?.type ?? AggregationType.NONE;
  const limit =
    typeof effective.aggregation?.limit === 'number'
      ? effective.aggregation.limit
      : undefined;

  const resolve = (startTs: number, endTs: number): ResolvedTimewindow => {
    const duration = Math.max(endTs - startTs, 1);
    return {
      tab,
      streaming: tab === 'REALTIME',
      startTs,
      endTs,
      aggType,
      aggIntervalMs:
        aggType === AggregationType.NONE
          ? undefined
          : (effective.aggregation?.interval ??
            computeAggregationIntervalMs(duration)),
      limit,
    };
  };

  if (tab === 'REALTIME') {
    // realtimeType LAST_INTERVAL only; quickInterval is not implemented (v1)
    const windowMs =
      typeof effective.realtime?.timewindowMs === 'number' &&
      effective.realtime.realtimeType !== 1
        ? effective.realtime.timewindowMs
        : HOUR;
    return resolve(nowMs - windowMs, nowMs);
  }

  const history = effective.history;
  // historyType FIXED = 1
  if (
    history?.historyType === 1 &&
    history.fixedTimewindow &&
    typeof history.fixedTimewindow.startTimeMs === 'number' &&
    typeof history.fixedTimewindow.endTimeMs === 'number'
  ) {
    return resolve(
      history.fixedTimewindow.startTimeMs,
      history.fixedTimewindow.endTimeMs,
    );
  }
  // historyType LAST_INTERVAL = 0
  if (history?.historyType === 0 && typeof history.timewindowMs === 'number') {
    return resolve(nowMs - history.timewindowMs, nowMs);
  }
  // unsupported shapes (quickInterval / FOR_ALL_TIME) → default window
  return resolve(nowMs - HOUR, nowMs);
}

/** Match a realtime window length back to a preset id ('custom' if none). */
export function presetIdForWindow(windowMs: number | undefined): string {
  if (windowMs === undefined) {
    return 'custom';
  }
  const found = TIMEWINDOW_PRESETS.find((preset) => preset.ms === windowMs);
  return found ? found.id : 'custom';
}
