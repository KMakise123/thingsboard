/**
 * Templates page tests: default server query (createdTime DESC, 0-based
 * page), notification-type column translation, the create flow through the
 * wizard (Setup seed: GENERAL + WEB on), row-click edit (type locked),
 * inline copy (name + " (copy)"), single + batch delete, and the toolbar
 * send-notification button. Services are mocked at the module boundary;
 * pro-components is replaced by antd Table (same workaround as the
 * js-library tests).
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
import zhTemplates from '@/locales/zh-CN/notifications/templates';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhTemplates } });

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import TemplatesPage from './index';

const servicesMock = vi.hoisted(() => ({
  getNotificationTemplates: vi.fn(),
  deleteNotificationTemplate: vi.fn(),
  saveNotificationTemplate: vi.fn(),
  getAvailableDeliveryMethods: vi.fn(),
  getNotificationRequestPreview: vi.fn(),
  sendNotificationRequest: vi.fn(),
  getNotificationTargets: vi.fn(),
  getNotificationTargetById: vi.fn(),
  getNotificationTemplatesById: vi.fn(),
}));
const dashboardsMock = vi.hoisted(() => ({
  getTenantDashboards: vi.fn(),
  getDashboardInfo: vi.fn(),
}));
const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/notification', () => servicesMock);
vi.mock('@/services/tb/dashboard', () => dashboardsMock);
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
  NotificationDeliveryMethod,
  NotificationType,
} from '@/types/tb/notification';

function templateRow(
  id: string,
  name: string,
  notificationType: NotificationType,
): NotificationTemplateShape {
  return {
    id: { entityType: EntityType.NOTIFICATION_TEMPLATE, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    name,
    notificationType,
    configuration: {
      deliveryMethodsTemplates: {
        [NotificationDeliveryMethod.WEB]: {
          method: NotificationDeliveryMethod.WEB,
          enabled: true,
          subject: 'Hello',
          body: 'World',
        },
      },
    },
  };
}

type NotificationTemplateShape = {
  id: { entityType: EntityType; id: string };
  createdTime: number;
  tenantId: { entityType: EntityType; id: string };
  name: string;
  notificationType: NotificationType;
  configuration: {
    deliveryMethodsTemplates: Record<string, unknown>;
  };
};

const PAGE = {
  data: [
    templateRow('tpl-1', 'device-alerts', NotificationType.ALARM),
    templateRow('tpl-2', 'general-news', NotificationType.GENERAL),
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
          <TemplatesPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('Templates page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/notifications/templates');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getNotificationTemplates.mockResolvedValue(PAGE);
    servicesMock.deleteNotificationTemplate.mockResolvedValue(undefined);
    servicesMock.saveNotificationTemplate.mockResolvedValue({});
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/notifications/templates');
  });

  it('queries templates with the default sort and renders translated rows', async () => {
    renderPage();

    expect(await screen.findByText('device-alerts')).toBeInTheDocument();
    expect(screen.getByText('general-news')).toBeInTheDocument();
    expect(screen.getByText('告警')).toBeInTheDocument();
    expect(screen.getByText('通用')).toBeInTheDocument();
    expect(servicesMock.getNotificationTemplates).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('carries the reusable send-notification button in the toolbar', async () => {
    renderPage();
    await screen.findByText('device-alerts');

    expect(screen.getByTestId('send-notification-button')).toBeInTheDocument();
  });

  it('opens the wizard prefilled for create (GENERAL + WEB on)', async () => {
    renderPage();
    await screen.findByText('device-alerts');

    fireEvent.click(screen.getByRole('button', { name: /新\s*建\s*模\s*板/ }));
    const modal = document.querySelector('.ant-modal') as HTMLElement;
    expect(
      within(modal).getByText('新建通知模板', {
        selector: '.ant-modal-title',
      }),
    ).toBeInTheDocument();
    // New seed: no name yet, WEB toggle already on (ngx constructor default).
    expect(
      (within(modal).getByLabelText('名称') as HTMLInputElement).value,
    ).toBe('');
    expect(
      within(modal)
        .getByTestId('template-method-toggle-WEB')
        .querySelector('.ant-switch-checked'),
    ).not.toBeNull();
  });

  it('opens the edit wizard from a row click with the type locked', async () => {
    renderPage();
    await screen.findByText('device-alerts');

    fireEvent.click(screen.getByText('device-alerts'));
    const modal = document.querySelector('.ant-modal') as HTMLElement;
    expect(
      await within(modal).findByText('编辑通知模板', {
        selector: '.ant-modal-title',
      }),
    ).toBeInTheDocument();
    expect(
      (within(modal).getByLabelText('名称') as HTMLInputElement).value,
    ).toBe('device-alerts');
    // Edit locks the notification type (ngx notificationType.disable).
    expect(
      (within(modal).getByTestId('template-wizard-type') as HTMLInputElement)
        .className,
    ).toContain('ant-select-disabled');
  });

  it('opens the copy wizard from the inline action with the suffixed name', async () => {
    renderPage();
    await screen.findByText('device-alerts');

    const row = screen.getByText('device-alerts').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByTitle('复制模板'));
    const modal = document.querySelector('.ant-modal') as HTMLElement;
    expect(
      await within(modal).findByText('新建通知模板', {
        selector: '.ant-modal-title',
      }),
    ).toBeInTheDocument();
    expect(
      (within(modal).getByLabelText('名称') as HTMLInputElement).value,
    ).toBe('device-alerts (copy)');
    // Copy does not lock the type — only edit does.
    expect(
      (within(modal).getByTestId('template-wizard-type') as HTMLInputElement)
        .className,
    ).not.toContain('ant-select-disabled');
  });

  it('deletes a single template after confirmation', async () => {
    renderPage();
    await screen.findByText('device-alerts');

    const row = screen.getByText('device-alerts').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByTitle('删除'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteNotificationTemplate).toHaveBeenCalledWith(
        'tpl-1',
      );
    });
    await waitFor(() => {
      expect(servicesMock.getNotificationTemplates).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('模板已删除。')).toBeInTheDocument();
  });

  it('batch-deletes the selected rows through the progress modal', async () => {
    renderPage();
    await screen.findByText('device-alerts');

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
      expect(servicesMock.deleteNotificationTemplate).toHaveBeenCalledWith(
        'tpl-1',
      );
      expect(servicesMock.deleteNotificationTemplate).toHaveBeenCalledWith(
        'tpl-2',
      );
    });
    // BatchProgressModal falls back to its defaultMessage for the summary.
    expect(
      await screen.findByText(/2 succeeded, 0 failed/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(servicesMock.getNotificationTemplates).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByText('删除所选')).toBeNull();
  });

  it('shows the load error through the shared server-error exit', async () => {
    servicesMock.getNotificationTemplates.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('模板加载失败')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });
});
