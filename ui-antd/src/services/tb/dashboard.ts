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

/**
 * Minimal widget-type digest for the registry resolver fallback probe
 * (GET /api/widgetType?fqn=…). CE descriptors are Angular script payloads;
 * v1 only needs existence + a runtime hint, never the scripts.
 */
export interface WidgetTypeDigest {
  fqn?: string;
  name?: string;
  /** descriptor body (templateHtml/controllerScript/resources…), passthrough. */
  descriptor?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * GET /api/widgetType?fqn={fqn} — existence probe for widget fqns the
 * built-in registry misses; 404 maps to the 'missing' placeholder.
 */
export async function getWidgetTypeByFqn(
  fqn: string,
): Promise<WidgetTypeDigest> {
  return tbHttp.get<WidgetTypeDigest>('/api/widgetType', { fqn });
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
