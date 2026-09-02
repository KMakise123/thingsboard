/**
 * system.analogue_gauges.radial_gauge — the gauge representative (no demo
 * anchor; TB analogue-gauge config shape). Proves the fqn renders the real
 * echarts gauge component instead of the pending placeholder and binds the
 * latest-telemetry value. echarts stubbed (canvas unavailable in happy-dom);
 * the WS manager rides the setDefaultWsManager seam.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { DashboardStateParams } from '@/core/dashboard/states';
import type { WsManager, WsStatus, WsSubscription } from '@/core/ws';
import { setDefaultWsManager } from '@/core/ws';
import zhDashboards from '@/locales/zh-CN/dashboards';
import { EntityType } from '@/types/tb/entity';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import RadialGauge from './radial-gauge';

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
    chart.getDom.mockReturnValue(node);
    return chart;
  });
  return { chart, init, registerTheme: vi.fn() };
});
vi.mock('echarts', () => echartsMock);

interface StubLatestSubscription
  extends WsSubscription<Array<{ key: string; value: unknown }>> {
  emit: (data: Array<{ key: string; value: unknown }>) => void;
}

let stubLatestSubs: StubLatestSubscription[];
let stubManager: WsManager;

function makeStubManager() {
  stubLatestSubs = [];
  stubManager = {
    subscribeLatestTelemetry: () => {
      const listeners = new Set<() => void>();
      let snapshot: Array<{ key: string; value: unknown }> = [];
      const subscription: StubLatestSubscription = {
        getSnapshot: () => snapshot,
        getStatus: () => 'open' as WsStatus,
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        unsubscribe: vi.fn(),
        emit(data: Array<{ key: string; value: unknown }>) {
          snapshot = data;
          for (const listener of listeners) {
            listener();
          }
        },
      };
      stubLatestSubs.push(subscription);
      return subscription;
    },
    close: vi.fn(),
  } as unknown as WsManager;
  setDefaultWsManager(stubManager);
}

// --- TB analogue-gauge config shape ------------------------------------------

function gaugeWidget(): Widget {
  return {
    typeFullFqn: 'system.analogue_gauges.radial_gauge',
    sizeX: 3,
    sizeY: 3,
    row: 0,
    col: 0,
    config: {
      title: 'Temperature gauge',
      showTitle: true,
      datasources: [
        {
          type: 'entity',
          entityAliasId: 'thermostat',
          dataKeys: [
            {
              name: 'temperature',
              type: 'timeseries',
              label: 'Temperature',
              color: '#4caf50',
              units: '°C',
              decimals: 1,
            },
          ],
        },
      ],
      settings: {
        minValue: -20,
        maxValue: 80,
        hideValue: false,
        showMinMax: true,
      },
    },
  };
}

const layout: WidgetLayout = { sizeX: 3, sizeY: 3, row: 0, col: 0 };

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

function renderGauge(widget: Widget) {
  return render(
    <RawIntlProvider value={intl}>
      <RadialGauge
        fqn="system.analogue_gauges.radial_gauge"
        widgetId="w-gauge"
        widget={widget}
        layout={layout}
        ctx={{
          effectiveTimewindow: { selectedTab: 'REALTIME' },
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

describe('radial_gauge (gauge representative)', () => {
  it('renders the real component (no placeholder) with the gauge title', () => {
    renderGauge(gaugeWidget());
    expect(document.querySelector('[data-widget-placeholder]')).toBeNull();
    expect(screen.getByText('Temperature gauge')).toBeInTheDocument();
    expect(
      document.querySelector(
        '[data-widget="system.analogue_gauges.radial_gauge"]',
      ),
    ).not.toBeNull();
  });

  it('subscribes latest telemetry for the bound key', async () => {
    renderGauge(gaugeWidget());
    await waitFor(() => {
      expect(stubLatestSubs).toHaveLength(1);
    });
    expect(stubLatestSubs[0].getSnapshot()).toEqual([]);
  });

  it('paints an echarts gauge with anchor min/max and a formatted detail', async () => {
    renderGauge(gaugeWidget());
    await waitFor(() => {
      expect(stubLatestSubs[0]).toBeTruthy();
    });
    stubLatestSubs[0].emit([{ key: 'temperature', value: '23.45' }]);
    await waitFor(() => {
      expect(echartsMock.chart.setOption).toHaveBeenCalled();
    });
    const option = echartsMock.chart.setOption.mock.calls.at(-1)?.[0] as {
      series: Array<{
        type: string;
        min: number;
        max: number;
        data: Array<{ value: number }>;
        detail?: {
          formatter?: (value: number) => string;
          show?: boolean;
        };
        progress?: { show?: boolean };
      }>;
    };
    expect(option.series[0].type).toBe('gauge');
    expect(option.series[0].min).toBe(-20);
    expect(option.series[0].max).toBe(80);
    expect(option.series[0].data[0].value).toBe(23.45);
    expect(option.series[0].progress?.show).toBe(true);
    expect(option.series[0].detail?.formatter?.(23.45)).toBe('23.4 °C');
  });
});
