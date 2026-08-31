import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenStore } from '@/core/auth/token-store';
import { DeviceCredentialsType, EntityType } from '@/types/tb';

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
  activate,
  changePassword,
  getCurrentUser,
  getUserPasswordPolicy,
  login,
  logout,
  refreshToken,
  requestPasswordReset,
  resetPasswordByToken,
} from './auth';
import {
  deleteEntityAttributes,
  getAttributes,
  getLatestTelemetry,
  getTimeseries,
  saveEntityAttributes,
} from './attributes';
import {
  assignDevicesToCustomer,
  deleteDevice,
  deleteDevices,
  getCustomerDevices,
  getDeviceCredentials,
  getTenantDevices,
  importDevices,
  saveDevice,
  saveDeviceCredentials,
  unassignDevicesFromCustomer,
} from './device';

function makeJwt(sub: string, ttlSeconds = 3600): string {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const iat = Math.floor(Date.now() / 1000);
  return `${enc({ typ: 'JWT' })}.${enc({ sub, iat, exp: iat + ttlSeconds })}.sig`;
}

const tokenPair = { token: makeJwt('u'), refreshToken: makeJwt('u', 604800) };

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const entityId = { entityType: EntityType.DEVICE, id: 'd-1' } as const;

describe('auth transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clear();
  });

  it('login posts to /api/auth/login and stores the pair', async () => {
    post.mockResolvedValue({ ...tokenPair } as never);
    await login({ username: 'u', password: 'p' });
    expect(post).toHaveBeenCalledWith('/api/auth/login', { username: 'u', password: 'p' });
    expect(tokenStore.getToken()).toBe(tokenPair.token);
  });

  it('getCurrentUser reads /api/auth/user', async () => {
    get.mockResolvedValue({} as never);
    await getCurrentUser();
    expect(get).toHaveBeenCalledWith('/api/auth/user');
  });

  it('changePassword posts and refresh endpoints are exact', async () => {
    post.mockResolvedValue({ ...tokenPair } as never);
    await changePassword('old', 'new');
    expect(post).toHaveBeenCalledWith('/api/auth/changePassword', {
      currentPassword: 'old',
      newPassword: 'new',
    });
    await refreshToken('r');
    expect(post).toHaveBeenCalledWith('/api/auth/token', { refreshToken: 'r' });
  });

  it('password reset chain hits the noauth endpoints', async () => {
    post.mockResolvedValue({ ...tokenPair } as never);
    await requestPasswordReset('a@b.c');
    expect(post).toHaveBeenCalledWith('/api/noauth/resetPasswordByEmail', { email: 'a@b.c' });
    await resetPasswordByToken('token', 'newpass');
    expect(post).toHaveBeenCalledWith('/api/noauth/resetPassword', {
      resetToken: 'token',
      password: 'newpass',
    });
    await activate('token', 'newpass', true);
    expect(post).toHaveBeenCalledWith(
      '/api/noauth/activate',
      { activateToken: 'token', password: 'newpass' },
      { sendActivationMail: true },
    );
    await getUserPasswordPolicy();
    expect(get).toHaveBeenCalledWith('/api/noauth/userPasswordPolicy');
  });

  it('logout posts then clears tokens even on failure', async () => {
    post.mockRejectedValue(new Error('offline'));
    await expect(logout()).rejects.toBeTruthy();
    expect(post).toHaveBeenCalledWith('/api/auth/logout');
    expect(tokenStore.getToken()).toBeNull();
  });
});

describe('device transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue(undefined as never);
    get.mockResolvedValue(undefined as never);
    del.mockResolvedValue(undefined as never);
  });

  it('tenant list uses the V2 deviceInfos path with explicit sort', async () => {
    await getTenantDevices(
      { page: 0, pageSize: 10, sortOrder: { property: 'createdTime', direction: 'DESC' } },
      { deviceProfileId: 'p1', active: true },
    );
    expect(get).toHaveBeenCalledWith('/api/tenant/deviceInfos', {
      pageSize: 10,
      page: 0,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      type: undefined,
      deviceProfileId: 'p1',
      active: true,
    });
  });

  it('customer list uses the V2 deviceInfos path with text search', async () => {
    await getCustomerDevices('c-9', {
      page: 1,
      pageSize: 20,
      textSearch: 'th',
      sortOrder: { property: 'name', direction: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/api/customer/c-9/deviceInfos', {
      pageSize: 20,
      page: 1,
      textSearch: 'th',
      sortProperty: 'name',
      sortOrder: 'ASC',
      type: undefined,
      deviceProfileId: undefined,
      active: undefined,
    });
  });

  it('saveDevice passes accessToken as a query param', async () => {
    await saveDevice({ name: 'd' } as never, { accessToken: 'tok' });
    expect(post).toHaveBeenCalledWith('/api/device', { name: 'd' }, { accessToken: 'tok' });
  });

  it('saveDeviceCredentials posts to /api/device/credentials', async () => {
    await saveDeviceCredentials({
      credentialsType: DeviceCredentialsType.ACCESS_TOKEN,
    } as never);
    expect(post).toHaveBeenCalledWith('/api/device/credentials', {
      credentialsType: DeviceCredentialsType.ACCESS_TOKEN,
    });
  });

  it('deleteDevices fans out per id', async () => {
    await deleteDevices(['a', 'b']);
    expect(del).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledWith('/api/device/a');
    expect(del).toHaveBeenCalledWith('/api/device/b');
  });

  it('assign/unassign batch fan-outs hit the single endpoints', async () => {
    await assignDevicesToCustomer('c1', ['a', 'b']);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledWith('/api/customer/c1/device/a');
    await unassignDevicesFromCustomer(['a']);
    expect(del).toHaveBeenCalledWith('/api/customer/device/a');
  });

  it('credentials endpoints match ui-ngx', async () => {
    await getDeviceCredentials('d-1');
    expect(get).toHaveBeenCalledWith('/api/device/d-1/credentials');
  });

  it('bulk import posts JSON (CSV text in `file`) at /api/device/bulk_import', async () => {
    await importDevices({
      file: 'name,type\nThermometer,default',
      mapping: {
        columns: [{ type: 'name' }, { type: 'type' }],
        delimiter: ',',
        header: true,
        update: true,
      },
    });
    const [path, body] = post.mock.calls.at(-1) as [string, Record<string, unknown>];
    expect(path).toBe('/api/device/bulk_import');
    expect(body).not.toBeInstanceOf(FormData);
    expect(body.file).toBe('name,type\nThermometer,default');
    expect(body.mapping).toEqual({
      columns: [{ type: 'name' }, { type: 'type' }],
      delimiter: ',',
      header: true,
      update: true,
    });
  });
});

describe('attributes transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue(undefined as never);
    post.mockResolvedValue(undefined as never);
    del.mockResolvedValue(undefined as never);
  });

  it('scoped read nests the scope; unscoped read flattens; keys are comma-joined', async () => {
    await getAttributes(entityId, 'SERVER_SCOPE' as never, ['k1', 'k2']);
    expect(get).toHaveBeenCalledWith(
      '/api/plugins/telemetry/DEVICE/d-1/values/attributes/SERVER_SCOPE',
      { keys: 'k1,k2' },
    );
    await getAttributes(entityId);
    expect(get).toHaveBeenCalledWith('/api/plugins/telemetry/DEVICE/d-1/values/attributes', {
      keys: undefined,
    });
  });

  it('save splits nulls into a delete', async () => {
    await saveEntityAttributes(entityId, 'SHARED_SCOPE' as never, [
      { key: 'a', value: 1 },
      { key: 'b', value: null },
    ]);
    expect(post).toHaveBeenCalledWith('/api/plugins/telemetry/DEVICE/d-1/SHARED_SCOPE', { a: 1 });
    expect(del).toHaveBeenCalledWith('/api/plugins/telemetry/DEVICE/d-1/SHARED_SCOPE', {
      keys: 'b',
    });
  });

  it('delete sends the comma-separated keys param', async () => {
    await deleteEntityAttributes(entityId, 'SERVER_SCOPE' as never, ['x', 'y']);
    expect(del).toHaveBeenCalledWith('/api/plugins/telemetry/DEVICE/d-1/SERVER_SCOPE', {
      keys: 'x,y',
    });
  });

  it('latest telemetry and history share the timeseries path', async () => {
    await getLatestTelemetry(entityId, ['temp']);
    expect(get).toHaveBeenCalledWith('/api/plugins/telemetry/DEVICE/d-1/values/timeseries', {
      keys: 'temp',
    });
    await getTimeseries(entityId, {
      keys: ['temp'],
      startTs: 1000,
      endTs: 2000,
      agg: 'AVG' as never,
      interval: 60000,
    });
    const [path, params] = get.mock.calls.at(-1) as [string, Record<string, unknown>];
    expect(path).toBe('/api/plugins/telemetry/DEVICE/d-1/values/timeseries');
    expect(params).toMatchObject({
      keys: 'temp',
      startTs: 1000,
      endTs: 2000,
      agg: 'AVG',
      interval: 60000,
    });
  });
});
