/**
 * Asset-profile transport (handwritten). Endpoint set mirrors the device
 * profile file minus transport/provisioning/OTA (CE AssetProfile has none).
 * Endpoints pinned against AssetProfileController.
 */

import type { AssetProfile } from '@/types/tb/asset-profile';
import type { PageData, PageLink } from '@/types/tb';
import { pageLinkToQueryParams } from '@/types/tb';

import { tbHttp } from './http';

/** GET /api/assetProfiles — full-profile rows for the list page. */
export async function getAssetProfileList(
  pageLink: PageLink,
): Promise<PageData<AssetProfile>> {
  return tbHttp.get<PageData<AssetProfile>>(
    '/api/assetProfiles',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/assetProfile/{id} — full entity (`inlineImages` mirrors ui-ngx). */
export async function getAssetProfileById(
  assetProfileId: string,
  params: { inlineImages?: boolean } = {},
): Promise<AssetProfile> {
  return tbHttp.get<AssetProfile>(`/api/assetProfile/${assetProfileId}`, {
    inlineImages: params.inlineImages,
  });
}

/** POST /api/assetProfile (create + update; TB has no PATCH). */
export async function saveAssetProfile(
  profile: AssetProfile,
): Promise<AssetProfile> {
  return tbHttp.post<AssetProfile>('/api/assetProfile', profile);
}

/** DELETE /api/assetProfile/{id} */
export async function deleteAssetProfile(assetProfileId: string): Promise<void> {
  await tbHttp.delete(`/api/assetProfile/${assetProfileId}`);
}

/** POST /api/assetProfile/{id}/default — mark as the tenant default. */
export async function setDefaultAssetProfile(assetProfileId: string): Promise<void> {
  await tbHttp.post(`/api/assetProfile/${assetProfileId}/default`);
}
