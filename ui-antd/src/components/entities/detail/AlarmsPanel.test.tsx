/**
 * Alarms panel tests: WS AlarmData channel consumes the REST seed, status
 * filter re-reads with the mapped statusList, ack/clear/delete actions hit
 * the alarm service, delete confirms first. The WS hook is mocked at the
 * module boundary (core/ws manager behavior is covered by core tests).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';
import {
  type AlarmData,
  AlarmSeverity,
  AlarmStatus,
  EntityType,
} from '@/types/tb';

import AlarmsPanel from './AlarmsPanel';
import { buildAlarmDataQuery } from './use-alarm-data-subscription';

const servicesMock = vi.hoisted(() => ({
  getEntityAlarms: vi.fn(),
  ackAlarm: vi.fn(),
  clearAlarm: vi.fn(),
  deleteAlarm: vi.fn(),
  getAlarmInfoById: vi.fn(),
  getAlarmComments: vi.fn(),
  saveAlarmComment: vi.fn(),
}));

const alarmHookMock = vi.hoisted(() => ({
  useAlarmDataSubscription: vi.fn(),
}));

vi.mock('@/services/tb/alarm', () => servicesMock);
vi.mock('./use-alarm-data-subscription', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./use-alarm-data-subscription')>()),
  useAlarmDataSubscription: alarmHookMock.useAlarmDataSubscription,
}));

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

function alarm(id: string, extra: Partial<AlarmData> = {}): AlarmData {
  return {
    id: { entityType: EntityType.ALARM, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 't-1' },
    type: '高温告警',
    originator: { entityType: EntityType.DEVICE, id: 'dev-1' },
    severity: AlarmSeverity.CRITICAL,
    status: AlarmStatus.ACTIVE_UNACK,
    startTs: 1_700_000_000_000,
    endTs: 0,
    ackTs: 0,
    clearTs: 0,
    assignTs: 0,
    acknowledged: false,
    cleared: false,
    entityId: 'dev-1',
    latest: {},
    ...extra,
  } as AlarmData;
}

function renderPanel(readOnly = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <AlarmsPanel
            entityId={{ entityType: EntityType.DEVICE, id: 'dev-1' }}
            readOnly={readOnly}
          />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('buildAlarmDataQuery', () => {
  it('pre-fills the single-entity filter with alarm + entity field sets', () => {
    const query = buildAlarmDataQuery(
      { entityType: EntityType.DEVICE, id: 'dev-1' },
      { statusList: ['ACTIVE'] },
    );
    expect(query.entityFilter).toEqual({
      type: 'singleEntity',
      singleEntity: { entityType: 'DEVICE', id: 'dev-1' },
    });
    expect(query.pageLink).toMatchObject({
      page: 0,
      statusList: ['ACTIVE'],
      sortOrder: {
        // Backend contract (TbAlarmDataSubCtx): ALARM_FIELD createdTime is the
        // supported alarm sort — an ENTITY_FIELD sort key is passed through to
        // the alarm SQL and fails the subscription with bad grammar.
        key: { type: 'ALARM_FIELD', key: 'createdTime' },
        direction: 'DESC',
      },
      // Backend contract: the per-entity alarm subscription derives its
      // startTs from pageLink.timeWindow (NPE when null).
      timeWindow: expect.any(Number),
    });
    expect(query.alarmFields.some((field) => field.key === 'severity')).toBe(
      true,
    );
    expect(query.entityFields.some((field) => field.key === 'name')).toBe(true);
    // Backend contract: latestValues must be an array (never null) — the
    // server iterates it unconditionally when creating value subscriptions.
    expect(query.latestValues).toEqual([]);
  });
});

describe('alarms panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.ackAlarm.mockResolvedValue(alarm('a-1'));
    servicesMock.clearAlarm.mockResolvedValue(alarm('a-1'));
    servicesMock.deleteAlarm.mockResolvedValue(true);
    servicesMock.getAlarmInfoById.mockResolvedValue(alarm('a-1'));
    servicesMock.getAlarmComments.mockResolvedValue({ data: [] });
  });

  function primeWs(rows: Array<AlarmData>) {
    servicesMock.getEntityAlarms.mockResolvedValue({
      data: rows,
      totalElements: rows.length,
    });
    alarmHookMock.useAlarmDataSubscription.mockImplementation(({ seed }) => ({
      data: seed ?? [],
      status: 'open',
    }));
  }

  it('renders the seeded alarms through the WS channel', async () => {
    primeWs([alarm('a-1'), alarm('a-2', { type: '低温告警' })]);
    renderPanel();
    expect(await screen.findByText('高温告警')).toBeTruthy();
    expect(screen.getByText('低温告警')).toBeTruthy();
    expect(screen.getAllByText('紧急').length).toBe(2);
    expect(screen.getAllByText('活动·未确认').length).toBe(2);
  });

  it('re-reads the seed with the mapped statusList on filter change', async () => {
    primeWs([]);
    renderPanel();
    await screen.findByText('暂无告警');
    fireEvent.click(screen.getByText('未确认'));
    await waitFor(() =>
      expect(servicesMock.getEntityAlarms).toHaveBeenCalledWith(
        { entityType: 'DEVICE', id: 'dev-1' },
        { statusList: ['UNACK'] },
        expect.anything(),
      ),
    );
  });

  it('acks a row through the alarm service', async () => {
    primeWs([alarm('a-1')]);
    renderPanel();
    await screen.findByText('高温告警');
    fireEvent.click(screen.getByTitle('确认'));
    await waitFor(() =>
      expect(servicesMock.ackAlarm).toHaveBeenCalledWith('a-1'),
    );
  });

  it('confirms before deleting (batch path shares the confirm)', async () => {
    primeWs([alarm('a-1')]);
    renderPanel();
    await screen.findByText('高温告警');
    // Select the row, then use the toolbar delete (same confirm + service).
    const checkbox = document.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    fireEvent.click(checkbox);
    const toolbarDelete = await screen.findByRole('button', {
      name: /删除/,
    });
    fireEvent.click(toolbarDelete);
    expect((await screen.findAllByText(/确定删除/)).length).toBeGreaterThan(0);
    const okButton = document.querySelectorAll('button.ant-btn-dangerous');
    fireEvent.click(okButton[okButton.length - 1]);
    await waitFor(() =>
      expect(servicesMock.deleteAlarm).toHaveBeenCalledWith('a-1'),
    );
  });

  it('hides all action entries for read-only users', async () => {
    primeWs([alarm('a-1')]);
    renderPanel(true);
    await screen.findByText('高温告警');
    expect(screen.queryByTitle('确认')).toBeNull();
    expect(screen.queryByText('详情')).toBeNull();
  });
});
