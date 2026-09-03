/**
 * Event transport (handwritten) — device events tab.
 *
 * Base path (ui-ngx event.service parity, typed GET variant):
 *   GET /api/events/{entityType}/{entityId}/{eventType}
 *       ?tenantId=&pageSize=&page=&textSearch=&sortProperty=&sortOrder=
 *
 * M8 wave-3 D (additive): the POST /api/events/{entityType}/{entityId}
 * filter variant (ui-ngx getFilterEvents parity) + the clear endpoint,
 * used by the rule-node / rule-chain DEBUG event tables.
 */

import type { QueryParams } from '@/core/http/client';
import type { BaseData, EntityId, EntityType, PageData, PageLink } from '@/types/tb';

import { tbHttp } from './http';

/** Event types the backend addresses by path segment (ui-ngx EventType + DebugEventType). */
export type EventTypeId =
  | 'ERROR'
  | 'LC_EVENT'
  | 'STATS'
  | 'DEBUG_RULE_NODE'
  | 'DEBUG_RULE_CHAIN'
  | 'DEBUG_CALCULATED_FIELD';

/** GET /api/events/... row — `body` is the per-type JSON payload. */
export interface EventInfo
  extends BaseData<{ entityType: EntityType; id: string }> {
  tenantId?: { entityType: EntityType.TENANT; id: string };
  type: string;
  uid?: string;
  entityId?: EntityId;
  body: Record<string, unknown>;
}

/** Typed event page read. */
export async function getEvents(
  entityId: EntityId,
  tenantId: string,
  eventType: EventTypeId,
  pageLink: PageLink,
): Promise<PageData<EventInfo>> {
  const params: QueryParams = {
    tenantId,
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    sortProperty: pageLink.sortOrder?.property,
    sortOrder: pageLink.sortOrder?.direction,
  };
  return tbHttp.get<PageData<EventInfo>>(
    `/api/events/${entityId.entityType}/${entityId.id}/${eventType}`,
    params,
  );
}

// ---------------------------------------------------------------------------
// M8 wave-3 D — POST filter read + clear (rule-node / rule-chain debug tables)
// ---------------------------------------------------------------------------

/**
 * Polymorphic POST /api/events/{entityType}/{entityId} body (backend
 * `EventFilter` discriminator `eventType`; ui-ngx FilterEventBody). All
 * fields except `eventType` are optional server-side filters — the debug
 * tables send only the filters the user filled in.
 */
export interface EventFilterBody {
  eventType: EventTypeId;
  /** DebugEventFilter base fields. */
  server?: string;
  isError?: boolean;
  errorStr?: string;
  /** RuleNodeDebugEventFilter fields. */
  msgDirectionType?: 'IN' | 'OUT';
  entityId?: string;
  entityType?: string;
  msgId?: string;
  msgType?: string;
  relationType?: string;
  dataSearch?: string;
  metadataSearch?: string;
  /** RuleChainDebugEventFilter fields. */
  message?: string;
}

/** Time-bounded page link variant (backend createTimePageLink). */
export type EventPageLink = PageLink & {
  startTime?: number;
  endTime?: number;
};

function eventPageQueryParams(
  tenantId: string,
  pageLink: EventPageLink,
): QueryParams {
  const params: QueryParams = {
    tenantId,
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    // backend EventController sorts debug events by ts/id only
    sortProperty: pageLink.sortOrder?.property ?? 'createdTime',
    sortOrder: pageLink.sortOrder?.direction ?? 'DESC',
    startTime: pageLink.startTime,
    endTime: pageLink.endTime,
  };
  return params;
}

/**
 * POST /api/events/{entityType}/{entityId} — filtered page read
 * (ui-ngx getFilterEvents parity). `entityId.entityType` is RULE_NODE /
 * RULE_CHAIN for the debug tables.
 */
export async function getEventsByFilter(
  entityId: EntityId,
  tenantId: string,
  filter: EventFilterBody,
  pageLink: EventPageLink,
): Promise<PageData<EventInfo>> {
  return tbHttp.post<PageData<EventInfo>>(
    `/api/events/${entityId.entityType}/${entityId.id}`,
    { ...filter },
    eventPageQueryParams(tenantId, pageLink),
  );
}

/**
 * POST /api/events/{entityType}/{entityId}/clear — delete the events
 * matching the filter (ui-ngx clearEvents parity; the table then refetches
 * from page 0). The served filter must carry the SAME eventType.
 */
export async function clearEvents(
  entityId: EntityId,
  tenantId: string,
  filter: EventFilterBody,
): Promise<void> {
  await tbHttp.post<void>(
    `/api/events/${entityId.entityType}/${entityId.id}/clear`,
    { ...filter },
    { tenantId },
  );
}
