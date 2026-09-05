/**
 * Edge-scope dashboards page tests (wave 5a): scoped query, the open-
 * dashboard title link, the export button (dashboards-domain helper reused
 * and mocked), single unassign, and the CUSTOMER_USER collapse (export
 * stays, assignment controls go). Services are mocked at the module
 * boundary; pro-components is replaced by antd's Table.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhEdge from '@/locales/zh-CN/edge';
import { EntityType } from '@/types/tb';
import type { DashboardInfo } from '@/types/tb/dashboard';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEdge },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({ id: 'edge-1' }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const edgeMock = vi.hoisted(() => ({
  getEdgeInfo: vi.fn(),
  getEdgeDashboards: vi.fn(),
  assignEdgeDashboard: vi.fn(),
  unassignEdgeDashboard: vi.fn(),
}));

const dashboardMock = vi.hoisted(() => ({
  getTenantDashboards: vi.fn(),
}));

const importExportMock = vi.hoisted(() => ({
  exportDashboardToFile: vi.fn(),
}));

vi.mock('@/services/tb/edge', () => edgeMock);
vi.mock('@/services/tb/dashboard', () => dashboardMock);
vi.mock('@/pages/dashboards/list/import-export', () => importExportMock);

vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
    PageContainer: (props: {
      title?: React.ReactNode;
      extra?: React.ReactNode;
      content?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div>
        <h1>{props.title}</h1>
        {props.extra}
        {props.content}
        {props.children}
      </div>
    ),
  };
});

import EdgeDashboardsPage from './index';

function dashboard(id: string, title: string): DashboardInfo {
  return {
    id: { entityType: EntityType.DASHBOARD, id },
    createdTime: 1_700_000_000_000,
    title,
  } as DashboardInfo;
}

const PAGE = {
  data: [
    dashboard('dash-1', 'scope-dash-a'),
    dashboard('dash-2', 'scope-dash-b'),
  ],
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

function renderPage(component: React.ReactNode = <EdgeDashboardsPage />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>{component}</RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/edges/edge-1/dashboards');
  edgeMock.getEdgeInfo.mockResolvedValue({
    id: { entityType: EntityType.EDGE, id: 'edge-1' },
    createdTime: 1,
    name: '网关A',
    type: 'default',
    routingKey: 'rk',
    secret: 'sec',
  });
  edgeMock.getEdgeDashboards.mockResolvedValue(PAGE);
  edgeMock.assignEdgeDashboard.mockResolvedValue({});
  edgeMock.unassignEdgeDashboard.mockResolvedValue(undefined);
  dashboardMock.getTenantDashboards.mockResolvedValue({
    data: [
      {
        id: { entityType: EntityType.DASHBOARD, id: 'tenant-dash-1' },
        createdTime: 1,
        title: 'tenant-dash-a',
      },
    ],
    totalElements: 1,
    totalPages: 1,
    hasNext: false,
  });
  importExportMock.exportDashboardToFile.mockResolvedValue(undefined);
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

describe('EdgeDashboardsPage', () => {
  it('queries the edge-scoped endpoint and titles with the edge name', async () => {
    renderPage();

    expect(await screen.findByText('scope-dash-a')).toBeInTheDocument();
    expect(edgeMock.getEdgeDashboards).toHaveBeenCalledWith('edge-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(screen.getByText('网关A: 仪表盘')).toBeInTheDocument();
  });

  it('opens the dashboard view from the title link', async () => {
    renderPage();
    await screen.findByText('scope-dash-a');

    fireEvent.click(screen.getByText('scope-dash-a'));
    expect(historyMock.push).toHaveBeenCalledWith('/dashboards/dash-1');
  });

  it('exports a dashboard through the dashboards-domain helper', async () => {
    renderPage();
    await screen.findByText('scope-dash-a');

    fireEvent.click(
      document.querySelector(
        '.ant-table-tbody button[title="导出仪表盘"]',
      ) as HTMLElement,
    );
    await waitFor(() => {
      expect(importExportMock.exportDashboardToFile).toHaveBeenCalledWith(
        'dash-1',
      );
    });
  });

  it('confirms before unassigning a dashboard from the edge', async () => {
    renderPage();
    await screen.findByText('scope-dash-a');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('从 Edge 取消分配'));

    expect(
      (await screen.findAllByText(/确定要将“scope-dash-a”从 Edge 取消分配吗？/))
        .length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      within(document.body).getByRole('button', { name: /从 Edge 取消分配/ }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeDashboard).toHaveBeenCalledWith(
        'edge-1',
        'dash-1',
      );
    });
  });

  it('fans batch unassign out per selected dashboard', async () => {
    renderPage();
    await screen.findByText('scope-dash-a');

    const checkboxes = document.querySelectorAll(
      '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
    );
    fireEvent.click(checkboxes[0] as HTMLElement);
    fireEvent.click(checkboxes[1] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('已选 2 条')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '取消分配所选' }));
    await screen.findAllByText(/确定要取消分配 2 个实体吗？/);
    fireEvent.click(
      within(document.body).getByRole('button', { name: /从 Edge 取消分配/ }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeDashboard).toHaveBeenCalledWith(
        'edge-1',
        'dash-1',
      );
      expect(edgeMock.unassignEdgeDashboard).toHaveBeenCalledWith(
        'edge-1',
        'dash-2',
      );
    });
  });

  it('collapses to read-only for CUSTOMER_USER but keeps export and open', async () => {
    vi.resetModules();
    vi.doMock('@/pages/edges/detail/use-authority', () => ({
      useAuthority: () => ({ authority: 'CUSTOMER_USER' }),
    }));
    const { default: CuPage } = await import('./index');
    renderPage(<CuPage />);

    await screen.findByText('scope-dash-a');
    expect(
      screen.queryByRole('button', { name: /分配已有仪表盘/ }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.ant-dropdown-trigger')).toBeNull();
    expect(
      document.querySelectorAll(
        '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
      ),
    ).toHaveLength(0);
    // Export and the open-dashboard jump survive the collapse.
    expect(
      document.querySelector('.ant-table-tbody button[title="导出仪表盘"]'),
    ).not.toBeNull();
    fireEvent.click(screen.getByText('scope-dash-a'));
    expect(historyMock.push).toHaveBeenCalledWith('/dashboards/dash-1');
    vi.doUnmock('@/pages/edges/detail/use-authority');
  });
});
