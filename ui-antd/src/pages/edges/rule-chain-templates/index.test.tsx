/**
 * Rule chain templates page tests (wave 5b): the two-call data merge (paged
 * EDGE list + auto-assign id set), the template-root confirm, the
 * auto-assign checkbox writing immediately, the canvas-entry name link and
 * the EDGE-typed create dialog. Services are mocked at the module boundary;
 * pro-components is replaced by antd's Table (same workaround as the other
 * edge pages).
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
import zhRuleChainPage from '@/locales/zh-CN/editor-rulechain-page';
import zhMenu from '@/locales/zh-CN/menu';
import { EntityType } from '@/types/tb';
import type { RuleChain } from '@/types/tb/rule-chain';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhMenu, ...zhEdge, ...zhRuleChainPage },
});

const historyMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({}),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const edgeMock = vi.hoisted(() => ({
  getAutoAssignToEdgeRuleChains: vi.fn(),
  setAutoAssignToEdgeRuleChain: vi.fn(),
  unsetAutoAssignToEdgeRuleChain: vi.fn(),
  setEdgeTemplateRoot: vi.fn(),
}));

const ruleChainMock = vi.hoisted(() => ({
  getRuleChains: vi.fn(),
  saveRuleChain: vi.fn(),
  saveRuleChainMetaData: vi.fn(),
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

import RuleChainTemplatesPage from './index';

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
  data: [
    chain('tpl-root', '模板根链', true),
    chain('tpl-1', '模板链乙'),
    chain('tpl-2', '模板链丙'),
  ],
  totalElements: 3,
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
          <RuleChainTemplatesPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/edges/rule-chains');
  edgeMock.getAutoAssignToEdgeRuleChains.mockResolvedValue([
    chain('tpl-1', '模板链乙'),
  ]);
  edgeMock.setAutoAssignToEdgeRuleChain.mockResolvedValue({});
  edgeMock.unsetAutoAssignToEdgeRuleChain.mockResolvedValue({});
  edgeMock.setEdgeTemplateRoot.mockResolvedValue({});
  ruleChainMock.getRuleChains.mockResolvedValue(PAGE);
  ruleChainMock.saveRuleChain.mockResolvedValue(
    chain('tpl-new', '新链', false),
  );
  ruleChainMock.saveRuleChainMetaData.mockResolvedValue({});
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

describe('RuleChainTemplatesPage', () => {
  it('merges the paged EDGE list with the auto-assign id set', async () => {
    renderPage();

    expect(await screen.findByText('模板链乙')).toBeInTheDocument();
    expect(ruleChainMock.getRuleChains).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0 }),
      'EDGE',
    );
    expect(edgeMock.getAutoAssignToEdgeRuleChains).toHaveBeenCalled();

    // The backend-flagged root row renders the checked (locked) template
    // root checkbox; the auto-assign column reflects the id set.
    const rootBox = document.querySelector(
      '[data-testid="tpl-template-root-tpl-root"]',
    ) as HTMLInputElement;
    expect(rootBox.checked).toBe(true);
    expect(rootBox.disabled).toBe(true);
    const assignedBox = document.querySelector(
      '[data-testid="tpl-auto-assign-tpl-1"]',
    ) as HTMLInputElement;
    expect(assignedBox.checked).toBe(true);
    expect(assignedBox.disabled).toBe(false);
    const unassignedBox = document.querySelector(
      '[data-testid="tpl-auto-assign-tpl-2"]',
    ) as HTMLInputElement;
    expect(unassignedBox.checked).toBe(false);
    expect(unassignedBox.disabled).toBe(false);
    // ngx guard: the template root never toggles auto-assign.
    const rootAssignBox = document.querySelector(
      '[data-testid="tpl-auto-assign-tpl-root"]',
    ) as HTMLInputElement;
    expect(rootAssignBox.checked).toBe(false);
    expect(rootAssignBox.disabled).toBe(true);
  });

  it('confirms before setting the Edge template root', async () => {
    renderPage();
    await screen.findByText('模板链乙');

    fireEvent.click(
      document.querySelector(
        '[data-testid="tpl-template-root-tpl-1"]',
      ) as HTMLElement,
    );
    await screen.findAllByText(/设为 Edge 模板根规则链？/);
    fireEvent.click(
      within(document.body).getByRole('button', { name: '设为模板根链' }),
    );
    await waitFor(() => {
      expect(edgeMock.setEdgeTemplateRoot).toHaveBeenCalledWith('tpl-1');
    });
  });

  it('writes the auto-assign toggle immediately', async () => {
    renderPage();
    await screen.findByText('模板链乙');

    // Unchecked non-root row → Set auto-assign.
    fireEvent.click(
      document.querySelector(
        '[data-testid="tpl-auto-assign-tpl-2"]',
      ) as HTMLElement,
    );
    await waitFor(() => {
      expect(edgeMock.setAutoAssignToEdgeRuleChain).toHaveBeenCalledWith(
        'tpl-2',
      );
    });

    // Checked row → Unset auto-assign.
    fireEvent.click(
      document.querySelector(
        '[data-testid="tpl-auto-assign-tpl-1"]',
      ) as HTMLElement,
    );
    await waitFor(() => {
      expect(edgeMock.unsetAutoAssignToEdgeRuleChain).toHaveBeenCalledWith(
        'tpl-1',
      );
    });
  });

  it('opens the chain canvas from the name link', async () => {
    renderPage();
    await screen.findByText('模板链乙');

    fireEvent.click(screen.getByTestId('tpl-open-tpl-1'));
    expect(historyMock.push).toHaveBeenCalledWith('/ruleChains/tpl-1');
  });

  it('creates an EDGE-type chain and jumps into the canvas', async () => {
    renderPage();
    await screen.findByText('模板链乙');

    fireEvent.click(screen.getByTestId('tpl-new'));
    const dialog = await screen.findByTestId('tpl-create-dialog');
    fireEvent.change(
      within(dialog as HTMLElement).getByTestId('tpl-create-name'),
      { target: { value: '新链' } },
    );
    fireEvent.click(
      within(document.body).getByRole('button', { name: /确\s*定/ }),
    );

    await waitFor(() => {
      expect(ruleChainMock.saveRuleChain).toHaveBeenCalledWith(
        expect.objectContaining({ name: '新链', type: 'EDGE' }),
      );
    });
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/ruleChains/tpl-new');
    });
  });

  it('imports a chain file with the type forced to EDGE', async () => {
    renderPage();
    await screen.findByText('模板链乙');

    fireEvent.click(screen.getByTestId('tpl-import'));
    const input = await waitFor(() => {
      const node = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      expect(node).not.toBeNull();
      return node;
    });
    const file = new File(
      [
        JSON.stringify({
          ruleChain: { name: '导入链', type: 'CORE' },
          metadata: { nodes: [], connections: [] },
        }),
      ],
      'imported.json',
      { type: 'application/json' },
    );
    fireEvent.change(input, { target: { files: [file] } });

    // The confirm step only unlocks after a parsed report.
    const okButton = (await screen.findByRole('button', {
      name: /导入并打开/,
    })) as HTMLButtonElement;
    await waitFor(() => {
      expect(okButton.disabled).toBe(false);
    });
    fireEvent.click(okButton);

    await waitFor(() => {
      expect(ruleChainMock.saveRuleChain).toHaveBeenCalledWith(
        expect.objectContaining({ name: '导入链', type: 'EDGE' }),
      );
    });
    await waitFor(() => {
      expect(ruleChainMock.saveRuleChainMetaData).toHaveBeenCalled();
    });
  });
});
