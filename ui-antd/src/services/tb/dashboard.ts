/**
 * Dashboard transport (full M5 surface).
 *
 * Replaces the minimal M2 seed (RECON risk 5): tenant list now returns the
 * full DashboardInfo; adds single-dashboard reads, save/delete, customer
 * assignment set updates, make-public/private and the system resource reads
 * (gateways dashboard JSON) + the widgetType fqn probe backing the widget
 * registry resolver (ADR 0003).
 *
 * Customer-scope list + assign/unassign single endpoints stay in
 * customer.ts (they ship with M2 and W3 consumes them there).
 *
 * Endpoints cross-checked against ui-ngx core/http/dashboard.service.ts and
 * backend DashboardController / TbResourceController / WidgetTypeController.
 */

import {
  type Dashboard,
  type DashboardInfo,
  type PageData,
  type PageLink,
  pageLinkToQueryParams,
} from '@/types/tb';

import { tbHttp } from './http';

/**
 * GET/POST /api/tenant/dashboard/home/info body (openapi HomeDashboardInfo).
 * GET never 404s: an unconfigured tenant reads `{dashboardId: null,
 * hideDashboardToolbar: true}`. POST returns 200 with an empty body and
 * `dashboardId: null` CLEARS the assignment (stored in Tenant.additionalInfo
 * — unrelated to tenant profiles, contract #23).
 */
export interface TenantHomeDashboardInfo {
  /** `{"entityType":"DASHBOARD","id":<uuid>}` object form; null = unset. */
  dashboardId: { entityType: 'DASHBOARD'; id: string } | null;
  hideDashboardToolbar: boolean;
}

/** GET /api/tenant/dashboard/home/info — home-dashboard assignment (TA only). */
export async function getTenantHomeDashboardInfo(): Promise<TenantHomeDashboardInfo> {
  return tbHttp.get<TenantHomeDashboardInfo>(
    '/api/tenant/dashboard/home/info',
  );
}

/** POST /api/tenant/dashboard/home/info — save (200, empty body). */
export async function setTenantHomeDashboardInfo(
  info: TenantHomeDashboardInfo,
): Promise<void> {
  await tbHttp.post<void>('/api/tenant/dashboard/home/info', info);
}

/**
 * GET /api/dashboard/home response (`HomeDashboard` = Dashboard wire shape +
 * `hideDashboardToolbar`). The backend controller reuses the Dashboard
 * serialization, so `id` / `tenantId` / `assignedCustomers[].customerId` all
 * arrive in object form `{entityType, id}` — exactly what the `Dashboard`
 * type already declares (openapi snapshot carries the schema too).
 *
 * Empty-body semantics pinned (M15 R41, brief §2A): SA always gets 200 with
 * a 0-byte body (no tenant-scoped home concept); TA/CU walk the
 * user → customer(CU only) → tenant `homeDashboardId` fallback chain where
 * each hop silently degrades to the next on a READ check failure (a dangling
 * id can never 404 here). The tbHttp parse already yields `undefined` for an
 * empty text body (core/http/client parseBody), and the falsy guard below
 * also normalizes a JSON `null` body — the function therefore resolves
 * `undefined` for every "no home configured" form and never throws on them.
 */
export interface HomeDashboard extends Dashboard {
  hideDashboardToolbar: boolean;
}

/**
 * GET /api/dashboard/home — the runtime home read all three roles consume
 * on /home (do not confuse with the TA-only /api/tenant/dashboard/home/info
 * settings pair above: CU/SA get 403 on that one).
 */
export async function getHomeDashboard(): Promise<HomeDashboard | undefined> {
  const home = await tbHttp.get<HomeDashboard | undefined>(
    '/api/dashboard/home',
  );
  return home || undefined;
}

/** GET /api/tenant/dashboards — tenant-scope paged dashboard list. */
export async function getTenantDashboards(
  pageLink: PageLink,
): Promise<PageData<DashboardInfo>> {
  return tbHttp.get<PageData<DashboardInfo>>(
    '/api/tenant/dashboards',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/dashboard/{dashboardId} — full entity including configuration. */
export async function getDashboard(dashboardId: string): Promise<Dashboard> {
  return tbHttp.get<Dashboard>(`/api/dashboard/${dashboardId}`);
}

/** GET /api/dashboard/info/{dashboardId} — row shape without configuration. */
export async function getDashboardInfo(
  dashboardId: string,
): Promise<DashboardInfo> {
  return tbHttp.get<DashboardInfo>(`/api/dashboard/info/${dashboardId}`);
}

/**
 * GET /api/dashboard/{dashboardId}?includeResources=true — export payload;
 * v1 always exports with resources (no upstream includeResources prompt).
 */
export async function exportDashboard(dashboardId: string): Promise<Dashboard> {
  return tbHttp.get<Dashboard>(`/api/dashboard/${dashboardId}`, {
    includeResources: true,
  });
}

/** POST /api/dashboard — create or update (import path). */
export async function saveDashboard(dashboard: Dashboard): Promise<Dashboard> {
  return tbHttp.post<Dashboard>('/api/dashboard', dashboard);
}

/** DELETE /api/dashboard/{dashboardId} */
export async function deleteDashboard(dashboardId: string): Promise<void> {
  await tbHttp.delete(`/api/dashboard/${dashboardId}`);
}

/**
 * POST /api/dashboard/{dashboardId}/customers — replace the assigned
 * customer set (body = customer id array; ui-ngx updateDashboardCustomers).
 */
export async function updateDashboardCustomers(
  dashboardId: string,
  customerIds: Array<string>,
): Promise<Dashboard> {
  return tbHttp.post<Dashboard>(
    `/api/dashboard/${dashboardId}/customers`,
    customerIds,
  );
}

/** POST /api/dashboard/{dashboardId}/customers/add (body = customer ids). */
export async function addDashboardCustomers(
  dashboardId: string,
  customerIds: Array<string>,
): Promise<Dashboard> {
  return tbHttp.post<Dashboard>(
    `/api/dashboard/${dashboardId}/customers/add`,
    customerIds,
  );
}

/** POST /api/dashboard/{dashboardId}/customers/remove (body = customer ids). */
export async function removeDashboardCustomers(
  dashboardId: string,
  customerIds: Array<string>,
): Promise<Dashboard> {
  return tbHttp.post<Dashboard>(
    `/api/dashboard/${dashboardId}/customers/remove`,
    customerIds,
  );
}

/** POST /api/customer/public/dashboard/{dashboardId} — make public. */
export async function makeDashboardPublic(
  dashboardId: string,
): Promise<Dashboard> {
  return tbHttp.post<Dashboard>(
    `/api/customer/public/dashboard/${dashboardId}`,
  );
}

/** DELETE /api/customer/public/dashboard/{dashboardId} — make private. */
export async function makeDashboardPrivate(
  dashboardId: string,
): Promise<Dashboard> {
  return tbHttp.delete<Dashboard>(
    `/api/customer/public/dashboard/${dashboardId}`,
  );
}

/**
 * GET /api/resource/dashboard/system/gateways_dashboard.json — system
 * dashboard resource served by TbResourceController (gateways page source).
 * Returns the exported-dashboard JSON stored in the resource.
 */
export async function getSystemResourceDashboard(
  resourcePath: string,
): Promise<Dashboard> {
  return tbHttp.get<Dashboard>(
    `/api/resource/dashboard/system/${resourcePath}`,
  );
}

// ---------------------------------------------------------------------------
// Entity query (alias resolution transport)
// ---------------------------------------------------------------------------

/** Requested entity columns (name/label) for alias resolution reads. */
export interface EntityFieldKey {
  type: 'ENTITY_FIELD';
  key: string;
}

/** Row of POST /api/entitiesQuery/find (projected fields under `latest`). */
export interface EntityDataLite {
  entityId: { entityType: string; id: string };
  latest?: {
    ENTITY_FIELD?: Record<string, { ts: number; value: string } | undefined>;
  };
}

/** PageLink subset accepted by the entity query endpoint. */
export interface EntityQueryPageLink {
  pageSize: number;
  page: number;
}

/**
 * POST /api/entitiesQuery/find — filter-driven entity query backing the
 * alias resolver (entityType / deviceType / relationsQuery / apiUsageState
 * filters). Same endpoint ui-ngx entity.service.findEntityDataByQuery uses.
 */
export async function findEntitiesByFilter(
  entityFilter: Record<string, unknown>,
  pageLink: EntityQueryPageLink,
  entityFields: EntityFieldKey[] = [
    { type: 'ENTITY_FIELD', key: 'name' },
    { type: 'ENTITY_FIELD', key: 'label' },
  ],
): Promise<{ data: EntityDataLite[]; hasNext: boolean }> {
  return tbHttp.post<{ data: EntityDataLite[]; hasNext: boolean }>(
    '/api/entitiesQuery/find',
    { entityFilter, pageLink, entityFields },
  );
}

/**
 * Follow `hasNext` until the filter is exhausted (aliases can match more
 * entities than one page holds). Safety cap guards against server-side
 * pagination anomalies.
 */
export const ALIAS_QUERY_PAGE_SIZE = 500;
export const ALIAS_QUERY_MAX_ENTITIES = 5000;

export async function findAllEntitiesByFilter(
  entityFilter: Record<string, unknown>,
): Promise<EntityDataLite[]> {
  const rows: EntityDataLite[] = [];
  let page = 0;
  let hasNext = true;
  while (hasNext) {
    const result = await findEntitiesByFilter(entityFilter, {
      pageSize: ALIAS_QUERY_PAGE_SIZE,
      page,
    });
    rows.push(...(result.data ?? []));
    hasNext = result.hasNext;
    page += 1;
    if (rows.length >= ALIAS_QUERY_MAX_ENTITIES) {
      console.warn(
        '[dashboard] alias entity query hit the safety cap of ' +
          `${ALIAS_QUERY_MAX_ENTITIES} entities; truncating`,
      );
      break;
    }
  }
  return rows;
}
