/**
 * Handwritten authoritative dashboard-level Timewindow wire types (M5).
 *
 * Source of truth: the six anchor dashboard JSONs (4 demo dashboards +
 * gateways_dashboard.json + api_usage.json) and
 * ui-ngx/src/app/shared/models/time/time.models.ts (:41-190).
 *
 * Wire quirk verified against anchors: the backend serializes *some* enum
 * fields as ordinals — `selectedTab: 0|1` and `realtimeType/historyType` —
 * while `aggregation.type` stays a string ("AVG"). Our types therefore accept
 * both the ordinal and the name for tab fields; `normalizeTimewindowTab()`
 * collapses them for consumers. (Brief §1.2 listed only the string form; the
 * anchors win per the "实现集 = 实查集" rule.)
 */

import { AggregationType } from './telemetry';

/** selectedTab on the wire: backend Jackson emits the ordinal, brief uses names. */
export type TimewindowTabWire = 'REALTIME' | 'HISTORY' | 0 | 1;

/** realtime.realtimeType — LAST_INTERVAL = 0, INTERVAL = 1. */
export type RealtimeWindowTypeWire = 0 | 1;

/**
 * history.historyType — LAST_INTERVAL = 0, FIXED = 1, INTERVAL = 2,
 * FOR_ALL_TIME = 3 (ui-ngx time.models.ts HistoryWindowType).
 */
export type HistoryWindowTypeWire = 0 | 1 | 2 | 3;

/** realtime tail of the timewindow JSON. */
export interface RealtimeWindow {
  realtimeType?: RealtimeWindowTypeWire;
  /** ms for LAST_INTERVAL windows. */
  timewindowMs?: number;
  /** streaming interval ms (ST cmd `interval`), defaults 5000 upstream. */
  interval?: number;
  /** calendar-aligned presets (CURRENT_DAY …); not implemented in v1 UI, passthrough only. */
  quickInterval?: string;
  [key: string]: unknown;
}

export interface FixedWindow {
  startTimeMs: number;
  endTimeMs: number;
}

/** history tail of the timewindow JSON. */
export interface HistoryWindow {
  historyType?: HistoryWindowTypeWire;
  timewindowMs?: number;
  interval?: number;
  fixedTimewindow?: FixedWindow;
  quickInterval?: string;
  [key: string]: unknown;
}

export interface TimewindowAggregation {
  type?: AggregationType;
  /** fixed aggregation interval ms; omitted => client/auto picks. */
  interval?: number;
  /** max datapoints for aggregated reads. */
  limit?: number;
  [key: string]: unknown;
}

/**
 * Dashboard/widget-level Timewindow JSON, as stored in
 * `configuration.timewindow` and `widget.config.timewindow`.
 */
export interface Timewindow {
  displayValue?: string;
  selectedTab?: TimewindowTabWire;
  realtime?: RealtimeWindow;
  history?: HistoryWindow;
  aggregation?: TimewindowAggregation;
  timezone?: string;
  hideInterval?: boolean;
  hideAggregation?: boolean;
  hideAggInterval?: boolean;
  hideTimezone?: boolean;
  [key: string]: unknown;
}

/** Collapse the wire's ordinal-or-name tab encoding to a canonical name. */
export function normalizeTimewindowTab(
  tab: TimewindowTabWire | undefined,
): 'REALTIME' | 'HISTORY' {
  return tab === 'HISTORY' || tab === 1 ? 'HISTORY' : 'REALTIME';
}

export const HOUR_MS = 3_600_000;

/**
 * Dashboard-level default timewindow (brief §1.6, aligned with
 * ui-ngx defaultTimewindow with isDashboard=true):
 * REALTIME / last 1 hour / aggregation NONE with limit 50000.
 */
export function createDefaultDashboardTimewindow(): Timewindow {
  return {
    selectedTab: 'REALTIME',
    realtime: { realtimeType: 0, timewindowMs: HOUR_MS },
    aggregation: { type: AggregationType.NONE, limit: 50000 },
  };
}
