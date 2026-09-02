/**
 * Asset-profile domain types (handwritten, authoritative).
 *
 * Base: ui-ngx/src/app/shared/models/asset.models.ts, cross-checked against
 * the openapi snapshot (`AssetProfile` schema — symmetric to DeviceProfile
 * minus type/transportType/provisionType/OTA and with `default` as the wire
 * key for the Java `boolean isDefault`).
 */

import type { BaseData, EntityIdOf, EntityType, HasVersion } from './entity';

/** GET /api/assetProfile/{id} / POST /api/assetProfile — the full entity. */
export interface AssetProfile
  extends BaseData<EntityIdOf<EntityType.ASSET_PROFILE>>,
    HasVersion {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  description?: string;
  /** Serialized as `default` on the wire (Java `boolean isDefault`). */
  default: boolean;
  image?: string;
  defaultRuleChainId?: EntityIdOf<EntityType.RULE_CHAIN>;
  defaultDashboardId?: EntityIdOf<EntityType.DASHBOARD>;
  defaultQueueName?: string;
  defaultEdgeRuleChainId?: EntityIdOf<EntityType.RULE_CHAIN>;
}

/** GET /api/assetProfileInfos — profile autocomplete digest (V2 shape). */
export interface AssetProfileInfo {
  id: EntityIdOf<EntityType.ASSET_PROFILE>;
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  image?: string;
  defaultDashboardId?: EntityIdOf<EntityType.DASHBOARD>;
}
