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
  checkRepositoryAccess,
  compareEntityDataToVersion,
  deleteAutoCommitSettings,
  deleteRepositorySettings,
  getAutoCommitSettings,
  getEntityDataInfo,
  getRepositorySettings,
  getRepositorySettingsInfo,
  getVersionCreateRequestStatus,
  getVersionLoadRequestStatus,
  listBranches,
  listEntityVersions,
  listVersions,
  loadEntitiesVersion,
  saveAutoCommitSettings,
  saveEntitiesVersion,
  saveRepositorySettings,
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

  it('lists all-type versions of a branch (M14 wave-1)', async () => {
    await listVersions('master', {
      pageSize: 10,
      page: 0,
      sortOrder: { property: 'timestamp', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/api/entities/vc/version', {
      branch: 'master',
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'timestamp',
      sortOrder: 'DESC',
    });
  });

  it('round-trips the repository settings family', async () => {
    await getRepositorySettings();
    expect(get).toHaveBeenCalledWith('/api/admin/repositorySettings');

    // GET 404 (not configured) degrades to null, like auto-commit settings.
    get.mockRejectedValue(
      Object.assign(new Error('Not found'), { status: 404 }),
    );
    await expect(getRepositorySettings()).resolves.toBeNull();

    const settings = {
      repositoryUri: 'file:///tmp/repo.git',
      authMethod: 'USERNAME_PASSWORD' as const,
      defaultBranch: 'main',
      readOnly: false,
      showMergeCommits: true,
      // Credentials left untouched are STRIPPED by the caller — the
      // service posts the body verbatim.
    };
    await saveRepositorySettings(settings);
    expect(post).toHaveBeenCalledWith('/api/admin/repositorySettings', settings);

    await checkRepositoryAccess(settings);
    expect(post).toHaveBeenCalledWith(
      '/api/admin/repositorySettings/checkAccess',
      settings,
    );

    await deleteRepositorySettings();
    expect(del).toHaveBeenCalledWith('/api/admin/repositorySettings');
  });

  it('posts COMPLEX create / ENTITY_TYPE load request shapes', async () => {
    post.mockResolvedValue('req-c1' as never);
    const complexRequest = {
      type: 'COMPLEX' as const,
      branch: 'master',
      versionName: 'snapshot-1',
      syncStrategy: 'MERGE' as const,
      entityTypes: {
        [EntityType.DEVICE]: {
          saveCredentials: true,
          syncStrategy: 'OVERWRITE' as const,
          allEntities: true,
        },
        [EntityType.DASHBOARD]: { saveRelations: false, entityIds: ['dash-1'] },
      },
    };
    await saveEntitiesVersion(complexRequest as never);
    expect(post).toHaveBeenCalledWith('/api/entities/vc/version', complexRequest);

    const entityTypeLoadRequest = {
      type: 'ENTITY_TYPE' as const,
      versionId: 'ver-1',
      rollbackOnError: true,
      entityTypes: {
        [EntityType.DEVICE]: {
          loadCredentials: true,
          removeOtherEntities: true,
          findExistingEntityByName: true,
        },
      },
    };
    await loadEntitiesVersion(entityTypeLoadRequest as never);
    expect(post).toHaveBeenCalledWith('/api/entities/vc/entity', entityTypeLoadRequest);
  });

  describe('await* polling (fake timers, contract #10)', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('resolves as soon as a done terminal arrives', async () => {
      vi.useFakeTimers();
      get
        .mockResolvedValueOnce({ done: false } as never)
        .mockResolvedValue({ done: true, modified: 2 } as never);
      const promise = awaitVersionCreateResult('req-p1', 1000);
      const expectation = expect(promise).resolves.toMatchObject({
        done: true,
        modified: 2,
      });
      await vi.advanceTimersByTimeAsync(1000);
      await expectation;
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('tolerates transient 400/404 statuses then resolves', async () => {
      vi.useFakeTimers();
      get
        .mockRejectedValueOnce(
          Object.assign(new Error('Invalid task'), { status: 400 }),
        )
        .mockRejectedValueOnce(
          Object.assign(new Error('Task execution timed-out'), { status: 404 }),
        )
        .mockResolvedValue({ done: true, added: 1 } as never);
      const promise = awaitVersionCreateResult('req-p2', 1000);
      const expectation = expect(promise).resolves.toMatchObject({ done: true });
      await vi.advanceTimersByTimeAsync(3000);
      await expectation;
      expect(get).toHaveBeenCalledTimes(3);
    });

    it('fails after more than three consecutive transient statuses', async () => {
      vi.useFakeTimers();
      const transient = () =>
        Object.assign(new Error('Task execution timed-out'), { status: 404 });
      get
        .mockRejectedValueOnce(transient())
        .mockRejectedValueOnce(transient())
        .mockRejectedValueOnce(transient())
        .mockRejectedValue(transient());
      const promise = awaitVersionCreateResult('req-p3', 1000);
      const expectation = expect(promise).rejects.toThrow(
        'Task execution timed-out',
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await expectation;
      // 3 tolerated + the 4th one that fails the poll.
      expect(get).toHaveBeenCalledTimes(4);
    });

    it('rejects a non-terminal task that outlives the 180s budget', async () => {
      vi.useFakeTimers();
      get.mockResolvedValue({ done: false } as never);
      const promise = awaitVersionCreateResult('req-p4');
      const expectation = expect(promise).rejects.toThrow(
        'Version control request timed out',
      );
      // The budget check runs after each fetch, so the rejection lands on
      // the first poll past 180_000ms (t=182s with the 2s cadence).
      await vi.advanceTimersByTimeAsync(185_000);
      await expectation;
    });

    it('keeps the load-side poller on the same contract', async () => {
      vi.useFakeTimers();
      get
        .mockRejectedValueOnce(
          Object.assign(new Error('Invalid task'), { status: 400 }),
        )
        .mockResolvedValue({
          done: true,
          result: [{ entityType: 'DEVICE', created: 1 }],
        } as never);
      const promise = awaitVersionLoadResult('req-p5', 1000);
      const expectation = expect(promise).resolves.toMatchObject({
        done: true,
      });
      await vi.advanceTimersByTimeAsync(2000);
      await expectation;
    });
  });
});
