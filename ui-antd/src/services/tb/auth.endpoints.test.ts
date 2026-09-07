/**
 * Auth login-line 2FA + OAuth2 clients + public-login transport endpoints:
 * exact paths pinned against TwoFactorAuthController (/api/auth/2fa),
 * OAuth2ClientLoginInfoController (/api/noauth/oauth2Clients) and the
 * RestPublicLoginProcessingFilter (/api/auth/login/public, M15). The pre-M4
 * auth endpoints live in ./endpoints.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenStore } from '@/core/auth/token-store';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

import {
  checkTwoFaVerificationCode,
  getOauth2Clients,
  getTwoFaLoginProviders,
  publicLogin,
  sendTwoFaVerificationCode,
} from './auth';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const request = vi.mocked(tbHttp.request);

function makeJwt(ttlSeconds = 3600): string {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const iat = Math.floor(Date.now() / 1000);
  return `${enc({ typ: 'JWT' })}.${enc({ sub: 'u', iat, exp: iat + ttlSeconds })}.sig`;
}

const regularPair = { token: makeJwt(), refreshToken: makeJwt(604800) };

describe('auth login-line 2FA + oauth2 clients endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.clear();
  });

  it('login providers read /api/auth/2fa/providers', async () => {
    get.mockResolvedValue([] as never);
    await getTwoFaLoginProviders();
    expect(get).toHaveBeenCalledWith('/api/auth/2fa/providers');
  });

  it('verification/send posts with providerType in the query', async () => {
    post.mockResolvedValue(undefined as never);
    await sendTwoFaVerificationCode('EMAIL');
    expect(post).toHaveBeenCalledWith(
      '/api/auth/2fa/verification/send',
      undefined,
      { providerType: 'EMAIL' },
    );
  });

  it('verification/check posts both params in the query and stores the regular pair', async () => {
    post.mockResolvedValue({ ...regularPair } as never);
    await checkTwoFaVerificationCode('TOTP', '123456');
    expect(post).toHaveBeenCalledWith('/api/auth/2fa/verification/check', undefined, {
      providerType: 'TOTP',
      verificationCode: '123456',
    });
    expect(tokenStore.getToken()).toBe(regularPair.token);
    expect(tokenStore.getRefreshToken()).toBe(regularPair.refreshToken);
  });

  it('oauth2 clients post to /api/noauth/oauth2Clients with platform=WEB', async () => {
    post.mockResolvedValue([] as never);
    await getOauth2Clients();
    expect(post).toHaveBeenCalledWith('/api/noauth/oauth2Clients', undefined, {
      platform: 'WEB',
    });
  });

  it('oauth2 clients failure degrades to an empty list (ui-ngx parity)', async () => {
    post.mockRejectedValue(new Error('oauth2 disabled'));
    await expect(getOauth2Clients()).resolves.toEqual([]);
  });

  it('publicLogin posts auth-exempt to /api/auth/login/public and stores the full pair', async () => {
    request.mockResolvedValue({ ...regularPair } as never);
    await publicLogin('public-customer-id');
    expect(request).toHaveBeenCalledWith('/api/auth/login/public', {
      method: 'POST',
      body: { publicId: 'public-customer-id' },
      // 401 must surface as "link invalid" at the gate — the shared refresh
      // chain / unauthorized exit must never fire for this call.
      authExempt: true,
    });
    expect(tokenStore.getToken()).toBe(regularPair.token);
    expect(tokenStore.getRefreshToken()).toBe(regularPair.refreshToken);
  });

  it('publicLogin rethrows failures and stores nothing', async () => {
    request.mockRejectedValue(new Error('401'));
    await expect(publicLogin('bogus')).rejects.toThrow('401');
    expect(tokenStore.getToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });
});
