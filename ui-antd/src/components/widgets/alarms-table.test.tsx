/**
 * system.alarm_widgets.alarms_table against the REAL anchor config shape
 * (thermostats.json "New Alarms table"): alarmSource over the Thermostats
 * alias, six alarm dataKeys, inline alarmFilterConfig, defaultSortOrder
 * '-createdTime' and the mutation affordances (ack/clear/assign) that stay
 * read-only in v1. The WS manager rides the setDefaultWsManager seam.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { DashboardStateParams } from '@/core/dashboard/states';
import type { WsManager, WsStatus, WsSubscription } from '@/core/ws';
import type { AlarmData } from '@/types/tb';
import { setDefaultWsManager } from '@/core/ws';
import zhDashboards from '@/locales/zh-CN/dashboards';
import { AlarmSeverity, AlarmStatus } from '@/types/tb/alarm';
import { EntityType } from '@/types/tb/entity';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import AlarmsTable from './alarms-table';

interface StubAlarmSubscription extends WsSubscription<Array<AlarmData>> {
  emit: (rows: Array<AlarmData>) => void;
  query: Record<string, unknown>;
}

let stubSubscriptions: StubAlarmSubscription[];
let stubManager: WsManager;

function makeStubManager() {
  stubSubscriptions = [];
  stubManager = {
    subscribeAlarmData: (params: { query: Record<string, unknown> }) => {
      const listeners = new Set<() => void>();
      let snapshot: Array<AlarmData> = [];
      const subscription: StubAlarmSubscription = {
        query: params.query,
        getSnapshot: () => snapshot,
        getStatus: () => 'open' as WsStatus,
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        unsubscribe: vi.fn(),
        emit(rows: Array<AlarmData>) {
          snapshot = rows;
          for (const listener of listeners) {
            listener();
          }
        },
      };
      stubSubscriptions.push(subscription);
      return subscription;
    },
    close: vi.fn(),
  } as unknown as WsManager;
  setDefaultWsManager(stubManager);
}

// --- anchor fixture (thermostats.json widget 7943196b, trimmed) --------------

function anchorAlarmsTableWidget(): Widget {
  return {
    typeFullFqn: 'system.alarm_widgets.alarms_table',
    sizeX: 13,
    sizeY: 5,
    row: 0,
    col: 0,
    config: {
      title: 'New Alarms table',
      showTitle: true,
      useDashboardTimewindow: false,
      timewindow: {
        selectedTab: 'REALTIME',
        realtime: { realtimeType: 0, timewindowMs: 86_400_000 },
      },
      alarmSource: {
        type: 'entity',
        entityAliasId: 'thermostats',
        filterId: null,
        dataKeys: [
          { name: 'createdTime', type: 'alarm', label: 'Created time' },
          { name: 'originator', type: 'alarm', label: 'Originator' },
          { name: 'type', type: 'alarm', label: 'Type' },
          { name: 'severity', type: 'alarm', label: 'Severity' },
          { name: 'status', type: 'alarm', label: 'Status' },
          { name: 'assignee', type: 'alarm', label: 'Assignee' },
        ],
      },
      alarmFilterConfig: {
        statusList: [],
        severityList: [],
        typeList: [],
        searchPropagatedAlarms: true,
      },
      settings: {
        enableSearch: true,
        displayPagination: true,
        defaultPageSize: 10,
        defaultSortOrder: '-createdTime',
        alarmsTitle: 'Alarms',
      },
    },
  };
}

const layout: WidgetLayout = { sizeX: 13, sizeY: 5, row: 0, col: 0 };

const statesStub: StatesController = {
  mode: 'entity',
  stateObject: [{ id: 'default', params: {} }],
  currentStateId: 'default',
  currentStateParams: {} as DashboardStateParams,
  breadcrumbs: [],
  openState: vi.fn(),
  navigatePrev: vi.fn(),
  resetState: vi.fn(),
};

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

const alarmSource = {
  type: 'entity' as const,
  entities: [
    { entityType: EntityType.DEVICE, id: 'therm-1', name: 'Thermostat A' },
  ],
  dataKeys: anchorAlarmsTableWidget().config.alarmSource?.dataKeys ?? [],
  alarmSource: {
    type: 'entity' as const,
    dataKeys: anchorAlarmsTableWidget().config.alarmSource?.dataKeys ?? [],
  },
  alarmFilter: {
    statusList: [],
    severityList: [],
    typeList: [],
    searchPropagatedAlarms: true,
  },
};

function anchorAlarm(overrides: Partial<AlarmData> = {}): AlarmData {
  return {
    id: { entityType: EntityType.ALARM, id: 'alarm-1' },
    createdTime: Date.UTC(2026, 0, 15, 8, 30, 0),
    type: 'High temperature',
    severity: AlarmSeverity.CRITICAL,
    status: AlarmStatus.ACTIVE_UNACK,
    acknowledged: false,
    cleared: false,
    originator: { entityType: EntityType.DEVICE, id: 'therm-1' },
    originatorName: 'Thermostat A',
    startTs: Date.UTC(2026, 0, 15, 8, 30, 0),
    endTs: Date.UTC(2026, 0, 15, 8, 30, 0),
    ackTs: 0,
    clearTs: 0,
    assignTs: 0,
    entityId: 'therm-1',
    latest: {
      ALARM_FIELD: {
        createdTime: { ts: 0, value: String(Date.UTC(2026, 0, 15, 8, 30, 0)) },
        originator: { ts: 0, value: 'Thermostat A' },
        type: { ts: 0, value: 'High temperature' },
        severity: { ts: 0, value: 'CRITICAL' },
        status: { ts: 0, value: 'ACTIVE_UNACK' },
      },
    },
    ...overrides,
  } as unknown as AlarmData;
}

function renderTable(widget: Widget) {
  return render(
    <RawIntlProvider value={intl}>
      <AlarmsTable
        fqn="system.alarm_widgets.alarms_table"
        widgetId="w-alarms"
        widget={widget}
        layout={layout}
        ctx={{
          effectiveTimewindow: widget.config.timewindow as Timewindow,
          aliases: {},
          datasources: [alarmSource],
          states: statesStub,
          isMobile: false,
        }}
      />
    </RawIntlProvider>,
  );
}

beforeEach(() => {
  makeStubManager();
});

afterEach(() => {
  cleanup();
  setDefaultWsManager(null);
});

describe('alarms_table (anchor: thermostats alarms table)', () => {
  it('renders the real component (no placeholder) with the anchor columns', () => {
    renderTable(anchorAlarmsTableWidget());
    expect(document.querySelector('[data-widget-placeholder]')).toBeNull();
    expect(screen.getByText('New Alarms table')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Originator')).toBeInTheDocument();
  });

  it('subscribes with entityList filter, alarm window and the inline filterConfig', async () => {
    renderTable(anchorAlarmsTableWidget());
    await waitFor(() => {
      expect(stubSubscriptions).toHaveLength(1);
    });
    const query = stubSubscriptions[0].query as {
      entityFilter: Record<string, unknown>;
      pageLink: {
        statusList: Array<string>;
        searchPropagatedAlarms: boolean;
        startTs: number;
        sortOrder: { direction: string };
      };
      alarmFields: Array<{ type: string; key: string }>;
    };
    expect(query.entityFilter).toEqual({
      type: 'entityList',
      entityType: 'DEVICE',
      entityIds: ['therm-1'],
    });
    expect(query.pageLink.statusList).toEqual([]);
    expect(query.pageLink.searchPropagatedAlarms).toBe(true);
    expect(query.pageLink.sortOrder.direction).toBe('DESC');
    expect(query.pageLink.startTs).toBeGreaterThan(0);
    expect(query.alarmFields).toEqual([
      { type: 'ALARM_FIELD', key: 'createdTime' },
      { type: 'ALARM_FIELD', key: 'originator' },
      { type: 'ALARM_FIELD', key: 'type' },
      { type: 'ALARM_FIELD', key: 'severity' },
      { type: 'ALARM_FIELD', key: 'status' },
      { type: 'ALARM_FIELD', key: 'assignee' },
    ]);
  });

  it('renders alarm rows with the severity tag and formatted created time', async () => {
    renderTable(anchorAlarmsTableWidget());
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    stubSubscriptions[0].emit([anchorAlarm()]);
    await waitFor(() => {
      expect(screen.getByText('High temperature')).toBeInTheDocument();
    });
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('Thermostat A')).toBeInTheDocument();
    // createdTime renders in the local zone (dayjs), matching the wire ts
    const createdTs = Date.UTC(2026, 0, 15, 8, 30, 0);
    expect(
      screen.getByText(dayjs(createdTs).format('YYYY-MM-DD HH:mm:ss')),
    ).toBeInTheDocument();
    // empty assignee renders the localized unassigned label
    expect(screen.getByText('未分配')).toBeInTheDocument();
  });

  it('shows the localized empty state when the window has no alarms', async () => {
    renderTable(anchorAlarmsTableWidget());
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    stubSubscriptions[0].emit([]);
    await waitFor(() => {
      expect(screen.getByText('所选时间窗口内暂无告警')).toBeInTheDocument();
    });
  });
});
