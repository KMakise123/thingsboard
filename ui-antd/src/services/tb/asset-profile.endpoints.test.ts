/**
 * Asset-profile transport endpoints: paths pinned against
 * AssetProfileController (symmetric to DeviceProfileController).
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
  deleteAssetProfile,
  getAssetProfileById,
  getAssetProfileList,
  saveAssetProfile,
  setDefaultAssetProfile,
} from './asset-profile';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

describe('asset-profile transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(true as never);
  });

  it('list reads the paged full-row endpoint', async () => {
    await getAssetProfileList({
      pageSize: 10,
      page: 0,
      textSearch: 'build',
      sortOrder: { property: 'name', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/api/assetProfiles', {
      pageSize: 10,
      page: 0,
      textSearch: 'build',
      sortProperty: 'name',
      sortOrder: 'DESC',
    });
  });

  it('by-id passes inlineImages through the query string', async () => {
    await getAssetProfileById('ap-1', { inlineImages: false });
    expect(get).toHaveBeenCalledWith('/api/assetProfile/ap-1', {
      inlineImages: false,
    });
  });

  it('save posts the entity, delete and set-default use the id path', async () => {
    const profile = { id: { entityType: 'ASSET_PROFILE', id: 'ap-1' } };
    await saveAssetProfile(profile as never);
    expect(post).toHaveBeenCalledWith('/api/assetProfile', profile);

    await deleteAssetProfile('ap-1');
    expect(del).toHaveBeenCalledWith('/api/assetProfile/ap-1');

    await setDefaultAssetProfile('ap-1');
    expect(post).toHaveBeenCalledWith('/api/assetProfile/ap-1/default');
  });
});
