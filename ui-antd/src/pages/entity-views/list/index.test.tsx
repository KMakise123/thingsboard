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

  it('fans batch assign out per entity view through the customer modal', async () => {
    customerServiceMock.getCustomers.mockResolvedValue({
      data: [
        {
          id: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
          createdTime: 1,
          title: 'Acme',
          additionalInfo: {},
        },
      ],
      totalElements: 1,
    });
    renderPage();
    await screen.findByText('free-view');

    const checkboxes = document.querySelectorAll(
      '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
    );
    expect(checkboxes.length).toBeGreaterThan(2);
    fireEvent.click(checkboxes[0] as HTMLElement);
    // Let the first selection land before the next (both compute from state).
    await waitFor(() => {
      expect(screen.getByText('已选 1 项')).toBeTruthy();
    });
    fireEvent.click(checkboxes[1] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('已选 2 项')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: '分配客户' }));

    await waitFor(() =>
      expect(customerServiceMock.getCustomers).toHaveBeenCalled(),
    );
    await screen.findByText('指派给客户');
    const selector = document.querySelector('.ant-modal .ant-select');
    fireEvent.mouseDown(selector as HTMLElement);
    fireEvent.click(
      await screen.findByText('Acme', {
        selector: '.ant-select-item-option-content',
      }),
    );
    const dialog = document.querySelector('.ant-modal') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: '分 配' }));

    await waitFor(() => {
      expect(servicesMock.assignEntityViewToCustomer).toHaveBeenCalledTimes(2);
    });
    expect(servicesMock.assignEntityViewToCustomer).toHaveBeenCalledWith(
      'cust-1',
      'ev-1',
    );
    expect(servicesMock.assignEntityViewToCustomer).toHaveBeenCalledWith(
      'cust-1',
      'ev-2',
    );
  });

  it('confirms and fans batch unassign out over the assigned selection', async () => {
    renderPage();
    await screen.findByText('free-view');

    const checkboxes = document.querySelectorAll(
      '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
    );
    // Rows ev-2 and ev-3 are customer-assigned.
    fireEvent.click(checkboxes[1] as HTMLElement);
    fireEvent.click(checkboxes[2] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('已选 2 项')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: '取消分配客户' }));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    expect(
      within(confirm).getAllByText(/确定要取消分配 2 个实体视图吗？/),
    ).not.toHaveLength(0);
    fireEvent.click(
      within(confirm).getByRole('button', { name: '取消分配客户' }),
    );

    await waitFor(() => {
      expect(servicesMock.unassignEntityViewFromCustomer).toHaveBeenCalledTimes(
        2,
      );
    });
    expect(servicesMock.unassignEntityViewFromCustomer).toHaveBeenCalledWith(
      'ev-2',
    );
    expect(servicesMock.unassignEntityViewFromCustomer).toHaveBeenCalledWith(
      'ev-3',
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
    // The customer/public columns collapse for CU and there is no
    // selection column (no batch surface at all).
    expect(screen.queryByText('客户')).toBeNull();
    expect(
      document.querySelectorAll('.ant-table-selection-column'),
    ).toHaveLength(0);
  });
});
