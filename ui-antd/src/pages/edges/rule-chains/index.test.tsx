/**
 * Edge-scope rule chains page tests (wave 5b): the scoped query, the
 * missing-related-chains Alert (name-map parse), Set root with confirm, the
 * root row guards (unassign disabled + row not selectable), single unassign
 * and the EDGE-only assign dialog. Services are mocked at the module
 * boundary; pro-components is replaced by antd's Table (same workaround as
 * the other edge scope pages).
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
import type { RuleChain } from '@/types/tb/rule-chain';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEdge },
});

const historyMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({ id: 'edge-1' }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const edgeMock = vi.hoisted(() => ({
  getEdgeInfo: vi.fn(),
  getEdgeRuleChains: vi.fn(),
  assignEdgeRuleChain: vi.fn(),
  unassignEdgeRuleChain: vi.fn(),
  setEdgeRootRuleChain: vi.fn(),
  getMissingToRelatedRuleChains: vi.fn(),
}));

const ruleChainMock = vi.hoisted(() => ({
  getRuleChains: vi.fn(),
}));

vi.mock('@/services/tb/edge', () => edgeMock);
vi.mock('@/services/tb/rule-chain', () => ruleChainMock);

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

import EdgeRuleChainsPage, { parseMissingRuleChains } from './index';

function chain(id: string, name: string, root = false): RuleChain {
  return {
    id: { entityType: EntityType.RULE_CHAIN, id },
    createdTime: 1_700_000_000_000,
    name,
    type: 'EDGE',
    root,
  } as RuleChain;
}

const PAGE = {
  data: [chain('rc-root', '根链A', true), chain('rc-1', '链B')],
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
          <EdgeRuleChainsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/edges/edge-1/ruleChains');
  edgeMock.getEdgeInfo.mockResolvedValue({
    id: { entityType: EntityType.EDGE, id: 'edge-1' },
    createdTime: 1,
    name: '网关A',
    type: 'default',
    routingKey: 'rk',
    secret: 'sec',
  });
  edgeMock.getEdgeRuleChains.mockResolvedValue(PAGE);
  edgeMock.getMissingToRelatedRuleChains.mockResolvedValue('{}');
  edgeMock.assignEdgeRuleChain.mockResolvedValue({});
  edgeMock.unassignEdgeRuleChain.mockResolvedValue(undefined);
  edgeMock.setEdgeRootRuleChain.mockResolvedValue({});
  ruleChainMock.getRuleChains.mockResolvedValue({
    data: [
      {
        id: { entityType: EntityType.RULE_CHAIN, id: 'tenant-rc-1' },
        createdTime: 1,
        name: '租户链甲',
        type: 'EDGE',
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

describe('parseMissingRuleChains', () => {
  it('parses the name-map JSON text and ignores junk', () => {
    expect(parseMissingRuleChains('{"链A":["链X"]}')).toEqual([
      { chain: '链A', missing: ['链X'] },
    ]);
    expect(parseMissingRuleChains('{}')).toEqual([]);
    expect(parseMissingRuleChains('{"链A":[]}')).toEqual([]);
    expect(parseMissingRuleChains(undefined)).toEqual([]);
    expect(parseMissingRuleChains('not json')).toEqual([]);
    expect(parseMissingRuleChains('["链X"]')).toEqual([]);
  });
});

describe('EdgeRuleChainsPage', () => {
  it('queries the edge-scoped endpoint and titles with the edge name', async () => {
    renderPage();

    expect(await screen.findByText('链B')).toBeInTheDocument();
    expect(edgeMock.getEdgeRuleChains).toHaveBeenCalledWith('edge-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(screen.getByText('网关A: 规则链')).toBeInTheDocument();
    // The root chain row shows the checked root checkbox.
    const rootBox = document.querySelector(
      '[data-testid="rc-root-rc-root"]',
    ) as HTMLInputElement;
    expect(rootBox.checked).toBe(true);
    expect(rootBox.disabled).toBe(true);
  });

  it('lists missing related chains in a closable Alert', async () => {
    edgeMock.getMissingToRelatedRuleChains.mockResolvedValue(
      '{"链B":["链X","链Y"]}',
    );
    renderPage();

    expect(await screen.findByTestId('rc-missing-alert')).toBeInTheDocument();
    expect(screen.getByText(/「链B」缺少：链X, 链Y/)).toBeInTheDocument();

    fireEvent.click(
      screen
        .getByTestId('rc-missing-alert')
        .querySelector('.ant-alert-close-icon') as HTMLElement,
    );
    await waitFor(() => {
      expect(screen.queryByTestId('rc-missing-alert')).not.toBeInTheDocument();
    });
  });

  it('confirms before setting a chain as the edge root', async () => {
    renderPage();
    await screen.findByText('链B');

    // Second row is the non-root chain.
    fireEvent.click(
      document.querySelectorAll('.ant-dropdown-trigger')[1] as HTMLElement,
    );
    fireEvent.click(await screen.findByText('设为根'));

    await screen.findAllByText(/设为根规则链？/);
    fireEvent.click(
      within(document.body).getByRole('button', { name: '设为根' }),
    );
    await waitFor(() => {
      expect(edgeMock.setEdgeRootRuleChain).toHaveBeenCalledWith(
        'edge-1',
        'rc-1',
      );
    });
  });

  it('disables unassign for the root chain row and keeps it unselectable', async () => {
    renderPage();
    await screen.findByText('链B');

    // First row is the root chain: its dropdown opens with a disabled
    // unassign entry.
    fireEvent.click(
      document.querySelectorAll('.ant-dropdown-trigger')[0] as HTMLElement,
    );
    const unassignItem = await screen.findByText('从 Edge 取消分配');
    expect(
      unassignItem
        .closest('.ant-dropdown-menu-item')
        ?.classList.contains('ant-dropdown-menu-item-disabled'),
    ).toBe(true);

    // The root row's selection checkbox is disabled (batch unassign guard).
    const checkboxes = document.querySelectorAll(
      '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
    );
    expect((checkboxes[0] as HTMLInputElement).disabled).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).disabled).toBe(false);
  });

  it('unassigns a non-root chain from the edge after confirm', async () => {
    renderPage();
    await screen.findByText('链B');

    fireEvent.click(
      document.querySelectorAll('.ant-dropdown-trigger')[1] as HTMLElement,
    );
    fireEvent.click(await screen.findByText('从 Edge 取消分配'));

    await screen.findAllByText(/确定要将“链B”从 Edge 取消分配吗？/);
    fireEvent.click(
      within(document.body).getByRole('button', { name: /从 Edge 取消分配/ }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeRuleChain).toHaveBeenCalledWith(
        'edge-1',
        'rc-1',
      );
    });
  });

  it('assigns existing EDGE-type chains through the dialog', async () => {
    renderPage();
    await screen.findByText('链B');

    fireEvent.click(screen.getByRole('button', { name: /分配已有规则链/ }));
    const modal = await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    await waitFor(() => {
      expect(ruleChainMock.getRuleChains).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0 }),
        'EDGE',
      );
    });

    fireEvent.mouseDown(
      within(modal).getByText('搜索并选择实体') as HTMLElement,
    );
    const option = await waitFor(() => {
      const node = document.querySelector(
        '.ant-select-item-option[title="租户链甲"]',
      );
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(option);
    fireEvent.click(within(modal).getByRole('button', { name: /分\s*配/ }));

    await waitFor(() => {
      expect(edgeMock.assignEdgeRuleChain).toHaveBeenCalledWith(
        'edge-1',
        'tenant-rc-1',
      );
    });
  });
});
