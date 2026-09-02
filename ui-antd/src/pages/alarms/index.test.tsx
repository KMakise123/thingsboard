/**
 * Global alarms page tests: REST seed plumbing + WS dual-channel wiring,
 * default status filter, debounced text search into the URL, batch delete
 * confirm/fan-out, and the CU same-customer write boundary. Services and the
 * WS manager are mocked at the module boundary.
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
import zhAlarms from '@/locales/zh-CN/alarms';
import zhCommon from '@/locales/zh-CN/common';
import zhDetail from '@/locales/zh-CN/devices/detail';
import {
  type AlarmData,
  AlarmSeverity,
  AlarmStatus,
  EntityType,
} from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhAlarms, ...zhDetail },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

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

const servicesMock = vi.hoisted(() => ({
  getAlarms: vi.fn(),
  getAlarmTypes: vi.fn(),
  ackAlarm: vi.fn(),
  clearAlarm: vi.fn(),
  deleteAlarm: vi.fn(),
  assignAlarm: vi.fn(),
  unassignAlarm: vi.fn(),
  getAlarmInfoById: vi.fn(),
  getAlarmComments: vi.fn(),
  getUsers: vi.fn(),
}));

const wsManagerMock = vi.hoisted(() => ({ subscribeAlarmData: vi.fn() }));

const tokenClaimsMock = vi.hoisted(() => ({ decodeTokenClaims: vi.fn() }));

vi.mock('@/services/tb/alarm', () => servicesMock);
vi.mock('@/services/tb/user', () => ({
  getUsers: servicesMock.getUsers,
}));
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenClaimsMock,
}));
vi.mock('@/core/ws/hooks', () => ({
  getDefaultWsManager: () => wsManagerMock,
}));

import AlarmsPage from './index';

function alarm(id: string, extra: Partial<AlarmData> = {}): AlarmData {
  return {
    id: { entityType: EntityType.ALARM, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 't-1' },
    customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
    type: '高温告警',
    originator: { entityType: EntityType.DEVICE, id: 'dev-1' },
    originatorName: '温度传感器 A',
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <AlarmsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('global alarms page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/alarms');
    tokenClaimsMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
      userId: 'u-me',
    });
    servicesMock.getAlarmTypes.mockResolvedValue({
      data: [{ type: '高温告警' }],
      totalElements: 1,
    });
    servicesMock.getUsers.mockResolvedValue({
      data: [
        {
          id: { entityType: EntityType.USER, id: 'u-1' },
          email: 'ops@example.com',
          firstName: '运维',
          lastName: '一号',
        },
      ],
      totalElements: 1,
    });
    servicesMock.ackAlarm.mockResolvedValue(alarm('a-1'));
    servicesMock.clearAlarm.mockResolvedValue(alarm('a-1'));
    servicesMock.deleteAlarm.mockResolvedValue(true);
    servicesMock.getAlarmInfoById.mockResolvedValue(alarm('a-1'));
    servicesMock.getAlarmComments.mockResolvedValue({ data: [] });
    wsManagerMock.subscribeAlarmData.mockImplementation(({ seed }) => ({
      getSnapshot: () => seed ?? [],
      getStatus: () => 'open',
      subscribe: () => () => {},
      unsubscribe: vi.fn(),
    }));
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/alarms');
  });

  function primeSeed(rows: Array<AlarmData>) {
    servicesMock.getAlarms.mockResolvedValue({
      data: rows,
      totalElements: rows.length,
    });
  }

  it('seeds the dual-channel WS stream with the default ACTIVE filter', async () => {
    primeSeed([alarm('a-1')]);
    renderPage();

    expect(await screen.findByText('高温告警')).toBeInTheDocument();
    // Both entityType channels subscribed (DEVICE + ASSET). The seed refetch
    // after the REST query resolves re-issues the pair once (same semantics
    // as the entity-tab hook), so only the tail pair is pinned.
    const filters = wsManagerMock.subscribeAlarmData.mock.calls.map(
      (call) =>
        (call[0] as { query: { entityFilter: { entityType: string } } }).query
          .entityFilter.entityType,
    );
    expect(filters.slice(-2)).toEqual(['DEVICE', 'ASSET']);
    // Seed query: default status filter, no assignee.
    expect(servicesMock.getAlarms).toHaveBeenCalledWith(
      {
        statusList: ['ACTIVE'],
        severityList: [],
        typeList: [],
        assigneeId: undefined,
      },
      {
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
    );
  });

  it('debounces the text search into the seed query and the URL', async () => {
    primeSeed([]);
    renderPage();
    await screen.findByText('未找到告警');

    fireEvent.change(screen.getByPlaceholderText('搜索告警'), {
      target: { value: '  高温 ' },
    });

    await waitFor(
      () => {
        expect(servicesMock.getAlarms).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ textSearch: '高温' }),
        );
      },
      { timeout: 2500 },
    );
    expect(window.location.search).toContain('textSearch=');
  });

  it('confirms before batch deleting and fans out per alarm', async () => {
    primeSeed([alarm('a-1'), alarm('a-2', { type: '低温告警' })]);
    renderPage();
    await screen.findByText('高温告警');

    const table = document.querySelector('.ant-table');
    const checkboxes = within(table as HTMLElement).queryAllByRole('checkbox');
    // Header checkbox = select all rows.
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    expect(
      (await screen.findAllByText(/删除 2 个告警/)).length,
    ).toBeGreaterThan(0);
    const okButtons = document.querySelectorAll('button.ant-btn-dangerous');
    fireEvent.click(okButtons[okButtons.length - 1]);

    await waitFor(() => {
      expect(servicesMock.deleteAlarm).toHaveBeenCalledTimes(2);
    });
  });

  it('hides the ack action on foreign-customer alarms for customer users', async () => {
    tokenClaimsMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
      userId: 'u-me',
      customerId: 'cust-1',
    });
    primeSeed([
      alarm('a-own', { type: '本客户告警' }),
      alarm('a-foreign', {
        type: '外来传播告警',
        customerId: { entityType: EntityType.CUSTOMER, id: 'cust-9' },
      }),
    ]);
    renderPage();
    expect(await screen.findByText('本客户告警')).toBeInTheDocument();

    // Own-customer alarm row: ack icon available; foreign row: none.
    const rows = document.querySelectorAll('.ant-table-tbody > tr');
    expect(
      within(rows[0] as HTMLElement).getByTitle('确认'),
    ).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).queryByTitle('确认')).toBeNull();
  });
});
