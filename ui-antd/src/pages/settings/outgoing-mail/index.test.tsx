/**
 * Outgoing-mail page tests (M14 wave-2): the five regression chains of
 * spec 6.3-12 plus the id save-contract (contract #2, wave-1 T6-①):
 *   1. provider preset overwrites the SMTP fields;
 *   2. OFFICE_365 derives authUri/tokenUri from the tenant id;
 *   3. the change-password gate: an untouched password NEVER travels —
 *      while a re-entered one does (password empty = no field, contract
 *      #1/#3);
 *   4. the redirect-URI preview builds from scheme + domain;
 *   5. generate-token navigates to the external authorize URI.
 * Every save payload must carry the snapshot id.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhSettings },
});

const servicesMock = vi.hoisted(() => ({
  getAdminSettings: vi.fn(),
  saveAdminSettings: vi.fn(),
  getMailConfigTemplates: vi.fn(),
  getMailOauth2LoginProcessingUrl: vi.fn(),
  generateMailOauth2AccessToken: vi.fn(),
  sendTestMail: vi.fn(),
}));

vi.mock('@/services/tb/admin', () => servicesMock);

import SettingsOutgoingMailPage from './index';

const MAIL_SNAPSHOT = {
  id: 'mail-snapshot-id',
  key: 'mail',
  jsonValue: {
    mailFrom: 'tb@example.com',
    smtpProtocol: 'SMTP',
    smtpHost: 'localhost',
    smtpPort: 25,
    timeout: 10000,
    enableTls: false,
    enableProxy: false,
    enableOauth2: false,
    providerId: 'CUSTOM',
  },
};

const TEMPLATES = [
  {
    providerId: 'SENDGRID',
    name: 'SendGrid',
    smtpProtocol: 'SMTP',
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: 465,
    timeout: 10000,
    enableTls: false,
    tlsVersion: 'TLSv1.2',
    authorizationUri: 'https://sendgrid.example/auth',
    accessTokenUri: 'https://sendgrid.example/token',
    scope: ['mail.send'],
  },
  {
    providerId: 'OFFICE_365',
    name: 'Office 365',
    smtpProtocol: 'SMTP',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    timeout: 10000,
    enableTls: true,
    tlsVersion: 'TLSv1.2',
    authorizationUri: 'https://login.microsoftonline.com/%s/oauth2/authorize',
    accessTokenUri: 'https://login.microsoftonline.com/%s/oauth2/token',
    scope: ['mail.send'],
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <RawIntlProvider value={intl}>
            <SettingsOutgoingMailPage />
          </RawIntlProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function inputById(id: string): Promise<HTMLInputElement> {
  return waitFor(() => {
    const el = document.querySelector(`input[id='${id}']`);
    if (!el) {
      throw new Error(`input not found: ${id}`);
    }
    return el as HTMLInputElement;
  });
}

async function pickProvider(label: string) {
  const selector = await screen.findByRole('combobox');
  fireEvent.mouseDown(selector);
  fireEvent.click(
    await screen.findByText(label, {
      selector: '.ant-select-item-option-content',
    }),
  );
}

async function getSaveButton(): Promise<HTMLButtonElement> {
  // Role-based: the success toast (…已保存。) must not match here.
  const buttons = await screen.findAllByRole('button', { name: /保\s*存/ });
  return buttons[0] as HTMLButtonElement;
}

function lastPayload() {
  const calls = servicesMock.saveAdminSettings.mock.calls;
  return calls[calls.length - 1][0];
}

describe('settings outgoing-mail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getAdminSettings.mockImplementation((key: string) =>
      key === 'mail'
        ? Promise.resolve(MAIL_SNAPSHOT)
        : Promise.reject(new Error(`unexpected bucket ${key}`)),
    );
    servicesMock.getMailConfigTemplates.mockResolvedValue(TEMPLATES);
    servicesMock.getMailOauth2LoginProcessingUrl.mockResolvedValue(
      '/api/admin/mail/oauth2/token',
    );
    servicesMock.saveAdminSettings.mockImplementation(
      async (body: unknown) => body,
    );
    servicesMock.generateMailOauth2AccessToken.mockResolvedValue(
      'https://login.microsoftonline.com/contoso/oauth2/authorize',
    );
  });

  it('applies a provider preset over the SMTP fields and echoes the snapshot id', async () => {
    renderPage();
    await screen.findByText('发件邮件服务器设置');
    await pickProvider('SendGrid');

    await waitFor(async () => {
      expect((await inputById('smtpHost')).value).toBe('smtp.sendgrid.net');
    });
    expect((await inputById('smtpPort')).value).toBe('465');

    fireEvent.click(await getSaveButton());
    await waitFor(() => {
      expect(servicesMock.saveAdminSettings).toHaveBeenCalledTimes(1);
    });
    const payload = lastPayload();
    expect(payload.id).toBe('mail-snapshot-id');
    expect(payload.jsonValue.smtpHost).toBe('smtp.sendgrid.net');
    expect(payload.jsonValue.smtpPort).toBe(465);
    expect(payload.jsonValue.providerId).toBe('SENDGRID');
    // Second save must stay 200: the id rides on every payload.
    fireEvent.change(await inputById('mailFrom'), {
      target: { value: 'tb2@example.com' },
    });
    fireEvent.click(await getSaveButton());
    await waitFor(() => {
      expect(servicesMock.saveAdminSettings).toHaveBeenCalledTimes(2);
    });
    expect(lastPayload().id).toBe('mail-snapshot-id');
  });

  it('derives the OFFICE_365 URIs from the tenant id', async () => {
    renderPage();
    await screen.findByText('发件邮件服务器设置');
    await pickProvider('Office 365');
    // Switch to OAuth2 to reach the tenant-id field.
    fireEvent.click(screen.getByText('OAuth 2.0'));
    fireEvent.change(await inputById('clientId'), {
      target: { value: 'client' },
    });
    fireEvent.change(await inputById('clientSecret'), {
      target: { value: 'secret' },
    });
    fireEvent.change(await inputById('providerTenantId'), {
      target: { value: 'contoso' },
    });
    await waitFor(async () => {
      expect((await inputById('authUri')).value).toBe(
        'https://login.microsoftonline.com/contoso/oauth2/authorize',
      );
    });
    expect((await inputById('tokenUri')).value).toBe(
      'https://login.microsoftonline.com/contoso/oauth2/token',
    );
  });

  it('keeps an untouched password off the wire and ships a re-entered one', async () => {
    renderPage();
    await screen.findByText('发件邮件服务器设置');

    // Change nothing password-related; the gate stays unchecked.
    fireEvent.change(await inputById('mailFrom'), {
      target: { value: 'tb2@example.com' },
    });
    fireEvent.click(await getSaveButton());
    await waitFor(() => {
      expect(servicesMock.saveAdminSettings).toHaveBeenCalledTimes(1);
    });
    expect('password' in lastPayload().jsonValue).toBe(false);
    expect(lastPayload().id).toBe('mail-snapshot-id');

    // Re-enter the password through the change gate.
    fireEvent.click(screen.getByText('修改密码'));
    fireEvent.change(await inputById('password'), {
      target: { value: 'new-secret' },
    });
    fireEvent.click(await getSaveButton());
    await waitFor(() => {
      expect(servicesMock.saveAdminSettings).toHaveBeenCalledTimes(2);
    });
    expect(lastPayload().jsonValue.password).toBe('new-secret');
  });

  it('builds the redirect-URI preview and navigates on generate-token', async () => {
    renderPage();
    await screen.findByText('发件邮件服务器设置');
    await pickProvider('自定义');
    fireEvent.click(screen.getByText('OAuth 2.0'));
    fireEvent.change(await inputById('clientId'), {
      target: { value: 'client' },
    });
    fireEvent.change(await inputById('clientSecret'), {
      target: { value: 'secret' },
    });
    fireEvent.change(await inputById('authUri'), {
      target: { value: 'https://auth.example.com' },
    });
    fireEvent.change(await inputById('tokenUri'), {
      target: { value: 'https://auth.example.com/token' },
    });
    // Scope is a required tags-select inside the advanced group.
    const scopeInput = await inputById('scope');
    fireEvent.change(scopeInput, { target: { value: 'mail.send' } });
    fireEvent.keyDown(scopeInput, { key: 'Enter' });
    fireEvent.change(await inputById('name'), {
      target: { value: 'tb.example.com' },
    });

    // The preview carries an explicit id (generic readonly inputs like the
    // Segmented radios would otherwise shadow it).
    const preview = await inputById('redirectUriPreview');
    expect(preview.value).toBe(
      'https://tb.example.com/api/admin/mail/oauth2/token',
    );

    // Generate-token only enables on a SAVED configuration (ngx parity:
    // configure → save → generate). The save also proves the builder's
    // domain rides along in the payload.
    fireEvent.click(await getSaveButton());
    await waitFor(() => {
      expect(servicesMock.saveAdminSettings).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('生成访问 Token'));
    await waitFor(() => {
      expect(servicesMock.generateMailOauth2AccessToken).toHaveBeenCalledTimes(
        1,
      );
    });
    expect(window.location.href).toBe(
      'https://login.microsoftonline.com/contoso/oauth2/authorize',
    );
  });
});
