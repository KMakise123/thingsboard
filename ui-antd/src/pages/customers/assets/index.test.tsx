/**
 * Customer-scope assets page tests: the scoped query, single unassign
 * confirm and delete confirm (same shape as the devices scope page).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhCustomers from '@/locales/zh-CN/customers';
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

import CustomerAssetsPage from './index';

const servicesMock = vi.hoisted(() => ({
  getCustomerTitle: vi.fn(),
  getCustomerAssets: vi.fn(),
  deleteAsset: vi.fn(),
  unassignAssetFromCustomer: vi.fn(),
}));

vi.mock('@/services/tb/customer', () => ({
  getCustomerTitle: servicesMock.getCustomerTitle,
}));
vi.mock('@/services/tb/asset', () => servicesMock);

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

function asset(id: string, name: string) {
  return {
    id: { entityType: EntityType.ASSET, id },
    createdTime: 1_700_000_000_000,
    name,
    assetProfileName: '默认资产配置',
    label: '',
    customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
  };
}

const PAGE = {
  data: [asset('asset-1', 'scope-asset-a'), asset('asset-2', 'scope-asset-b')],
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
          <CustomerAssetsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('customer assets scope page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/customers/cust-1/assets');
    servicesMock.getCustomerTitle.mockResolvedValue('工厂 A');
    servicesMock.getCustomerAssets.mockResolvedValue(PAGE);
    servicesMock.deleteAsset.mockResolvedValue(undefined);
    servicesMock.unassignAssetFromCustomer.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('loads the customer-scoped assets list', async () => {
    renderPage();

    expect(await screen.findByText('scope-asset-a')).toBeInTheDocument();
    expect(servicesMock.getCustomerAssets).toHaveBeenCalledWith('cust-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('confirms before unassigning a single asset', async () => {
    renderPage();
    await screen.findByText('scope-asset-a');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('从该客户取消分配'));

    expect(
      (await screen.findAllByText(/确定要取消分配资产“scope-asset-a”吗？/))
        .length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      await screen.findByRole('button', { name: /从该客户取消分配/ }),
    );
    await waitFor(() => {
      expect(servicesMock.unassignAssetFromCustomer).toHaveBeenCalledWith(
        'asset-1',
      );
    });
  });

  it('confirms before deleting an asset', async () => {
    renderPage();
    await screen.findByText('scope-asset-a');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('删除'));

    expect(
      (await screen.findAllByText(/确定要删除资产“scope-asset-a”吗？/)).length,
    ).toBeGreaterThan(0);
    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteAsset).toHaveBeenCalledWith('asset-1');
    });
  });
});
