/**
 * Asset transport (handwritten). Mirrors the device domain: double-path
 * endpoints always use the V2 Infos shape; every paged call passes an
 * explicit sort; batch operations fan out over the single-entity endpoints
 * (no bulk endpoint upstream — RECON §2, BCR C-1).
 */

import type { QueryParams } from '@/core/http/client';
import {
  type Asset,
  type AssetInfo,
  type AssetProfileInfo,
  type AssetSearchQuery,
  type BulkImportRequest,
  type BulkImportResult,
  type EntitySubtype,
  type PageData,
  type PageLink,
  pageLinkToQueryParams,
} from '@/types/tb';

import { tbHttp } from './http';

export interface AssetListFilter {
  /** Legacy profile type name (mutually exclusive with assetProfileId). */
  type?: string;
  assetProfileId?: string;
}

function assetListQuery(
  pageLink: PageLink,
  filter: AssetListFilter = {},
): QueryParams {
  return {
    ...pageLinkToQueryParams(pageLink),
    type: filter.type,
    assetProfileId: filter.assetProfileId,
  };
}

/** GET /api/tenant/assetInfos (V2 shape: joined profile/customer fields). */
export async function getTenantAssets(
  pageLink: PageLink,
  filter: AssetListFilter = {},
): Promise<PageData<AssetInfo>> {
  return tbHttp.get<PageData<AssetInfo>>(
    '/api/tenant/assetInfos',
    assetListQuery(pageLink, filter),
  );
}

/** GET /api/customer/{customerId}/assetInfos (V2). */
export async function getCustomerAssets(
  customerId: string,
  pageLink: PageLink,
  filter: AssetListFilter = {},
): Promise<PageData<AssetInfo>> {
  return tbHttp.get<PageData<AssetInfo>>(
    `/api/customer/${customerId}/assetInfos`,
    assetListQuery(pageLink, filter),
  );
}

/** GET /api/asset/info/{assetId} (V2 joined row). */
export async function getAssetInfoById(assetId: string): Promise<AssetInfo> {
  return tbHttp.get<AssetInfo>(`/api/asset/info/${assetId}`);
}

/** POST /api/asset (create and update). */
export async function saveAsset(asset: Asset): Promise<Asset> {
  return tbHttp.post<Asset>('/api/asset', asset);
}

/** DELETE /api/asset/{assetId} */
export async function deleteAsset(assetId: string): Promise<void> {
  await tbHttp.delete(`/api/asset/${assetId}`);
}

/** POST /api/customer/{customerId}/asset/{assetId} */
export async function assignAssetToCustomer(
  customerId: string,
  assetId: string,
): Promise<Asset> {
  return tbHttp.post<Asset>(
    `/api/customer/${customerId}/asset/${assetId}`,
  );
}

/** DELETE /api/customer/asset/{assetId} */
export async function unassignAssetFromCustomer(assetId: string): Promise<void> {
  await tbHttp.delete(`/api/customer/asset/${assetId}`);
}

/** GET /api/asset/types — profile type names for legacy filters. */
export async function getAssetTypes(): Promise<Array<EntitySubtype>> {
  return tbHttp.get<Array<EntitySubtype>>('/api/asset/types');
}

/** GET /api/assetProfileInfos — profile autocomplete (V2 digest). */
export async function getAssetProfiles(
  pageLink: PageLink,
): Promise<PageData<AssetProfileInfo>> {
  return tbHttp.get<PageData<AssetProfileInfo>>(
    '/api/assetProfileInfos',
    pageLinkToQueryParams(pageLink),
  );
}

/** POST /api/assets (findAssetsByQuery) — selector entity search. */
export async function findAssetsByQuery(
  query: AssetSearchQuery,
): Promise<Array<Asset>> {
  return tbHttp.post<Array<Asset>>('/api/assets', query);
}

/**
 * POST /api/asset/bulk_import — JSON body (same shape as the device
 * import: `file` carries the CSV text itself).
 */
export async function importAssets(
  request: BulkImportRequest,
): Promise<BulkImportResult> {
  return tbHttp.post<BulkImportResult>('/api/asset/bulk_import', request);
}
