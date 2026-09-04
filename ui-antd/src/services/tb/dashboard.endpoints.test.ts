/**
 * Dashboard transport endpoints (full M5 surface). Pins every REST path the
 * dashboards domain uses; customer-scope list/assign/unassign stay pinned in
 * customer.endpoints.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  addDashboardCustomers,
  deleteDashboard,
  exportDashboard,
  getDashboard,
  getDashboardInfo,
  getSystemResourceDashboard,
  getTenantDashboards,
  makeDashboardPrivate,
  makeDashboardPublic,
  removeDashboardCustomers,
  saveDashboard,
  updateDashboardCustomers,
} from './dashboard';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

describe('dashboard transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('pins the tenant dashboard list to /api/tenant/dashboards', async () => {
    await getTenantDashboards({
      pageSize: 20,
      page: 3,
      textSearch: 'energy',
      sortOrder: { property: 'title', direction: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/api/tenant/dashboards', {
      pageSize: 20,
      page: 3,
      textSearch: 'energy',
      sortProperty: 'title',
      sortOrder: 'ASC',
    });
  });

  it('pins single-dashboard reads', async () => {
    await getDashboard('d1');
    expect(get).toHaveBeenCalledWith('/api/dashboard/d1');
    await getDashboardInfo('d1');
    expect(get).toHaveBeenCalledWith('/api/dashboard/info/d1');
  });

  it('pins the export to includeResources=true', async () => {
    await exportDashboard('d1');
    expect(get).toHaveBeenCalledWith('/api/dashboard/d1', {
      includeResources: true,
    });
  });

  it('pins save/delete', async () => {
    const payload = {
      id: { entityType: 'DASHBOARD', id: 'd1' },
      title: 'T',
    } as never;
    await saveDashboard(payload);
    expect(post).toHaveBeenCalledWith('/api/dashboard', payload);
    await deleteDashboard('d1');
    expect(del).toHaveBeenCalledWith('/api/dashboard/d1');
  });

  it('pins the assigned-customer set endpoints (body = customer ids)', async () => {
    const ids = ['c1', 'c2'];
    await updateDashboardCustomers('d1', ids);
    expect(post).toHaveBeenCalledWith('/api/dashboard/d1/customers', ids);
    await addDashboardCustomers('d1', ids);
    expect(post).toHaveBeenCalledWith('/api/dashboard/d1/customers/add', ids);
    await removeDashboardCustomers('d1', ids);
    expect(post).toHaveBeenCalledWith(
      '/api/dashboard/d1/customers/remove',
      ids,
    );
  });

  it('pins make-public / make-private on the public-customer path', async () => {
    await makeDashboardPublic('d1');
    expect(post).toHaveBeenCalledWith('/api/customer/public/dashboard/d1');
    await makeDashboardPrivate('d1');
    expect(del).toHaveBeenCalledWith('/api/customer/public/dashboard/d1');
  });

  it('pins the system resource dashboard read (gateways page source)', async () => {
    await getSystemResourceDashboard('gateways_dashboard.json');
    expect(get).toHaveBeenCalledWith(
      '/api/resource/dashboard/system/gateways_dashboard.json',
    );
  });

  // NOTE: the widgetType fqn probe lives with its typed M9 surface in
  // services/tb/widget-type.endpoints.test.ts (getWidgetTypeByFullFqn).
});
