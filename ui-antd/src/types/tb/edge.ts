/**
 * Handwritten authoritative Edge domain types (M13 wave-1).
 *
 * Source of truth: common/data/src/main/java/org/thingsboard/server/common/data/edge/
 * (Edge.java, EdgeInfo.java, EdgeEvent.java, EdgeEventActionType.java,
 * EdgeEventType.java) cross-checked against ui-ngx
 * shared/models/edge.models.ts.
 *
 * Upstream dropped the standalone EdgeCredentials class and its
 * `/api/edge/{id}/credentials` endpoint: the connection credentials live
 * directly on the Edge entity (`routingKey` = username, `secret` =
 * password). There is no credentials sub-resource to model.
 */

import type {
  BaseData,
  EntityIdOf,
  EntityType,
  EpochMillis,
  HasVersion,
} from './entity';

/** `Edge.additionalInfo` — `{description}` is the only field the UI uses. */
export interface EdgeAdditionalInfo {
  description?: string;
  [key: string]: unknown;
}

/**
 * POST /api/edge / GET /api/edge/{id} row. `routingKey`/`secret` are
 * required on create (the server never generates them) and are the edge
 * connection credentials — the UI keeps them read-only after save.
 */
export interface Edge
  extends BaseData<EntityIdOf<EntityType.EDGE>>,
    HasVersion {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  customerId?: EntityIdOf<EntityType.CUSTOMER>;
  /** Default rule chain pushed to a new edge; server falls back to the edge template root. */
  rootRuleChainId?: EntityIdOf<EntityType.RULE_CHAIN>;
  /** Unique per tenant — a clash answers "Edge with such name already exists!". */
  name: string;
  /** Free-form subtype string (see /api/edge/types). */
  type: string;
  /** Connection username half of the merged credentials (no separate credentials endpoint upstream). */
  routingKey: string;
  /** Connection password half of the merged credentials. */
  secret: string;
  label?: string;
  additionalInfo?: EdgeAdditionalInfo;
}

/** Edge + customer join columns — the `edgeInfos` list/detail shape. */
export interface EdgeInfo extends Edge {
  customerTitle: string;
  /** Derived from the assigned customer's `additionalInfo.isPublic`. */
  customerIsPublic: boolean;
}

/**
 * Cloud-to-edge sync event row (GET /api/edge/{edgeId}/events). The wire id
 * is an EDGE_EVENT EventId; `seqId` is the global monotonic ordering key the
 * backend actually sorts by (its sortProperty/sortOrder params are ignored),
 * so it doubles as a stable UI key.
 */
export interface EdgeEvent {
  seqId: number;
  tenantId?: EntityIdOf<EntityType.TENANT>;
  edgeId: EntityIdOf<EntityType.EDGE>;
  action: EdgeEventActionType;
  type: EdgeEventType;
  /** Target entity as a bare UUID string (wire is not an `{entityType,id}` object here). */
  entityId: string;
  /** Originator user id. */
  uid: string;
  /** Per-action JSON payload — shape varies (attribute posts carry kv maps, alarms carry alarm fields). */
  body: unknown;
  createdTime: EpochMillis;
}

/** GET /api/edge/instructions/{install|upgrade}/… — markdown text to render verbatim. */
export interface EdgeInstructions {
  instructions: string;
}

/** Instruction flavors the install/upgrade endpoints accept as `{method}`. */
export type EdgeInstructionsMethod = 'docker' | 'ubuntu' | 'centos';

/**
 * What the event is about (EdgeEventType.java, ui-ngx parity — the 20
 * values the ngx UI maps; backend extras stay unlisted until consumed).
 */
export enum EdgeEventType {
  DASHBOARD = 'DASHBOARD',
  ASSET = 'ASSET',
  DEVICE = 'DEVICE',
  DEVICE_PROFILE = 'DEVICE_PROFILE',
  ASSET_PROFILE = 'ASSET_PROFILE',
  ENTITY_VIEW = 'ENTITY_VIEW',
  ALARM = 'ALARM',
  RULE_CHAIN = 'RULE_CHAIN',
  RULE_CHAIN_METADATA = 'RULE_CHAIN_METADATA',
  EDGE = 'EDGE',
  USER = 'USER',
  CUSTOMER = 'CUSTOMER',
  RELATION = 'RELATION',
  TENANT = 'TENANT',
  TENANT_PROFILE = 'TENANT_PROFILE',
  WIDGETS_BUNDLE = 'WIDGETS_BUNDLE',
  WIDGET_TYPE = 'WIDGET_TYPE',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
  OTA_PACKAGE = 'OTA_PACKAGE',
  QUEUE = 'QUEUE',
}

/**
 * What happened to the event's entity (EdgeEventActionType.java, ui-ngx
 * parity — 21 values incl. the deprecated CREDENTIALS_REQUEST /
 * ENTITY_MERGE_REQUEST which still appear on old events).
 */
export enum EdgeEventActionType {
  ADDED = 'ADDED',
  DELETED = 'DELETED',
  UPDATED = 'UPDATED',
  POST_ATTRIBUTES = 'POST_ATTRIBUTES',
  ATTRIBUTES_UPDATED = 'ATTRIBUTES_UPDATED',
  ATTRIBUTES_DELETED = 'ATTRIBUTES_DELETED',
  TIMESERIES_UPDATED = 'TIMESERIES_UPDATED',
  CREDENTIALS_UPDATED = 'CREDENTIALS_UPDATED',
  ASSIGNED_TO_CUSTOMER = 'ASSIGNED_TO_CUSTOMER',
  UNASSIGNED_FROM_CUSTOMER = 'UNASSIGNED_FROM_CUSTOMER',
  RELATION_ADD_OR_UPDATE = 'RELATION_ADD_OR_UPDATE',
  RELATION_DELETED = 'RELATION_DELETED',
  RPC_CALL = 'RPC_CALL',
  ALARM_ACK = 'ALARM_ACK',
  ALARM_CLEAR = 'ALARM_CLEAR',
  ALARM_ASSIGNED = 'ALARM_ASSIGNED',
  ALARM_UNASSIGNED = 'ALARM_UNASSIGNED',
  ASSIGNED_TO_EDGE = 'ASSIGNED_TO_EDGE',
  UNASSIGNED_FROM_EDGE = 'UNASSIGNED_FROM_EDGE',
  /** Deprecated upstream but still present on historical rows. */
  CREDENTIALS_REQUEST = 'CREDENTIALS_REQUEST',
  /** Deprecated upstream but still present on historical rows. */
  ENTITY_MERGE_REQUEST = 'ENTITY_MERGE_REQUEST',
}

// ---------------------------------------------------------------------------
// CSV bulk import (POST /api/edge/bulk_import) — BulkImportRequest.java with
// the edge column set from ui-ngx table-columns-assignment.component.ts:
// NAME, TYPE, LABEL, DESCRIPTION + ROUTING_KEY/SECRET (required for edges)
// + SERVER_ATTRIBUTE/TIMESERIES.
// ---------------------------------------------------------------------------

/** Wire column types the edge import accepts (BulkImportColumnType edge subset). */
export type EdgeImportColumnType =
  | 'NAME'
  | 'TYPE'
  | 'LABEL'
  | 'DESCRIPTION'
  | 'ROUTING_KEY'
  | 'SECRET'
  | 'SERVER_ATTRIBUTE'
  | 'TIMESERIES';

/** One CSV column mapping row; `key` is the attribute/timeseries key for the `*_ATTRIBUTE`/`TIMESERIES` columns. */
export interface EdgeBulkImportColumnMapping {
  type: EdgeImportColumnType;
  key?: string;
}

/**
 * POST /api/edge/bulk_import body — JSON (not multipart): `file` carries the
 * CSV text itself, matching ngx import-dialog-csv (delimiter is the literal
 * character; `\t` for tab).
 */
export interface EdgeBulkImportRequest {
  file: string;
  mapping: {
    columns: Array<EdgeBulkImportColumnMapping>;
    delimiter: ',' | ';' | '|' | '\t';
    header: boolean;
    update: boolean;
  };
}

/** Bulk import answer — counters plus per-row error strings. */
export interface EdgeBulkImportResult {
  created: number;
  updated: number;
  errors: number;
  errorsList: Array<string>;
}
