/**
 * Customer-scope devices page tests: the scoped query plumbing, the
 * single-row unassign confirm and the batch unassign fan-out. Services are
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
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import zhCustomers from '@/locales/zh-CN/customers';
import zhCommon from '@/locales/zh-CN/common';
import zhDevicesList from '@/locales/zh-CN/devices/list';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhCustomers, ...zhDevicesList },
});

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn() },
  useParams: () => ({ id: 'cust-1' }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { EntityType } from '@/types/tb';

import CustomerDevicesPage from './index';

const servicesMock = vi.hoisted(() => ({
  getCustomerTitle: vi.fn(),
  getCustomerDevices: vi.fn(),
  deleteDevice: vi.fn(),
  unassignDeviceFromCustomer: vi.fn(),
}));

vi.mock('@/services/tb/customer', () => ({
  getCustomerTitle: servicesMock.getCustomerTitle,
}));
vi.mock('@/services/tb/device', () => servicesMock);

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

function device(id: string, name: string) {
  return {
    id: { entityType: EntityType.DEVICE, id },
    createdTime: 1_700_000_000_000,
    name,
    deviceProfileName: '默认配置',
    label: '',
    active: true,
    customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
  };
}

const PAGE = {
  data: [device('dev-1', 'scope-dev-a'), device('dev-2', 'scope-dev-b')],
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
          <CustomerDevicesPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('customer devices scope page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/customers/cust-1/devices');
    servicesMock.getCustomerTitle.mockResolvedValue('工厂 A');
    servicesMock.getCustomerDevices.mockResolvedValue(PAGE);
    servicesMock.deleteDevice.mockResolvedValue(undefined);
    servicesMock.unassignDeviceFromCustomer.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('loads the customer-scoped list and shows the customer context', async () => {
    renderPage();

    expect(await screen.findByText('scope-dev-a')).toBeInTheDocument();
    expect(servicesMock.getCustomerDevices).toHaveBeenCalledWith('cust-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    // The header names the owning customer.
    expect(screen.getByText(/工厂 A/)).toBeInTheDocument();
  });

  it('confirms before unassigning a single device from this customer', async () => {
    renderPage();
    await screen.findByText('scope-dev-a');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('从该客户取消分配'));

    const confirm = await screen.findAllByText(
      /确定要取消分配设备“scope-dev-a”吗？/,
    );
    expect(confirm.length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole('button', { name: /从该客户取消分配/ }),
    );

    await waitFor(() => {
      expect(servicesMock.unassignDeviceFromCustomer).toHaveBeenCalledWith(
        'dev-1',
      );
    });
  });

  it('fans batch unassign out per selected device', async () => {
    renderPage();
    await screen.findByText('scope-dev-a');

    const checkboxes = document.querySelectorAll(
      '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
    );
    expect(checkboxes).toHaveLength(2);
    fireEvent.click(checkboxes[0] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('已选 1 项')).toBeInTheDocument();
    });
    fireEvent.click(checkboxes[1] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('已选 2 项')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '取消分配所选设备' }));
    const confirm = await screen.findAllByText(
      /确定要取消分配 2 台设备吗？/,
    );
    expect(confirm.length).toBeGreaterThan(0);
    fireEvent.click(
      within(document.body).getByRole('button', {
        name: /从该客户取消分配/,
      }),
    );

    await waitFor(() => {
      expect(servicesMock.unassignDeviceFromCustomer).toHaveBeenCalledWith(
        'dev-1',
      );
      expect(servicesMock.unassignDeviceFromCustomer).toHaveBeenCalledWith(
        'dev-2',
      );
    });
  });

  it('confirms before deleting a device', async () => {
    renderPage();
    await screen.findByText('scope-dev-a');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('删除'));

    expect(
      (await screen.findAllByText(/确定要删除设备“scope-dev-a”吗？/)).length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole('button', { name: /删\s*除/ }),
    );
    await waitFor(() => {
      expect(servicesMock.deleteDevice).toHaveBeenCalledWith('dev-1');
    });
  });
});
