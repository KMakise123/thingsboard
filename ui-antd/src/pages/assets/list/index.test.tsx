/**
 * Asset list page tests: server-parameter plumbing (page/sort/filters via
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
import zhAssets from '@/locales/zh-CN/assets';
import zhCommon from '@/locales/zh-CN/common';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhAssets },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { EntityType } from '@/types/tb';

import AssetsListPage from './index';

const servicesMock = vi.hoisted(() => ({
  getTenantAssets: vi.fn(),
  getCustomerAssets: vi.fn(),
  getAssetProfiles: vi.fn(),
  deleteAsset: vi.fn(),
  assignAssetToCustomer: vi.fn(),
  unassignAssetFromCustomer: vi.fn(),
}));

const customerServiceMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/asset', () => servicesMock);
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

function asset(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id: { entityType: EntityType.ASSET, id },
    createdTime: 1_700_000_000_000,
    name,
    assetProfileName: '默认资产配置',
    label: '',
    customerTitle: '',
    customerIsPublic: false,
    customerId: NULL_CUSTOMER,
    assetProfileId: { entityType: EntityType.ASSET_PROFILE, id: 'ap-1' },
    ...extra,
  };
}

const TENANT_PAGE = {
  data: [
    asset('ast-1', 'm2-test-asset-alpha'),
    asset('ast-2', 'm2-test-asset-beta', {
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
          <AssetsListPage />
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

describe('assets list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/assets');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getTenantAssets.mockResolvedValue(TENANT_PAGE);
    servicesMock.getCustomerAssets.mockResolvedValue(TENANT_PAGE);
    servicesMock.getAssetProfiles.mockResolvedValue({ data: [] });
    servicesMock.deleteAsset.mockResolvedValue(undefined);
    servicesMock.assignAssetToCustomer.mockResolvedValue(TENANT_PAGE.data[0]);
    servicesMock.unassignAssetFromCustomer.mockResolvedValue(undefined);
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
    window.history.replaceState({}, '', '/assets');
  });

  it('loads page 1 with the default sort and renders the rows', async () => {
    renderPage();

    expect(await screen.findByText('m2-test-asset-alpha')).toBeInTheDocument();
    expect(screen.getByText('m2-test-asset-beta')).toBeInTheDocument();
    expect(servicesMock.getTenantAssets).toHaveBeenCalledWith(
      DEFAULT_PAGE_LINK,
      { assetProfileId: undefined },
    );
    expect(servicesMock.getCustomerAssets).not.toHaveBeenCalled();
  });

  it('moves pagination into the URL and the 0-based server call', async () => {
    renderPage();
    await screen.findByText('m2-test-asset-alpha');

    fireEvent.click(screen.getByTitle('2'));

    await waitFor(() => {
      expect(servicesMock.getTenantAssets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
        { assetProfileId: undefined },
      );
    });
    expect(window.location.search).toContain('page=2');
  });

  it('initializes the profile filter from the assetProfileId URL param', async () => {
    window.history.replaceState({}, '', '/assets?assetProfileId=ap-9');
    renderPage();

    await screen.findByText('m2-test-asset-alpha');
    expect(servicesMock.getTenantAssets).toHaveBeenCalledWith(
      expect.objectContaining(DEFAULT_PAGE_LINK),
      { assetProfileId: 'ap-9' },
    );
  });

  it('debounces the text search into the server query', async () => {
    renderPage();
    await screen.findByText('m2-test-asset-alpha');

    fireEvent.change(screen.getByPlaceholderText('搜索资产'), {
      target: { value: '  alpha ' },
    });

    await waitFor(
      () => {
        expect(servicesMock.getTenantAssets).toHaveBeenCalledWith(
          expect.objectContaining({ textSearch: 'alpha' }),
          { assetProfileId: undefined },
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

    expect(await screen.findByText('m2-test-asset-alpha')).toBeInTheDocument();
    expect(servicesMock.getCustomerAssets).toHaveBeenCalledWith(
      'cust-1',
      DEFAULT_PAGE_LINK,
      { assetProfileId: undefined },
    );
    expect(servicesMock.getTenantAssets).not.toHaveBeenCalled();

    // Read-only: no create / import / edit / selection affordances.
    expect(
      screen.queryByRole('button', { name: '添加新资产' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '导入资产' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTitle('编辑')).not.toBeInTheDocument();
    expect(document.querySelector('.ant-table-selection-column')).toBeNull();
  });

  it('confirms before deleting a single row', async () => {
    renderPage();
    await screen.findByText('m2-test-asset-alpha');

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
      within(confirm).getAllByText(/确定要删除资产“m2-test-asset-alpha”吗？/),
    ).not.toHaveLength(0);

    // antd auto-inserts a space between the two CJK chars in the ok button.
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteAsset).toHaveBeenCalledWith('ast-1');
    });
  });

  it('fans batch delete out per asset and reports progress', async () => {
    renderPage();
    await screen.findByText('m2-test-asset-alpha');

    const rowCheckbox = (index: number) =>
      document.querySelectorAll(
        '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
      )[index] as HTMLElement;
    expect(rowCheckbox(0)).toBeTruthy();
    fireEvent.click(rowCheckbox(0));
    await waitFor(() => {
      expect(screen.getByText('已选 1 项')).toBeInTheDocument();
    });
    fireEvent.click(rowCheckbox(1));
    await waitFor(() => {
      expect(screen.getByText('已选 2 项')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /删除所选/ }));
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    // antd confirm renders the title twice (visible + announced copy).
    expect(
      within(confirm).getAllByText(/确定要删除 2 个资产吗？/),
    ).not.toHaveLength(0);

    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteAsset).toHaveBeenCalledTimes(2);
    });
    expect(servicesMock.deleteAsset).toHaveBeenCalledWith('ast-1');
    expect(servicesMock.deleteAsset).toHaveBeenCalledWith('ast-2');
  });

  it('navigates to the detail page from the name link', async () => {
    renderPage();
    await screen.findByText('m2-test-asset-alpha');

    fireEvent.click(screen.getByText('m2-test-asset-alpha'));
    expect(historyMock.push).toHaveBeenCalledWith('/assets/ast-1');
  });

  it('shows the load-failure alert with the server error text', async () => {
    servicesMock.getTenantAssets.mockRejectedValue(
      Object.assign(new Error('should-not-leak'), {
        detail: '资产列表不可用',
      }),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('加载资产列表失败')).toBeInTheDocument();
    });
  });
});
