/**
 * Admin-settings transport endpoints (settings domain): paths and the
 * settings-key routing pinned against AdminController / MailConfigTemplateController.
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
  generateMailOauth2AccessToken,
  getAdminSettings,
  getJwtSettings,
  getMailConfigTemplates,
  getMailOauth2LoginProcessingUrl,
  getSecuritySettings,
  saveAdminSettings,
  saveJwtSettings,
  saveSecuritySettings,
  sendTestMail,
  sendTestSms,
} from './admin';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);

describe('admin settings transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
  });

  it('settings buckets read/write by key', async () => {
    await getAdminSettings('general');
    expect(get).toHaveBeenCalledWith('/api/admin/settings/general');
    await getAdminSettings('connectivity');
    expect(get).toHaveBeenCalledWith('/api/admin/settings/connectivity');
    await getAdminSettings('mail');
    expect(get).toHaveBeenCalledWith('/api/admin/settings/mail');

    const body = { key: 'general', jsonValue: { baseUrl: 'http://x' } };
    await saveAdminSettings(body);
    expect(post).toHaveBeenCalledWith('/api/admin/settings', body);
  });

  it('test mail posts the full mail settings envelope', async () => {
    const body = {
      key: 'mail',
      jsonValue: {
        mailFrom: 'a@b.c',
        enableOauth2: false,
        smtpProtocol: 'SMTP',
        smtpHost: 'localhost',
        smtpPort: 25,
        timeout: 10000,
        enableTls: false,
        enableProxy: false,
        providerId: 'CUSTOM',
      },
    };
    await sendTestMail(body as never);
    expect(post).toHaveBeenCalledWith('/api/admin/settings/testMail', body);
  });

  it('mail oauth2 flow endpoints', async () => {
    await getMailOauth2LoginProcessingUrl();
    expect(get).toHaveBeenCalledWith(
      '/api/admin/mail/oauth2/loginProcessingUrl',
    );
    await generateMailOauth2AccessToken();
    expect(get).toHaveBeenCalledWith('/api/admin/mail/oauth2/authorize');
    await getMailConfigTemplates();
    expect(get).toHaveBeenCalledWith('/api/mail/config/template');
  });

  it('security settings round-trip (M14 wave-1)', async () => {
    get.mockResolvedValue({
      passwordPolicy: { minimumLength: 6 },
      userActivationTokenTtl: 24,
      passwordResetTokenTtl: 24,
    } as never);
    await getSecuritySettings();
    expect(get).toHaveBeenCalledWith('/api/admin/securitySettings');

    const settings = {
      passwordPolicy: { minimumLength: 8 },
      maxFailedLoginAttempts: 5,
      userLockoutNotificationEmail: 'ops@example.com',
      mobileSecretKeyLength: 16,
      userActivationTokenTtl: 24,
      passwordResetTokenTtl: 24,
    };
    await saveSecuritySettings(settings);
    expect(post).toHaveBeenCalledWith('/api/admin/securitySettings', settings);
  });

  it('jwt settings read + save (save responds with a fresh token pair)', async () => {
    get.mockResolvedValue({
      tokenExpirationTime: 9000,
      refreshTokenExpTime: 604800,
      tokenIssuer: 'thingsboard.io',
      tokenSigningKey: 'abc==',
    } as never);
    await getJwtSettings();
    expect(get).toHaveBeenCalledWith('/api/admin/jwtSettings');

    const settings = { tokenIssuer: 'thingsboard.io', tokenSigningKey: 'abc==' };
    post.mockResolvedValue({ token: 't', refreshToken: 'r' } as never);
    await expect(saveJwtSettings(settings)).resolves.toEqual({
      token: 't',
      refreshToken: 'r',
    });
    expect(post).toHaveBeenCalledWith('/api/admin/jwtSettings', settings);
  });

  it('test sms posts the request-body configuration (no save first)', async () => {
    const request = {
      providerConfiguration: {
        type: 'TWILIO' as const,
        accountSid: 'sid',
        accountToken: 'tok',
        numberFrom: '+10000000000',
      },
      numberTo: '+10000000001',
      message: 'tb test',
    };
    await sendTestSms(request);
    expect(post).toHaveBeenCalledWith('/api/admin/settings/testSms', request);
  });
});
