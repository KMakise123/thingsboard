/**
 * Customer-scope Edge instances page tests (wave 5a): the scoped query and
 * the composed "customer: Edge instances" title, the row unassign (= the
 * customer-scope delete semantics), the assign-existing fan-out and the
 * batch unassign. Services are mocked at the module boundary.
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
import zhEdge from '@/locales/zh-CN/edge';
import zhMenu from '@/locales/zh-CN/menu';
import { EntityType } from '@/types/tb';
import type { EdgeInfo } from '@/types/tb/edge';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhCustomers, ...zhMenu, ...zhEdge },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({ id: 'cust-1' }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const edgeMock = vi.hoisted(() => ({
  getCustomerEdgeInfos: vi.fn(),
  getTenantEdgeInfos: vi.fn(),
  assignEdgeToCustomer: vi.fn(),
  unassignEdgeFromCustomer: vi.fn(),
}));

const customerMock = vi.hoisted(() => ({
  getCustomerTitle: vi.fn(),
}));

vi.mock('@/services/tb/edge', () => edgeMock);
vi.mock('@/services/tb/customer', () => customerMock);

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

import CustomerEdgesPage from './index';

function edge(id: string, name: string): EdgeInfo {
  return {
    id: { entityType: EntityType.EDGE, id },
    createdTime: 1_700_000_000_000,
    name,
    type: 'default',
    label: '',
    customerTitle: '客户甲',
  } as EdgeInfo;
}

const PAGE = {
  data: [edge('edge-1', '网关A'), edge('edge-2', '网关B')],
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
          <CustomerEdgesPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/customers/cust-1/edges');
  customerMock.getCustomerTitle.mockResolvedValue('客户甲');
  edgeMock.getCustomerEdgeInfos.mockResolvedValue(PAGE);
  edgeMock.getTenantEdgeInfos.mockResolvedValue({
    data: [
      {
        id: { entityType: EntityType.EDGE, id: 'tenant-edge-1' },
        createdTime: 1,
        name: 'tenant-edge-a',
        type: 'default',
      },
    ],
    totalElements: 1,
    totalPages: 1,
    hasNext: false,
  });
  edgeMock.assignEdgeToCustomer.mockResolvedValue({});
  edgeMock.unassignEdgeFromCustomer.mockResolvedValue({});
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

describe('CustomerEdgesPage', () => {
  it('queries the customer-scoped edges and titles with the customer', async () => {
    renderPage();

    expect(await screen.findByText('网关A')).toBeInTheDocument();
    expect(edgeMock.getCustomerEdgeInfos).toHaveBeenCalledWith('cust-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(screen.getByText('客户甲: Edge 实例')).toBeInTheDocument();
  });

  it('jumps to the edge detail from the name link', async () => {
    renderPage();
    await screen.findByText('网关A');

    fireEvent.click(screen.getByText('网关A'));
    expect(historyMock.push).toHaveBeenCalledWith('/edges/edge-1');
  });

  it('treats the row delete as an unassign from this customer', async () => {
    renderPage();
    await screen.findByText('网关A');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('取消分配客户'));

    expect(
      (await screen.findAllByText(/确定要取消分配 Edge“网关A”吗？/)).length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      within(document.body).getByRole('button', { name: '取消分配客户' }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeFromCustomer).toHaveBeenCalledWith('edge-1');
    });
  });

  it('fans batch unassign out per selected edge', async () => {
    renderPage();
    await screen.findByText('网关A');

    const checkboxes = document.querySelectorAll(
      '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
    );
    fireEvent.click(checkboxes[0] as HTMLElement);
    fireEvent.click(checkboxes[1] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('已选 2 条')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '取消分配所选' }));
    await screen.findAllByText(/确定要取消分配 2 个 Edge吗？/);
    fireEvent.click(
      within(document.body).getByRole('button', { name: '取消分配客户' }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeFromCustomer).toHaveBeenCalledWith('edge-1');
      expect(edgeMock.unassignEdgeFromCustomer).toHaveBeenCalledWith('edge-2');
    });
  });

  it('assigns existing tenant edges to this customer', async () => {
    renderPage();
    await screen.findByText('网关A');

    fireEvent.click(screen.getByRole('button', { name: /分配已有 Edge/ }));
    const modal = await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    await waitFor(() => {
      expect(edgeMock.getTenantEdgeInfos).toHaveBeenCalled();
    });

    fireEvent.mouseDown(
      within(modal).getByText('搜索并选择实体') as HTMLElement,
    );
    const option = await waitFor(() => {
      const node = document.querySelector(
        '.ant-select-item-option[title="tenant-edge-a"]',
      );
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(option);
    fireEvent.click(within(modal).getByRole('button', { name: /分\s*配/ }));

    await waitFor(() => {
      expect(edgeMock.assignEdgeToCustomer).toHaveBeenCalledWith(
        'cust-1',
        'tenant-edge-1',
      );
    });
  });
});
