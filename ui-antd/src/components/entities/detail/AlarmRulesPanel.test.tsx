/**
 * Alarm-rules panel tests: list with severity tags + clear-rule badge, and
 * the create payload (ALARM configuration with one threshold condition).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';
import { EntityType } from '@/types/tb';

import AlarmRulesPanel from './AlarmRulesPanel';

const servicesMock = vi.hoisted(() => ({
  getAlarmRulesByEntityId: vi.fn(),
  saveAlarmRule: vi.fn(),
  deleteAlarmRule: vi.fn(),
  getLatestTelemetry: vi.fn(),
  getAttributes: vi.fn(),
}));

vi.mock('@/services/tb/alarm-rules', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/tb/alarm-rules')>()),
  getAlarmRulesByEntityId: servicesMock.getAlarmRulesByEntityId,
  saveAlarmRule: servicesMock.saveAlarmRule,
  deleteAlarmRule: servicesMock.deleteAlarmRule,
}));
vi.mock('@/services/tb/attributes', () => ({
  getLatestTelemetry: servicesMock.getLatestTelemetry,
  getAttributes: servicesMock.getAttributes,
}));

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

const entityId = { entityType: EntityType.DEVICE, id: 'dev-1' };

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <AlarmRulesPanel entityId={entityId} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('alarm rules panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getAlarmRulesByEntityId.mockResolvedValue({
      data: [
        {
          id: { entityType: 'CALCULATED_FIELD', id: 'r-1' },
          createdTime: 1_700_000_000_000,
          entityId: entityId,
          type: 'ALARM',
          name: 'High temperature',
          debugMode: false,
          configuration: {
            type: 'ALARM',
            arguments: {},
            createRules: { CRITICAL: { condition: {} } },
          },
        },
      ],
      totalElements: 1,
    });
    servicesMock.getLatestTelemetry.mockResolvedValue({
      temperature: [{ ts: 1, value: '20' }],
    });
    servicesMock.getAttributes.mockResolvedValue([]);
    servicesMock.saveAlarmRule.mockResolvedValue({});
    servicesMock.deleteAlarmRule.mockResolvedValue(true);
  });

  it('lists rules with severity tags and clear-rule badge', async () => {
    renderPanel();
    expect(await screen.findByText('High temperature')).toBeTruthy();
    expect(screen.getAllByText('紧急').length).toBeGreaterThan(0);
    expect(screen.getByText('否')).toBeTruthy();
  });

  it('creates a rule with a threshold condition payload', async () => {
    renderPanel();
    await screen.findByText('High temperature');
    fireEvent.click(screen.getByRole('button', { name: /新增告警规则/ }));

    fireEvent.change(await screen.findByLabelText(/告警类型/), {
      target: { value: 'Low battery' },
    });
    const keySelect = await screen.findByLabelText(/监听的键/);
    fireEvent.mouseDown(keySelect);
    fireEvent.click(
      await screen.findByText('temperature', {
        selector: '.ant-select-item-option-content',
      }),
    );
    fireEvent.change(await screen.findByLabelText(/阈值/), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));

    await waitFor(() => expect(servicesMock.saveAlarmRule).toHaveBeenCalled());
    const payload = servicesMock.saveAlarmRule.mock.calls[0][0];
    expect(payload.type).toBe('ALARM');
    expect(payload.name).toBe('Low battery');
    const createRule =
      payload.configuration.createRules[
        Object.keys(payload.configuration.createRules)[0]
      ];
    expect(createRule.condition.type).toBe('SIMPLE');
    expect(createRule.condition.expression.filters[0].argument).toBe('a');
    expect(createRule.condition.expression.filters[0].predicates[0]).toEqual({
      type: 'NUMERIC',
      operation: 'GREATER',
      value: { staticValue: 15 },
    });
  });
});
