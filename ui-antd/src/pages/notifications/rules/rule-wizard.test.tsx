/**
 * Rule wizard tests: basic-step validation, trigger-type switching renders
 * the matching config form, deep payload examples (ALARM escalation chain,
 * DEVICE_ACTIVITY either-side, ENTITIES_LIMIT percent→fraction, all with the
 * three-way triggerType stamp), the no-field trigger, and edit mode (locked
 * triggerType + payload merge). The shared entity picker is stubbed with a
 * native select keyed by its placeholder label; services are mocked at the
 * module boundary.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhRules from '@/locales/zh-CN/notifications/rules';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhRules } });

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
vi.mock('@/components/notifications/recipient-dialog', () => ({
  default: () => null,
}));

/** Native-select stand-in for the server-search picker, keyed by placeholder. */
const PICKER_OPTIONS: Record<
  string,
  Array<{ value: string; label: string }>
> = {
  搜索模板: [{ value: 'tpl-1', label: 'Alarm template' }],
  搜索接收人: [
    { value: 'target-1', label: 'ops group' },
    { value: 'target-2', label: 'slack group' },
  ],
  搜索实体: [{ value: 'chain-1', label: 'Root rule chain' }],
};

vi.mock('@/components/notifications/recipient-entity-select', () => ({
  RecipientEntitySelect: ({
    mode,
    value,
    onChange,
    placeholder,
  }: {
    mode?: 'multiple';
    value?: Array<string> | string;
    onChange?: (value: Array<string> | string) => void;
    placeholder: string;
  }) => {
    const options = PICKER_OPTIONS[placeholder] ?? [];
    const current = Array.isArray(value) ? value[0] : value;
    return (
      <select
        aria-label={placeholder}
        value={current ?? ''}
        onChange={(event) => {
          const next = event.target.value;
          if (!next) {
            return;
          }
          onChange?.(mode === 'multiple' ? [next] : next);
        }}
      >
        <option value="">(未选择)</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
}));

import { EntityType } from '@/types/tb';
import {
  type NotificationRuleInfo,
  NotificationRuleTriggerType,
} from '@/types/tb/notification';
import RuleWizard, { type RuleWizardProps } from './rule-wizard';

function renderWizard(props: Partial<RuleWizardProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <RuleWizard open onClose={() => {}} onSaved={() => {}} {...props} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

async function pickTriggerType(zhLabel: string) {
  const select = screen.getByTestId('rule-wizard-trigger-type');
  // antd v6 opens the dropdown from a mousedown on the select root. The
  // picked option must sit inside the virtualized dropdown's first page.
  fireEvent.mouseDown(select);
  fireEvent.click(
    await screen.findByText(zhLabel, {
      selector: '.ant-select-item-option-content',
    }),
  );
  // The useWatch-driven fork (targets vs escalation chain) settles async.
  await waitFor(() => {
    expect(
      document.querySelector('[data-testid=escalations-editor]') === null,
    ).toBe(zhLabel !== '告警');
  });
}

function fillBasics() {
  fireEvent.change(screen.getByLabelText('名称'), {
    target: { value: 'my rule' },
  });
  fireEvent.change(screen.getByLabelText('搜索模板'), {
    target: { value: 'tpl-1' },
  });
}

const ALARM_SOURCE: NotificationRuleInfo = {
  id: { entityType: EntityType.NOTIFICATION_RULE, id: 'rule-1' },
  createdTime: 123,
  tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
  name: 'alarm rule',
  enabled: true,
  templateId: { entityType: EntityType.NOTIFICATION_TEMPLATE, id: 'tpl-1' },
  triggerType: NotificationRuleTriggerType.ALARM,
  triggerConfig: {
    triggerType: NotificationRuleTriggerType.ALARM,
    alarmTypes: ['HighTemperature'],
    notifyOn: ['CREATED'],
    clearRule: { alarmStatuses: ['ACTIVE'] },
  },
  recipientsConfig: {
    triggerType: NotificationRuleTriggerType.ALARM,
    escalationTable: { 0: ['target-1'], 60: ['target-2'] },
  },
  additionalConfig: { description: 'on-call pages' },
};

beforeEach(() => {
  vi.clearAllMocks();
  tokenStoreMock.decodeTokenClaims.mockReturnValue({
    scopes: ['TENANT_ADMIN'],
  });
  servicesMock.saveNotificationRule.mockImplementation(async (rule) => rule);
  servicesMock.getNotificationTemplates.mockResolvedValue({
    data: [],
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  });
});

describe('Rule wizard', () => {
  it('blocks Next on the basic step with inline errors and never saves', async () => {
    renderWizard();

    fireEvent.click(screen.getByTestId('rule-wizard-next'));

    expect(await screen.findByText('名称必填')).toBeInTheDocument();
    expect(screen.getByText('请选择模板')).toBeInTheDocument();
    expect(servicesMock.saveNotificationRule).not.toHaveBeenCalled();
    expect(screen.queryByTestId('rule-wizard-submit')).toBeNull();
  });

  it('assembles the ALARM deep example with the escalation chain', async () => {
    renderWizard();

    fillBasics();
    fireEvent.change(screen.getByLabelText('搜索接收人'), {
      target: { value: 'target-1' },
    });
    fireEvent.click(screen.getByTestId('rule-wizard-next'));

    expect(await screen.findByTestId('rule-wizard-submit')).toBeInTheDocument();
    // Single-stage chain: the clearRule block is locked.
    expect(screen.getByTestId('trigger-clear-alarm-statuses')).toHaveClass(
      'ant-select-disabled',
    );
    fireEvent.change(screen.getByLabelText('描述'), {
      target: { value: 'page on-call' },
    });
    fireEvent.click(screen.getByTestId('rule-wizard-submit'));

    await waitFor(() => {
      expect(servicesMock.saveNotificationRule).toHaveBeenCalledTimes(1);
    });
    expect(servicesMock.saveNotificationRule.mock.calls[0][0]).toMatchObject({
      name: 'my rule',
      enabled: true,
      templateId: {
        entityType: EntityType.NOTIFICATION_TEMPLATE,
        id: 'tpl-1',
      },
      triggerType: NotificationRuleTriggerType.ALARM,
      triggerConfig: {
        triggerType: NotificationRuleTriggerType.ALARM,
        alarmTypes: [],
        alarmSeverities: [],
        notifyOn: ['CREATED'],
        clearRule: { alarmStatuses: [] },
      },
      recipientsConfig: {
        triggerType: NotificationRuleTriggerType.ALARM,
        escalationTable: { 0: ['target-1'] },
      },
      additionalConfig: { description: 'page on-call' },
    });
    expect(
      servicesMock.saveNotificationRule.mock.calls[0][0].id,
    ).toBeUndefined();
  });

  it('keeps only the chosen DEVICE_ACTIVITY side and drops filterByDevice', async () => {
    renderWizard();

    await pickTriggerType('设备活动');
    fillBasics();
    fireEvent.change(screen.getByLabelText('搜索接收人'), {
      target: { value: 'target-1' },
    });
    fireEvent.click(screen.getByTestId('rule-wizard-next'));

    expect(await screen.findByTestId('rule-wizard-submit')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rule-wizard-submit'));

    await waitFor(() => {
      expect(servicesMock.saveNotificationRule).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveNotificationRule.mock.calls[0][0];
    expect(payload.triggerType).toBe(
      NotificationRuleTriggerType.DEVICE_ACTIVITY,
    );
    expect(payload.triggerConfig).toEqual({
      triggerType: NotificationRuleTriggerType.DEVICE_ACTIVITY,
      notifyOn: ['INACTIVE'],
      devices: [],
    });
    expect(payload.triggerConfig).not.toHaveProperty('filterByDevice');
    expect(payload.triggerConfig).not.toHaveProperty('deviceProfiles');
    expect(payload.recipientsConfig).toEqual({
      triggerType: NotificationRuleTriggerType.DEVICE_ACTIVITY,
      targets: ['target-1'],
    });
  });

  it('divides the ENTITIES_LIMIT threshold percent by 100 (sysadmin default)', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['SYS_ADMIN'],
    });
    renderWizard();

    // SYS default trigger type is ENTITIES_LIMIT — no need to switch.
    fillBasics();
    fireEvent.change(screen.getByLabelText('搜索接收人'), {
      target: { value: 'target-1' },
    });
    fireEvent.click(screen.getByTestId('rule-wizard-next'));

    const threshold = (await screen.findByTestId(
      'trigger-threshold',
    )) as HTMLInputElement;
    expect(threshold.value).toBe('80');
    fireEvent.click(screen.getByTestId('rule-wizard-submit'));

    await waitFor(() => {
      expect(servicesMock.saveNotificationRule).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveNotificationRule.mock.calls[0][0];
    expect(payload.triggerConfig).toEqual({
      triggerType: NotificationRuleTriggerType.ENTITIES_LIMIT,
      entityTypes: [],
      threshold: 0.8,
    });
  });

  it('renders only the description for the no-field trigger', async () => {
    // sysadmin so the NEW_PLATFORM_VERSION option sits on the dropdown's
    // first (virtualized) page.
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['SYS_ADMIN'],
    });
    renderWizard();

    await pickTriggerType('新平台版本');
    fillBasics();
    fireEvent.change(screen.getByLabelText('搜索接收人'), {
      target: { value: 'target-1' },
    });
    fireEvent.click(screen.getByTestId('rule-wizard-next'));

    expect(
      await screen.findByText('此触发器没有额外配置项'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('trigger-threshold')).toBeNull();
    fireEvent.click(screen.getByTestId('rule-wizard-submit'));

    await waitFor(() => {
      expect(servicesMock.saveNotificationRule).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveNotificationRule.mock.calls[0][0];
    expect(payload.triggerConfig).toEqual({
      triggerType: NotificationRuleTriggerType.NEW_PLATFORM_VERSION,
    });
    expect(payload.recipientsConfig).toEqual({
      triggerType: NotificationRuleTriggerType.NEW_PLATFORM_VERSION,
      targets: ['target-1'],
    });
  });

  it('locks the trigger type when editing and merges over the source', async () => {
    renderWizard({ source: ALARM_SOURCE });

    expect(screen.getByTestId('rule-wizard-trigger-type')).toHaveClass(
      'ant-select-disabled',
    );
    expect(screen.getByLabelText('名称')).toHaveValue('alarm rule');

    fireEvent.click(screen.getByTestId('rule-wizard-next'));
    expect(await screen.findByTestId('rule-wizard-submit')).toBeInTheDocument();
    // Two-stage chain: the clearRule block unlocks.
    expect(screen.getByTestId('trigger-clear-alarm-statuses')).not.toHaveClass(
      'ant-select-disabled',
    );
    fireEvent.click(screen.getByTestId('rule-wizard-submit'));

    await waitFor(() => {
      expect(servicesMock.saveNotificationRule).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveNotificationRule.mock.calls[0][0];
    expect(payload.id).toEqual({
      entityType: EntityType.NOTIFICATION_RULE,
      id: 'rule-1',
    });
    expect(payload.triggerType).toBe(NotificationRuleTriggerType.ALARM);
    expect(payload.recipientsConfig).toEqual({
      triggerType: NotificationRuleTriggerType.ALARM,
      escalationTable: { 0: ['target-1'], 60: ['target-2'] },
    });
    expect(payload.triggerConfig).toMatchObject({
      triggerType: NotificationRuleTriggerType.ALARM,
      alarmTypes: ['HighTemperature'],
      clearRule: { alarmStatuses: ['ACTIVE'] },
    });
    expect(payload.additionalConfig).toEqual({ description: 'on-call pages' });
  });
});
