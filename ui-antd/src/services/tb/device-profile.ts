/**
 * Device-profile transport (handwritten). Endpoints pinned against
 * DeviceProfileController + the rule-chain/queue/OTA lookups the profile
 * General form needs. The generic lookups (rule chains / queues / OTA
 * packages) live here until their owning domains land (dashboards M5);
 * they are only consumed by the profile forms.
 */

import type { QueryParams } from '@/core/http/client';
import {
  type DeviceProfile,
  type OtaPackageDigest,
  type OtaPackageType,
  type RuleChainDigest,
  type RuleChainTypeFilter,
  type RuleEngineQueue,
} from '@/types/tb/device-profile';
import type { PageData, PageLink } from '@/types/tb';
import { pageLinkToQueryParams } from '@/types/tb';

import { tbHttp } from './http';

/**
 * GET /api/deviceProfiles — full-profile rows for the list page
 * (sort: createdTime/name/type/transportType/description/default...).
 */
export async function getDeviceProfileList(
  pageLink: PageLink,
): Promise<PageData<DeviceProfile>> {
  return tbHttp.get<PageData<DeviceProfile>>(
    '/api/deviceProfiles',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/deviceProfileInfos — profile autocomplete digest (V2 shape). */
export async function getDeviceProfileInfos(
  pageLink: PageLink,
): Promise<PageData<DeviceProfileInfoRow>> {
  return tbHttp.get<PageData<DeviceProfileInfoRow>>(
    '/api/deviceProfileInfos',
    pageLinkToQueryParams(pageLink),
  );
}

/** Digest row returned by /api/deviceProfileInfos. */
export interface DeviceProfileInfoRow {
  id: DeviceProfile['id'];
  name: string;
  image?: string;
  type: DeviceProfile['type'];
  transportType: DeviceProfile['transportType'];
  defaultDashboardId?: DeviceProfile['defaultDashboardId'];
}

/** GET /api/deviceProfile/{id} — full entity (`inlineImages` mirrors ui-ngx). */
export async function getDeviceProfileById(
  deviceProfileId: string,
  params: { inlineImages?: boolean } = {},
): Promise<DeviceProfile> {
  return tbHttp.get<DeviceProfile>(`/api/deviceProfile/${deviceProfileId}`, {
    inlineImages: params.inlineImages,
  });
}

/** POST /api/deviceProfile (create + update; TB has no PATCH). */
export async function saveDeviceProfile(
  profile: DeviceProfile,
): Promise<DeviceProfile> {
  return tbHttp.post<DeviceProfile>('/api/deviceProfile', profile);
}

/** DELETE /api/deviceProfile/{id} */
export async function deleteDeviceProfile(deviceProfileId: string): Promise<void> {
  await tbHttp.delete(`/api/deviceProfile/${deviceProfileId}`);
}

/** POST /api/deviceProfile/{id}/default — mark as the tenant default. */
export async function setDefaultDeviceProfile(deviceProfileId: string): Promise<void> {
  await tbHttp.post(`/api/deviceProfile/${deviceProfileId}/default`);
}

/**
 * GET /api/ruleChains?type=… — rule-chain picker rows (CORE for the default
 * rule chain, EDGE for the default edge rule chain, as in ui-ngx's
 * tb-rule-chain-autocomplete). Rides in this file until a rule-chain
 * service exists (M5).
 */
export async function getTenantRuleChains(
  pageLink: PageLink,
  type: RuleChainTypeFilter = 'CORE',
): Promise<PageData<RuleChainDigest>> {
  const params: QueryParams = {
    ...pageLinkToQueryParams(pageLink),
    type,
  };
  return tbHttp.get<PageData<RuleChainDigest>>('/api/ruleChains', params);
}

/** GET /api/queues?serviceType=TB_RULE_ENGINE — default-queue picker rows. */
export async function getRuleEngineQueues(
  pageLink: PageLink,
): Promise<PageData<RuleEngineQueue>> {
  const params: QueryParams = {
    ...pageLinkToQueryParams(pageLink),
    serviceType: 'TB_RULE_ENGINE',
  };
  return tbHttp.get<PageData<RuleEngineQueue>>('/api/queues', params);
}

/**
 * GET /api/otaPackages/{deviceProfileId}/{type} — firmware/software picker
 * rows scoped to this profile (ui-ngx ota-package-autocomplete).
 */
export async function getOtaPackagesByDeviceProfile(
  deviceProfileId: string,
  type: OtaPackageType,
  pageLink: PageLink,
): Promise<PageData<OtaPackageDigest>> {
  return tbHttp.get<PageData<OtaPackageDigest>>(
    `/api/otaPackages/${deviceProfileId}/${type}`,
    pageLinkToQueryParams(pageLink),
  );
}
