/**
 * system.cards.timeseries_table against the REAL anchor config shape
 * (firmware.json "Firmware history": state-entity datasource, two
 * timeseries keys, showTimestamp + pagination + search settings; widget
 * PRIVATE timewindow). The WS manager rides the setDefaultWsManager seam.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { DashboardStateParams } from '@/core/dashboard/states';
import type {
  EntityTimeseriesParams,
  EntityTimeseriesRow,
  WsManager,
  WsStatus,
  WsSubscription,
} from '@/core/ws';
import { setDefaultWsManager } from '@/core/ws';
import zhDashboards from '@/locales/zh-CN/dashboards';
import { EntityType } from '@/types/tb/entity';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import TimeseriesTable from './timeseries-table';

interface StubSubscription extends WsSubscription<Array<EntityTimeseriesRow>> {
  emit: (rows: Array<EntityTimeseriesRow>) => void;
  params: EntityTimeseriesParams;
}

let stubSubscriptions: StubSubscription[];
let stubManager: WsManager;

function makeStubManager() {
  stubSubscriptions = [];
  stubManager = {
    subscribeEntityTimeseries: (params: EntityTimeseriesParams) => {
      const listeners = new Set<() => void>();
      let snapshot: Array<EntityTimeseriesRow> = [];
      const subscription: StubSubscription = {
        params,
        getSnapshot: () => snapshot,
        getStatus: () => 'open' as WsStatus,
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        unsubscribe: vi.fn(),
        emit(rows: Array<EntityTimeseriesRow>) {
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

// --- anchor fixture (firmware.json widget 100b756c "Firmware history") ------

const TS_BASE = Date.now() - 30_000;

function anchorTimeseriesTableWidget(): Widget {
  return {
    typeFullFqn: 'system.cards.timeseries_table',
    sizeX: 8,
    sizeY: 6.5,
    row: 0,
    col: 0,
    config: {
      title: 'Firmware history',
      showTitle: true,
      useDashboardTimewindow: false,
      timewindow: {
        selectedTab: 'REALTIME',
        realtime: { realtimeType: 0, timewindowMs: 60_000 },
      },
      datasources: [
        {
          type: 'entity',
          entityAliasId: 'state-entity',
          dataKeys: [
            {
              name: 'current_fw_title',
              type: 'timeseries',
              label: 'Current firmware title',
              color: '#2196f3',
              settings: {},
            },
            {
              name: 'current_fw_version',
              type: 'timeseries',
              label: 'Current firmware version',
              color: '#4caf50',
              settings: {},
            },
          ],
        },
      ],
      settings: {
        showTimestamp: true,
        displayPagination: true,
        defaultPageSize: 10,
        enableSearch: true,
      },
    },
  };
}

const layout: WidgetLayout = { sizeX: 8, sizeY: 6.5, row: 0, col: 0 };

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

function renderTable(widget: Widget, multi = false) {
  const entities = [
    {
      entityType: EntityType.DEVICE,
      id: 'dev-1',
      name: 'Thermometer 1',
    },
    ...(multi
      ? [
          {
            entityType: EntityType.DEVICE,
            id: 'dev-2',
            name: 'Thermometer 2',
          },
        ]
      : []),
  ];
  return render(
    <RawIntlProvider value={intl}>
      <TimeseriesTable
        fqn="system.cards.timeseries_table"
        widgetId="w-ts-table"
        widget={widget}
        layout={layout}
        ctx={{
          effectiveTimewindow: widget.config.timewindow as Timewindow,
          aliases: {},
          datasources: [
            {
              type: 'entity',
              entities,
              dataKeys: widget.config.datasources?.[0]?.dataKeys ?? [],
            },
          ],
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

describe('timeseries_table (anchor: firmware Firmware history)', () => {
  it('renders the real component (no placeholder) with the anchor title', () => {
    renderTable(anchorTimeseriesTableWidget());
    expect(document.querySelector('[data-widget-placeholder]')).toBeNull();
    expect(screen.getByText('Firmware history')).toBeInTheDocument();
    expect(screen.getByText('时间')).toBeInTheDocument();
    expect(screen.getByText('Current firmware version')).toBeInTheDocument();
  });

  it('subscribes with the widget-private timewindow tsCmd and both keys', async () => {
    renderTable(anchorTimeseriesTableWidget());
    await waitFor(() => {
      expect(stubSubscriptions).toHaveLength(1);
    });
    const params = stubSubscriptions[0].params;
    expect(params.tsCmd).toMatchObject({
      keys: ['current_fw_title', 'current_fw_version'],
      timeWindow: 60_000,
      agg: 'NONE',
    });
    expect(params.historyCmd).toBeUndefined();
  });

  it('renders one row per timestamp with ts + key columns, newest first', async () => {
    renderTable(anchorTimeseriesTableWidget());
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    stubSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
        timeseries: {
          current_fw_title: [
            { ts: TS_BASE, value: 'thermo-fw' },
            { ts: TS_BASE + 1000, value: 'thermo-fw' },
          ],
          current_fw_version: [
            { ts: TS_BASE, value: '1.0' },
            { ts: TS_BASE + 1000, value: '1.1' },
          ],
        },
      },
    ]);
    await waitFor(() => {
      expect(screen.getAllByText('thermo-fw')).toHaveLength(2);
    });
    const rows = document.querySelectorAll('.ant-table-tbody .ant-table-row');
    expect(rows).toHaveLength(2);
    // newest first
    expect(rows[0]?.textContent).toContain('1.1');
    expect(rows[1]?.textContent).toContain('1.0');
    // timestamp column renders the formatted wire ts
    expect(rows[0]?.textContent).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  });

  it('adds the entity column when several entities feed the table', async () => {
    renderTable(anchorTimeseriesTableWidget(), true);
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    stubSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
        timeseries: { current_fw_version: [{ ts: TS_BASE, value: '1.0' }] },
      },
      {
        entityId: { entityType: EntityType.DEVICE, id: 'dev-2' },
        timeseries: { current_fw_version: [{ ts: TS_BASE, value: '2.0' }] },
      },
    ]);
    await waitFor(() => {
      expect(screen.getByText('Thermometer 2')).toBeInTheDocument();
    });
    expect(screen.getByText('实体')).toBeInTheDocument();
  });
});
