/**
 * Account 2FA transport endpoints (M4): exact paths pinned against
 * TwoFactorAuthConfigController (/api/2fa) — settings read, provider types,
 * generate/submit/verify/update/delete of the per-user config.
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
  deleteTwoFaAccountConfig,
  generateTwoFaAccountConfig,
  getAccountTwoFaSettings,
  getAvailableTwoFaProviderTypes,
  submitTwoFaAccountConfig,
  updateTwoFaAccountConfig,
  verifyAndSaveTwoFaAccountConfig,
} from './two-fa-account';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const put = vi.mocked(tbHttp.put);
const del = vi.mocked(tbHttp.delete);

const settings = { configs: {} };

describe('two-fa-account transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue(settings as never);
    post.mockResolvedValue(settings as never);
    put.mockResolvedValue(undefined as never);
    del.mockResolvedValue(settings as never);
  });

  it('account settings + available provider types', async () => {
    await getAccountTwoFaSettings();
    expect(get).toHaveBeenCalledWith('/api/2fa/account/settings');
    await getAvailableTwoFaProviderTypes();
    expect(get).toHaveBeenCalledWith('/api/2fa/providers');
  });

  it('generate passes providerType in the query', async () => {
    await generateTwoFaAccountConfig('TOTP');
    expect(post).toHaveBeenCalledWith(
      '/api/2fa/account/config/generate',
      undefined,
      { providerType: 'TOTP' },
    );
  });

  it('submit posts the config body (code mail is triggered server-side)', async () => {
    const config = { providerType: 'SMS', phoneNumber: '+1234', useByDefault: false };
    await submitTwoFaAccountConfig(config as never);
    expect(post).toHaveBeenCalledWith('/api/2fa/account/config/submit', config);
  });

  it('verifyAndSave posts the config; verificationCode rides the query when present', async () => {
    const config = { providerType: 'TOTP', authUrl: 'otpauth://x', useByDefault: false };
    await verifyAndSaveTwoFaAccountConfig(config as never, '123456');
    expect(post).toHaveBeenCalledWith('/api/2fa/account/config', config, {
      verificationCode: '123456',
    });
    await verifyAndSaveTwoFaAccountConfig(config as never);
    expect(post).toHaveBeenCalledWith('/api/2fa/account/config', config, {
      verificationCode: undefined,
    });
  });

  it('update flips useByDefault via PUT with providerType in the query', async () => {
    await updateTwoFaAccountConfig('EMAIL', true);
    expect(put).toHaveBeenCalledWith(
      '/api/2fa/account/config',
      { useByDefault: true },
      { providerType: 'EMAIL' },
    );
  });

  it('delete deactivates and returns the fresh settings', async () => {
    const result = await deleteTwoFaAccountConfig('BACKUP_CODE');
    expect(del).toHaveBeenCalledWith('/api/2fa/account/config', {
      providerType: 'BACKUP_CODE',
    });
    expect(result).toEqual(settings);
  });
});
