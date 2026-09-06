/**
 * Home-settings page test (M14 wave-2, spec 6.3-5): renders the two-field
 * card, keeps the cleared dashboardId as a wire-null payload (clearing
 * contract #23) and posts the object form when a dashboard is picked.
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
  getTenantHomeDashboardInfo: vi.fn(),
  setTenantHomeDashboardInfo: vi.fn(),
  getDashboardInfo: vi.fn(),
  getTenantDashboards: vi.fn(),
}));

vi.mock('@/services/tb/dashboard', () => servicesMock);

import SettingsHomePage from './index';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <RawIntlProvider value={intl}>
            <SettingsHomePage />
          </RawIntlProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('settings home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getTenantHomeDashboardInfo.mockResolvedValue({
      dashboardId: null,
      hideDashboardToolbar: true,
    });
    servicesMock.setTenantHomeDashboardInfo.mockResolvedValue(undefined);
    servicesMock.getDashboardInfo.mockResolvedValue({
      id: { entityType: 'DASHBOARD', id: 'dash-1' },
      title: '能耗监控',
    });
    servicesMock.getTenantDashboards.mockResolvedValue({
      data: [
        {
          id: { entityType: 'DASHBOARD', id: 'dash-1' },
          title: '能耗监控',
        },
        {
          id: { entityType: 'DASHBOARD', id: 'dash-2' },
          title: '网关概览',
        },
      ],
      totalElements: 2,
    });
  });

  it('renders the card with the unchecked toolbar flag by default', async () => {
    renderPage();
    expect(await screen.findByText('首页设置')).toBeDefined();
    const toolbar = (await screen.findByRole('checkbox')) as HTMLInputElement;
    expect(toolbar.checked).toBe(true);
    // Pristine form keeps save disabled.
    expect(screen.getByText(/保\s*存/).closest('button')).toBeDisabled();
  });

  it('posts a null dashboardId after clearing (server-side clear)', async () => {
    servicesMock.getTenantHomeDashboardInfo.mockResolvedValue({
      dashboardId: { entityType: 'DASHBOARD', id: 'dash-1' },
      hideDashboardToolbar: false,
    });
    renderPage();
    await screen.findByText('首页设置');

    // Clear the select (antd clear affordance) then save.
    await screen.findByRole('combobox');
    const clear = await waitFor(() => {
      const el = document.querySelector('.ant-select-clear');
      if (!el) {
        throw new Error('clear affordance not rendered yet');
      }
      return el;
    });
    fireEvent.click(clear);
    fireEvent.click(screen.getByText(/保\s*存/));

    await waitFor(() => {
      expect(servicesMock.setTenantHomeDashboardInfo).toHaveBeenCalledWith({
        dashboardId: null,
        hideDashboardToolbar: false,
      });
    });
  });

  it('keeps hideDashboardToolbar true when only the dashboard is set', async () => {
    renderPage();
    await screen.findByText('首页设置');

    const combobox = await screen.findByRole('combobox');
    fireEvent.mouseDown(combobox);
    fireEvent.click(
      await screen.findByText('能耗监控', {
        selector: '.ant-select-item-option-content',
      }),
    );
    fireEvent.click(screen.getByText(/保\s*存/));

    await waitFor(() => {
      expect(servicesMock.setTenantHomeDashboardInfo).toHaveBeenCalledWith({
        dashboardId: { entityType: 'DASHBOARD', id: 'dash-1' },
        hideDashboardToolbar: true,
      });
    });
    await screen.findByText('主页设置已保存。');
  });
});
