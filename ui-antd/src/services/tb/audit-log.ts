/**
 * Audit-log transport (handwritten) — entity-scoped audit tab + the global
 * page read (settings domain, spec 3.7).
 *
 * Base paths:
 *   GET /api/audit/logs                          (global, SA/TA scope)
 *   GET /api/audit/logs/entity/{entityType}/{entityId}
 *       ?pageSize=&page=&textSearch=&sortProperty=&sortOrder=
 *   Global read adds startTime/endTime (ms) and actionTypes
 *   (comma-joined enum values — AuditLogController parses one string).
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

function auditLogParams(pageLink: PageLink): QueryParams {
  return {
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    sortProperty: pageLink.sortOrder?.property,
    sortOrder: pageLink.sortOrder?.direction,
  };
}

/** Filters for the global audit read (settings audit-logs page). */
export interface GlobalAuditLogFilter {
  /** Inclusive window start, ms since epoch. */
  startTime?: number;
  /** Inclusive window end, ms since epoch. */
  endTime?: number;
  /** Empty/undefined = any action type (wire: comma-joined values). */
  actionTypes?: AuditActionType[];
}

/**
 * Global audit page read (GET /api/audit/logs): SA sees the system-domain
 * log, TA their tenant scope — decided by the caller's authority upstream.
 */
export async function getAuditLogs(
  pageLink: PageLink,
  filter: GlobalAuditLogFilter = {},
): Promise<PageData<AuditLog>> {
  return tbHttp.get<PageData<AuditLog>>('/api/audit/logs', {
    ...auditLogParams(pageLink),
    startTime: filter.startTime,
    endTime: filter.endTime,
    actionTypes:
      filter.actionTypes && filter.actionTypes.length > 0
        ? filter.actionTypes.join(',')
        : undefined,
  });
}

/** Entity-scoped audit page read (spec 3.3 audit-logs tab). */
export async function getAuditLogsByEntityId(
  entityId: EntityId,
  pageLink: PageLink,
): Promise<PageData<AuditLog>> {
  return tbHttp.get<PageData<AuditLog>>(
    `/api/audit/logs/entity/${entityId.entityType}/${entityId.id}`,
    auditLogParams(pageLink),
  );
}

/**
 * Customer-scoped audit page read (ui-ngx auditLogMode=CUSTOMER, customer
 * tabs): every entity inside the customer's scope, not just the customer
 * entity itself.
 */
export async function getAuditLogsByCustomerId(
  customerId: string,
  pageLink: PageLink,
): Promise<PageData<AuditLog>> {
  return tbHttp.get<PageData<AuditLog>>(
    `/api/audit/logs/customer/${customerId}`,
    auditLogParams(pageLink),
  );
}
