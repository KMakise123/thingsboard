/**
 * Asset transport endpoints. Paths exist on this backend's openapi snapshot
 * (RECON §3, verified 2026-09-01); double-path reads always go V2 Infos.
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
  assignAssetToCustomer,
  deleteAsset,
  findAssetsByQuery,
  getAssetInfoById,
  getAssetProfiles,
  getAssetTypes,
  getCustomerAssets,
  getTenantAssets,
  importAssets,
  makeAssetPublic,
  saveAsset,
  unassignAssetFromCustomer,
} from './asset';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const PAGE_LINK = {
  pageSize: 20,
  page: 0,
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

describe('asset transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('reads the tenant page from the V2 assetInfos path', async () => {
    await getTenantAssets(PAGE_LINK, { assetProfileId: 'prof-1' });
    expect(get).toHaveBeenCalledWith('/api/tenant/assetInfos', {
      pageSize: 20,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      type: undefined,
      assetProfileId: 'prof-1',
    });
  });

  it('reads the customer scope from the V2 path', async () => {
    await getCustomerAssets('cust-1', PAGE_LINK);
    expect(get).toHaveBeenCalledWith(
      '/api/customer/cust-1/assetInfos',
      expect.objectContaining({ pageSize: 20 }),
    );
  });

  it('pins the single-entity CRUD endpoints', async () => {
    await getAssetInfoById('a-1');
    expect(get).toHaveBeenCalledWith('/api/asset/info/a-1');

    await saveAsset({
      id: { entityType: EntityType.ASSET, id: 'a-1' },
      createdTime: 0,
      name: 'Room',
    });
    expect(post).toHaveBeenCalledWith('/api/asset', {
      id: { entityType: EntityType.ASSET, id: 'a-1' },
      createdTime: 0,
      name: 'Room',
    });

    await deleteAsset('a-1');
    expect(del).toHaveBeenCalledWith('/api/asset/a-1');
  });

  it('pins assign/unassign on the customer endpoints', async () => {
    await assignAssetToCustomer('cust-1', 'a-1');
    expect(post).toHaveBeenCalledWith('/api/customer/cust-1/asset/a-1');

    await unassignAssetFromCustomer('a-1');
    expect(del).toHaveBeenCalledWith('/api/customer/asset/a-1');
  });

  it('pins make-public on the public-customer endpoint', async () => {
    await makeAssetPublic('a-1');
    expect(post).toHaveBeenCalledWith('/api/customer/public/asset/a-1');
  });

  it('reads filter sources and runs the selector/import posts', async () => {
    await getAssetTypes();
    expect(get).toHaveBeenCalledWith('/api/asset/types');

    await getAssetProfiles(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/assetProfileInfos', {
      pageSize: 20,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });

    await findAssetsByQuery({ entityFilter: { type: 'DEVICE' } });
    expect(post).toHaveBeenCalledWith('/api/assets', {
      entityFilter: { type: 'DEVICE' },
    });

    await importAssets({ file: 'a,b', mapping: { columns: [], delimiter: ',', header: true, update: false } });
    expect(post).toHaveBeenCalledWith('/api/asset/bulk_import', {
      file: 'a,b',
      mapping: { columns: [], delimiter: ',', header: true, update: false },
    });
  });
});
