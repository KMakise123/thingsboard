/**
 * system.time_series_chart against the REAL anchor config shape
 * (thermostats.json "Temperature" widget: stateEntity datasource, AVG agg,
 * latestDataKeys threshold, legend stats). The WS manager is stubbed at the
 * documented seam (setDefaultWsManager) and echarts is stubbed (canvas is
 * unavailable under happy-dom).
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
import { AggregationType, EntityType } from '@/types/tb';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import TimeSeriesChart from './timeseries-chart';

const echartsMock = vi.hoisted(() => {
  const chart = {
    setOption: vi.fn(),
    clear: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    isDisposed: vi.fn(() => false),
    getDom: vi.fn((): unknown => null),
  };
  const init = vi.fn((node: unknown) => {
    // real echarts binds the container; the lifecycle guard asserts on it
    chart.getDom.mockReturnValue(node);
    return chart;
  });
  return { chart, init, registerTheme: vi.fn() };
});
vi.mock('echarts', () => echartsMock);

// --- WS manager stub -------------------------------------------------------

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
  // setDefaultWsManager(null) closes the active manager during teardown
}

// --- anchor fixture (thermostats.json widget eda8a397, trimmed to fields the
// component reads) -----------------------------------------------------------

function anchorTemperatureWidget(): Widget {
  return {
    typeFullFqn: 'system.time_series_chart',
    sizeX: 8,
    sizeY: 5,
    row: 0,
    col: 0,
    config: {
      title: 'Temperature',
      showTitle: true,
      useDashboardTimewindow: false,
      datasources: [
        {
          type: 'entity',
          name: '',
          entityAliasId: 'thermostat-alias',
          dataKeys: [
            {
              name: 'temperature',
              type: 'timeseries',
              label: 'Temperature',
              color: '#EF5350',
              units: '°C',
              decimals: 1,
              settings: {
                yAxisId: 'default',
                showInLegend: true,
                type: 'line',
                lineSettings: {
                  showLine: true,
                  smooth: true,
                  lineWidth: 2.5,
                  showPoints: false,
                  fillAreaSettings: { type: 'gradient', opacity: 0.4 },
                },
              },
            },
          ],
          latestDataKeys: [
            {
              name: 'temperatureAlarmThreshold',
              type: 'attribute',
              label: 'temperatureAlarmThreshold',
              color: '#4caf50',
              settings: { __thresholdKey: true },
            },
          ],
        },
      ],
      settings: {
        showLegend: true,
        legendConfig: {
          direction: 'column',
          position: 'bottom',
          showMin: true,
          showMax: true,
          showAvg: true,
          showTotal: false,
          showLatest: false,
        },
        thresholds: [
          {
            type: 'latestKey',
            yAxisId: 'default',
            units: '°C',
            decimals: 0,
            lineColor: 'rgb(233, 30, 99)',
            lineType: 'solid',
            lineWidth: 2,
            showLabel: true,
            latestKey: 'temperatureAlarmThreshold',
            latestKeyType: 'attribute',
          },
        ],
        dataZoom: true,
        stack: false,
      },
    },
  };
}

const layout: WidgetLayout = { sizeX: 8, sizeY: 5, row: 0, col: 0 };

const widgetTimewindow: Timewindow = {
  selectedTab: 'REALTIME',
  realtime: { realtimeType: 0, timewindowMs: 3_600_000 },
  aggregation: { type: AggregationType.AVG, limit: 25_000 },
};

const statesStub: StatesController = {
  mode: 'entity',
  stateObject: [{ id: 'chart', params: {} }],
  currentStateId: 'chart',
  currentStateParams: {
    entityName: 'Thermostat A',
  } as DashboardStateParams,
  breadcrumbs: [],
  openState: vi.fn(),
  navigatePrev: vi.fn(),
  resetState: vi.fn(),
};

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

function renderChart(widget: Widget) {
  return render(
    <RawIntlProvider value={intl}>
      <TimeSeriesChart
        fqn="system.time_series_chart"
        widgetId="w-temperature"
        widget={widget}
        layout={layout}
        ctx={{
          effectiveTimewindow: widgetTimewindow,
          aliases: {},
          datasources: [
            {
              type: 'entity',
              entities: [
                {
                  entityType: EntityType.DEVICE,
                  id: 'therm-1',
                  name: 'Thermostat A',
                },
              ],
              dataKeys: widget.config.datasources?.[0]?.dataKeys ?? [],
              latestDataKeys:
                widget.config.datasources?.[0]?.latestDataKeys ?? [],
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
  echartsMock.chart.setOption.mockClear();
});

afterEach(() => {
  cleanup();
  setDefaultWsManager(null);
});

describe('time_series_chart (anchor: thermostats Temperature)', () => {
  it('renders the real component (no placeholder) with the anchor title', () => {
    renderChart(anchorTemperatureWidget());
    expect(document.querySelector('[data-widget-placeholder]')).toBeNull();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(
      document.querySelector('[data-widget="system.time_series_chart"]'),
    ).not.toBeNull();
  });

  it('subscribes once with an entityList filter, the ts key and AVG buckets', async () => {
    renderChart(anchorTemperatureWidget());
    await waitFor(() => {
      expect(stubSubscriptions).toHaveLength(1);
    });
    const params = stubSubscriptions[0].params;
    expect(params.query?.entityFilter).toEqual({
      type: 'entityList',
      entityType: 'DEVICE',
      entityList: ['therm-1'],
    });
    expect(params.tsCmd).toMatchObject({
      keys: ['temperature'],
      agg: 'AVG',
      intervalType: 'MILLISECONDS',
      timeWindow: 3_600_000,
    });
    expect(params.latestCmd).toEqual({
      keys: [{ type: 'ATTRIBUTE', key: 'temperatureAlarmThreshold' }],
    });
  });

  it('paints the anchor series and the latestKey threshold markLine', async () => {
    const widget = anchorTemperatureWidget();
    renderChart(widget);
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    // realistic timestamps: the chart clips points to the resolved window
    // (realtime "last hour"), so epoch-1000 points would be dropped
    const base = Date.now() - 60_000;
    stubSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'therm-1' },
        timeseries: {
          temperature: [
            { ts: base, value: '21.5' },
            { ts: base + 1000, value: '22.5' },
          ],
        },
        latest: {
          ATTRIBUTE: {
            temperatureAlarmThreshold: { ts: base + 1000, value: '25' },
          },
        },
      },
    ]);

    await waitFor(() => {
      expect(echartsMock.chart.setOption).toHaveBeenCalled();
    });
    const option = echartsMock.chart.setOption.mock.calls.at(-1)?.[0] as {
      series: Array<{
        name: string;
        type: string;
        smooth?: boolean;
        areaStyle?: { opacity?: number };
        markLine?: {
          data?: Array<{ yAxis?: number }>;
        };
        tooltip?: { valueFormatter?: (value: number) => string };
      }>;
      legend?: { formatter?: (name: string) => string };
      dataZoom?: Array<{ type: string }>;
    };
    expect(option.series).toHaveLength(1);
    expect(option.series[0]).toMatchObject({
      name: 'Temperature',
      type: 'line',
      smooth: true,
    });
    expect(option.series[0].areaStyle).toEqual({ opacity: 0.4 });
    expect(option.series[0].markLine?.data?.[0]?.yAxis).toBe(25);
    expect(option.dataZoom?.map((z) => z.type)).toEqual(['inside', 'slider']);
    // legend stats (min/max/avg) computed from visible points (zh-CN labels)
    expect(option.legend?.formatter?.('Temperature')).toContain('最小 21.5');
    expect(option.legend?.formatter?.('Temperature')).toContain('最大 22.5');
    expect(option.legend?.formatter?.('Temperature')).toContain('平均 22');
    expect(option.series[0].tooltip?.valueFormatter?.(22.46)).toBe('22.5 °C');
  });

  it('renders the no-data empty state when the window has no numeric points', async () => {
    renderChart(anchorTemperatureWidget());
    stubSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'therm-1' },
        timeseries: { temperature: [{ ts: 1000, value: 'oops' }] },
      },
    ]);
    await waitFor(() => {
      expect(screen.getByText('该窗口内暂无数值数据')).toBeInTheDocument();
    });
  });
});
