/**
 * Entity-view domain types (handwritten, authoritative).
 *
 * Base: ui-ngx/src/app/shared/models/entity-view.models.ts, cross-checked
 * against the openapi snapshot schemas EntityView / EntityViewInfo /
 * TelemetryEntityView / AttributesEntityView.
 */

import type {
  BaseData,
  EntityId,
  EntityIdOf,
  EntityType,
  EpochMillis,
  HasTenantIdAndCustomer,
  HasVersion,
} from './entity';

/**
 * The telemetry/attribute keys an entity view exposes. Arrays are required
 * on the wire (openapi) but ui-ngx sends partial objects; keep them optional
 * and let callers normalize.
 */
export interface EntityViewKeys {
  timeseries?: Array<string>;
  attributes?: {
    cs?: Array<string>;
    ss?: Array<string>;
    sh?: Array<string>;
  };
}

/** GET /api/entityView/{entityViewId} — full entity view (POST body too). */
export interface EntityView
  extends BaseData<EntityIdOf<EntityType.ENTITY_VIEW>>,
    HasTenantIdAndCustomer,
    HasVersion {
  /** The target entity (device or asset) this view exposes. */
  entityId: EntityId;
  name: string;
  /** Entity-view "type" name (a free tag in TB, not a profile). */
  type?: string;
  keys?: EntityViewKeys;
  startTimeMs?: EpochMillis;
  endTimeMs?: EpochMillis;
  additionalInfo?: Record<string, unknown>;
}

/**
 * GET /api/tenant/entityViewInfos — list row with joined customer fields
 * (V2 shape; the plain /api/tenant/entityViews variant is not consumed).
 */
export interface EntityViewInfo extends EntityView {
  customerTitle: string;
  customerIsPublic: boolean;
}

/** Entity list filter for the entity-view selector (POST /api/entityViews). */
export interface EntityViewSearchQuery {
  entityFilter: Record<string, unknown>;
  entityViewTypes?: Array<string>;
}
