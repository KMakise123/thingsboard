/**
 * Tenant transport (handwritten, M3 sys-admin domain; SA-only endpoints).
 *
 * Parity notes (RECON §3 / ui-ngx tenant.service):
 *   - the list and the autocomplete read the *Infos shapes
 *     (GET /api/tenantInfos rows carry tenantProfileName);
 *   - saveTenant returns the bare Tenant, so hosts reload the info shape
 *     afterwards (ui-ngx saveEntity mergeMaps onto getTenantInfo).
 */

import type { PageLink, PageQueryParams } from '@/types/tb/page';
import type { TenantInfo } from '@/types/tb/tenant';
import { type PageData, type User, pageLinkToQueryParams } from '@/types/tb';

import { tbHttp } from './http';

/** GET /api/tenantInfos — paged tenant list with tenantProfileName (SA). */
export async function getTenantInfos(
  pageLink: PageLink,
): Promise<PageData<TenantInfo>> {
  return tbHttp.get<PageData<TenantInfo>>(
    '/api/tenantInfos',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/tenant/info/{tenantId} (SA). */
export async function getTenantInfo(tenantId: string): Promise<TenantInfo> {
  return tbHttp.get<TenantInfo>(`/api/tenant/info/${tenantId}`);
}

/** POST /api/tenant — create and update (SA). */
export async function saveTenant(tenant: TenantInfo): Promise<TenantInfo> {
  return tbHttp.post<TenantInfo>('/api/tenant', tenant);
}

/** DELETE /api/tenant/{tenantId} (SA). */
export async function deleteTenant(tenantId: string): Promise<void> {
  await tbHttp.delete(`/api/tenant/${tenantId}`);
}

/** GET /api/tenant/{tenantId}/users — the tenant-admins page list (SA only). */
export async function getTenantUsers(
  tenantId: string,
  pageLink: PageLink,
  params: PageQueryParams = {},
): Promise<PageData<User>> {
  return tbHttp.get<PageData<User>>(
    `/api/tenant/${tenantId}/users`,
    { ...pageLinkToQueryParams(pageLink), ...params },
  );
}
