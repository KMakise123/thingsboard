/**
 * Inbox page tests: default unread-only query through the URL state, the
 * unread/all toggle (reset + URL write), the row mark-read call, the single
 * delete confirm flow and the detail dialog marking read on close.
 * Services are mocked at the module boundary; ProTable renders through
 * antd's Table (same workaround as the js-library tests).
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
import zhDevicesDetail from '@/locales/zh-CN/devices/detail';
import zhBell from '@/locales/zh-CN/notifications/bell';
import zhInbox from '@/locales/zh-CN/notifications/inbox';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhInbox, ...zhBell, ...zhDevicesDetail },
});

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { EntityType } from '@/types/tb';
import {
  NotificationStatus,
  NotificationType,
  type TbNotification,
} from '@/types/tb/notification';

import InboxPage from './index';

const servicesMock = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

vi.mock('@/services/tb/notification', () => servicesMock);

// vite-node cannot resolve antd's extensionless internal locale imports
// through pro-components' bundle — render through antd's Table.
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

function notification(
  id: string,
  extra: Partial<TbNotification> = {},
): TbNotification {
  return {
    id: { entityType: EntityType.NOTIFICATION, id },
    createdTime: 1_700_000_000_000,
    type: NotificationType.GENERAL,
    status: NotificationStatus.SENT,
    subject: `Subject ${id}`,
    text: `Text ${id}`,
    ...extra,
  };
}

const PAGE = {
  data: [
    notification('n-1'),
    notification('n-2', { status: NotificationStatus.READ }),
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
          <InboxPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('Notification inbox page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/notifications/inbox');
    servicesMock.getNotifications.mockResolvedValue(PAGE);
    servicesMock.markNotificationAsRead.mockResolvedValue(undefined);
    servicesMock.markAllNotificationsAsRead.mockResolvedValue(undefined);
    servicesMock.deleteNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/notifications/inbox');
  });

  it('queries unread notifications by default and renders rows', async () => {
    renderPage();

    expect(await screen.findByText('Subject n-1')).toBeInTheDocument();
    expect(screen.getByText('Subject n-2')).toBeInTheDocument();
    expect(screen.getByText('类型')).toBeInTheDocument();
    expect(servicesMock.getNotifications).toHaveBeenCalledWith(
      {
        pageSize: 10,
        page: 0,
        textSearch: undefined,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
      { unreadOnly: true },
    );
  });

  it('moves the unread/all toggle through the URL into the query', async () => {
    renderPage();
    await screen.findByText('Subject n-1');

    // The 全部 segment of the unread/all toggle (antd Segmented).
    fireEvent.click(screen.getByText('全部', { exact: true }));

    await waitFor(() => {
      expect(servicesMock.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0 }),
        { unreadOnly: false },
      );
    });
    expect(window.location.search).toContain('unreadOnly=false');
  });

  it('marks a row read over REST from the row action', async () => {
    renderPage();
    await screen.findByText('Subject n-1');

    fireEvent.click(screen.getAllByTestId('inbox-mark-read')[0]);
    await waitFor(() => {
      expect(servicesMock.markNotificationAsRead).toHaveBeenCalledWith('n-1');
    });
  });

  it('runs the single delete confirm flow', async () => {
    renderPage();
    await screen.findByText('Subject n-1');

    fireEvent.click(screen.getAllByTestId('inbox-delete')[0]);
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteNotification).toHaveBeenCalledWith('n-1');
    });
  });

  it('marks the row read when the detail dialog closes', async () => {
    renderPage();
    await screen.findByText('Subject n-1');

    fireEvent.click(screen.getByText('Subject n-1'));
    expect(await screen.findByTestId('notification-item')).not.toBeNull();

    fireEvent.click(document.querySelector('.ant-modal-close') as HTMLElement);
    await waitFor(() => {
      expect(servicesMock.markNotificationAsRead).toHaveBeenCalledWith('n-1');
    });
  });
});
