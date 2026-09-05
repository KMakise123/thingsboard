/**
 * Recipients page tests: default server query (createdTime DESC, 0-based
 * page), type-column translation, the create flow through the real shared
 * dialog, single + batch delete, and row-click edit. Services are mocked at
 * the module boundary; pro-components is replaced by antd Table (same
 * workaround as the js-library tests).
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
import zhRecipients from '@/locales/zh-CN/notifications/recipients';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhRecipients } });

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import RecipientsPage from './index';

const servicesMock = vi.hoisted(() => ({
  getNotificationTargets: vi.fn(),
  deleteNotificationTarget: vi.fn(),
  saveNotificationTarget: vi.fn(),
  getSlackConversations: vi.fn(),
}));
const usersMock = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getUserById: vi.fn(),
}));
const tenantsMock = vi.hoisted(() => ({
  getTenantInfos: vi.fn(),
  getTenantInfo: vi.fn(),
}));
const profilesMock = vi.hoisted(() => ({
  getTenantProfileInfos: vi.fn(),
  getTenantProfileInfoById: vi.fn(),
}));
const customersMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
}));
const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/notification', () => servicesMock);
vi.mock('@/services/tb/user', () => usersMock);
vi.mock('@/services/tb/tenant', () => tenantsMock);
vi.mock('@/services/tb/tenant-profile', () => profilesMock);
vi.mock('@/services/tb/customer', () => customersMock);
vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));

// vite-node cannot resolve antd's extensionless internal locale imports
// through pro-components' bundle — render through antd's Table (same
// workaround as the js-library page tests).
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

import { EntityType } from '@/types/tb';
import {
  type NotificationTarget,
  NotificationTargetType,
  SlackConversationType,
  UsersFilterType,
} from '@/types/tb/notification';

function targetRow(
  id: string,
  name: string,
  configuration: NotificationTarget['configuration'],
): NotificationTarget {
  return {
    id: { entityType: EntityType.NOTIFICATION_TARGET, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    name,
    configuration,
  };
}

const PAGE = {
  data: [
    targetRow('target-1', 'ops-group', {
      type: NotificationTargetType.PLATFORM_USERS,
      usersFilter: { type: UsersFilterType.ALL_USERS },
      description: 'everyone on the platform',
    }),
    targetRow('target-2', 'slack-group', {
      type: NotificationTargetType.SLACK,
      conversationType: SlackConversationType.PUBLIC_CHANNEL,
      conversation: {
        type: SlackConversationType.PUBLIC_CHANNEL,
        id: 'conv-1',
        name: 'alerts',
      },
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
          <RecipientsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('Recipients page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/notifications/recipients');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getNotificationTargets.mockResolvedValue(PAGE);
    servicesMock.deleteNotificationTarget.mockResolvedValue(undefined);
    servicesMock.saveNotificationTarget.mockResolvedValue({});
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/notifications/recipients');
  });

  it('queries targets with the default sort and renders translated rows', async () => {
    renderPage();

    expect(await screen.findByText('ops-group')).toBeInTheDocument();
    expect(screen.getByText('slack-group')).toBeInTheDocument();
    expect(screen.getByText('平台用户')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('everyone on the platform')).toBeInTheDocument();
    expect(servicesMock.getNotificationTargets).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('creates a recipient group through the shared dialog and refetches', async () => {
    renderPage();
    await screen.findByText('ops-group');

    fireEvent.click(screen.getByRole('button', { name: /新建接收人/ }));
    const modal = document.querySelector('.ant-modal') as HTMLElement;
    expect(
      within(modal).getByText('新建接收人', { selector: '.ant-modal-title' }),
    ).toBeInTheDocument();

    fireEvent.change(within(modal).getByLabelText('名称') as HTMLInputElement, {
      target: { value: 'fresh-group' },
    });
    fireEvent.click(
      within(modal).getByRole('button', { name: /新\s*建\s*接\s*收\s*人/ }),
    );

    await waitFor(() => {
      expect(servicesMock.saveNotificationTarget).toHaveBeenCalledWith({
        name: 'fresh-group',
        configuration: {
          type: NotificationTargetType.PLATFORM_USERS,
          usersFilter: { type: UsersFilterType.ALL_USERS },
          description: undefined,
        },
      });
    });
    await waitFor(() => {
      expect(servicesMock.getNotificationTargets).toHaveBeenCalledTimes(2);
    });
  });

  it('opens the edit dialog prefilled from a row click', async () => {
    renderPage();
    await screen.findByText('ops-group');

    fireEvent.click(screen.getByText('ops-group'));
    const modal = document.querySelector('.ant-modal') as HTMLElement;
    expect(
      await within(modal).findByText('编辑接收人', {
        selector: '.ant-modal-title',
      }),
    ).toBeInTheDocument();
    expect(
      (within(modal).getByLabelText('名称') as HTMLInputElement).value,
    ).toBe('ops-group');
  });

  it('deletes a single recipient after confirmation', async () => {
    renderPage();
    await screen.findByText('ops-group');

    const row = screen.getByText('ops-group').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByTitle('删除'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteNotificationTarget).toHaveBeenCalledWith(
        'target-1',
      );
    });
    await waitFor(() => {
      expect(servicesMock.getNotificationTargets).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('接收人已删除。')).toBeInTheDocument();
  });

  it('batch-deletes the selected rows through the progress modal', async () => {
    renderPage();
    await screen.findByText('ops-group');

    const checkboxes = document.querySelectorAll<HTMLElement>(
      '.ant-table-tbody .ant-checkbox-input',
    );
    expect(checkboxes).toHaveLength(2);
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    fireEvent.click(screen.getByText('删除所选'));
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteNotificationTarget).toHaveBeenCalledWith(
        'target-1',
      );
      expect(servicesMock.deleteNotificationTarget).toHaveBeenCalledWith(
        'target-2',
      );
    });
    // BatchProgressModal falls back to its defaultMessage for the summary.
    expect(
      await screen.findByText(/2 succeeded, 0 failed/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(servicesMock.getNotificationTargets).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByText('删除所选')).toBeNull();
  });

  it('shows the load error through the shared server-error exit', async () => {
    servicesMock.getNotificationTargets.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('接收人加载失败')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });
});
