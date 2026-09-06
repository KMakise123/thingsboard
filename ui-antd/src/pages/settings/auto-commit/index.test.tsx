/**
 * Auto-commit settings page test (M14 wave-3, R23): the two-stage gate
 * (no repository → the shared RepositorySettingsForm; configured → the
 * panel), the 404-not-configured degrade of the settings read, and the
 * empty-map save that DELETEs instead of POST-ing `{}`.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
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

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn(), replace: vi.fn() },
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const vcMock = vi.hoisted(() => ({
  getRepositorySettingsInfo: vi.fn(),
  getRepositorySettings: vi.fn(),
  saveRepositorySettings: vi.fn(),
  deleteRepositorySettings: vi.fn(),
  checkRepositoryAccess: vi.fn(),
  getAutoCommitSettings: vi.fn(),
  saveAutoCommitSettings: vi.fn(),
  deleteAutoCommitSettings: vi.fn(),
}));
vi.mock('@/services/tb/version-control', () => vcMock);

import AutoCommitSettingsPage from './index';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <AutoCommitSettingsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('settings auto-commit page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vcMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: false,
      readOnly: false,
    });
    vcMock.getAutoCommitSettings.mockResolvedValue(null);
    vcMock.saveAutoCommitSettings.mockImplementation(async (map) => map);
  });

  it('shows the shared repository-settings form when no repository exists (gate)', async () => {
    renderPage();
    // From the shared RepositorySettingsForm (zh VC domain copy).
    expect(await screen.findByText('仓库设置')).toBeDefined();
    expect(screen.getByText(/请先配置版本控制仓库/)).toBeDefined();
  });

  it('reads the settings map with the 404 degrade (unconfigured → empty panel)', async () => {
    vcMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: true,
      readOnly: false,
    });
    renderPage();
    expect(await screen.findByText('自动提交设置')).toBeDefined();
    await waitFor(() => {
      expect(vcMock.getAutoCommitSettings).toHaveBeenCalledTimes(1);
    });
    // No rows (the service degraded the 404 to null) → the empty prompt.
    expect(await screen.findByText('尚未配置自动提交实体')).toBeDefined();
  });

  it('renders per-type rows from the stored map', async () => {
    vcMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: true,
      readOnly: false,
    });
    vcMock.getAutoCommitSettings.mockResolvedValue({
      DEVICE: {
        branch: 'release',
        saveCredentials: true,
        saveAttributes: true,
        saveRelations: false,
        saveCalculatedFields: true,
      },
    });
    renderPage();
    expect(await screen.findByText('设备')).toBeDefined();
    // DEVICE row carries the credentials checkbox with the stored branch.
    const branchInput = (await screen.findByDisplayValue(
      'release',
    )) as HTMLInputElement;
    expect(branchInput).toBeDefined();
  });

  it('DELETEs the settings when the map was emptied instead of POST-ing {}', async () => {
    vcMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: true,
      readOnly: false,
    });
    vcMock.getAutoCommitSettings.mockResolvedValue({
      DEVICE: {
        branch: '',
        saveCredentials: true,
        saveAttributes: true,
        saveRelations: false,
        saveCalculatedFields: true,
      },
    });
    renderPage();
    // Remove the single row, then save → empty map → DELETE endpoint.
    fireEvent.click(await screen.findByRole('button', { name: '移除' }));
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => {
      expect(vcMock.deleteAutoCommitSettings).toHaveBeenCalledTimes(1);
    });
    expect(vcMock.saveAutoCommitSettings).not.toHaveBeenCalled();
  });
});
