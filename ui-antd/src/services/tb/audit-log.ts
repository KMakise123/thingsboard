/**
 * Audit-log transport (handwritten) — entity-scoped audit tab.
 *
 * Base path:
 *   GET /api/audit/logs/entity/{entityType}/{entityId}
 *       ?pageSize=&page=&textSearch=&sortProperty=&sortOrder=
 */

import type { QueryParams } from '@/core/http/client';
import type {
  BaseData,
  EntityId,
  EntityType,
  PageData,
  PageLink,
} from '@/types/tb';

import { tbHttp } from './http';

/** Wire enum (openapi ActionType). */
export type AuditActionType =
  | 'ADDED'
  | 'DELETED'
  | 'UPDATED'
  | 'ATTRIBUTES_UPDATED'
  | 'ATTRIBUTES_DELETED'
  | 'TIMESERIES_UPDATED'
  | 'TIMESERIES_DELETED'
  | 'RPC_CALL'
  | 'CREDENTIALS_UPDATED'
  | 'ASSIGNED_TO_CUSTOMER'
  | 'UNASSIGNED_FROM_CUSTOMER'
  | 'ACTIVATED'
  | 'SUSPENDED'
  | 'CREDENTIALS_READ'
  | 'ATTRIBUTES_READ'
  | 'RELATION_ADD_OR_UPDATE'
  | 'RELATION_DELETED'
  | 'RELATIONS_DELETED'
  | 'REST_API_RULE_ENGINE_CALL'
  | 'ALARM_ACK'
  | 'ALARM_CLEAR'
  | 'ALARM_DELETE'
  | 'ALARM_ASSIGNED'
  | 'ALARM_UNASSIGNED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOCKOUT'
  | 'ASSIGNED_FROM_TENANT'
  | 'ASSIGNED_TO_TENANT'
  | 'PROVISION_SUCCESS'
  | 'PROVISION_FAILURE'
  | 'ASSIGNED_TO_EDGE'
  | 'UNASSIGNED_FROM_EDGE'
  | 'ADDED_COMMENT'
  | 'UPDATED_COMMENT'
  | 'DELETED_COMMENT'
  | 'SMS_SENT';

export type AuditActionStatus = 'SUCCESS' | 'FAILURE';

/** GET /api/audit/logs row (openapi AuditLog). */
export interface AuditLog
  extends BaseData<{ entityType: EntityType; id: string }> {
  tenantId?: { entityType: EntityType.TENANT; id: string };
  customerId?: { entityType: EntityType.CUSTOMER; id: string };
  entityId?: EntityId;
  entityName?: string;
  userId?: { entityType: EntityType.USER; id: string };
  userName?: string;
  actionType: AuditActionType;
  actionData?: Record<string, unknown>;
  actionStatus: AuditActionStatus;
  actionFailureDetails?: string;
}

/** Entity-scoped audit page read (spec 3.3 audit-logs tab). */
export async function getAuditLogsByEntityId(
  entityId: EntityId,
  pageLink: PageLink,
): Promise<PageData<AuditLog>> {
  const params: QueryParams = {
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    sortProperty: pageLink.sortOrder?.property,
    sortOrder: pageLink.sortOrder?.direction,
  };
  return tbHttp.get<PageData<AuditLog>>(
    `/api/audit/logs/entity/${entityId.entityType}/${entityId.id}`,
    params,
  );
}
