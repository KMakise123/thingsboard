/**
 * Template wizard tests: authority-narrowed type candidates, the Setup gate
 * (name required, atLeastOne method), the Compose gate (incomplete enabled
 * message blocks the save), edit locking the type, and the save payload
 * shape (deliveryMethodsTemplates entries carry enabled + method; copy never
 * carries the source id).
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
import zhSent from '@/locales/zh-CN/notifications/sent';
import zhTemplates from '@/locales/zh-CN/notifications/templates';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhTemplates, ...zhSent },
});

const servicesMock = vi.hoisted(() => ({
  saveNotificationTemplate: vi.fn(),
  getNotificationTemplates: vi.fn(),
  deleteNotificationTemplate: vi.fn(),
  getAvailableDeliveryMethods: vi.fn(),
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

import { EntityType } from '@/types/tb';
import {
  NotificationDeliveryMethod,
  type NotificationTemplate,
  NotificationType,
} from '@/types/tb/notification';

import TemplateWizard from './template-wizard';

function sourceTemplate(): NotificationTemplate {
  return {
    id: { entityType: EntityType.NOTIFICATION_TEMPLATE, id: 'tpl-9' },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    name: 'ops alert',
    notificationType: NotificationType.GENERAL,
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

function renderWizard(props: {
  source?: NotificationTemplate | null;
  copy?: boolean;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <TemplateWizard
            open
            source={props.source ?? null}
            copy={props.copy}
            onClose={() => {}}
            onSaved={() => {}}
          />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

function typeNameOptions(): Array<string> {
  return Array.from(
    document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
  ).map((node) => node.textContent ?? '');
}

async function openTypeDropdown(): Promise<void> {
  fireEvent.mouseDown(screen.getByTestId('template-wizard-type'));
  await waitFor(() => {
    expect(document.querySelector('.ant-select-item-option')).not.toBeNull();
  });
}

async function fillName(value: string): Promise<void> {
  fireEvent.change(screen.getByLabelText('名称') as HTMLInputElement, {
    target: { value },
  });
}

/** Drives Setup → Compose with WEB on; returns nothing (assertions follow). */
async function goToCompose(): Promise<HTMLElement> {
  await fillName('fresh-template');
  fireEvent.click(screen.getByTestId('template-wizard-next'));
  await waitFor(() => {
    expect(
      screen.getByTestId('template-wizard-step-compose').className,
    ).not.toContain('hidden');
  });
  return screen.getByTestId('template-wizard-step-compose');
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenStoreMock.decodeTokenClaims.mockReturnValue({
    scopes: ['TENANT_ADMIN'],
  });
  servicesMock.saveNotificationTemplate.mockResolvedValue({});
});

describe('Template wizard — Setup', () => {
  it('narrows the type candidates for TENANT_ADMIN (10, no platform types)', async () => {
    renderWizard({});
    await openTypeDropdown();

    const options = typeNameOptions();
    expect(options).toHaveLength(10);
    expect(options).toContain('通用');
    expect(options).toContain('告警');
    expect(options).toContain('规则节点');
    expect(options).not.toContain('实体限制');
    expect(options).not.toContain('新平台版本');
  });

  it('narrows the type candidates for SYS_ADMIN (GENERAL + 7 platform types)', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['SYS_ADMIN'],
    });
    renderWizard({});
    await openTypeDropdown();

    const options = typeNameOptions();
    expect(options).toEqual([
      '通用',
      '实体限制',
      '实体限制提升请求',
      'API 使用限制',
      '新平台版本',
      '超出速率限制',
      '任务处理失败',
      '资源不足',
    ]);
    expect(options).not.toContain('告警');
  });

  it('blocks the next step while the name is empty', async () => {
    renderWizard({});
    fireEvent.click(screen.getByTestId('template-wizard-next'));

    expect(await screen.findByText('名称为必填项')).toBeInTheDocument();
    expect(
      screen.getByTestId('template-wizard-step-compose').className,
    ).toContain('hidden');
    expect(servicesMock.saveNotificationTemplate).not.toHaveBeenCalled();
  });

  it('blocks the next step when every delivery method is off', async () => {
    renderWizard({});
    await fillName('no-methods');
    fireEvent.click(
      within(screen.getByTestId('template-method-toggle-WEB')).getByRole(
        'switch',
      ),
    );
    fireEvent.click(screen.getByTestId('template-wizard-next'));

    const gateError = await screen.findByTestId('template-wizard-gate-error');
    expect(gateError).toBeInTheDocument();
    // The gate message (the Setup hint carries the same sentence — assert
    // inside the alert to tell them apart).
    expect(
      within(gateError).getByText('至少需要选择一种发送方式'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('template-wizard-step-compose').className,
    ).toContain('hidden');
  });
});

describe('Template wizard — Compose and save', () => {
  it('saves a create payload whose WEB entry carries enabled + method', async () => {
    renderWizard({});
    const compose = await goToCompose();

    fireEvent.change(
      within(compose).getByLabelText('主题') as HTMLInputElement,
      { target: { value: 'subj' } },
    );
    fireEvent.change(
      within(compose).getByTestId('template-body-WEB') as HTMLTextAreaElement,
      { target: { value: 'body text' } },
    );
    fireEvent.click(screen.getByTestId('template-wizard-next'));

    await waitFor(() => {
      expect(servicesMock.saveNotificationTemplate).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveNotificationTemplate.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'fresh-template',
      notificationType: NotificationType.GENERAL,
    });
    expect(payload.id).toBeUndefined();
    const web =
      payload.configuration.deliveryMethodsTemplates[
        NotificationDeliveryMethod.WEB
      ];
    expect(web).toMatchObject({
      method: NotificationDeliveryMethod.WEB,
      enabled: true,
      subject: 'subj',
      body: 'body text',
    });
    expect(web.additionalConfig.icon).toMatchObject({ enabled: false });
  });

  it('blocks the save while an enabled message is incomplete', async () => {
    renderWizard({});
    await goToCompose();

    fireEvent.click(screen.getByTestId('template-wizard-next'));

    expect(
      await screen.findByTestId('template-wizard-gate-error'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('请先补全所有已启用方式的消息内容。'),
    ).toBeInTheDocument();
    expect(servicesMock.saveNotificationTemplate).not.toHaveBeenCalled();
  });

  it('locks the type and keeps identity fields when editing', async () => {
    renderWizard({ source: sourceTemplate() });

    const select = screen.getByTestId(
      'template-wizard-type',
    ) as HTMLInputElement;
    expect(select.className).toContain('ant-select-disabled');
    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe(
      'ops alert',
    );
    // Edit mode keeps the source's enabled method prefilled in Setup.
    expect(
      screen
        .getByTestId('template-method-toggle-WEB')
        .querySelector('.ant-switch-checked'),
    ).not.toBeNull();
    // The last-step button reads 保存 for an edit.
    fireEvent.click(screen.getByTestId('template-wizard-next'));
    await waitFor(() => {
      expect(
        screen.getByTestId('template-wizard-step-compose').className,
      ).not.toContain('hidden');
    });
    expect(screen.getByRole('button', { name: /保\s*存/ })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('template-wizard-next'));
    await waitFor(() => {
      expect(servicesMock.saveNotificationTemplate).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveNotificationTemplate.mock.calls[0][0];
    expect(payload.id).toEqual(sourceTemplate().id);
    expect(payload.createdTime).toBe(1_700_000_000_000);
    expect(payload.name).toBe('ops alert');
    expect(
      payload.configuration.deliveryMethodsTemplates[
        NotificationDeliveryMethod.WEB
      ],
    ).toMatchObject({ subject: 'Hello', body: 'World', enabled: true });
  });

  it('saves a copy as a fresh entity with the suffixed name', async () => {
    renderWizard({ source: sourceTemplate(), copy: true });

    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe(
      'ops alert (copy)',
    );
    // Copy does NOT lock the type.
    const select = screen.getByTestId(
      'template-wizard-type',
    ) as HTMLInputElement;
    expect(select.className).not.toContain('ant-select-disabled');

    fireEvent.click(screen.getByTestId('template-wizard-next'));
    await waitFor(() => {
      expect(
        screen.getByTestId('template-wizard-step-compose').className,
      ).not.toContain('hidden');
    });
    fireEvent.click(screen.getByTestId('template-wizard-next'));

    await waitFor(() => {
      expect(servicesMock.saveNotificationTemplate).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveNotificationTemplate.mock.calls[0][0];
    expect(payload.id).toBeUndefined();
    expect(payload.createdTime).toBeUndefined();
    expect(payload.name).toBe('ops alert (copy)');
    expect(
      payload.configuration.deliveryMethodsTemplates[
        NotificationDeliveryMethod.WEB
      ],
    ).toMatchObject({ subject: 'Hello', body: 'World', enabled: true });
  });
});
