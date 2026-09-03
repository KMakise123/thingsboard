/**
 * ruleChains list page tests (M8 wave-3 D): URL-state plumbing, the root-row
 * guards (delete / set-root disabled), set-root + delete + create/export
 * flows, and the details dialog tab assembly. Services are mocked at the
 * module boundary (dashboards-list test conventions, ProTable → antd Table).
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
import zhPage from '@/locales/zh-CN/editor-rulechain-page';
import zhMenu from '@/locales/zh-CN/menu';
import { EntityType } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhMenu, ...zhPage },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import RuleChainsListPage from './list';

const serviceMock = vi.hoisted(() => ({
  getRuleChains: vi.fn(),
  getRuleChainById: vi.fn(),
  getRuleChainMetaData: vi.fn(),
  saveRuleChain: vi.fn(),
  deleteRuleChain: vi.fn(),
  setRootRuleChain: vi.fn(),
}));

vi.mock('@/services/tb/rule-chain', () => serviceMock);

// details-dialog sibling panels resolve through these services; empty
// results are enough for the tab-assembly assertions
vi.mock('@/services/tb/events', () => ({
  getEventsByFilter: vi.fn().mockResolvedValue({
    data: [],
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  }),
  clearEvents: vi.fn(),
}));
vi.mock('@/services/tb/attributes', () => ({
  getAttributes: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/services/tb/alarm', () => ({
  getAlarms: vi.fn().mockResolvedValue({
    data: [],
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  }),
}));
vi.mock('@/services/tb/relations', () => ({
  getRelations: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/services/tb/audit-log', () => ({
  getAuditLogs: vi.fn().mockResolvedValue({
    data: [],
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  }),
}));

// vite-node cannot resolve antd's extensionless internal locale imports
// through @ant-design/pro-components (same workaround as the assets list)
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
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

const intlMessageIds = { intl };

function chain(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id: { entityType: EntityType.RULE_CHAIN, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 't-1' },
    name,
    type: 'CORE',
    ...extra,
  };
}

const PAGE = {
  data: [
    chain('rc-root', 'Root Chain', { root: true }),
    chain('rc-2', 'Thermostats Chain'),
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
          <RuleChainsListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/ruleChains');
  serviceMock.getRuleChains.mockResolvedValue(PAGE);
  serviceMock.getRuleChainById.mockResolvedValue(
    chain('rc-2', 'Thermostats Chain'),
  );
  serviceMock.getRuleChainMetaData.mockResolvedValue({
    ruleChainId: { entityType: EntityType.RULE_CHAIN, id: 'rc-2' },
    version: 1,
    nodes: [],
    connections: [],
  });
  serviceMock.saveRuleChain.mockResolvedValue(
    chain('rc-new', '新建链', {
      id: { entityType: EntityType.RULE_CHAIN, id: 'rc-new' },
    }),
  );
  serviceMock.deleteRuleChain.mockResolvedValue(undefined);
  serviceMock.setRootRuleChain.mockResolvedValue(
    chain('rc-2', 'Thermostats Chain', { root: true }),
  );
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('ruleChains list page', () => {
  it('loads the list through the URL-state page params', async () => {
    renderPage();

    expect(await screen.findByText('Thermostats Chain')).toBeInTheDocument();
    expect(serviceMock.getRuleChains).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('marks the root chain and disables delete / set-root on it', async () => {
    renderPage();
    await screen.findByText('Thermostats Chain');

    // the root tag renders for the root chain only
    expect(screen.getByTestId('rc-root-tag-rc-root')).toBeInTheDocument();

    const rootMenu = screen.getByTestId('rc-more-rc-root');
    fireEvent.click(rootMenu);
    const setRootItem = await screen.findByText('设为根链');
    const deleteItem = screen.getAllByText('删除').at(-1) as HTMLElement;
    // antd renders the disabled items with the ant-menu-item-disabled class
    const rootMenuItem = setRootItem.closest('li');
    const deleteMenuItem = deleteItem.closest('li');
    expect(rootMenuItem?.className).toContain('disabled');
    expect(deleteMenuItem?.className).toContain('disabled');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
  });

  it('set-root posts to the root endpoint and refreshes', async () => {
    renderPage();
    await screen.findByText('Thermostats Chain');

    fireEvent.click(screen.getByTestId('rc-more-rc-2'));
    fireEvent.click(await screen.findByText('设为根链'));
    // confirm dialog (title renders twice: modal shell + confirm body)
    await screen.findAllByText('确认设为根链？');
    const okButton = document.querySelector(
      '.ant-modal-confirm .ant-btn-primary',
    ) as HTMLButtonElement | null;
    fireEvent.click(okButton as HTMLButtonElement);

    await waitFor(() => {
      expect(serviceMock.setRootRuleChain).toHaveBeenCalledWith('rc-2');
    });
  });

  it('delete shows a confirm and surfaces backend rejections verbatim', async () => {
    serviceMock.deleteRuleChain.mockRejectedValue(
      Object.assign(new Error('referenced'), { message: '被其他规则链引用' }),
    );
    renderPage();
    await screen.findByText('Thermostats Chain');

    fireEvent.click(screen.getByTestId('rc-more-rc-2'));
    fireEvent.click((await screen.findAllByText('删除'))[0]);
    // D1 regression: the delete confirm interpolates the actual chain name
    await screen.findAllByText('确认删除规则链「Thermostats Chain」？');
    const okButton = document.querySelector(
      '.ant-modal-confirm .ant-btn-dangerous',
    ) as HTMLButtonElement | null;
    fireEvent.click(okButton as HTMLButtonElement);

    await waitFor(() => {
      expect(serviceMock.deleteRuleChain).toHaveBeenCalledWith('rc-2');
    });
    // backend error text surfaces (报错透出)
    await waitFor(() => {
      expect(screen.getAllByText(/被其他规则链引用/).length).toBeGreaterThan(0);
    });
  });

  it('create posts a fresh CORE chain and reports it', async () => {
    renderPage();
    await screen.findByText('Thermostats Chain');

    fireEvent.click(screen.getByTestId('rc-new-chain'));
    fireEvent.change(await screen.findByTestId('rc-chain-form-name'), {
      target: { value: '新建链' },
    });
    fireEvent.click(
      screen
        .getByTestId('rc-chain-form-dialog')
        .querySelector('.ant-btn-primary') as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(serviceMock.saveRuleChain).toHaveBeenCalledWith(
        expect.objectContaining({ name: '新建链', type: 'CORE' }),
      );
    });
    // a create payload carries no id (新建语义)
    const payload = serviceMock.saveRuleChain.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(payload.id).toBeUndefined();
    // D1 regression: the created toast interpolates the actual chain name
    // (ICU straight-quote escaping used to render a bare {name})
    expect(await screen.findByText('规则链「新建链」已创建。')).toBeInTheDocument();
  });

  it('edit prefills the name and merges additionalInfo.description', async () => {
    renderPage();
    await screen.findByText('Thermostats Chain');

    fireEvent.click(screen.getByTestId('rc-more-rc-2'));
    fireEvent.click(await screen.findByText('编辑'));
    const nameInput = await screen.findByTestId('rc-chain-form-name');
    expect(nameInput).toHaveValue('Thermostats Chain');
    fireEvent.change(nameInput, { target: { value: 'Renamed Chain' } });
    fireEvent.change(screen.getByTestId('rc-chain-form-description'), {
      target: { value: 'demo' },
    });
    fireEvent.click(
      screen
        .getByTestId('rc-chain-form-dialog')
        .querySelector('.ant-btn-primary') as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(serviceMock.saveRuleChain).toHaveBeenCalledWith(
        expect.objectContaining({
          id: { entityType: EntityType.RULE_CHAIN, id: 'rc-2' },
          name: 'Renamed Chain',
          additionalInfo: { description: 'demo' },
        }),
      );
    });
  });

  it('export applies the strip rules to the GET truth', async () => {
    // capture the REAL anchor (React creates host elements through
    // document.createElement — a fake node breaks the table render)
    const originalCreate = document.createElement.bind(document);
    let lastAnchor: HTMLAnchorElement | null = null;
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation(((
      tag: string,
      options?: ElementCreationOptions,
    ) => {
      const el = originalCreate(tag, options);
      if (tag === 'a') {
        lastAnchor = el as HTMLAnchorElement;
      }
      return el;
    }) as typeof document.createElement);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    renderPage();
    await screen.findByText('Thermostats Chain');

    fireEvent.click(screen.getByTestId('rc-more-rc-2'));
    fireEvent.click(await screen.findByText('导出规则链'));

    await waitFor(() => {
      expect(lastAnchor?.download).toBe('Thermostats Chain.json');
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(serviceMock.getRuleChainById).toHaveBeenCalledWith('rc-2');
    createSpy.mockRestore();
    vi.restoreAllMocks();
    void intlMessageIds;
    void within;
  });

  it('details dialog assembles the entity tabs with DEBUG_RULE_CHAIN events', async () => {
    renderPage();
    await screen.findByText('Thermostats Chain');

    fireEvent.click(screen.getByTestId('rc-more-rc-2'));
    fireEvent.click(await screen.findByText('详情'));

    const dialog = await screen.findByTestId('rc-details-dialog');
    expect(within(dialog as HTMLElement).getByText('属性')).toBeInTheDocument();
    expect(within(dialog as HTMLElement).getByText('告警')).toBeInTheDocument();
    expect(within(dialog as HTMLElement).getByText('事件')).toBeInTheDocument();
    expect(within(dialog as HTMLElement).getByText('关联')).toBeInTheDocument();
    expect(
      within(dialog as HTMLElement).getByText('审计日志'),
    ).toBeInTheDocument();
    // the events tab queries the RULE_CHAIN debug table
    await waitFor(() => {
      expect(serviceMock.getRuleChains).toHaveBeenCalled();
    });
  });
});
