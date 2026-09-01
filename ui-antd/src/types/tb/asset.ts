/**
 * Asset domain types (handwritten, authoritative).
 *
 * Base: ui-ngx/src/app/shared/models/asset.models.ts, cross-checked against
 * the openapi snapshot schemas Asset / AssetInfo / AssetProfileInfo.
 */

import type {
  BaseData,
  EntityIdOf,
  EntityType,
  HasTenantIdAndCustomer,
  HasVersion,
} from './entity';

/** GET /api/asset/{assetId} — full asset entity (also POST /api/asset body). */
export interface Asset
  extends BaseData<EntityIdOf<EntityType.ASSET>>,
    HasTenantIdAndCustomer,
    HasVersion {
  name: string;
  /** Asset profile "type" name; derived, prefer assetProfileId. */
  type?: string;
  label?: string;
  assetProfileId?: EntityIdOf<EntityType.ASSET_PROFILE>;
  additionalInfo?: Record<string, unknown>;
}

/**
 * GET /api/tenant/assetInfos — list row with joined fields the table needs
 * (V2 shape; the plain /api/tenant/assets variant is not consumed).
 */
export interface AssetInfo extends Asset {
  customerTitle: string;
  customerIsPublic: boolean;
  assetProfileName: string;
}

/** Asset profile digest for list filters (GET /api/assetProfileInfos). */
export interface AssetProfileInfo {
  id: EntityIdOf<EntityType.ASSET_PROFILE>;
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  image?: string;
  defaultDashboardId?: EntityIdOf<EntityType.DASHBOARD>;
}

/** Entity list filter for the asset selector (POST /api/assets query body). */
export interface AssetSearchQuery {
  entityFilter: Record<string, unknown>;
  assetTypes?: Array<string>;
}
