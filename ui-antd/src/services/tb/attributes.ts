/**
 * Attribute / telemetry transport (handwritten).
 *
 * Base paths (V2 plugin-telemetry surface, entity-typed):
 *   GET    /api/plugins/telemetry/{entityType}/{entityId}/values/attributes[/{scope}]
 *   POST   /api/plugins/telemetry/{entityType}/{entityId}/{scope}
 *   DELETE /api/plugins/telemetry/{entityType}/{entityId}/{scope}
 *   GET    /api/plugins/telemetry/{entityType}/{entityId}/values/timeseries
 *          (no startTs/endTs → latest values; with range → history variant)
 *
 * Key filters use the comma-separated `keys` query param everywhere.
 */

import type { QueryParams } from '@/core/http/client';
import type {
  AggregationType,
  AttributeData,
  AttributeScope,
  EntityId,
  TimeseriesData,
} from '@/types/tb';

import { tbHttp } from './http';

function base(entityId: EntityId): string {
  return `/api/plugins/telemetry/${entityId.entityType}/${entityId.id}`;
}

/**
 * Keys filter as the backend's documented comma-separated `keys` param.
 * (NOT the repeatable `key` param: a single joined value there is treated as
 * ONE key — TelemetryController.getKeys splits only `keys`.)
 */
function keysParam(keys?: Array<string>): string | undefined {
  return keys?.length ? keys.join(',') : undefined;
}

/** GET .../values/attributes[/{scope}]?keys=... — scope omitted reads all. */
export async function getAttributes(
  entityId: EntityId,
  scope?: AttributeScope,
  keys?: Array<string>,
): Promise<Array<AttributeData>> {
  const path = scope
    ? `${base(entityId)}/values/attributes/${scope}`
    : `${base(entityId)}/values/attributes`;
  return tbHttp.get<Array<AttributeData>>(path, { keys: keysParam(keys) });
}

/**
 * POST .../{scope} — body is a {key: value} map (ui-ngx semantics: entries
 * with null value are DELETEd in the same logical save).
 */
export async function saveEntityAttributes(
  entityId: EntityId,
  scope: AttributeScope,
  attributes: Array<AttributeData>,
): Promise<void> {
  const toSave: Record<string, unknown> = {};
  const toDelete: Array<AttributeData> = [];
  for (const attribute of attributes) {
    if (attribute.value === null || attribute.value === undefined) {
      toDelete.push(attribute);
    } else {
      toSave[attribute.key] = attribute.value;
    }
  }
  const operations: Array<Promise<unknown>> = [];
  if (Object.keys(toSave).length > 0) {
    operations.push(tbHttp.post(`${base(entityId)}/${scope}`, toSave));
  }
  if (toDelete.length > 0) {
    operations.push(deleteEntityAttributes(entityId, scope, toDelete.map((a) => a.key)));
  }
  await Promise.all(operations);
}

/** DELETE .../{scope}?keys=k1,k2 — same comma-separated param as the reads. */
export async function deleteEntityAttributes(
  entityId: EntityId,
  scope: AttributeScope,
  keys: Array<string>,
): Promise<void> {
  await tbHttp.delete(`${base(entityId)}/${scope}`, {
    keys: keys.join(','),
  });
}

/** GET .../values/timeseries (no range) — latest telemetry snapshot. */
export async function getLatestTelemetry(
  entityId: EntityId,
  keys?: Array<string>,
): Promise<TimeseriesData> {
  return tbHttp.get<TimeseriesData>(`${base(entityId)}/values/timeseries`, {
    keys: keysParam(keys),
  });
}

export interface TimeseriesQuery {
  keys: Array<string>;
  /** ms epoch, inclusive. */
  startTs: number;
  endTs: number;
  limit?: number;
  agg?: AggregationType;
  /** Aggregation interval, ms. */
  interval?: number;
  orderBy?: 'ASC' | 'DESC';
  useStrictDataTypes?: boolean;
}

/**
 * GET .../values/timeseries?startTs=&endTs=... — history read. Same path as
 * the latest read: the backend maps the startTs/endTs params variant to the
 * history handler (TelemetryController getTimeseries).
 */
export async function getTimeseries(
  entityId: EntityId,
  query: TimeseriesQuery,
): Promise<TimeseriesData> {
  const params: QueryParams = {
    keys: query.keys.join(','),
    startTs: query.startTs,
    endTs: query.endTs,
    limit: query.limit,
    agg: query.agg,
    interval: query.interval,
    orderBy: query.orderBy,
    useStrictDataTypes: query.useStrictDataTypes,
  };
  return tbHttp.get<TimeseriesData>(`${base(entityId)}/values/timeseries`, params);
}
