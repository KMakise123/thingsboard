/**
 * DashboardToolbar update-image entry (spec §3.5 parity, ui-ngx
 * dashboard-page.component.html:230-235): the button lives on the READ-ONLY
 * toolbar only, gated by isTenantAdmin && !embedded (+ the
 * showUpdateDashboardImage settings flag, default on); clicking it opens
 * the dashboard-image dialog.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhDialogs from '@/locales/zh-CN/editor-dashboard-dialogs';
import type { DashboardSettings } from '@/types/tb/dashboard';
import type { Timewindow } from '@/types/tb/timewindow';
import { DashboardToolbar } from './DashboardToolbar';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@umijs/max', () => ({ history: historyMock }));

const dashboardServiceMock = vi.hoisted(() => ({
  exportDashboard: vi.fn(),
  getTenantDashboards: vi.fn().mockResolvedValue({ data: [] }),
  getDashboard: vi.fn().mockResolvedValue({
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Demo',
    image: 'data:image/png;base64,AAA',
  }),
  saveDashboard: vi.fn(),
}));
vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);

const intl = createIntl({
  locale: 'zh-CN',
  messages: {
    ...zhEditorCommon,
    ...zhEditorDashboard,
    ...zhDialogs,
    'dashboards.toolbar.dashboardSelect': '仪表盘',
    'dashboards.toolbar.export': '导出仪表盘',
    'dashboards.toolbar.fullscreen': '全屏',
    'dashboards.toolbar.exitFullscreen': '退出全屏',
  },
});

const BASE = {
  title: 'Demo',
  settings: {} as DashboardSettings,
  dashboardId: 'd1',
  timewindow: { defaultAggregation: 'NONE' } as unknown as Timewindow,
  onTimewindowChange: () => undefined,
  breadcrumbs: [{ id: 'default', name: 'Root', index: 0 }],
  hasRightLayout: false,
  isMobile: false,
  showRightLayout: false,
  onToggleRightLayout: () => undefined,
  singlePageMode: false,
  embedded: false,
  isTenantAdmin: true,
};

function renderToolbar(props?: Partial<typeof BASE>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <DashboardToolbar {...BASE} {...props} />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

describe('DashboardToolbar update-image entry (§3.5)', () => {
  it('shows the image button for a tenant admin on the readonly page and opens the dialog', async () => {
    renderToolbar();
    fireEvent.click(screen.getByTestId('dashboard-toolbar-image'));
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-image-dialog')).toBeInTheDocument();
    });
    // the dialog loads the persisted image for the preview
    await waitFor(() => {
      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledWith('d1');
    });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-image-preview')).toBeInTheDocument();
    });
  });

  it('hides the image button when embedded', () => {
    renderToolbar({ embedded: true });
    expect(screen.queryByTestId('dashboard-toolbar-image')).toBeNull();
  });

  it('hides the image button for non-tenant-admin users', () => {
    renderToolbar({ isTenantAdmin: false });
    expect(screen.queryByTestId('dashboard-toolbar-image')).toBeNull();
  });

  it('hides the image button when the setting disables it', () => {
    renderToolbar({
      settings: { showUpdateDashboardImage: false } as DashboardSettings,
    });
    expect(screen.queryByTestId('dashboard-toolbar-image')).toBeNull();
  });
});
