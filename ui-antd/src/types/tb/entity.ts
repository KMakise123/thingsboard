/**
 * Handwritten authoritative entity-id types (M1 minimal set).
 *
 * Source of truth: ui-ngx/src/app/shared/models/id/* + entity-type.models.ts,
 * cross-checked against the generated snapshot in src/types/tb/openapi.
 * The generated file is reference-only; this file is what app code consumes.
 */

/** ThingsBoard entity type wire enum (subset listed fully; values are stable upstream). */
export enum EntityType {
  TENANT = 'TENANT',
  CUSTOMER = 'CUSTOMER',
  USER = 'USER',
  DASHBOARD = 'DASHBOARD',
  ASSET = 'ASSET',
  DEVICE = 'DEVICE',
  ALARM = 'ALARM',
  RULE_CHAIN = 'RULE_CHAIN',
  RULE_NODE = 'RULE_NODE',
  ENTITY_VIEW = 'ENTITY_VIEW',
  WIDGETS_BUNDLE = 'WIDGETS_BUNDLE',
  WIDGET_TYPE = 'WIDGET_TYPE',
  TENANT_PROFILE = 'TENANT_PROFILE',
  DEVICE_PROFILE = 'DEVICE_PROFILE',
  ASSET_PROFILE = 'ASSET_PROFILE',
  API_USAGE_STATE = 'API_USAGE_STATE',
  TB_RESOURCE = 'TB_RESOURCE',
  OTA_PACKAGE = 'OTA_PACKAGE',
  EDGE = 'EDGE',
  RPC = 'RPC',
  QUEUE = 'QUEUE',
  NOTIFICATION_TARGET = 'NOTIFICATION_TARGET',
  NOTIFICATION_TEMPLATE = 'NOTIFICATION_TEMPLATE',
  NOTIFICATION_REQUEST = 'NOTIFICATION_REQUEST',
  NOTIFICATION = 'NOTIFICATION',
  NOTIFICATION_RULE = 'NOTIFICATION_RULE',
  QUEUE_STATS = 'QUEUE_STATS',
  OAUTH2_CLIENT = 'OAUTH2_CLIENT',
  DOMAIN = 'DOMAIN',
  MOBILE_APP = 'MOBILE_APP',
  MOBILE_APP_BUNDLE = 'MOBILE_APP_BUNDLE',
  CALCULATED_FIELD = 'CALCULATED_FIELD',
  JOB = 'JOB',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
  AI_MODEL = 'AI_MODEL',
  API_KEY = 'API_KEY',
}

/** UUIDv7 string as used by every ThingsBoard entity id. */
export type Uuid = string;

/** Polymorphic entity reference sent over REST/WS as `{ entityType, id }`. */
export interface EntityId {
  entityType: EntityType;
  id: Uuid;
}

/**
 * Typed entity reference. `Device` carries `tenantId: EntityIdOf<EntityType.TENANT>`
 * so narrowing mistakes are caught at compile time instead of runtime.
 */
export type EntityIdOf<E extends EntityType> = {
  entityType: E;
  id: Uuid;
};

/**
 * Time convention across the whole TB wire protocol: **milliseconds since epoch**,
 * plain JSON number (`createdTime`, `lastUpdateTs`, `startTs`, `ts`, ...).
 * Alias exists to document intent at call sites; it is not branded.
 */
export type EpochMillis = number;

/** Common tail of every entity returned by the REST API. */
export interface BaseData<I extends EntityId = EntityId> {
  id: I;
  /** ms since epoch */
  createdTime: EpochMillis;
}

/** Entities that expose optimistic-locking `version` (used by save flows). */
export interface HasVersion {
  /** Server-assigned version, pass back on update to detect conflicts. */
  version?: number;
}

/** Tenant/customer ownership tail shared by most tenant-scope entities. */
export interface HasTenantIdAndCustomer {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  customerId?: EntityIdOf<EntityType.CUSTOMER>;
}
