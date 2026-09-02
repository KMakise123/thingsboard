/**
 * Tenant-profile transport endpoints (RECON §3, TenantProfileController):
 * the full/detail shape lives under /api/tenantProfile, the digests under
 * /api/tenantProfileInfos (+ /default), set-default is a POST on
 * /{id}/default.
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

import {
  deleteTenantProfile,
  getDefaultTenantProfileInfo,
  getTenantProfileById,
  getTenantProfileInfoById,
  getTenantProfileInfos,
  getTenantProfiles,
  saveTenantProfile,
  setDefaultTenantProfile,
} from './tenant-profile';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

describe('tenant-profile transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('pins the paged lists (full + infos)', async () => {
    await getTenantProfiles({
      pageSize: 20,
      page: 1,
      textSearch: 'gold',
      sortOrder: { property: 'name', direction: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/api/tenantProfiles', {
      pageSize: 20,
      page: 1,
      textSearch: 'gold',
      sortProperty: 'name',
      sortOrder: 'ASC',
    });

    await getTenantProfileInfos({
      pageSize: 50,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'name', direction: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/api/tenantProfileInfos', {
      pageSize: 50,
      page: 0,
      sortProperty: 'name',
      sortOrder: 'ASC',
    });
  });

  it('pins the profile CRUD + default endpoints', async () => {
    await getTenantProfileById('profile-1');
    expect(get).toHaveBeenCalledWith('/api/tenantProfile/profile-1');

    await getTenantProfileInfoById('profile-1');
    expect(get).toHaveBeenCalledWith('/api/tenantProfileInfo/profile-1');

    await getDefaultTenantProfileInfo();
    expect(get).toHaveBeenCalledWith('/api/tenantProfileInfo/default');

    await saveTenantProfile({
      id: { entityType: EntityType.TENANT_PROFILE, id: 'profile-1' },
      createdTime: 0,
      name: 'Gold',
    });
    expect(post).toHaveBeenCalledWith('/api/tenantProfile', {
      id: { entityType: EntityType.TENANT_PROFILE, id: 'profile-1' },
      createdTime: 0,
      name: 'Gold',
    });

    await deleteTenantProfile('profile-1');
    expect(del).toHaveBeenCalledWith('/api/tenantProfile/profile-1');

    await setDefaultTenantProfile('profile-1');
    expect(post).toHaveBeenCalledWith('/api/tenantProfile/profile-1/default');
  });
});
