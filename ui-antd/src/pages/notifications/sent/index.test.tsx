/**
 * Sent-list page tests: default server query (createdTime DESC, 0-based
 * page), status/method/template translation, the failure badge → errors
 * dialog, row "notify again" (disabled while SCHEDULED, opens the wizard
 * otherwise), single + batch delete, and the load-error exit. Services are
 * mocked at the module boundary; pro-components is replaced by antd Table
 * (same workaround as the js-library/recipients tests).
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

import zhSent from '@/locales/zh-CN/notifications/sent';
import { EntityType } from '@/types/tb/entity';
import {
  NotificationDeliveryMethod,
  type NotificationRequestInfo,
  NotificationRequestStatus,
} from '@/types/tb/notification';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhSent } });

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getNotificationRequests: vi.fn(),
  deleteNotificationRequest: vi.fn(),
  getNotificationRequestById: vi.fn(),
  getAvailableDeliveryMethods: vi.fn(),
  getNotificationRequestPreview: vi.fn(),
  getNotificationTargetById: vi.fn(),
  getNotificationTargetsByNotificationType: vi.fn(),
  getNotificationTemplates: vi.fn(),
  sendNotificationRequest: vi.fn(),
  getSlackConversations: vi.fn(),
  saveNotificationTarget: vi.fn(),
}));
vi.mock('@/services/tb/notification', () => servicesMock);

// vite-node cannot resolve antd's extensionless internal locale imports
// through pro-components' bundle — render through antd's Table (same
// workaround as the js-library/recipients page tests).
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

import SentPage from './index';

function requestRow(
  id: string,
  overrides: Partial<NotificationRequestInfo> = {},
): NotificationRequestInfo {
  return {
    id: { entityType: EntityType.NOTIFICATION_REQUEST, id },
    createdTime: 1_700_000_000_000,
    targets: ['t-1'],
    status: NotificationRequestStatus.SENT,
    templateName: 'ops-template',
    deliveryMethods: ['WEB'],
    ...overrides,
  } as NotificationRequestInfo;
}

const ROWS: Array<NotificationRequestInfo> = [
  requestRow('req-1', {
    status: NotificationRequestStatus.SENT,
    stats: {
      sent: { [NotificationDeliveryMethod.WEB]: 3 },
      errors: {
        [NotificationDeliveryMethod.WEB]: { 'Alice Wang': 'user is deleted' },
        [NotificationDeliveryMethod.EMAIL]: {
          'bob@x.io': 'SMTP unavailable',
        },
      },
      totalErrors: 2,
    },
  }),
  requestRow('req-2', {
    status: NotificationRequestStatus.PROCESSING,
    deliveryMethods: [
      NotificationDeliveryMethod.WEB,
      NotificationDeliveryMethod.EMAIL,
    ],
    templateName: undefined,
  }),
  requestRow('req-3', {
    status: NotificationRequestStatus.SCHEDULED,
    deliveryMethods: [NotificationDeliveryMethod.WEB],
  }),
];

const PAGE = {
  data: ROWS,
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
          <SentPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/notifications/sent');
  servicesMock.getNotificationRequests.mockResolvedValue(PAGE);
  servicesMock.deleteNotificationRequest.mockResolvedValue(undefined);
  servicesMock.getAvailableDeliveryMethods.mockResolvedValue(['WEB']);
});

afterEach(() => {
  window.history.replaceState({}, '', '/notifications/sent');
});

describe('Sent page', () => {
  it('queries requests with the default sort and renders translated rows', async () => {
    renderPage();

    expect((await screen.findAllByText('ops-template')).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText('已发送')).toBeInTheDocument();
    expect(screen.getByText('处理中')).toBeInTheDocument();
    expect(screen.getByText('已计划')).toBeInTheDocument();
    expect(screen.getAllByText('Web').length).toBeGreaterThan(0);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // no templateName
    expect(servicesMock.getNotificationRequests).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('opens the delivery-failures dialog from the red badge', async () => {
    renderPage();
    await screen.findAllByText('ops-template');
    fireEvent.click(screen.getByTestId('sent-errors-req-1'));
    await screen.findByTestId('sent-error-dialog');
    expect(document.querySelector('.ant-modal-title')?.textContent).toBe(
      '发送失败明细',
    );
    expect(screen.getByText('Alice Wang')).toBeInTheDocument();
    expect(screen.getByText('user is deleted')).toBeInTheDocument();
    expect(screen.getByText('bob@x.io')).toBeInTheDocument();
    // Row payload carries stats: no refetch needed.
    expect(servicesMock.getNotificationRequestById).not.toHaveBeenCalled();
  });

  it('disables notify-again on SCHEDULED rows and opens the wizard otherwise', async () => {
    renderPage();
    await screen.findAllByText('ops-template');

    const scheduledResend = screen.getByTestId('sent-resend-req-3');
    expect(scheduledResend).toBeDisabled();

    fireEvent.click(screen.getByTestId('sent-resend-req-1'));
    expect(
      await screen.findByText('再次通知', { selector: '.ant-modal-title' }),
    ).toBeInTheDocument();
    // Prefilled with the row's targets.
    await waitFor(() => {
      expect(
        document.querySelectorAll('.ant-select-selection-item'),
      ).not.toHaveLength(0);
    });
  });

  it('deletes a single request after confirmation', async () => {
    renderPage();
    await screen.findAllByText('ops-template');

    const row = screen
      .getAllByText('ops-template')[0]
      .closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByTitle('删除'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteNotificationRequest).toHaveBeenCalledWith(
        'req-1',
      );
    });
    await waitFor(() => {
      expect(servicesMock.getNotificationRequests).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('通知请求已删除。')).toBeInTheDocument();
  });

  it('batch-deletes the selected rows through the progress modal', async () => {
    renderPage();
    await screen.findAllByText('ops-template');

    const checkboxes = document.querySelectorAll<HTMLElement>(
      '.ant-table-tbody .ant-checkbox-input',
    );
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
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
      expect(servicesMock.deleteNotificationRequest).toHaveBeenCalledWith(
        'req-1',
      );
      expect(servicesMock.deleteNotificationRequest).toHaveBeenCalledWith(
        'req-2',
      );
    });
    expect(
      await screen.findByText(/2 succeeded, 0 failed/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(servicesMock.getNotificationRequests).toHaveBeenCalledTimes(2);
    });
  });

  it('shows the load error through the shared server-error exit', async () => {
    servicesMock.getNotificationRequests.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('已发通知加载失败')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });
});
