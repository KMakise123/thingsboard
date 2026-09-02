/**
 * Device-profile transport endpoints: paths and params pinned against
 * DeviceProfileController (plus the rule-chain/queue/OTA lookups the
 * profile General form consumes).
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

import { OtaPackageType } from '@/types/tb/device-profile';

import {
  deleteDeviceProfile,
  getDeviceProfileById,
  getDeviceProfileInfos,
  getDeviceProfileList,
  getOtaPackagesByDeviceProfile,
  getRuleEngineQueues,
  getTenantRuleChains,
  saveDeviceProfile,
  setDefaultDeviceProfile,
} from './device-profile';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

describe('device-profile transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(true as never);
  });

  it('list reads the paged full-row endpoint with explicit sort', async () => {
    await getDeviceProfileList({
      pageSize: 10,
      page: 2,
      textSearch: 'sensor',
      sortOrder: { property: 'transportType', direction: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/api/deviceProfiles', {
      pageSize: 10,
      page: 2,
      textSearch: 'sensor',
      sortProperty: 'transportType',
      sortOrder: 'ASC',
    });
  });

  it('infos digest hits /api/deviceProfileInfos', async () => {
    await getDeviceProfileInfos({
      pageSize: 50,
      page: 0,
      sortOrder: { property: 'name', direction: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/api/deviceProfileInfos', {
      pageSize: 50,
      page: 0,
      textSearch: undefined,
      sortProperty: 'name',
      sortOrder: 'ASC',
    });
  });

  it('by-id passes inlineImages through the query string', async () => {
    await getDeviceProfileById('dp-1', { inlineImages: true });
    expect(get).toHaveBeenCalledWith('/api/deviceProfile/dp-1', {
      inlineImages: true,
    });
  });

  it('save posts the entity, delete and set-default use the id path', async () => {
    const profile = { id: { entityType: 'DEVICE_PROFILE', id: 'dp-1' } };
    await saveDeviceProfile(profile as never);
    expect(post).toHaveBeenCalledWith('/api/deviceProfile', profile);

    await deleteDeviceProfile('dp-1');
    expect(del).toHaveBeenCalledWith('/api/deviceProfile/dp-1');

    await setDefaultDeviceProfile('dp-1');
    expect(post).toHaveBeenCalledWith('/api/deviceProfile/dp-1/default');
  });

  it('rule-chain lookup pins the CORE/EDGE type param', async () => {
    await getTenantRuleChains(
      { pageSize: 50, page: 0, sortOrder: { property: 'name', direction: 'ASC' } },
      'EDGE',
    );
    expect(get).toHaveBeenCalledWith('/api/ruleChains', {
      pageSize: 50,
      page: 0,
      textSearch: undefined,
      sortProperty: 'name',
      sortOrder: 'ASC',
      type: 'EDGE',
    });
  });

  it('queue lookup pins serviceType=TB_RULE_ENGINE', async () => {
    await getRuleEngineQueues({
      pageSize: 50,
      page: 0,
      sortOrder: { property: 'name', direction: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/api/queues', {
      pageSize: 50,
      page: 0,
      textSearch: undefined,
      sortProperty: 'name',
      sortOrder: 'ASC',
      serviceType: 'TB_RULE_ENGINE',
    });
  });

  it('OTA lookup scopes packages by profile id and FIRMWARE/SOFTWARE type', async () => {
    await getOtaPackagesByDeviceProfile(
      'dp-1',
      OtaPackageType.SOFTWARE,
      { pageSize: 50, page: 0, sortOrder: { property: 'title', direction: 'ASC' } },
    );
    expect(get).toHaveBeenCalledWith('/api/otaPackages/dp-1/SOFTWARE', {
      pageSize: 50,
      page: 0,
      textSearch: undefined,
      sortProperty: 'title',
      sortOrder: 'ASC',
    });
  });
});
