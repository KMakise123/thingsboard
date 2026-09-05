/**
 * Edge-scope entity views page tests (wave 5a): scoped query, the detail
 * jump, single unassign and the assign-existing fan-out. Services are
 * mocked at the module boundary; pro-components is replaced by antd's Table.
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
import type { EntityView } from '@/types/tb/entity-view';

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
  getEdgeEntityViews: vi.fn(),
  assignEdgeEntityView: vi.fn(),
  unassignEdgeEntityView: vi.fn(),
}));

const entityViewMock = vi.hoisted(() => ({
  getTenantEntityViews: vi.fn(),
}));

vi.mock('@/services/tb/edge', () => edgeMock);
vi.mock('@/services/tb/entity-view', () => entityViewMock);

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

import EdgeEntityViewsPage from './index';

function entityView(id: string, name: string): EntityView {
  return {
    id: { entityType: EntityType.ENTITY_VIEW, id },
    createdTime: 1_700_000_000_000,
    name,
    type: 'temperature',
    entityId: { entityType: EntityType.DEVICE, id: 'dev-x' },
  } as EntityView;
}

const PAGE = {
  data: [
    entityView('ev-1', 'scope-view-a'),
    entityView('ev-2', 'scope-view-b'),
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
          <EdgeEntityViewsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/edges/edge-1/entityViews');
  edgeMock.getEdgeInfo.mockResolvedValue({
    id: { entityType: EntityType.EDGE, id: 'edge-1' },
    createdTime: 1,
    name: '网关A',
    type: 'default',
    routingKey: 'rk',
    secret: 'sec',
  });
  edgeMock.getEdgeEntityViews.mockResolvedValue(PAGE);
  edgeMock.assignEdgeEntityView.mockResolvedValue({});
  edgeMock.unassignEdgeEntityView.mockResolvedValue(undefined);
  entityViewMock.getTenantEntityViews.mockResolvedValue({
    data: [
      {
        id: { entityType: EntityType.ENTITY_VIEW, id: 'tenant-ev-1' },
        createdTime: 1,
        name: 'tenant-view-a',
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

describe('EdgeEntityViewsPage', () => {
  it('queries the edge-scoped endpoint and titles with the edge name', async () => {
    renderPage();

    expect(await screen.findByText('scope-view-a')).toBeInTheDocument();
    expect(edgeMock.getEdgeEntityViews).toHaveBeenCalledWith('edge-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(screen.getByText('网关A: 实体视图')).toBeInTheDocument();
  });

  it('jumps to the entity view detail from the name link', async () => {
    renderPage();
    await screen.findByText('scope-view-a');

    fireEvent.click(screen.getByText('scope-view-a'));
    expect(historyMock.push).toHaveBeenCalledWith('/entityViews/ev-1');
  });

  it('confirms before unassigning an entity view from the edge', async () => {
    renderPage();
    await screen.findByText('scope-view-a');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('从 Edge 取消分配'));

    expect(
      (await screen.findAllByText(/确定要将“scope-view-a”从 Edge 取消分配吗？/))
        .length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      within(document.body).getByRole('button', { name: /从 Edge 取消分配/ }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeEntityView).toHaveBeenCalledWith(
        'edge-1',
        'ev-1',
      );
    });
  });

  it('assigns existing tenant entity views through the dialog', async () => {
    renderPage();
    await screen.findByText('scope-view-a');

    fireEvent.click(screen.getByRole('button', { name: /分配已有实体视图/ }));
    const modal = await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    await waitFor(() => {
      expect(entityViewMock.getTenantEntityViews).toHaveBeenCalled();
    });

    fireEvent.mouseDown(
      within(modal).getByText('搜索并选择实体') as HTMLElement,
    );
    const option = await waitFor(() => {
      const node = document.querySelector(
        '.ant-select-item-option[title="tenant-view-a"]',
      );
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(option);
    fireEvent.click(within(modal).getByRole('button', { name: /分\s*配/ }));

    await waitFor(() => {
      expect(edgeMock.assignEdgeEntityView).toHaveBeenCalledWith(
        'edge-1',
        'tenant-ev-1',
      );
    });
  });
});
