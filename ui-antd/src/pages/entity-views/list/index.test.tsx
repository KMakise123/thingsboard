/**
 * Entity-view list page tests: server-parameter plumbing (pageLink shape
 * from the URL state), the ui-ngx row-action set (make public / assign /
 * unassign+make private / delete confirmations), and the read-only surface
 * for a hand-typed URL as CU. Services are mocked at the module boundary.
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
import zhEntityViews from '@/locales/zh-CN/entityViews';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEntityViews },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { EntityType } from '@/types/tb';

import EntityViewsListPage from './index';

const servicesMock = vi.hoisted(() => ({
  getTenantEntityViews: vi.fn(),
  getEntityViewTypes: vi.fn(),
  deleteEntityView: vi.fn(),
  assignEntityViewToCustomer: vi.fn(),
  unassignEntityViewFromCustomer: vi.fn(),
  makeEntityViewPublic: vi.fn(),
  saveEntityView: vi.fn(),
}));

const customerServiceMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/entity-view', () => servicesMock);
vi.mock('@/services/tb/customer', () => customerServiceMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));
// vite-node cannot resolve antd's extensionless internal locale imports when
// they are pulled through @ant-design/pro-components' bundle (works from
// src-side imports), so tests render the list through antd's Table (same
// workaround as the device list test).
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = ({
    rowKey,
    ...rest
  }: React.ComponentProps<typeof Table>) => <Table rowKey={rowKey} {...rest} />;
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

const NULL_CUSTOMER = {
  entityType: EntityType.CUSTOMER,
  id: '13814000-1dd2-11b2-8080-808080808080',
};

function entityView(
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: { entityType: EntityType.ENTITY_VIEW, id },
    createdTime: 1_700_000_000_000,
    name,
    type: 'Thermometer',
    entityId: { entityType: EntityType.DEVICE, id: `dev-${id}` },
    keys: {},
    customerTitle: '',
    customerIsPublic: false,
    customerId: NULL_CUSTOMER,
    ...extra,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <EntityViewsListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('entity-view list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/entityViews');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getTenantEntityViews.mockResolvedValue({
      data: [
        entityView('ev-1', 'free-view'),
        entityView('ev-2', 'assigned-view', {
          customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
          customerTitle: 'Acme',
          customerIsPublic: false,
        }),
        entityView('ev-3', 'public-view', {
          customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
          customerTitle: 'Acme',
          customerIsPublic: true,
        }),
      ],
      totalElements: 3,
    });
    servicesMock.getEntityViewTypes.mockResolvedValue([
      { type: 'Thermometer' },
    ]);
    servicesMock.deleteEntityView.mockResolvedValue(undefined);
    servicesMock.unassignEntityViewFromCustomer.mockResolvedValue(undefined);
    servicesMock.makeEntityViewPublic.mockResolvedValue({});
    customerServiceMock.getCustomers.mockResolvedValue({
      data: [],
      totalElements: 0,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/entityViews');
  });

  it('renders rows and the server pageLink honors the URL state', async () => {
    window.history.replaceState(
      {},
      '',
      '/entityViews?page=2&pageSize=20&textSearch=room&type=Thermometer',
    );
    renderPage();
    expect(await screen.findByText('free-view')).toBeTruthy();
    await waitFor(() =>
      expect(servicesMock.getTenantEntityViews).toHaveBeenCalled(),
    );
    const [pageLink, filter] = servicesMock.getTenantEntityViews.mock
      .calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(pageLink.page).toBe(1); // 0-based server page from UI page 2
    expect(pageLink.pageSize).toBe(20);
    expect(pageLink.textSearch).toBe('room');
    expect(pageLink.sortOrder).toEqual({
      property: 'createdTime',
      direction: 'DESC',
    });
    expect(filter).toEqual({ type: 'Thermometer' });
  });

  it('offers make-public and assign for an unassigned row', async () => {
    renderPage();
    await screen.findByText('free-view');
    const row = screen.getByText('free-view').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button'));
    fireEvent.click(await screen.findByText('将实体视图设为公开'));
    fireEvent.click(
      await screen.findByRole('button', { name: '将实体视图设为公开' }),
    );
    await waitFor(() =>
      expect(servicesMock.makeEntityViewPublic).toHaveBeenCalledWith('ev-1'),
    );
  });

  it('offers make-private for an assigned public row', async () => {
    renderPage();
    await screen.findByText('public-view');
    fireEvent.click(
      within(
        screen.getByText('public-view').closest('tr') as HTMLElement,
      ).getByRole('button'),
    );
    fireEvent.click(await screen.findByText('将实体视图设为私有'));
    fireEvent.click(
      await screen.findByRole('button', { name: '将实体视图设为私有' }),
    );
    await waitFor(() =>
      expect(servicesMock.unassignEntityViewFromCustomer).toHaveBeenCalledWith(
        'ev-3',
      ),
    );
  });

  it('confirms before deleting', async () => {
    renderPage();
    await screen.findByText('free-view');
    fireEvent.click(
      within(
        screen.getByText('free-view').closest('tr') as HTMLElement,
      ).getByRole('button'),
    );
    fireEvent.click(await screen.findByText('删除'));
    fireEvent.click(await screen.findByRole('button', { name: '删 除' }));
    await waitFor(() =>
      expect(servicesMock.deleteEntityView).toHaveBeenCalledWith('ev-1'),
    );
  });

  it('navigates to the detail page on row click', async () => {
    renderPage();
    await screen.findByText('free-view');
    // Click the row element itself (the navigation lives in onRow).
    fireEvent.click(screen.getByText('free-view').closest('tr') as HTMLElement);
    await waitFor(() =>
      expect(historyMock.push).toHaveBeenCalledWith('/entityViews/ev-1'),
    );
  });

  it('hides every action entry for a customer user', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
    });
    renderPage();
    await screen.findByText('free-view');
    expect(screen.queryByText('添加实体视图')).toBeNull();
    // No option-column dropdown buttons at all.
    expect(
      screen
        .queryAllByRole('button')
        .filter((button) => button.querySelector('.anticon-more')),
    ).toHaveLength(0);
    // The customer/public columns collapse for CU.
    expect(screen.queryByText('客户')).toBeNull();
  });
});
