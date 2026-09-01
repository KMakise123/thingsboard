/**
 * Dashboard transport (minimal M2 seed).
 *
 * Only what the customer domain needs today: the tenant-wide paged list
 * feeding the "assign existing dashboard" picker on the customer-scope
 * dashboards page. The customer home-dashboard picker reads the customer
 * scope instead (`getCustomerDashboards` in services/tb/customer.ts — the
 * same source ui-ngx's tb-dashboard-autocomplete uses with
 * dashboardsScope='customer').
 *
 * The dashboards domain (M5) owns the full DashboardInfo type and the
 * render surface — replace this digest then (RECON risk 5).
 */

import { type PageData, type PageLink, pageLinkToQueryParams } from '@/types/tb';

import { tbHttp } from './http';

/** Minimal dashboard digest (only the fields the M2 pickers/tables render). */
export interface DashboardDigest {
  id: { entityType: 'DASHBOARD'; id: string };
  createdTime: number;
  title: string;
}

/** GET /api/tenant/dashboards — tenant-scope paged dashboard list. */
export async function getTenantDashboards(
  pageLink: PageLink,
): Promise<PageData<DashboardDigest>> {
  return tbHttp.get<PageData<DashboardDigest>>(
    '/api/tenant/dashboards',
    pageLinkToQueryParams(pageLink),
  );
}
