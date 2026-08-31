/**
 * Telemetry / attribute types (handwritten, authoritative).
 *
 * Base: ui-ngx shared/models/telemetry/telemetry.models.ts +
 * attribute/base-attribute-data.ts, cross-checked against openapi
 * AttributeData / AttributesEntityView schemas.
 */

import type { EpochMillis } from './entity';

/** Attribute scopes — REST path segment and WS subscription discriminator. */
export enum AttributeScope {
  CLIENT_SCOPE = 'CLIENT_SCOPE',
  SERVER_SCOPE = 'SERVER_SCOPE',
  SHARED_SCOPE = 'SHARED_SCOPE',
}

/** Sentinel scope for latest-telemetry reads (`LATEST_TELEMETRY`). */
export enum LatestTelemetry {
  LATEST_TELEMETRY = 'LATEST_TELEMETRY',
}

/** Any scope usable against telemetry read endpoints. */
export type TelemetryScope = LatestTelemetry | AttributeScope;

/** Aggregation functions accepted by history queries (REST + WS). */
export enum AggregationType {
  MIN = 'MIN',
  MAX = 'MAX',
  AVG = 'AVG',
  SUM = 'SUM',
  COUNT = 'COUNT',
  NONE = 'NONE',
}

/**
 * A single key/value cell (REST attribute reads).
 * `value` is server-typed: string | number | boolean | parsed JSON.
 */
export interface AttributeData {
  key: string;
  value: unknown;
  /** ms since epoch of last write. */
  lastUpdateTs?: EpochMillis;
}

/** TS alias: widget layer calls this KvEntry; same shape as AttributeData. */
export type KvEntry = AttributeData;

/** WS/REST timeseries point — value is always string on the wire. */
export interface TsValue {
  ts: EpochMillis;
  value: string;
  count?: number;
}

/** REST history read: key → points. */
export type TimeseriesData = Record<string, Array<TsValue>>;

/** WS `SubscriptionUpdate.data` shape: key → [ts, value] tuples. */
export type SubscriptionDataEntry = [EpochMillis, unknown, number?];
export type SubscriptionData = Record<string, Array<SubscriptionDataEntry>>;
