/**
 * Repository-settings shell page test (M14 wave-2, spec 6.3-6 前半 +
 * 6.2-2 表单本体). Two contract pins on the shared form:
 *  - credential strip (R31 / contract #8): saving WITHOUT re-entering the
 *    stored password must NOT put the credential key on the wire;
 *  - Check access failure surfaces the server's underlying reason
 *    verbatim (contract #9: 400 carries "Unable to access repository: …").
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';
import zhVc from '@/locales/zh-CN/vc';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhSettings, ...zhVc },
});

const servicesMock = vi.hoisted(() => ({
  getRepositorySettingsInfo: vi.fn(),
  getRepositorySettings: vi.fn(),
  saveRepositorySettings: vi.fn(),
  deleteRepositorySettings: vi.fn(),
  checkRepositoryAccess: vi.fn(),
}));

vi.mock('@/services/tb/version-control', () => servicesMock);

import SettingsRepositoryPage from './index';

const STORED = {
  repositoryUri: 'https://git.example.com/acme.git',
  authMethod: 'USERNAME_PASSWORD' as const,
  username: 'alice',
  password: null,
  privateKeyFileName: null,
  privateKey: null,
  privateKeyPassword: null,
  defaultBranch: 'main',
  readOnly: false,
  showMergeCommits: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <RawIntlProvider value={intl}>
            <SettingsRepositoryPage />
          </RawIntlProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function getSaveButton(): Promise<HTMLButtonElement> {
  const label = await screen.findByText(/保\s*存/);
  return label.closest('button') as HTMLButtonElement;
}

async function getCheckAccessButton(): Promise<HTMLButtonElement> {
  const label = await screen.findByText('检查访问');
  return label.closest('button') as HTMLButtonElement;
}

describe('settings repository page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: true,
      readOnly: false,
    });
    servicesMock.getRepositorySettings.mockResolvedValue(STORED);
    servicesMock.saveRepositorySettings.mockImplementation(
      async (body: unknown) => body,
    );
    servicesMock.checkRepositoryAccess.mockResolvedValue(undefined);
  });

  it('saves without re-entering the stored password: the credential key never reaches the wire', async () => {
    renderPage();
    await screen.findByText('仓库设置');

    // Dirty the form through a non-credential field (default branch).
    const branch = await waitFor(() => {
      const el = document.querySelector("input[id='defaultBranch']");
      if (!el) {
        throw new Error('branch input not rendered yet');
      }
      return el as HTMLInputElement;
    });
    fireEvent.change(branch, { target: { value: 'release' } });
    await waitFor(async () => {
      expect((await getSaveButton()).disabled).toBe(false);
    });

    // The "Change password" checkbox is NOT ticked and the password input
    // never rendered — the strip must drop the key entirely (no null, no
    // empty string: empty would be treated as a REAL credential).
    fireEvent.click(await getSaveButton());
    await waitFor(() => {
      expect(servicesMock.saveRepositorySettings).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveRepositorySettings.mock.calls[0][0];
    expect(payload).toEqual({
      repositoryUri: 'https://git.example.com/acme.git',
      defaultBranch: 'release',
      readOnly: false,
      showMergeCommits: false,
      authMethod: 'USERNAME_PASSWORD',
      username: 'alice',
    });
    expect('password' in payload).toBe(false);
  });

  it('shows the underlying server reason when Check access fails', async () => {
    servicesMock.checkRepositoryAccess.mockRejectedValue(
      new Error('Unable to access repository: authentication failed'),
    );
    renderPage();
    await screen.findByText('仓库设置');
    await waitFor(async () => {
      expect((await getCheckAccessButton()).disabled).toBe(false);
    });

    fireEvent.click(await getCheckAccessButton());
    await waitFor(() => {
      expect(servicesMock.checkRepositoryAccess).toHaveBeenCalledTimes(1);
    });
    // The checkAccess probe payload obeys the same strip contract.
    expect(
      'password' in servicesMock.checkRepositoryAccess.mock.calls[0][0],
    ).toBe(false);
    // The 400 message carries the cause — shown verbatim (contract #9).
    await screen.findByText(
      /Unable to access repository: authentication failed/,
    );
  });
});
