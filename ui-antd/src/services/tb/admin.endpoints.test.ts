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
  getMailConfigTemplates,
  getMailOauth2LoginProcessingUrl,
  saveAdminSettings,
  sendTestMail,
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
      jsonValue: { mailFrom: 'a@b.c', enableOauth2: false },
    };
    await sendTestMail(body);
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
});
