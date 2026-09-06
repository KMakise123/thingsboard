/**
 * Version-control standalone page tests (M14 wave-6, spec 6.2-1): the
 * two-stage repository gate (unconfigured → the embedded shared settings
 * form + the "go to settings" jump; configured → the versions table) and
 * the read-only create lock (6.2-3). Services are mocked at the module
 * boundary; PageContainer is a passthrough (pro-components-free render,
 * same workaround as the widget-type details tests).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import type { ReactNode } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhVc from '@/locales/zh-CN/vc';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@umijs/max', () => ({ history: historyMock }));

vi.mock('@/components/layout/page-container', () => ({
  default: (props: { children?: ReactNode }) => <div>{props.children}</div>,
}));

const servicesMock = vi.hoisted(() => ({
  getRepositorySettingsInfo: vi.fn(),
  getRepositorySettings: vi.fn(),
  saveRepositorySettings: vi.fn(),
  deleteRepositorySettings: vi.fn(),
  checkRepositoryAccess: vi.fn(),
  listBranches: vi.fn(),
  listVersions: vi.fn(),
  saveEntitiesVersion: vi.fn(),
  awaitVersionCreateResult: vi.fn(),
  loadEntitiesVersion: vi.fn(),
  awaitVersionLoadResult: vi.fn(),
}));
vi.mock('@/services/tb/version-control', () => servicesMock);

import VersionControlPage from './index';

const intl = createIntl({ locale: 'zh-CN', messages: zhVc });

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <VersionControlPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('version control standalone page gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getRepositorySettings.mockResolvedValue(null);
    servicesMock.listBranches.mockResolvedValue([
      { name: 'master', default: true },
    ]);
    servicesMock.listVersions.mockResolvedValue({
      data: [],
      totalElements: 0,
      totalPages: 0,
      hasNext: false,
    });
  });

  it('unconfigured: embedded repository settings form + go-to-settings jump', async () => {
    servicesMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: false,
    });
    renderPage();

    expect(
      await screen.findByText('版本控制需要先为租户配置 Git 仓库。'),
    ).toBeTruthy();
    // The embedded shared form (detailsMode) renders the repository URL field.
    expect(await screen.findByText('仓库 URL')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '前往仓库设置配置' }));
    expect(historyMock.push).toHaveBeenCalledWith('/settings/repository');
  });

  it('configured: versions table replaces the gate, create enabled', async () => {
    servicesMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: true,
    });
    renderPage();

    expect(await screen.findByText('版本')).toBeTruthy();
    const create = await screen.findByRole('button', {
      name: /创建实体版本/,
    });
    expect((create as HTMLButtonElement).disabled).toBe(false);
    // The gate hint is gone.
    expect(
      screen.queryByText('版本控制需要先为租户配置 Git 仓库。'),
    ).toBeNull();
    await waitFor(() =>
      expect(servicesMock.listVersions).toHaveBeenCalledWith(
        'master',
        expect.objectContaining({
          sortOrder: expect.objectContaining({ direction: 'DESC' }),
        }),
      ),
    );
  });

  it('read-only repository disables create (spec 6.2-3)', async () => {
    servicesMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: true,
      readOnly: true,
    });
    renderPage();

    expect(await screen.findByText(/仓库处于只读状态/)).toBeTruthy();
    const create = await screen.findByRole('button', {
      name: /创建实体版本/,
    });
    expect((create as HTMLButtonElement).disabled).toBe(true);
  });
});
