/**
 * Edge-scope assets page tests (wave 5a): scoped query, the detail jump,
 * single unassign and the assign-existing fan-out. Services are mocked at
 * the module boundary; pro-components is replaced by antd's Table.
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
import type { AssetInfo } from '@/types/tb/asset';

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
  getEdgeAssets: vi.fn(),
  assignEdgeAsset: vi.fn(),
  unassignEdgeAsset: vi.fn(),
}));

const assetMock = vi.hoisted(() => ({
  getTenantAssets: vi.fn(),
}));

vi.mock('@/services/tb/edge', () => edgeMock);
vi.mock('@/services/tb/asset', () => assetMock);

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

import EdgeAssetsPage from './index';

function asset(id: string, name: string): AssetInfo {
  return {
    id: { entityType: EntityType.ASSET, id },
    createdTime: 1_700_000_000_000,
    name,
    type: 'building',
    label: '',
    assetProfileName: '楼宇',
  } as AssetInfo;
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
          <EdgeAssetsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/edges/edge-1/assets');
  edgeMock.getEdgeInfo.mockResolvedValue({
    id: { entityType: EntityType.EDGE, id: 'edge-1' },
    createdTime: 1,
    name: '网关A',
    type: 'default',
    routingKey: 'rk',
    secret: 'sec',
  });
  edgeMock.getEdgeAssets.mockResolvedValue(PAGE);
  edgeMock.assignEdgeAsset.mockResolvedValue({});
  edgeMock.unassignEdgeAsset.mockResolvedValue(undefined);
  assetMock.getTenantAssets.mockResolvedValue({
    data: [
      {
        id: { entityType: EntityType.ASSET, id: 'tenant-asset-1' },
        createdTime: 1,
        name: 'tenant-asset-a',
      },
    ],
    totalElements: 1,
    totalPages: 1,
    hasNext: false,
  });
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

describe('EdgeAssetsPage', () => {
  it('queries the edge-scoped endpoint and titles with the edge name', async () => {
    renderPage();

    expect(await screen.findByText('scope-asset-a')).toBeInTheDocument();
    expect(edgeMock.getEdgeAssets).toHaveBeenCalledWith('edge-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(screen.getByText('网关A: 资产')).toBeInTheDocument();
  });

  it('jumps to the asset detail from the name link', async () => {
    renderPage();
    await screen.findByText('scope-asset-a');

    fireEvent.click(screen.getByText('scope-asset-a'));
    expect(historyMock.push).toHaveBeenCalledWith('/assets/asset-1');
  });

  it('confirms before unassigning an asset from the edge', async () => {
    renderPage();
    await screen.findByText('scope-asset-a');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('从 Edge 取消分配'));

    expect(
      (
        await screen.findAllByText(
          /确定要将“scope-asset-a”从 Edge 取消分配吗？/,
        )
      ).length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      within(document.body).getByRole('button', { name: /从 Edge 取消分配/ }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeAsset).toHaveBeenCalledWith(
        'edge-1',
        'asset-1',
      );
    });
  });

  it('fans batch unassign out per selected asset', async () => {
    renderPage();
    await screen.findByText('scope-asset-a');

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
      expect(edgeMock.unassignEdgeAsset).toHaveBeenCalledWith(
        'edge-1',
        'asset-1',
      );
      expect(edgeMock.unassignEdgeAsset).toHaveBeenCalledWith(
        'edge-1',
        'asset-2',
      );
    });
  });

  it('assigns existing tenant assets through the dialog', async () => {
    renderPage();
    await screen.findByText('scope-asset-a');

    fireEvent.click(screen.getByRole('button', { name: /分配已有资产/ }));
    const modal = await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    await waitFor(() => {
      expect(assetMock.getTenantAssets).toHaveBeenCalled();
    });

    fireEvent.mouseDown(
      within(modal).getByText('搜索并选择实体') as HTMLElement,
    );
    const option = await waitFor(() => {
      const node = document.querySelector(
        '.ant-select-item-option[title="tenant-asset-a"]',
      );
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(option);
    fireEvent.click(within(modal).getByRole('button', { name: /分\s*配/ }));

    await waitFor(() => {
      expect(edgeMock.assignEdgeAsset).toHaveBeenCalledWith(
        'edge-1',
        'tenant-asset-1',
      );
    });
  });
});
