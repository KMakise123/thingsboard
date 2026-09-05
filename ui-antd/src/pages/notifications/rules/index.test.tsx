/**
 * Rules page tests: default server query (createdTime DESC, 0-based page),
 * trigger-type translation, the inline enable toggle (saves the rule),
 * copy-into-wizard, single + batch delete, and row-click edit. Services are
 * mocked at the module boundary; pro-components is replaced by antd Table and
 * the wizard by a prop-exposing stub (same workarounds as the recipients
 * page tests).
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
import zhRules from '@/locales/zh-CN/notifications/rules';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhRules } });

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const wizardMock = vi.hoisted(() => ({ props: vi.fn() }));
vi.mock('./rule-wizard', () => ({
  default: (props: {
    open: boolean;
    copy?: boolean;
    source?: { name: string } | null;
  }) => {
    wizardMock.props(props);
    return props.open ? (
      <div data-testid="wizard-stub" data-copy={String(!!props.copy)}>
        {props.source?.name ?? 'new'}
      </div>
    ) : null;
  },
}));

import RulesPage from './index';

const servicesMock = vi.hoisted(() => ({
  getNotificationRules: vi.fn(),
  deleteNotificationRule: vi.fn(),
  saveNotificationRule: vi.fn(),
  getNotificationTemplates: vi.fn(),
  getNotificationTemplateById: vi.fn(),
  getNotificationTargets: vi.fn(),
  getNotificationTargetsByNotificationType: vi.fn(),
  getNotificationTargetById: vi.fn(),
}));
const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/notification', () => servicesMock);
vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));

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

import { EntityType } from '@/types/tb';
import { NotificationRuleTriggerType } from '@/types/tb/notification';

function ruleRow(
  id: string,
  name: string,
  triggerType: NotificationRuleTriggerType,
  enabled = true,
): import('@/types/tb/notification').NotificationRuleInfo {
  return {
    id: { entityType: EntityType.NOTIFICATION_RULE, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    name,
    enabled,
    templateId: {
      entityType: EntityType.NOTIFICATION_TEMPLATE,
      id: `tpl-${id}`,
    },
    triggerType,
    triggerConfig: { triggerType },
    recipientsConfig: { triggerType, targets: ['target-1'] },
    additionalConfig: { description: `desc of ${name}` },
    templateName: `template ${id}`,
  };
}

const PAGE = {
  data: [
    ruleRow('rule-1', 'alarm rule', NotificationRuleTriggerType.ALARM, true),
    ruleRow(
      'rule-2',
      'limit rule',
      NotificationRuleTriggerType.ENTITIES_LIMIT,
      false,
    ),
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
          <RulesPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('Rules page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/notifications/rules');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getNotificationRules.mockResolvedValue(PAGE);
    servicesMock.deleteNotificationRule.mockResolvedValue(undefined);
    servicesMock.saveNotificationRule.mockImplementation(async (rule) => rule);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/notifications/rules');
  });

  it('queries rules with the default sort and renders translated rows', async () => {
    renderPage();

    expect(await screen.findByText('alarm rule')).toBeInTheDocument();
    expect(screen.getByText('告警')).toBeInTheDocument();
    expect(screen.getByText('实体数量上限')).toBeInTheDocument();
    expect(screen.getByText('template rule-1')).toBeInTheDocument();
    expect(screen.getByText('desc of alarm rule')).toBeInTheDocument();
    expect(servicesMock.getNotificationRules).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('toggles a rule inline by saving it with the flipped flag', async () => {
    renderPage();
    await screen.findByText('alarm rule');

    const row = screen.getByText('alarm rule').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('switch'));

    await waitFor(() => {
      expect(servicesMock.saveNotificationRule).toHaveBeenCalledTimes(1);
    });
    const saved = servicesMock.saveNotificationRule.mock.calls[0][0];
    expect(saved.id.id).toBe('rule-1');
    expect(saved.enabled).toBe(false);
    // onSettled invalidates: the list is refreshed through the same endpoint.
    await waitFor(() => {
      expect(servicesMock.getNotificationRules).toHaveBeenCalledTimes(2);
    });
  });

  it('rolls the switch back when the save fails', async () => {
    servicesMock.saveNotificationRule.mockRejectedValue(
      new Error('save failed'),
    );
    renderPage();
    await screen.findByText('alarm rule');

    const row = screen.getByText('alarm rule').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('switch'));

    expect(await screen.findByText('save failed')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(row).getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });
  });

  it('opens the wizard prefilled as a copy with "(copy)" source name', async () => {
    renderPage();
    await screen.findByText('alarm rule');

    const row = screen.getByText('alarm rule').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByTitle('复制规则'));

    await waitFor(() => {
      expect(wizardMock.props).toHaveBeenCalledWith(
        expect.objectContaining({ open: true, copy: true }),
      );
    });
    expect(screen.getByTestId('wizard-stub')).toHaveTextContent('alarm rule');
  });

  it('opens the edit wizard on row click', async () => {
    renderPage();
    await screen.findByText('alarm rule');

    fireEvent.click(screen.getByText('limit rule'));

    await waitFor(() => {
      expect(wizardMock.props).toHaveBeenCalledWith(
        expect.objectContaining({ open: true, copy: false }),
      );
    });
    expect(screen.getByTestId('wizard-stub')).toHaveTextContent('limit rule');
  });

  it('deletes a single rule after confirmation', async () => {
    renderPage();
    await screen.findByText('alarm rule');

    const row = screen.getByText('alarm rule').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByTitle('删除'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(servicesMock.deleteNotificationRule).toHaveBeenCalledWith(
        'rule-1',
      );
    });
    expect(await screen.findByText('通知规则已删除。')).toBeInTheDocument();
  });

  it('batch-deletes the selected rules through the progress modal', async () => {
    renderPage();
    await screen.findByText('alarm rule');

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
      expect(servicesMock.deleteNotificationRule).toHaveBeenCalledWith(
        'rule-1',
      );
      expect(servicesMock.deleteNotificationRule).toHaveBeenCalledWith(
        'rule-2',
      );
    });
    expect(
      await screen.findByText(/2 succeeded, 0 failed/),
    ).toBeInTheDocument();
  });
});
