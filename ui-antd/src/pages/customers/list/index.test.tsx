/**
 * Customer list page tests: server-parameter plumbing (page/sort/textSearch
 * via the URL state), delete confirmation, and the shared CustomerDialog
 * create/edit flow. Services are mocked at the module boundary (Wave1 rule:
 * the page never does HTTP itself).
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
import zhCustomers from '@/locales/zh-CN/customers';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhCustomers },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { EntityType } from '@/types/tb';

import CustomersListPage from './index';

const servicesMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
  saveCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  getCustomerDashboards: vi.fn(),
}));

vi.mock('@/services/tb/customer', () => servicesMock);

// vite-node cannot resolve antd's extensionless internal locale imports when
// they are pulled through @ant-design/pro-components' bundle (works from
// src-side imports), so tests render the table through antd's Table.
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
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

function customer(
  id: string,
  title: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: { entityType: EntityType.CUSTOMER, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    title,
    ...extra,
  };
}

const CUSTOMER_PAGE = {
  data: [
    customer('cust-1', '工厂 A', {
      email: 'a@corp.io',
      country: '中国',
      city: '上海',
    }),
    customer('cust-2', '工厂 B'),
  ],
  totalElements: 12,
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
          <CustomersListPage />
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

describe('customers list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/customers');
    servicesMock.getCustomers.mockResolvedValue(CUSTOMER_PAGE);
    servicesMock.saveCustomer.mockResolvedValue(customer('cust-3', '工厂 C'));
    servicesMock.deleteCustomer.mockResolvedValue(undefined);
    servicesMock.getCustomerDashboards.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/customers');
  });

  it('loads page 1 with the default sort and renders the rows', async () => {
    renderPage();

    expect(await screen.findByText('工厂 A')).toBeInTheDocument();
    expect(screen.getByText('工厂 B')).toBeInTheDocument();
    expect(servicesMock.getCustomers).toHaveBeenCalledWith(DEFAULT_PAGE_LINK);
  });

  it('moves pagination into the URL and the 0-based server call', async () => {
    renderPage();
    await screen.findByText('工厂 A');

    fireEvent.click(screen.getByTitle('2'));

    await waitFor(() => {
      expect(servicesMock.getCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
      );
    });
    expect(window.location.search).toContain('page=2');
  });

  it('turns a column click into server-side sort URL params', async () => {
    renderPage();
    await screen.findByText('工厂 A');

    const titleHeader = screen.getByText('客户名称').closest('th');
    expect(titleHeader).not.toBeNull();
    fireEvent.click(titleHeader as HTMLElement);

    await waitFor(() => {
      expect(servicesMock.getCustomers).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: { property: 'title', direction: 'ASC' },
        }),
      );
    });
    expect(window.location.search).toContain('sortProperty=title');
    expect(window.location.search).toContain('sortOrder=ASC');
  });

  it('debounces the text search into the server query', async () => {
    renderPage();
    await screen.findByText('工厂 A');

    fireEvent.change(screen.getByPlaceholderText('搜索客户'), {
      target: { value: '  工厂  ' },
    });

    await waitFor(
      () => {
        expect(servicesMock.getCustomers).toHaveBeenCalledWith(
          expect.objectContaining({ textSearch: '工厂' }),
        );
      },
      { timeout: 2500 },
    );
    expect(window.location.search).toContain('textSearch=');
  });

  it('confirms before deleting a customer', async () => {
    renderPage();
    await screen.findByText('工厂 A');

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
      within(confirm).getAllByText(/确定要删除客户“工厂 A”吗？/),
    ).not.toHaveLength(0);

    // antd auto-inserts a space between the two CJK chars in the ok button.
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteCustomer).toHaveBeenCalledWith('cust-1');
    });
  });

  it('creates a customer through the shared dialog', async () => {
    renderPage();
    await screen.findByText('工厂 A');

    fireEvent.click(screen.getByRole('button', { name: /新增客户/ }));

    // Scope to the dialog via its title node — a stale confirm modal from an
    // earlier test could still hold the generic .ant-modal class.
    const titleNode = await screen.findByText('新增客户', {
      selector: '.ant-modal-title',
    });
    const modal = titleNode.closest('.ant-modal') as HTMLElement;
    fireEvent.change(within(modal).getByLabelText('客户名称'), {
      target: { value: '工厂 C' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(servicesMock.saveCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ title: '工厂 C' }),
      );
    });
    // Create payloads carry no draft id/createdTime/tenantId (backend
    // rejects them — see formValuesToCustomer).
    const payload = servicesMock.saveCustomer.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(payload.id).toBeUndefined();
    expect(payload.createdTime).toBeUndefined();
    expect(payload.tenantId).toBeUndefined();
  });

  it('edits a customer through the shared dialog and keeps the entity id', async () => {
    renderPage();
    await screen.findByText('工厂 A');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('编辑'));

    // Scope to the dialog via its title node — an earlier dialog could still
    // hold the generic .ant-modal class in the DOM.
    const titleNode = await screen.findByText('编辑客户', {
      selector: '.ant-modal-title',
    });
    const modal = titleNode.closest('.ant-modal') as HTMLElement;
    const titleInput = within(modal).getByLabelText(
      '客户名称',
    ) as HTMLInputElement;
    expect(titleInput.value).toBe('工厂 A');
    fireEvent.change(titleInput, { target: { value: '工厂 A2' } });
    fireEvent.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(servicesMock.saveCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ title: '工厂 A2' }),
      );
    });
    const payload = servicesMock.saveCustomer.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect((payload.id as Record<string, unknown>).id).toBe('cust-1');
  });

  it('navigates to the detail page from the title link', async () => {
    renderPage();
    await screen.findByText('工厂 A');

    fireEvent.click(screen.getByText('工厂 A'));
    expect(historyMock.push).toHaveBeenCalledWith('/customers/cust-1');
  });

  it('navigates to the scope pages from the row dropdown', async () => {
    renderPage();
    await screen.findByText('工厂 A');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('管理设备'));
    expect(historyMock.push).toHaveBeenCalledWith('/customers/cust-1/devices');
  });

  it('shows the load-failure alert with the server error text', async () => {
    servicesMock.getCustomers.mockRejectedValue(
      Object.assign(new Error('should-not-leak'), {
        detail: '客户列表不可用',
      }),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('加载客户列表失败')).toBeInTheDocument();
    });
  });
});
