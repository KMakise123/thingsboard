/**
 * /home thin-shell tests (M15 R48): the three render branches — configured
 * home dashboard (DashboardPage with hideDashboardToolbar forwarded and
 * embedded chrome), unconfigured (quick-links fallback), transport error
 * (Alert, never a blank page).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import zhHome from '@/locales/zh-CN/home';
import zhMenu from '@/locales/zh-CN/menu';

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  useAppData: vi.fn(() => ({ clientRoutes: [] })),
}));

vi.mock('@umijs/max', () => ({
  history: { push: routerMock.push },
  useAppData: routerMock.useAppData,
  useAccessMarkedRoutes: (routes: unknown) => routes,
}));

// The pro-components bundle cannot be loaded under vite-node (extensionless
// antd locale imports) — replace the shell with a passthrough.
vi.mock('@/components/layout/page-container', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const dashboardPageMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/dashboard/DashboardPage', () => ({
  DashboardPage: (props: {
    hideToolbar?: boolean;
    embedded?: boolean;
    dashboard?: { title?: string };
  }) => {
    dashboardPageMock(props);
    return (
      <div
        data-testid="dashboard-page"
        data-hide-toolbar={String(Boolean(props.hideToolbar))}
        data-embedded={String(Boolean(props.embedded))}
      >
        {props.dashboard?.title}
      </div>
    );
  },
}));

const servicesMock = vi.hoisted(() => ({
  getHomeDashboard: vi.fn(),
}));
vi.mock('@/services/tb/dashboard', () => servicesMock);

import Page from './page';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhHome, ...zhMenu },
});

const homeDashboard = (hideDashboardToolbar: boolean) =>
  ({
    id: { entityType: 'DASHBOARD', id: 'dash-1' },
    title: 'Ops overview',
    configuration: { widgets: {}, states: {}, entityAliases: {}, filters: {} },
    hideDashboardToolbar,
  }) as never;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <AntdApp>
          <Page />
        </AntdApp>
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

describe('home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getHomeDashboard.mockReset();
  });

  it('renders the configured home dashboard with hideToolbar forwarded', async () => {
    servicesMock.getHomeDashboard.mockResolvedValue(homeDashboard(true));

    renderPage();

    const el = await screen.findByTestId('dashboard-page');
    expect(el).toHaveAttribute('data-hide-toolbar', 'true');
    expect(el).toHaveAttribute('data-embedded', 'true');
    expect(await screen.findByText('Ops overview')).toBeInTheDocument();
    expect(dashboardPageMock).toHaveBeenCalledWith(
      expect.objectContaining({ embedded: true, hideToolbar: true }),
    );
  });

  it('keeps the toolbar when hideDashboardToolbar is false', async () => {
    servicesMock.getHomeDashboard.mockResolvedValue(homeDashboard(false));

    renderPage();

    const el = await screen.findByTestId('dashboard-page');
    expect(el).toHaveAttribute('data-hide-toolbar', 'false');
  });

  it('falls back to quick links when nothing is configured (SA / unset TA-CU)', async () => {
    servicesMock.getHomeDashboard.mockResolvedValue(undefined);

    renderPage();

    expect(await screen.findByText('快捷入口')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
    expect(screen.getByText(/尚未配置首页仪表盘/)).toBeInTheDocument();
  });

  it('shows an alert on a transport error instead of a blank page', async () => {
    servicesMock.getHomeDashboard.mockRejectedValue(
      new ServerErrorError({
        status: 500,
        detail: 'Kaboom',
        titleKey: 'tb.error.generic',
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Kaboom')).toBeInTheDocument();
  });
});
