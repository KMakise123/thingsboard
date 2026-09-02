/**
 * Tenant transport endpoints (RECON §3, TenantController). Paths + query
 * shapes pinned: the Infos list carries tenantProfileName, the
 * tenant-admins list hangs under /api/tenant/{tenantId}/users (SA only).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { deleteTenant, getTenantInfo, getTenantInfos, getTenantUsers, saveTenant } from './tenant';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const PAGE_LINK = {
  pageSize: 20,
  page: 3,
  textSearch: 'acme',
  sortOrder: { property: 'title', direction: 'ASC' as const },
};

describe('tenant transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('pins the paged Infos list to /api/tenantInfos', async () => {
    await getTenantInfos(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/tenantInfos', {
      pageSize: 20,
      page: 3,
      textSearch: 'acme',
      sortProperty: 'title',
      sortOrder: 'ASC',
    });
  });

  it('pins the tenant CRUD endpoints to the info shape', async () => {
    await getTenantInfo('tenant-1');
    expect(get).toHaveBeenCalledWith('/api/tenant/info/tenant-1');

    await saveTenant({
      id: { entityType: EntityType.TENANT, id: 'tenant-1' },
      createdTime: 0,
      tenantProfileId: {
        entityType: EntityType.TENANT_PROFILE,
        id: 'profile-1',
      },
      title: 'ACME',
    });
    expect(post).toHaveBeenCalledWith('/api/tenant', {
      id: { entityType: EntityType.TENANT, id: 'tenant-1' },
      createdTime: 0,
      tenantProfileId: {
        entityType: EntityType.TENANT_PROFILE,
        id: 'profile-1',
      },
      title: 'ACME',
    });

    await deleteTenant('tenant-1');
    expect(del).toHaveBeenCalledWith('/api/tenant/tenant-1');
  });

  it('pins the tenant-admins list under /api/tenant/{tenantId}/users', async () => {
    await getTenantUsers('tenant-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/api/tenant/tenant-1/users', {
      pageSize: 10,
      page: 0,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
  });
});
