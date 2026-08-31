/**
 * Alarm base structures (handwritten, authoritative) — device alarms tab.
 *
 * Base: ui-ngx shared/models/alarm.models.ts, cross-checked against
 * openapi Alarm / AlarmInfo / AlarmSeverity / AlarmStatus schemas.
 */

import type {
  BaseData,
  EntityId,
  EntityIdOf,
  EntityType,
  EpochMillis,
  HasTenantIdAndCustomer,
} from './entity';
import type { TsValue } from './telemetry';

export enum AlarmSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  WARNING = 'WARNING',
  INDETERMINATE = 'INDETERMINATE',
}

/** Bit-composed lifecycle state as sent by REST. */
export enum AlarmStatus {
  ACTIVE_UNACK = 'ACTIVE_UNACK',
  ACTIVE_ACK = 'ACTIVE_ACK',
  CLEARED_UNACK = 'CLEARED_UNACK',
  CLEARED_ACK = 'CLEARED_ACK',
}

export interface Alarm
  extends BaseData<EntityIdOf<EntityType.ALARM>>,
    HasTenantIdAndCustomer {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  customerId?: EntityIdOf<EntityType.CUSTOMER>;
  type: string;
  /** Derived display name (server getter). */
  name?: string;
  originator: EntityId;
  severity: AlarmSeverity;
  status: AlarmStatus;
  acknowledged: boolean;
  cleared: boolean;
  assigneeId?: EntityIdOf<EntityType.USER>;
  startTs: EpochMillis;
  endTs: EpochMillis;
  ackTs: EpochMillis;
  clearTs: EpochMillis;
  assignTs: EpochMillis;
  details?: Record<string, unknown>;
  propagate?: boolean;
  propagateToOwner?: boolean;
  propagateToTenant?: boolean;
  propagateRelationTypes?: Array<string>;
}

/** Alarm row enriched for lists (originator title, etc.). */
export interface AlarmInfo extends Alarm {
  originatorName?: string;
  originatorLabel?: string;
}

/** WS AlarmData payload: alarm + latest-value map for requested keys. */
export interface AlarmData extends AlarmInfo {
  entityId: string;
  latest: Record<string, Record<string, TsValue>>;
}
