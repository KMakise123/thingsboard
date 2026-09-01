/**
 * Customer-scope dashboards page tests (minimal face per RECON risk 5):
 * the scoped legacy-shape query, the assign flow through the tenant
 * dashboard picker, and the unassign confirm. Services are mocked at the
 * module boundary.
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
import zhCustomers from '@/locales/zh-CN/customers';
import zhCommon from '@/locales/zh-CN/common';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhCustomers },
});

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn() },
  useParams: () => ({ id: 'cust-1' }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { EntityType } from '@/types/tb';

import CustomerDashboardsPage from './index';

const customerServiceMock = vi.hoisted(() => ({
  getCustomerTitle: vi.fn(),
  getCustomerDashboards: vi.fn(),
  assignDashboardToCustomer: vi.fn(),
  unassignDashboardFromCustomer: vi.fn(),
}));

const dashboardServiceMock = vi.hoisted(() => ({
  getTenantDashboards: vi.fn(),
}));

vi.mock('@/services/tb/customer', () => customerServiceMock);
vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);

vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
    PageContainer: (props: {
      extra?: React.ReactNode;
      content?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div>
        {props.extra}
        {props.content}
        {props.children}
      </div>
    ),
  };
});

const PAGE = {
  data: [
    {
      id: { entityType: EntityType.DASHBOARD, id: 'dash-1' },
      createdTime: 1_700_000_000_000,
      title: '客户驾驶舱',
    },
  ],
  totalElements: 1,
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
          <CustomerDashboardsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('customer dashboards scope page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/customers/cust-1/dashboards');
    customerServiceMock.getCustomerTitle.mockResolvedValue('工厂 A');
    customerServiceMock.getCustomerDashboards.mockResolvedValue(PAGE);
    customerServiceMock.assignDashboardToCustomer.mockResolvedValue(
      PAGE.data[0],
    );
    customerServiceMock.unassignDashboardFromCustomer.mockResolvedValue(
      undefined,
    );
    dashboardServiceMock.getTenantDashboards.mockResolvedValue({
      data: [
        {
          id: { entityType: EntityType.DASHBOARD, id: 'dash-9' },
          createdTime: 1_700_000_000_000,
          title: '能耗监控',
        },
      ],
      totalElements: 1,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('loads the customer-scoped dashboards list', async () => {
    renderPage();

    expect(await screen.findByText('客户驾驶舱')).toBeInTheDocument();
    expect(
      customerServiceMock.getCustomerDashboards,
    ).toHaveBeenCalledWith('cust-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('assigns a tenant dashboard picked from the server-searched list', async () => {
    renderPage();
    await screen.findByText('客户驾驶舱');

    fireEvent.click(screen.getByRole('button', { name: /指派仪表盘/ }));
    const titleNode = await screen.findByText('指派仪表盘给客户', {
      selector: '.ant-modal-title',
    });
    const modal = titleNode.closest('.ant-modal') as HTMLElement;

    const selector = within(modal).getByRole('combobox');
    fireEvent.mouseDown(selector);
    fireEvent.click(
      await screen.findByText('能耗监控', {
        selector: '.ant-select-item-option-content',
      }),
    );
    fireEvent.click(
      within(modal).getByRole('button', { name: /分\s*配/ }),
    );

    await waitFor(() => {
      expect(
        customerServiceMock.assignDashboardToCustomer,
      ).toHaveBeenCalledWith('cust-1', 'dash-9');
    });
  });

  it('confirms before unassigning a dashboard', async () => {
    renderPage();
    await screen.findByText('客户驾驶舱');

    // The row button (small, inside the table) opens the confirm.
    const rowButton = document.querySelector(
      '.ant-table-tbody .ant-btn',
    ) as HTMLElement;
    fireEvent.click(rowButton);

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    expect(
      within(confirm).getAllByText(/确定要取消指派仪表盘“客户驾驶舱”吗？/)
        .length,
    ).toBeGreaterThan(0);
    // Scope to the confirm dialog: the row button shares the label.
    fireEvent.click(
      within(confirm).getByRole('button', { name: /取\s*消\s*指\s*派/ }),
    );
    await waitFor(() => {
      expect(
        customerServiceMock.unassignDashboardFromCustomer,
      ).toHaveBeenCalledWith('cust-1', 'dash-1');
    });
  });
});
