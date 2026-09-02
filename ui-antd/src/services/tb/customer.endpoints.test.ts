/**
 * Customer transport endpoints. Paths exist on this backend's openapi
 * snapshot (RECON §3, verified 2026-09-01). The dashboards scope endpoints
 * keep the legacy non-Infos shape (only what the M2 customer-scope page
 * needs; the dashboards domain lands in M5).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Customer } from '@/types/tb';
import { EntityType } from '@/types/tb';

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
  assignDashboardToCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomerDashboards,
  getCustomerTitle,
  getCustomers,
  saveCustomer,
  unassignDashboardFromCustomer,
} from './customer';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const PAGE_LINK = {
  pageSize: 20,
  page: 0,
  textSearch: 'factory',
  sortOrder: { property: 'title', direction: 'ASC' as const },
};

describe('customer transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('keeps the assign-picker list pinned to /api/customers', async () => {
    await getCustomers(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/customers', {
      pageSize: 20,
      page: 0,
      textSearch: 'factory',
      sortProperty: 'title',
      sortOrder: 'ASC',
    });
  });

  it('pins the customer CRUD endpoints', async () => {
    await getCustomerById('cust-1');
    expect(get).toHaveBeenCalledWith('/api/customer/cust-1');

    await getCustomerTitle('cust-1');
    expect(get).toHaveBeenCalledWith('/api/customer/cust-1/title');

    await saveCustomer({
      id: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
      createdTime: 0,
      tenantId: { entityType: EntityType.TENANT, id: 't-1' },
      title: 'Factory A',
    } satisfies Customer);
    expect(post).toHaveBeenCalledWith('/api/customer', {
      id: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
      createdTime: 0,
      tenantId: { entityType: EntityType.TENANT, id: 't-1' },
      title: 'Factory A',
    });

    await deleteCustomer('cust-1');
    expect(del).toHaveBeenCalledWith('/api/customer/cust-1');
  });

  it('reads the scoped dashboards page and assigns/unassigns', async () => {
    await getCustomerDashboards('cust-1', PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/customer/cust-1/dashboards', {
      pageSize: 20,
      page: 0,
      textSearch: 'factory',
      sortProperty: 'title',
      sortOrder: 'ASC',
    });

    await assignDashboardToCustomer('cust-1', 'dash-1');
    expect(post).toHaveBeenCalledWith(
      '/api/customer/cust-1/dashboard/dash-1',
    );

    await unassignDashboardFromCustomer('cust-1', 'dash-1');
    expect(del).toHaveBeenCalledWith(
      '/api/customer/cust-1/dashboard/dash-1',
    );
  });
});
