/**
 * Customer transport (handwritten). M1 shipped only the assign-dialog
 * picker; M2 adds the customer CRUD surface and the customer-scope
 * dashboard list + assign/unassign minimal set (spec M2: rendering belongs
 * to the dashboards domain in M5 — RECON risk 5).
 *
 * Customer-scope queries for other domains live with their own domain files
 * (devices → device.ts, assets → asset.ts, entity views → entity-view.ts,
 * users → user.ts) so function names never collide in services/tb/index.
 */

import {
  type Customer,
  type PageData,
  type PageLink,
  pageLinkToQueryParams,
} from '@/types/tb';

import { tbHttp } from './http';

/** GET /api/customers — tenant-scope paged customer list (assign dialog source). */
export async function getCustomers(
  pageLink: PageLink,
): Promise<PageData<Customer>> {
  return tbHttp.get<PageData<Customer>>(
    '/api/customers',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/customer/{customerId} */
export async function getCustomerById(customerId: string): Promise<Customer> {
  return tbHttp.get<Customer>(`/api/customer/${customerId}`);
}

/** POST /api/customer (create and update). */
export async function saveCustomer(customer: Customer): Promise<Customer> {
  return tbHttp.post<Customer>('/api/customer', customer);
}

/** DELETE /api/customer/{customerId} */
export async function deleteCustomer(customerId: string): Promise<void> {
  await tbHttp.delete(`/api/customer/${customerId}`);
}

/**
 * GET /api/customer/{customerId}/title — text/plain title (cheap breadcrumb
 * / scope-page header source; the http client falls back to raw text).
 */
export async function getCustomerTitle(customerId: string): Promise<string> {
  return tbHttp.get<string>(`/api/customer/${customerId}/title`);
}

/**
 * Minimal dashboard digest for the M2 customer-scope page. The dashboards
 * domain (M5) owns the full type — replace then (RECON risk 5).
 */
export interface CustomerDashboardInfo {
  id: { entityType: 'DASHBOARD'; id: string };
  createdTime: number;
  title: string;
}

/** GET /api/customer/{customerId}/dashboards (legacy non-Infos shape). */
export async function getCustomerDashboards(
  customerId: string,
  pageLink: PageLink,
): Promise<PageData<CustomerDashboardInfo>> {
  return tbHttp.get<PageData<CustomerDashboardInfo>>(
    `/api/customer/${customerId}/dashboards`,
    pageLinkToQueryParams(pageLink),
  );
}

/** POST /api/customer/{customerId}/dashboard/{dashboardId} */
export async function assignDashboardToCustomer(
  customerId: string,
  dashboardId: string,
): Promise<CustomerDashboardInfo> {
  return tbHttp.post<CustomerDashboardInfo>(
    `/api/customer/${customerId}/dashboard/${dashboardId}`,
  );
}

/** DELETE /api/customer/{customerId}/dashboard/{dashboardId} */
export async function unassignDashboardFromCustomer(
  customerId: string,
  dashboardId: string,
): Promise<void> {
  await tbHttp.delete(
    `/api/customer/${customerId}/dashboard/${dashboardId}`,
  );
}
