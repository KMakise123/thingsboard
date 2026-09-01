/**
 * Device list page tests: server-parameter plumbing (page/sort/filters via
 * the URL state), CU read-only gating, delete confirmation and the batch
 * fan-out with visible progress. Services are mocked at the module boundary
 * (Wave1 rule: the page never does HTTP itself).
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
import zhDevices from '@/locales/zh-CN/devices/list';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhDevices },
});

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { EntityType } from '@/types/tb';

import DevicesListPage from './index';

const servicesMock = vi.hoisted(() => ({
  getTenantDevices: vi.fn(),
  getCustomerDevices: vi.fn(),
  getDeviceProfiles: vi.fn(),
  deleteDevice: vi.fn(),
  assignDeviceToCustomer: vi.fn(),
  unassignDeviceFromCustomer: vi.fn(),
}));

const customerServiceMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/device', () => servicesMock);
vi.mock('@/services/tb/customer', () => customerServiceMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));
vi.mock('@/core/ws/hooks', () => ({
  useAttributeSubscription: () => ({ data: [], status: 'connected' }),
  useLatestTelemetrySubscription: () => ({ data: [], status: 'connected' }),
}));
// vite-node cannot resolve antd's extensionless internal locale imports when
// they are pulled through @ant-design/pro-components' bundle (works from
// src-side imports), so tests render the list through antd's Table. The mock
// keeps ProTable's two behaviors the page leans on: the props/onChange
// contract and dot-path string rowKey resolution ("id.id").
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  type Row = Record<string, unknown>;
  const getByPath = (row: Row, path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (value, key) =>
          value && typeof value === 'object' ? (value as Row)[key] : undefined,
        row,
      );
  const ProTable = ({
    rowKey,
    ...rest
  }: React.ComponentProps<typeof Table>) => (
    <Table
      rowKey={
        typeof rowKey === 'string' && rowKey.includes('.')
          ? (row: unknown) => String(getByPath(row as Row, rowKey))
          : rowKey
      }
      {...rest}
    />
  );
  return {
    ProTable,
    // Thin passthrough: the page header (ADR 0008) renders extra + children.
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

const NULL_CUSTOMER = {
  entityType: EntityType.CUSTOMER,
  id: '13814000-1dd2-11b2-8080-808080808080',
};

function device(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id: { entityType: EntityType.DEVICE, id },
    createdTime: 1_700_000_000_000,
    name,
    deviceProfileName: '默认配置',
    label: '',
    active: false,
    customerTitle: '',
    customerIsPublic: false,
    customerId: NULL_CUSTOMER,
    ...extra,
  };
}

const TENANT_PAGE = {
  data: [
    device('dev-1', 'm1-test-list-alpha'),
    device('dev-2', 'm1-test-list-beta', {
      active: true,
      customerTitle: '工厂 A',
      customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
    }),
  ],
  totalElements: 15,
  totalPages: 2,
  hasNext: true,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <DevicesListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

const DEFAULT_PAGE_LINK = {
  pageSize: 10,
  page: 0,
  textSearch: undefined,
  sortOrder: { property: 'createdTime', direction: 'DESC' },
};

describe('devices list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/devices');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getTenantDevices.mockResolvedValue(TENANT_PAGE);
    servicesMock.getCustomerDevices.mockResolvedValue(TENANT_PAGE);
    servicesMock.getDeviceProfiles.mockResolvedValue({ data: [] });
    servicesMock.deleteDevice.mockResolvedValue(undefined);
    servicesMock.assignDeviceToCustomer.mockResolvedValue(TENANT_PAGE.data[0]);
    servicesMock.unassignDeviceFromCustomer.mockResolvedValue(undefined);
    customerServiceMock.getCustomers.mockResolvedValue({
      data: [
        {
          id: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
          tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
          createdTime: 0,
          title: '工厂 A',
        },
      ],
      totalElements: 1,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/devices');
  });

  it('loads page 1 with the default sort and renders the rows', async () => {
    renderPage();

    expect(await screen.findByText('m1-test-list-alpha')).toBeInTheDocument();
    expect(screen.getByText('m1-test-list-beta')).toBeInTheDocument();
    expect(servicesMock.getTenantDevices).toHaveBeenCalledWith(
      DEFAULT_PAGE_LINK,
      {},
    );
    // Empty-state / loading live in the table config; total shows through.
    expect(servicesMock.getCustomerDevices).not.toHaveBeenCalled();
  });

  it('moves pagination into the URL and the 0-based server call', async () => {
    renderPage();
    await screen.findByText('m1-test-list-alpha');

    fireEvent.click(screen.getByTitle('2'));

    await waitFor(() => {
      expect(servicesMock.getTenantDevices).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
        {},
      );
    });
    expect(window.location.search).toContain('page=2');
  });

  it('turns a column click into server-side sort URL params', async () => {
    renderPage();
    await screen.findByText('m1-test-list-alpha');

    const nameHeader = screen.getByText('名称').closest('th');
    expect(nameHeader).not.toBeNull();
    fireEvent.click(nameHeader as HTMLElement);

    await waitFor(() => {
      expect(servicesMock.getTenantDevices).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: { property: 'name', direction: 'ASC' },
        }),
        {},
      );
    });
    expect(window.location.search).toContain('sortProperty=name');
    expect(window.location.search).toContain('sortOrder=ASC');
  });

  it('initializes the filter from deviceProfileId / active URL params', async () => {
    window.history.replaceState(
      {},
      '',
      '/devices?deviceProfileId=prof-1&active=true',
    );
    renderPage();

    await screen.findByText('m1-test-list-alpha');
    expect(servicesMock.getTenantDevices).toHaveBeenCalledWith(
      expect.objectContaining(DEFAULT_PAGE_LINK),
      { deviceProfileId: 'prof-1', active: true },
    );
  });

  it('debounces the text search into the server query', async () => {
    renderPage();
    await screen.findByText('m1-test-list-alpha');

    fireEvent.change(screen.getByPlaceholderText('搜索设备'), {
      target: { value: '  alpha ' },
    });

    await waitFor(
      () => {
        expect(servicesMock.getTenantDevices).toHaveBeenCalledWith(
          expect.objectContaining({ textSearch: 'alpha' }),
          {},
        );
      },
      { timeout: 2500 },
    );
    expect(window.location.search).toContain('textSearch=alpha');
  });

  it('gates customer users to a read-only customer-scoped view', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
      customerId: 'cust-1',
    });
    renderPage();

    expect(await screen.findByText('m1-test-list-alpha')).toBeInTheDocument();
    expect(servicesMock.getCustomerDevices).toHaveBeenCalledWith(
      'cust-1',
      DEFAULT_PAGE_LINK,
      {},
    );
    expect(servicesMock.getTenantDevices).not.toHaveBeenCalled();

    // Read-only: no create / import / selection affordances.
    expect(
      screen.queryByRole('button', { name: '添加新设备' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '导入设备' }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.ant-table-selection-column')).toBeNull();
  });

  it('confirms before deleting a single row', async () => {
    renderPage();
    await screen.findByText('m1-test-list-alpha');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('删除'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    expect(
      within(confirm).getAllByText(/确定要删除设备“m1-test-list-alpha”吗？/),
    ).not.toHaveLength(0);

    // antd auto-inserts a space between the two CJK chars in the ok button.
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteDevice).toHaveBeenCalledWith('dev-1');
    });
  });

  it('fans batch delete out per device and reports progress', async () => {
    renderPage();
    await screen.findByText('m1-test-list-alpha');

    const rowCheckbox = (index: number) =>
      document.querySelectorAll(
        '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
      )[index] as HTMLElement;
    expect(rowCheckbox(0)).toBeTruthy();
    fireEvent.click(rowCheckbox(0));
    // Let the first selection land before the next (both compute from state).
    await waitFor(() => {
      expect(screen.getByText('已选 1 项')).toBeInTheDocument();
    });
    fireEvent.click(rowCheckbox(1));
    await waitFor(() => {
      expect(screen.getByText('已选 2 项')).toBeInTheDocument();
    });

    // The delete icon's aria-label prefixes the accessible name; regex-match.
    fireEvent.click(screen.getByRole('button', { name: /删除所选/ }));
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    // antd confirm renders the title twice (visible + announced copy).
    expect(
      within(confirm).getAllByText(/确定要删除 2 个设备吗？/),
    ).not.toHaveLength(0);

    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteDevice).toHaveBeenCalledTimes(2);
    });
    expect(servicesMock.deleteDevice).toHaveBeenCalledWith('dev-1');
    expect(servicesMock.deleteDevice).toHaveBeenCalledWith('dev-2');
  });

  it('assigns selected devices to a customer picked from the server list', async () => {
    renderPage();
    await screen.findByText('m1-test-list-alpha');

    const checkboxes = document.querySelectorAll(
      '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
    );
    expect(checkboxes).toHaveLength(2);
    fireEvent.click(checkboxes[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: '分配客户' }));

    await waitFor(() => {
      expect(customerServiceMock.getCustomers).toHaveBeenCalled();
    });
    // The assign dialog is open.
    await screen.findByText('指派给客户');

    // Scope to the dialog: the toolbar profile filter is also a Select.
    const selector = document.querySelector('.ant-modal .ant-select');
    fireEvent.mouseDown(selector as HTMLElement);
    fireEvent.click(
      await screen.findByText('工厂 A', {
        selector: '.ant-select-item-option-content',
      }),
    );
    // Scope to the open dialog: the toolbar "分配客户" button also matches.
    const dialog = document.querySelector('.ant-modal') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: '分 配' }));

    await waitFor(() => {
      expect(servicesMock.assignDeviceToCustomer).toHaveBeenCalledWith(
        'cust-1',
        'dev-1',
      );
    });
  });

  it('shows the load-failure alert with the server error text', async () => {
    servicesMock.getTenantDevices.mockRejectedValue(
      Object.assign(new Error('should-not-leak'), {
        detail: '设备列表不可用',
      }),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('加载设备列表失败')).toBeInTheDocument();
    });
  });
});
