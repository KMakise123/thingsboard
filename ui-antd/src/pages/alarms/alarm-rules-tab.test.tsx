/**
 * Global alarm-rules tab tests: tenant-wide list plumbing (server
 * pagination + sort + entity-type filter via the shared URL state), delete
 * confirmation, and the create dialog entity picker defaults. Services are
 * mocked at the module boundary.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhAlarms from '@/locales/zh-CN/alarms';
import zhCommon from '@/locales/zh-CN/common';
import zhDetail from '@/locales/zh-CN/devices/detail';
import { AlarmSeverity, EntityType } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhAlarms, ...zhDetail },
});

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn() },
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  return {
    ProTable: (props: React.ComponentProps<typeof Table>) => (
      <Table {...props} />
    ),
  };
});

const servicesMock = vi.hoisted(() => ({
  getAlarmRules: vi.fn(),
  deleteAlarmRule: vi.fn(),
  saveAlarmRule: vi.fn(),
  alarmRuleSeverities: (ruleRow: {
    configuration?: { createRules?: Record<string, unknown> };
  }) => Object.keys(ruleRow.configuration?.createRules ?? {}),
  getTenantDevices: vi.fn(),
  getTenantAssets: vi.fn(),
  getCustomers: vi.fn(),
}));

vi.mock('@/services/tb/alarm-rules', () => servicesMock);
vi.mock('@/services/tb/device', () => ({
  getTenantDevices: servicesMock.getTenantDevices,
}));
vi.mock('@/services/tb/asset', () => ({
  getTenantAssets: servicesMock.getTenantAssets,
}));
vi.mock('@/services/tb/customer', () => ({
  getCustomers: servicesMock.getCustomers,
}));
vi.mock('@/services/tb/attributes', () => ({
  getLatestTelemetry: vi.fn().mockResolvedValue({}),
  getAttributes: vi.fn().mockResolvedValue([]),
}));

import AlarmRulesTab from './alarm-rules-tab';
import { useAlarmsPageUrlState } from './url-state';

function rule(
  id: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: { entityType: EntityType.CALCULATED_FIELD, id },
    createdTime: 1_700_000_000_000,
    entityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
    entityName: '温度传感器 A',
    type: 'ALARM',
    name: '高温告警规则',
    debugMode: false,
    configuration: {
      type: 'ALARM',
      arguments: {},
      createRules: {
        [AlarmSeverity.MAJOR]: {
          condition: {
            type: 'SIMPLE',
            expression: { type: 'SIMPLE', filters: [] },
          },
        },
      },
    },
    ...extra,
  };
}

function Harness() {
  const { state, patch } = useAlarmsPageUrlState();
  return <AlarmRulesTab state={state} patch={patch} />;
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <Harness />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('global alarm-rules tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/alarms');
    servicesMock.getAlarmRules.mockResolvedValue({
      data: [rule('r-1')],
      totalElements: 1,
      totalPages: 1,
    });
    servicesMock.deleteAlarmRule.mockResolvedValue(true);
    servicesMock.getTenantDevices.mockResolvedValue({
      data: [
        {
          id: { entityType: EntityType.DEVICE, id: 'dev-1' },
          name: '温度传感器 A',
        },
      ],
      totalElements: 1,
    });
    servicesMock.getTenantAssets.mockResolvedValue({
      data: [],
      totalElements: 0,
    });
    servicesMock.getCustomers.mockResolvedValue({ data: [], totalElements: 0 });
  });

  it('lists rules through the tenant-wide endpoint with the default sort', async () => {
    renderTab();
    expect(await screen.findByText('高温告警规则')).toBeInTheDocument();
    expect(servicesMock.getAlarmRules).toHaveBeenCalledWith(
      {
        pageSize: 10,
        page: 0,
        textSearch: undefined,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
      { entityType: undefined },
    );
    expect(screen.getByText('DEVICE 温度传感器 A')).toBeInTheDocument();
  });

  it('confirms before deleting and hits the rule endpoint', async () => {
    renderTab();
    await screen.findByText('高温告警规则');

    fireEvent.click(screen.getByTitle('删除'));
    expect(
      (await screen.findAllByText(/确定要删除告警规则/)).length,
    ).toBeGreaterThan(0);
    const okButtons = document.querySelectorAll('button.ant-btn-dangerous');
    fireEvent.click(okButtons[okButtons.length - 1]);

    await waitFor(() =>
      expect(servicesMock.deleteAlarmRule).toHaveBeenCalledWith('r-1'),
    );
  });

  it('opens the create dialog with the device entity picker wired', async () => {
    renderTab();
    await screen.findByText('高温告警规则');

    fireEvent.click(screen.getByRole('button', { name: /新增告警规则/ }));
    expect(await screen.findByText('目标实体')).toBeInTheDocument();
    // Devices load for the default DEVICE entity type.
    await waitFor(() =>
      expect(servicesMock.getTenantDevices).toHaveBeenCalled(),
    );
    expect(servicesMock.getCustomers).not.toHaveBeenCalled();
  });
});
