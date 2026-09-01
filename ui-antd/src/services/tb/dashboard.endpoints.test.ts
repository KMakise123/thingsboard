/**
 * Dashboard transport endpoints (minimal M2 seed). The tenant list feeds
 * the customer-scope "assign dashboard" picker; the customer-scope list and
 * assign/unassign live in customer.endpoints.test.ts.
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

import { getTenantDashboards } from './dashboard';

const get = vi.mocked(tbHttp.get);

describe('dashboard transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
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
});
