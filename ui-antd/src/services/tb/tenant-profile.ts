/**
 * Tenant-profile transport (handwritten, M3 sys-admin domain; SA only).
 *
 * Endpoints pinned against TenantProfileController + ui-ngx
 * tenant-profile.service. The list and the tenant-form autocomplete read
 * the Info shapes; the detail page and the JSON export read the full
 * profile (profileData included).
 */

import type { PageLink } from '@/types/tb/page';
import type { TenantProfile, TenantProfileInfo } from '@/types/tb/tenant';
import { type PageData, pageLinkToQueryParams } from '@/types/tb';

import { tbHttp } from './http';

/** GET /api/tenantProfiles — full-shape paged list (list page rows). */
export async function getTenantProfiles(
  pageLink: PageLink,
): Promise<PageData<TenantProfile>> {
  return tbHttp.get<PageData<TenantProfile>>(
    '/api/tenantProfiles',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/tenantProfileInfos — digest list (tenant-form autocomplete). */
export async function getTenantProfileInfos(
  pageLink: PageLink,
): Promise<PageData<TenantProfileInfo>> {
  return tbHttp.get<PageData<TenantProfileInfo>>(
    '/api/tenantProfileInfos',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/tenantProfileInfo/{tenantProfileId} */
export async function getTenantProfileInfoById(
  tenantProfileId: string,
): Promise<TenantProfileInfo> {
  return tbHttp.get<TenantProfileInfo>(
    `/api/tenantProfileInfo/${tenantProfileId}`,
  );
}

/** GET /api/tenantProfileInfo/default — the profile new tenants get. */
export async function getDefaultTenantProfileInfo(): Promise<TenantProfileInfo> {
  return tbHttp.get<TenantProfileInfo>('/api/tenantProfileInfo/default');
}

/** GET /api/tenantProfile/{tenantProfileId} — full profile (detail page). */
export async function getTenantProfileById(
  tenantProfileId: string,
): Promise<TenantProfile> {
  return tbHttp.get<TenantProfile>(`/api/tenantProfile/${tenantProfileId}`);
}

/** POST /api/tenantProfile — create and update. */
export async function saveTenantProfile(
  profile: TenantProfile,
): Promise<TenantProfile> {
  return tbHttp.post<TenantProfile>('/api/tenantProfile', profile);
}

/** DELETE /api/tenantProfile/{tenantProfileId} (default profile is refused). */
export async function deleteTenantProfile(
  tenantProfileId: string,
): Promise<void> {
  await tbHttp.delete(`/api/tenantProfile/${tenantProfileId}`);
}

/** POST /api/tenantProfile/{tenantProfileId}/default — make default. */
export async function setDefaultTenantProfile(
  tenantProfileId: string,
): Promise<void> {
  await tbHttp.post<void>(`/api/tenantProfile/${tenantProfileId}/default`);
}
