/**
 * 2FA settings transport endpoints (settings domain): GET/POST /api/2fa/settings.
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

import { getTwoFaSettings, saveTwoFaSettings } from './two-fa';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);

describe('two-fa transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
  });

  it('reads and saves the platform policy', async () => {
    await getTwoFaSettings();
    expect(get).toHaveBeenCalledWith('/api/2fa/settings');
    const settings = {
      providers: [{ providerType: 'TOTP', issuerName: 'ThingsBoard' }],
      minVerificationCodeSendPeriod: 30,
      totalAllowedTimeForVerification: 3600,
      enforceTwoFa: false,
    };
    await saveTwoFaSettings(settings as never);
    expect(post).toHaveBeenCalledWith('/api/2fa/settings', settings);
  });
});
