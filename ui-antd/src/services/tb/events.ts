/**
 * Event transport (handwritten) — device events tab.
 *
 * Base path (ui-ngx event.service parity, typed GET variant):
 *   GET /api/events/{entityType}/{entityId}/{eventType}
 *       ?tenantId=&pageSize=&page=&textSearch=&sortProperty=&sortOrder=
 *
 * The POST /api/events/{entityType}/{entityId} filter variant exists for
 * advanced filtered reads; the tab only needs the typed page above.
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
