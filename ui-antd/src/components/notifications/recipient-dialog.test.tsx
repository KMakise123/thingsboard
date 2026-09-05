/**
 * Recipient dialog tests: type radio switching, role-narrowed usersFilter
 * options, per-variant validation and the exact saveNotificationTarget
 * payloads (form values -> wire shape). Services are mocked at the module
 * boundary; the authority comes from the token-store mock.
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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import zhRecipients from '@/locales/zh-CN/notifications/recipients';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhRecipients } });

import RecipientDialog, { type RecipientDialogProps } from './recipient-dialog';

const servicesMock = vi.hoisted(() => ({
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

import { EntityType } from '@/types/tb';
import {
  type NotificationTarget,
  NotificationTargetType,
  SlackConversationType,
  UsersFilterType,
} from '@/types/tb/notification';

function user(id: string, email: string) {
  return { id: { entityType: EntityType.USER, id }, createdTime: 1, email };
}

const USERS_PAGE = {
  data: [user('user-1', 'one@tb.io'), user('user-2', 'two@tb.io')],
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

function target(
  configuration: NotificationTarget['configuration'],
  name = 'ops',
): NotificationTarget {
  return {
    id: { entityType: EntityType.NOTIFICATION_TARGET, id: 'target-1' },
    createdTime: 1_700_000_000_000,
    name,
    configuration,
  };
}

function renderDialog(props: Partial<RecipientDialogProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <RecipientDialog
            open
            {...props}
            onClose={onClose}
            onSaved={onSaved}
          />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
  return { onClose, onSaved };
}

/** Opens the n-th antd select inside the modal (0 = filter select). */
async function openSelect(index: number) {
  await waitFor(() => {
    expect(
      document.querySelectorAll('.ant-modal .ant-select').length,
    ).toBeGreaterThan(index);
  });
  const select = document.querySelectorAll<HTMLElement>(
    '.ant-modal .ant-select',
  )[index];
  fireEvent.mouseDown(select);
}

async function clickOption(text: string) {
  fireEvent.click(
    await screen.findByText(text, {
      selector: '.ant-select-item-option-content',
    }),
  );
}

const okButton = () =>
  within(document.querySelector('.ant-modal') as HTMLElement).getByRole(
    'button',
    { name: /新\s*建\s*接\s*收\s*人|保\s*存/ },
  );

describe('RecipientDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    usersMock.getUsers.mockResolvedValue(USERS_PAGE);
    usersMock.getUserById.mockResolvedValue(user('user-9', 'stored@tb.io'));
    servicesMock.saveNotificationTarget.mockResolvedValue({});
    servicesMock.getSlackConversations.mockResolvedValue([
      {
        type: SlackConversationType.PUBLIC_CHANNEL,
        id: 'conv-1',
        name: 'alerts',
      },
    ]);
  });

  it('blocks an empty submit with the name error and no service call', async () => {
    renderDialog();
    fireEvent.click(okButton());
    expect(await screen.findByText('名称必填')).toBeInTheDocument();
    expect(servicesMock.saveNotificationTarget).not.toHaveBeenCalled();
  });

  it('saves the default PLATFORM_USERS/ALL_USERS payload', async () => {
    const { onSaved } = renderDialog();
    fireEvent.change(screen.getByLabelText('名称') as HTMLInputElement, {
      target: { value: 'everyone' },
    });
    fireEvent.click(okButton());
    await waitFor(() => {
      expect(servicesMock.saveNotificationTarget).toHaveBeenCalledWith({
        name: 'everyone',
        configuration: {
          type: NotificationTargetType.PLATFORM_USERS,
          usersFilter: { type: UsersFilterType.ALL_USERS },
          description: undefined,
        },
      });
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('narrows the usersFilter options per role (tenant sees six, no SYS variants)', async () => {
    renderDialog();
    await openSelect(0);
    expect(
      await screen.findByText('客户用户', {
        selector: '.ant-select-item-option-content',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('系统管理员', {
        selector: '.ant-select-item-option-content',
      }),
    ).toBeNull();
    expect(
      screen.queryByText('受影响的租户管理员', {
        selector: '.ant-select-item-option-content',
      }),
    ).toBeNull();
  });

  it('picks users for the USER_LIST variant and validates the empty list', async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('名称') as HTMLInputElement, {
      target: { value: 'pick-list' },
    });
    await openSelect(0);
    await clickOption('用户列表');

    fireEvent.click(okButton());
    expect(await screen.findByText('请选择用户')).toBeInTheDocument();
    expect(servicesMock.saveNotificationTarget).not.toHaveBeenCalled();

    await openSelect(1);
    await clickOption('one@tb.io');
    // The multiple-mode dropdown stays open across picks.
    await clickOption('two@tb.io');
    fireEvent.click(okButton());

    await waitFor(() => {
      expect(servicesMock.saveNotificationTarget).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: expect.objectContaining({
            usersFilter: {
              type: UsersFilterType.USER_LIST,
              usersIds: ['user-1', 'user-2'],
            },
          }),
        }),
      );
    });
    expect(usersMock.getUsers).toHaveBeenCalled();
  });

  it('shows the tenants/profiles toggle for SYS only and saves tenantsIds', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['SYS_ADMIN'],
    });
    tenantsMock.getTenantInfos.mockResolvedValue({
      data: [{ id: { entityType: 'TENANT', id: 'tenant-9' }, title: 'Acme' }],
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
    renderDialog();
    fireEvent.change(screen.getByLabelText('名称') as HTMLInputElement, {
      target: { value: 'all-tenants' },
    });
    await openSelect(0);
    expect(
      screen.queryByText('客户用户', {
        selector: '.ant-select-item-option-content',
      }),
    ).toBeNull();
    await clickOption('租户管理员');

    // SYS sees the toggle; pick the tenant-profiles side and back.
    expect(await screen.findByText('按租户')).toBeInTheDocument();
    expect(screen.getByText('按租户配置档')).toBeInTheDocument();
    await openSelect(1);
    await clickOption('Acme');
    fireEvent.click(okButton());

    await waitFor(() => {
      expect(servicesMock.saveNotificationTarget).toHaveBeenCalledWith({
        name: 'all-tenants',
        configuration: {
          type: NotificationTargetType.PLATFORM_USERS,
          usersFilter: {
            type: UsersFilterType.TENANT_ADMINISTRATORS,
            tenantsIds: ['tenant-9'],
          },
          description: undefined,
        },
      });
    });
  });

  it('saves SLACK with the full conversation object from the fetched list', async () => {
    const { onSaved } = renderDialog();
    fireEvent.change(screen.getByLabelText('名称') as HTMLInputElement, {
      target: { value: 'slack ops' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Slack' }));

    fireEvent.click(await screen.findByRole('radio', { name: '私有频道' }));
    await openSelect(0);
    await clickOption('alerts');
    fireEvent.click(okButton());

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(servicesMock.getSlackConversations).toHaveBeenCalledWith(
      SlackConversationType.PRIVATE_CHANNEL,
    );
    expect(servicesMock.saveNotificationTarget).toHaveBeenCalledWith({
      name: 'slack ops',
      configuration: {
        type: NotificationTargetType.SLACK,
        conversationType: SlackConversationType.PRIVATE_CHANNEL,
        conversation: {
          type: SlackConversationType.PUBLIC_CHANNEL,
          id: 'conv-1',
          name: 'alerts',
        },
        description: undefined,
      },
    });
  });

  it('saves MICROSOFT_TEAMS with the new-API default and required fields', async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('名称') as HTMLInputElement, {
      target: { value: 'teams' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Microsoft Teams' }));

    // New target defaults to the new Workflows API label.
    expect(await screen.findByLabelText('Workflow URL')).toBeInTheDocument();
    fireEvent.click(okButton());
    expect(await screen.findByText('请输入 Workflow URL')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Workflow URL'), {
      target: { value: ' https://example.com/workflow ' },
    });
    fireEvent.change(screen.getByLabelText('频道名称'), {
      target: { value: 'General' },
    });
    fireEvent.click(okButton());

    await waitFor(() => {
      expect(servicesMock.saveNotificationTarget).toHaveBeenCalledWith({
        name: 'teams',
        configuration: {
          type: NotificationTargetType.MICROSOFT_TEAMS,
          useOldApi: false,
          webhookUrl: 'https://example.com/workflow',
          channelName: 'General',
          description: undefined,
        },
      });
    });
  });

  it('prefills an edited legacy TEAMS target with the old API label', async () => {
    renderDialog({
      target: target(
        {
          type: NotificationTargetType.MICROSOFT_TEAMS,
          webhookUrl: 'https://hooks.office.com/abc',
          channelName: 'Legacy',
        },
        'legacy teams',
      ),
    });
    expect(await screen.findByLabelText('Webhook URL')).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Webhook URL') as HTMLInputElement).value,
    ).toBe('https://hooks.office.com/abc');
    expect((screen.getByLabelText('频道名称') as HTMLInputElement).value).toBe(
      'Legacy',
    );
    expect(screen.getByText('使用旧版 API')).toBeInTheDocument();
  });

  it('shows the server error inside the dialog when the save fails', async () => {
    servicesMock.saveNotificationTarget.mockRejectedValue(
      new ServerErrorError({
        status: 400,
        detail: 'validation failed',
        titleKey: 'tb.error.badRequest',
      }),
    );
    renderDialog();
    fireEvent.change(screen.getByLabelText('名称') as HTMLInputElement, {
      target: { value: 'broken' },
    });
    fireEvent.click(okButton());
    await screen.findByTestId('recipient-dialog-error');
    expect(screen.getByText('validation failed')).toBeInTheDocument();
  });
});
