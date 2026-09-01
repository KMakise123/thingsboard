/**
 * Version-control transport endpoints (device detail VC tab). Paths exist
 * on this backend's openapi snapshot — verified before building the tab.
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
  awaitVersionCreateResult,
  awaitVersionLoadResult,
  compareEntityDataToVersion,
  deleteAutoCommitSettings,
  getAutoCommitSettings,
  getEntityDataInfo,
  getRepositorySettingsInfo,
  getVersionCreateRequestStatus,
  getVersionLoadRequestStatus,
  listBranches,
  listEntityVersions,
  loadEntitiesVersion,
  saveAutoCommitSettings,
  saveEntitiesVersion,
} from './version-control';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const entityId = { entityType: EntityType.DEVICE, id: 'd-1' };

describe('version-control transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('gates on repository settings info and reads auto-commit settings', async () => {
    await getRepositorySettingsInfo();
    expect(get).toHaveBeenCalledWith('/api/admin/repositorySettings/info');

    get.mockResolvedValue({ DEVICE: { branch: 'master' } } as never);
    await saveAutoCommitSettings({ DEVICE: { branch: 'master' } });
    expect(post).toHaveBeenCalledWith('/api/admin/autoCommitSettings', {
      DEVICE: { branch: 'master' },
    });
    await deleteAutoCommitSettings();
    expect(del).toHaveBeenCalledWith('/api/admin/autoCommitSettings');
  });

  it('degrades a 404 auto-commit settings read to null', async () => {
    get.mockRejectedValue(
      Object.assign(new Error('Not found'), { status: 404 }),
    );
    await expect(getAutoCommitSettings()).resolves.toBeNull();
    get.mockRejectedValue(
      Object.assign(new Error('Server error'), { status: 500 }),
    );
    await expect(getAutoCommitSettings()).rejects.toThrow('Server error');
  });

  it('lists branches and the entity-scoped version page', async () => {
    await listBranches();
    expect(get).toHaveBeenCalledWith('/api/entities/vc/branches');

    await listEntityVersions(
      EntityType.DEVICE,
      'd-1',
      'master',
      {
        pageSize: 10,
        page: 0,
        sortOrder: { property: 'timestamp', direction: 'DESC' },
      },
    );
    expect(get).toHaveBeenCalledWith('/api/entities/vc/version/DEVICE/d-1', {
      branch: 'master',
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'timestamp',
      sortOrder: 'DESC',
    });
  });

  it('posts create/load requests and reads both status endpoints', async () => {
    post.mockResolvedValue('req-1' as never);
    get.mockResolvedValue({ done: true } as never);

    await saveEntitiesVersion({
      type: 'SINGLE_ENTITY',
      branch: 'master',
      versionName: 'v1',
      entityId,
      config: { saveCredentials: true },
    });
    expect(post).toHaveBeenCalledWith('/api/entities/vc/version', {
      type: 'SINGLE_ENTITY',
      branch: 'master',
      versionName: 'v1',
      entityId,
      config: { saveCredentials: true },
    });

    await loadEntitiesVersion({
      type: 'SINGLE_ENTITY',
      versionId: 'ver-1',
      externalEntityId: entityId,
      config: { loadCredentials: true },
    });
    expect(post).toHaveBeenCalledWith('/api/entities/vc/entity', {
      type: 'SINGLE_ENTITY',
      versionId: 'ver-1',
      externalEntityId: entityId,
      config: { loadCredentials: true },
    });

    await getVersionCreateRequestStatus('req-1');
    expect(get).toHaveBeenCalledWith('/api/entities/vc/version/req-1/status');
    await getVersionLoadRequestStatus('req-1');
    expect(get).toHaveBeenCalledWith('/api/entities/vc/entity/req-1/status');

    await expect(awaitVersionCreateResult('req-1', 1)).resolves.toEqual({
      done: true,
    });
    await expect(awaitVersionLoadResult('req-1', 1)).resolves.toEqual({
      done: true,
    });
  });

  it('keeps polling create/load status until done', async () => {
    post.mockResolvedValue('req-2' as never);
    get
      .mockResolvedValueOnce({ done: false } as never)
      .mockResolvedValueOnce({ done: false } as never)
      .mockResolvedValue({ done: true, modified: 1 } as never);
    await expect(awaitVersionCreateResult('req-2', 1)).resolves.toMatchObject({
      done: true,
    });

    get
      .mockResolvedValueOnce({ done: false } as never)
      .mockResolvedValue({ done: true, result: [] } as never);
    await expect(awaitVersionLoadResult('req-2', 1)).resolves.toMatchObject({
      done: true,
    });
  });

  it('reads the diff and versioned-data-info endpoints', async () => {
    await compareEntityDataToVersion(EntityType.DEVICE, 'd-1', 'ver-1');
    expect(get).toHaveBeenCalledWith('/api/entities/vc/diff/DEVICE/d-1', {
      versionId: 'ver-1',
    });

    await getEntityDataInfo('ver-1', entityId);
    expect(get).toHaveBeenCalledWith(
      '/api/entities/vc/info/ver-1/DEVICE/d-1',
    );
  });
});
