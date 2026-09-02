/**
 * Dashboards list page tests (brief §0.A): server-parameter plumbing through
 * the URL state, tenant row operations (export / make-public + link /
 * make-private / delete confirm) and the CU read-only face. Services are
 * mocked at the module boundary.
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
import zhDashboards from '@/locales/zh-CN/dashboards';
import { EntityType } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhDashboards },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import DashboardsListPage from './index';

const dashboardServiceMock = vi.hoisted(() => ({
  getTenantDashboards: vi.fn(),
  deleteDashboard: vi.fn(),
  makeDashboardPublic: vi.fn(),
  makeDashboardPrivate: vi.fn(),
  exportDashboard: vi.fn(),
}));

const customerServiceMock = vi.hoisted(() => ({
  getCustomerDashboards: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);
vi.mock('@/services/tb/customer', () => customerServiceMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));

// vite-node cannot resolve antd's extensionless internal locale imports when
// they are pulled through @ant-design/pro-components' bundle (works from
// src-side imports), so tests render the list through antd's Table (same
// workaround as the assets list tests).
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
    PageContainer: (props: {
      extra?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div>
        {props.extra}
        {props.children}
      </div>
    ),
  };
});

function dashboard(
  id: string,
  title: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: { entityType: EntityType.DASHBOARD, id },
    createdTime: 1_700_000_000_000,
    title,
    ...extra,
  };
}

const TENANT_PAGE = {
  data: [
    dashboard('dash-1', 'Thermostats', {
      assignedCustomers: [
        {
          customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
          title: '工厂 A',
          public: false,
        },
        {
          customerId: { entityType: EntityType.CUSTOMER, id: 'pub-cust' },
          title: 'Public',
          public: true,
        },
      ],
    }),
    dashboard('dash-2', 'Rule Engine Statistics'),
  ],
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <DashboardsListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

function setAuthority(claims: Record<string, unknown> | null) {
  tokenStoreMock.decodeTokenClaims.mockReturnValue(claims);
}

describe('dashboards list page (tenant admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/dashboards');
    setAuthority({ scopes: ['TENANT_ADMIN'], customerId: null });
    dashboardServiceMock.getTenantDashboards.mockResolvedValue(TENANT_PAGE);
    dashboardServiceMock.deleteDashboard.mockResolvedValue(undefined);
    dashboardServiceMock.makeDashboardPublic.mockResolvedValue(
      dashboard('dash-2', 'Rule Engine Statistics', {
        assignedCustomers: [
          {
            customerId: { entityType: EntityType.CUSTOMER, id: 'pub-cust' },
            title: 'Public',
            public: true,
          },
        ],
      }),
    );
    dashboardServiceMock.makeDashboardPrivate.mockResolvedValue(
      dashboard('dash-1', 'Thermostats'),
    );
    dashboardServiceMock.exportDashboard.mockResolvedValue(
      dashboard('dash-2', 'Rule Engine Statistics'),
    );
    customerServiceMock.getCustomerDashboards.mockResolvedValue({
      data: [],
      totalElements: 0,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('loads the tenant list with the URL-state page params', async () => {
    renderPage();

    expect(await screen.findByText('Thermostats')).toBeInTheDocument();
    expect(dashboardServiceMock.getTenantDashboards).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    // Assigned customers text (non-public titles) + public checkbox.
    expect(screen.getByText('工厂 A')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('opens the readonly view from the title link', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Thermostats'));
    expect(historyMock.push).toHaveBeenCalledWith('/dashboards/dash-1');
  });

  /** Opens the more-menu of the row whose cell contains `title`. */
  async function openRowMenu(title: string) {
    const cell = await screen.findByText(title);
    const row = cell.closest('tr') as HTMLElement;
    const buttons = row.querySelectorAll('button');
    fireEvent.click(buttons[buttons.length - 1]);
    // antd mounts the dropdown portal asynchronously (motion wrapper).
    await waitFor(() => {
      expect(
        document.querySelector('.ant-dropdown:not(.ant-dropdown-hidden)'),
      ).not.toBeNull();
    });
  }

  it('exports a row without prompting (includeResources handled in the service)', async () => {
    renderPage();
    await screen.findByText('Thermostats');

    fireEvent.click(screen.getAllByTitle('导出仪表盘')[0]);

    await waitFor(() => {
      // includeResources=true is hardwired in the service (v1: no prompt).
      expect(dashboardServiceMock.exportDashboard).toHaveBeenCalledWith(
        'dash-1',
      );
    });
  });

  it('makes a private dashboard public and shows the generated public link', async () => {
    renderPage();
    await screen.findByText('Rule Engine Statistics');

    // dash-2 is not public -> its more menu carries make-public.
    await openRowMenu('Rule Engine Statistics');
    fireEvent.click(
      await screen.findByText('公开仪表盘', {
        selector: '.ant-dropdown-menu-title-content',
      }),
    );

    fireEvent.click(
      await waitFor(() => {
        const confirm = document.querySelector('.ant-modal-confirm');
        expect(confirm).not.toBeNull();
        return within(confirm as HTMLElement).getByRole('button', {
          name: /公\s*开\s*仪\s*表\s*盘/,
        });
      }),
    );

    await waitFor(() => {
      expect(dashboardServiceMock.makeDashboardPublic).toHaveBeenCalledWith(
        'dash-2',
      );
    });
    expect(
      await screen.findByText(/dashboard\/dash-2\?publicId=pub-cust/),
    ).toBeInTheDocument();
  });

  it('makes a public dashboard private after the confirm', async () => {
    renderPage();
    await screen.findByText('Thermostats');

    // dash-1 is public -> its more menu carries make-private.
    await openRowMenu('Thermostats');
    fireEvent.click(
      await screen.findByText('将仪表盘设为私有', {
        selector: '.ant-dropdown-menu-title-content',
      }),
    );

    fireEvent.click(
      await waitFor(() => {
        const confirm = document.querySelector('.ant-modal-confirm');
        expect(confirm).not.toBeNull();
        return within(confirm as HTMLElement).getByRole('button', {
          name: /设\s*为\s*私\s*有/,
        });
      }),
    );

    await waitFor(() => {
      expect(dashboardServiceMock.makeDashboardPrivate).toHaveBeenCalledWith(
        'dash-1',
      );
    });
  });

  it('deletes a dashboard only after the danger confirm', async () => {
    renderPage();
    await screen.findByText('Thermostats');

    await openRowMenu('Thermostats');
    fireEvent.click(
      await screen.findByText('删除', {
        selector: '.ant-dropdown-menu-title-content',
      }),
    );

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(dashboardServiceMock.deleteDashboard).toHaveBeenCalledWith(
        'dash-1',
      );
    });
  });
});

describe('dashboards list page (customer user)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/dashboards');
    setAuthority({ scopes: ['CUSTOMER_USER'], customerId: 'cust-1' });
    customerServiceMock.getCustomerDashboards.mockResolvedValue({
      data: [dashboard('dash-1', 'Thermostats')],
      totalElements: 1,
    });
    dashboardServiceMock.getTenantDashboards.mockResolvedValue({
      data: [],
      totalElements: 0,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('reads the customer scope without any action column', async () => {
    renderPage();

    expect(await screen.findByText('Thermostats')).toBeInTheDocument();
    expect(customerServiceMock.getCustomerDashboards).toHaveBeenCalledWith(
      'cust-1',
      expect.objectContaining({ page: 0, pageSize: 10 }),
    );
    expect(dashboardServiceMock.getTenantDashboards).not.toHaveBeenCalled();
    // No customers/public columns, no export/more buttons.
    expect(screen.queryByText('已分配给客户')).not.toBeInTheDocument();
    expect(screen.queryByTitle('导出仪表盘')).not.toBeInTheDocument();
  });
});
