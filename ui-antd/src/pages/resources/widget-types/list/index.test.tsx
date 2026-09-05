/**
 * Widget types list page smoke tests (M11 wave 1B): column rendering, the
 * deprecated filter in the URL/query, the template-select create dialog,
 * delete confirmation and the system-column visibility rule. Services are
 * mocked at the module boundary (Wave1 rule: the page never does HTTP).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhWidgetTypes from '@/locales/zh-CN/resources/widget-types';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhWidgetTypes },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getWidgetTypes: vi.fn(),
  deleteWidgetType: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/widget-type', () => servicesMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));

import WidgetTypesListPage from './index';

// The same ProTable shim the devices list test uses (antd Table passthrough
// with the props/onChange contract).
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

const SYSTEM_TENANT = {
  entityType: 'TENANT',
  id: '13814000-1dd2-11b2-8080-808080808080',
};
const OWN_TENANT = { entityType: 'TENANT', id: 'tenant-1' };

function row(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id: { entityType: 'WIDGET_TYPE', id },
    createdTime: 1_700_000_000_000,
    name,
    widgetType: 'latest',
    deprecated: false,
    bundles: [
      { id: { entityType: 'WIDGETS_BUNDLE', id: 'b-1' }, name: '卡片包' },
    ],
    ...extra,
  };
}

const PAGE = {
  data: [
    row('wt-1', '我的卡片', { tenantId: OWN_TENANT }),
    row('wt-2', '系统仪表', {
      tenantId: SYSTEM_TENANT,
      deprecated: true,
      widgetType: 'timeseries',
      bundles: [],
    }),
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
          <WidgetTypesListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('widget types list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/resources/widget-types');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getWidgetTypes.mockResolvedValue(PAGE);
    servicesMock.deleteWidgetType.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/resources/widget-types');
  });

  it('renders the rows with the ui-ngx default sort (name ASC) and the deprecated filter', async () => {
    renderPage();

    expect(await screen.findByText('我的卡片')).toBeInTheDocument();
    expect(screen.getByText('系统仪表')).toBeInTheDocument();
    expect(servicesMock.getWidgetTypes).toHaveBeenCalledWith(
      {
        pageSize: 10,
        page: 0,
        textSearch: undefined,
        sortOrder: { property: 'name', direction: 'ASC' },
      },
      { deprecatedFilter: 'ALL' },
    );
    // bundles chips render
    expect(screen.getByText('卡片包')).toBeInTheDocument();
  });

  it('carries the deprecated filter in the URL and the server query', async () => {
    renderPage();
    await screen.findByText('我的卡片');

    fireEvent.click(
      screen.getByText('已弃用', { selector: '.ant-segmented-item-label' }),
    );

    await waitFor(() => {
      expect(servicesMock.getWidgetTypes).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 0 }),
        { deprecatedFilter: 'DEPRECATED' },
      );
    });
    expect(window.location.search).toContain('deprecatedFilter=DEPRECATED');
  });

  it('hides the system column for a tenant page without system rows', async () => {
    servicesMock.getWidgetTypes.mockResolvedValue({
      ...PAGE,
      data: [row('wt-1', '我的卡片', { tenantId: OWN_TENANT })],
    });
    renderPage();
    await screen.findByText('我的卡片');
    expect(screen.queryByText('系统')).not.toBeInTheDocument();
  });

  it('shows the system column when the page contains system rows and gates tenant actions', async () => {
    renderPage();
    await screen.findByText('系统仪表');

    expect(screen.getAllByText('系统').length).toBeGreaterThan(0);
    // the system row exposes no edit/delete affordances for a tenant
    const systemRow = screen.getByText('系统仪表').closest('tr');
    expect(systemRow?.querySelector('.anticon-edit')).toBeNull();
    // the tenant-owned row does
    const ownRow = screen.getByText('我的卡片').closest('tr');
    expect(ownRow?.querySelector('.anticon-edit')).not.toBeNull();
  });

  it('opens the template dialog and jumps to the editor with the picked kind', async () => {
    renderPage();
    await screen.findByText('我的卡片');

    fireEvent.click(screen.getByTestId('widget-types-create'));
    const dialog = await screen.findByTestId('widget-template-dialog');
    expect(dialog).toBeTruthy();

    fireEvent.click(screen.getByTestId('widget-template-timeseries'));
    fireEvent.click(
      (dialog as HTMLElement).querySelector('.ant-btn-primary') as HTMLElement,
    );

    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith(
        '/widgets/editor?template=timeseries',
      );
    });
  });

  it('closes the template dialog on cancel without navigating', async () => {
    renderPage();
    await screen.findByText('我的卡片');

    fireEvent.click(screen.getByTestId('widget-types-create'));
    const dialog = (await screen.findByTestId(
      'widget-template-dialog',
    )) as HTMLElement;
    fireEvent.click(
      dialog.querySelector('.ant-btn:not(.ant-btn-primary)') as HTMLElement,
    );
    expect(historyMock.push).not.toHaveBeenCalled();
  });

  it('confirms before deleting a tenant-owned row', async () => {
    renderPage();
    await screen.findByText('我的卡片');

    const ownRow = screen.getByText('我的卡片').closest('tr');
    fireEvent.click(
      ownRow
        ?.querySelector('.anticon-delete')
        ?.closest('button') as HTMLElement,
    );

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(confirm.querySelector('.ant-btn-dangerous') as HTMLElement);
    await waitFor(() => {
      expect(servicesMock.deleteWidgetType).toHaveBeenCalledWith('wt-1');
    });
  });
});
