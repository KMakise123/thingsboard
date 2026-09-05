/**
 * Send-notification wizard tests (services mocked at the module boundary):
 * the Setup → Compose → Review flow in both from-scratch and template modes,
 * the setup gate (recipients / compose completeness), the WEB-always-on
 * switch, the preview call and the final POST /api/notification/request
 * payload, plus the schedule required-fields gate.
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
import { NotificationDeliveryMethod } from '@/types/tb/notification';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhSent } });

const servicesMock = vi.hoisted(() => ({
  getAvailableDeliveryMethods: vi.fn(),
  getNotificationRequestPreview: vi.fn(),
  getNotificationTargetById: vi.fn(),
  getNotificationTargets: vi.fn(),
  getNotificationTemplates: vi.fn(),
  sendNotificationRequest: vi.fn(),
  // RecipientDialog (mounted closed) service deps:
  getSlackConversations: vi.fn(),
  saveNotificationTarget: vi.fn(),
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

import { SendNotificationWizard } from './wizard';

const ALL_METHODS = Object.values(NotificationDeliveryMethod);

const TARGETS_PAGE = {
  data: [
    {
      id: { entityType: EntityType.NOTIFICATION_TARGET, id: 't-1' },
      createdTime: 1,
      name: 'ops-group',
      configuration: {
        type: 'PLATFORM_USERS',
        usersFilter: { type: 'ALL_USERS' },
      },
    },
    {
      id: { entityType: EntityType.NOTIFICATION_TARGET, id: 't-2' },
      createdTime: 2,
      name: 'all-users',
      configuration: {
        type: 'PLATFORM_USERS',
        usersFilter: { type: 'ALL_USERS' },
      },
    },
  ],
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

const TEMPLATES_PAGE = {
  data: [
    {
      id: { entityType: EntityType.NOTIFICATION_TEMPLATE, id: 'tpl-1' },
      createdTime: 1,
      name: 'ops-template',
      notificationType: 'GENERAL',
      configuration: { deliveryMethodsTemplates: {} },
    },
  ],
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
};

const PREVIEW = {
  processedTemplates: {
    [NotificationDeliveryMethod.WEB]: {
      method: NotificationDeliveryMethod.WEB,
      enabled: true,
      subject: 'Hello',
      body: 'Body text',
    },
  },
  totalRecipientsCount: 5,
  recipientsCountByTarget: { 'ops-group': 5 },
  recipientsPreview: ['Alice'],
};

function renderWizard(
  props: Partial<React.ComponentProps<typeof SendNotificationWizard>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <SendNotificationWizard open onClose={onClose} {...props} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
  return { onClose };
}

async function pickTarget(title: string, value = 't-1') {
  // First combobox in scratch mode is the recipients select.
  const combo = screen.getAllByRole('combobox')[0];
  fireEvent.mouseDown(combo);
  fireEvent.click(await screen.findByText(title));
  await waitFor(() => {
    expect(
      document.querySelectorAll('.ant-select-selection-item'),
    ).not.toHaveLength(0);
  });
  return value;
}

/** The Next handler is async — wait until the requested step is the active one. */
async function gotoStep(testid: string) {
  fireEvent.click(screen.getByTestId('wizard-next'));
  await waitFor(() => {
    expect(screen.getByTestId(testid).className).not.toContain('hidden');
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  servicesMock.getAvailableDeliveryMethods.mockResolvedValue(ALL_METHODS);
  servicesMock.getNotificationTargets.mockResolvedValue(TARGETS_PAGE);
  servicesMock.getNotificationTemplates.mockResolvedValue(TEMPLATES_PAGE);
  servicesMock.getNotificationRequestPreview.mockResolvedValue(PREVIEW);
  servicesMock.sendNotificationRequest.mockResolvedValue({});
  servicesMock.getNotificationTargetById.mockResolvedValue(
    TARGETS_PAGE.data[0],
  );
  tokenStoreMock.decodeTokenClaims.mockReturnValue({
    scopes: ['TENANT_ADMIN'],
  });
});

afterEach(() => {
  window.history.replaceState({}, '', '/notifications/sent');
});

describe('SendNotificationWizard', () => {
  it('starts in scratch mode with WEB forced on and no template select', async () => {
    renderWizard();
    await screen.findByTestId('wizard-method-WEB');
    expect(screen.getByText('从头开始')).toBeInTheDocument();
    // No template search select in scratch mode.
    expect(screen.queryByPlaceholderText('搜索模板')).toBeNull();
    // WEB switch: checked + disabled.
    const webSwitch = screen
      .getByTestId('wizard-method-WEB')
      .querySelector('.ant-switch') as HTMLElement;
    expect(webSwitch.className).toContain('ant-switch-checked');
    expect(webSwitch.className).toContain('ant-switch-disabled');
  });

  it('blocks Next until recipients are picked', async () => {
    renderWizard();
    await screen.findByTestId('wizard-method-WEB');
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(await screen.findByText('收件人为必填项')).toBeInTheDocument();
    // Still on setup: compose completeness gate not even reached.
    expect(screen.queryByText('请先补全所有已启用方式的消息内容。')).toBeNull();
  });

  it('walks scratch mode: setup → compose → review → send', async () => {
    const { onClose } = renderWizard();
    await screen.findByTestId('wizard-method-WEB');

    await pickTarget('ops-group');

    // Compose fields are mounted (hidden) alongside setup — fill them here.
    fireEvent.change(screen.getByLabelText('主题'), {
      target: { value: 'Hello' },
    });
    fireEvent.change(screen.getByTestId('template-body-WEB'), {
      target: { value: 'Body text' },
    });

    // Compose completeness gate before filling would fire; now Next passes.
    await gotoStep('wizard-step-compose');
    expect(screen.getByTestId('template-configuration')).toBeInTheDocument();

    await gotoStep('wizard-step-review');
    await screen.findByTestId('wizard-review');
    await screen.findByText('ops-group: 5');
    await waitFor(() => {
      expect(servicesMock.getNotificationRequestPreview).toHaveBeenCalledTimes(
        1,
      );
    });
    const previewPayload =
      servicesMock.getNotificationRequestPreview.mock.calls[0][0];
    expect(previewPayload.targets).toEqual(['t-1']);
    expect(
      previewPayload.template.configuration.deliveryMethodsTemplates,
    ).toMatchObject({
      WEB: {
        method: 'WEB',
        enabled: true,
        subject: 'Hello',
        body: 'Body text',
      },
    });

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => {
      expect(servicesMock.sendNotificationRequest).toHaveBeenCalledTimes(1);
    });
    const sent = servicesMock.sendNotificationRequest.mock.calls[0][0];
    expect(sent.targets).toEqual(['t-1']);
    expect(sent.additionalConfig).toEqual({ sendingDelayInSec: 0 });
    expect(sent.templateId).toBeUndefined();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('gates Setup while the composed message is incomplete', async () => {
    renderWizard();
    await screen.findByTestId('wizard-method-WEB');
    await pickTarget('ops-group');
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(
      await screen.findByText('请先补全所有已启用方式的消息内容。'),
    ).toBeInTheDocument();
  });

  it('template mode renders the template select and blocks empty submit', async () => {
    renderWizard();
    await screen.findByTestId('wizard-method-WEB');

    fireEvent.click(screen.getByText('使用模板'));
    // The template select mounts (placeholder) once template mode is on;
    // rc-select single-mode options cannot be clicked in happy-dom, so the
    // templateId payload is covered by the notify-again test below.
    expect(await screen.findByText('搜索模板')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(await screen.findByText('模板为必填项')).toBeInTheDocument();
    expect(screen.queryByTestId('template-configuration')).toBeNull();
    expect(screen.getByTestId('wizard-step-setup').className).not.toContain(
      'hidden',
    );
  });

  it('notify-again prefill submits the original templateId', async () => {
    const { onClose } = renderWizard({
      prefilledRequest: {
        id: { entityType: EntityType.NOTIFICATION_REQUEST, id: 'req-9' },
        createdTime: 0,
        targets: ['t-1', 't-2'],
        templateId: {
          entityType: EntityType.NOTIFICATION_TEMPLATE,
          id: 'tpl-7',
        },
      },
    });
    // Prefilled: template mode + both targets. The template select shows the
    // raw id (its option list has no label for tpl-7).
    await screen.findByText('tpl-7');
    await waitFor(() => {
      expect(
        document.querySelectorAll('.ant-select-selection-item'),
      ).not.toHaveLength(0);
    });

    await gotoStep('wizard-step-review');
    await screen.findByTestId('wizard-review');
    await waitFor(() => {
      expect(servicesMock.getNotificationRequestPreview).toHaveBeenCalledTimes(
        1,
      );
    });
    expect(
      servicesMock.getNotificationRequestPreview.mock.calls[0][0].templateId,
    ).toEqual({ entityType: EntityType.NOTIFICATION_TEMPLATE, id: 'tpl-7' });

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => {
      expect(servicesMock.sendNotificationRequest).toHaveBeenCalledTimes(1);
    });
    expect(
      servicesMock.sendNotificationRequest.mock.calls[0][0].templateId,
    ).toEqual({ entityType: EntityType.NOTIFICATION_TEMPLATE, id: 'tpl-7' });
    expect(
      servicesMock.sendNotificationRequest.mock.calls[0][0].targets,
    ).toEqual(['t-1', 't-2']);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('requires timezone and time once scheduling is enabled', async () => {
    renderWizard();
    await screen.findByTestId('wizard-method-WEB');
    await pickTarget('ops-group');
    fireEvent.change(screen.getByLabelText('主题'), {
      target: { value: 'Hello' },
    });
    fireEvent.change(screen.getByTestId('template-body-WEB'), {
      target: { value: 'Body text' },
    });
    fireEvent.click(screen.getByTestId('wizard-schedule-switch'));
    // Wait for the schedule fields to mount before validating.
    await screen.findByText('时间');
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(await screen.findByText('时间为必填项')).toBeInTheDocument();
    expect(servicesMock.getNotificationRequestPreview).not.toHaveBeenCalled();
  });

  it('flags unconfigured delivery methods as contact-administrator', async () => {
    servicesMock.getAvailableDeliveryMethods.mockResolvedValue([
      NotificationDeliveryMethod.WEB,
    ]);
    renderWizard();
    const slackRow = await screen.findByTestId(
      `wizard-method-${NotificationDeliveryMethod.SLACK}`,
    );
    expect(
      within(slackRow).getByText('发送方式未配置。请联系系统管理员。'),
    ).toBeInTheDocument();
    // WEB stays forced on regardless.
    const webSwitch = screen
      .getByTestId('wizard-method-WEB')
      .querySelector('.ant-switch') as HTMLElement;
    expect(webSwitch.className).toContain('ant-switch-checked');
  });
});
