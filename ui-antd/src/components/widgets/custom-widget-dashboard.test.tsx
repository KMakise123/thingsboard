/**
 * Integration: a dashboard JSON fixture referencing a CUSTOM widget fqn →
 * registry resolver → compile → CustomWidgetHost → rendered component with
 * live data (ADR 0004 §4 closed loop; the P2 落地场景). The fixture models a
 * fork-exported dashboard whose widget type is a react-1 descriptor with
 * TSX + scoped CSS.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { DashboardStateParams } from '@/core/dashboard/states';
import { releaseAllWidgetStyles } from '@/core/widget/style-scope';
import type {
  EntityTimeseriesParams,
  EntityTimeseriesRow,
  WsManager,
  WsStatus,
  WsSubscription,
} from '@/core/ws';
import { setDefaultWsManager } from '@/core/ws';
import zhDashboards from '@/locales/zh-CN/dashboards';
import zhWidgetKit from '@/locales/zh-CN/widget-kit';
import { EntityType } from '@/types/tb/entity';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget } from '@/types/tb/widget';
import type { WidgetType } from '@/types/tb/widget-type';
import dashboardFixture from './__fixtures__/custom-widget-dashboard.json';
import { WidgetContainer } from './WidgetContainer';

// the fixture's custom widget source (what the editor would have saved into
// descriptor.source.tsx) — reads data + ctx through the frozen contract
const WIDGET_SOURCE = [
  "import { antd } from 'widget-kit';",
  '',
  'export default function TempGauge(props: CustomWidgetProps) {',
  '  const series = props.data.temperature ?? [];',
  '  const last = series[series.length - 1];',
  '  const theme = String(props.settings.theme ?? "light");',
  '  const value = last ? String(last[1]) : "no-data";',
  '  return (',
  '    <div className="gauge-body" data-testid="temp-gauge">',
  '      <antd.Typography.Text strong>{props.config.title}</antd.Typography.Text>',
  '      <span data-testid="temp-gauge-value">{value}</span>',
  '      <span data-testid="temp-gauge-theme">{theme}</span>',
  '      <span data-testid="temp-gauge-locale">{props.ctx.locale}</span>',
  '    </div>',
  '  );',
  '}',
].join('\n');

const WIDGET_TYPE: WidgetType = {
  id: { entityType: EntityType.WIDGET_TYPE, id: 'wt-temp-gauge' },
  fqn: 'temp_gauge',
  name: 'Temperature gauge',
  version: 7,
  descriptor: {
    type: 'timeseries',
    sizeX: 4,
    sizeY: 3,
    runtime: 'react-1',
    schemaVersion: 1,
    settingsForm: [
      { id: 'theme', name: 'Theme', type: 'select', default: 'dark' },
    ],
    source: {
      tsx: WIDGET_SOURCE,
      css: '.gauge-body { color: red; }',
    },
  },
};

const getWidgetTypeByFullFqn = vi.hoisted(() => vi.fn());
vi.mock('@/services/tb/widget-type', () => ({
  getWidgetTypeByFullFqn: (...args: unknown[]) =>
    getWidgetTypeByFullFqn(...args),
}));

// --- WS stub: the widget has ONE timeseries key on one alias group ---------

interface StubSubscription extends WsSubscription<Array<EntityTimeseriesRow>> {
  params: EntityTimeseriesParams;
  emit: (rows: Array<EntityTimeseriesRow>) => void;
}

let tsSubscriptions: StubSubscription[];

function makeStubManager(): WsManager {
  tsSubscriptions = [];
  return {
    subscribeEntityTimeseries: (params: EntityTimeseriesParams) => {
      const listeners = new Set<() => void>();
      let snapshot: Array<EntityTimeseriesRow> = [];
      const subscription = {
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
      tsSubscriptions.push(subscription);
      return subscription;
    },
    close: vi.fn(),
  } as unknown as WsManager;
}

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhDashboards, ...zhWidgetKit },
});

/** Fixture pieces: the dashboard JSON references the custom fqn on widget w1. */
const fixtureWidgets = dashboardFixture.configuration.widgets as Record<
  string,
  Widget
>;
// what the alias resolver would produce for the fixture's entityAliases map
// (AliasResolution: aliasId → resolved entities)
const fixtureAliases = {
  'alias-1': [{ entityType: EntityType.DEVICE, id: 'dev-1', name: 'Dev 1' }],
};

const dashboardTimewindow: Timewindow = {
  selectedTab: 'REALTIME',
  realtime: { timewindowMs: 3_600_000 },
};

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

function renderFixtureWidget(widget: Widget) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <AntdApp>
          <WidgetContainer
            widgetId="w1"
            widget={widget}
            layout={
              dashboardFixture.configuration.states.default.layouts.main.widgets
                .w1
            }
            dashboardTimewindow={dashboardTimewindow}
            aliases={fixtureAliases}
            states={statesStub}
            isMobile={false}
          />
        </AntdApp>
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

beforeEach(() => {
  setDefaultWsManager(makeStubManager());
  getWidgetTypeByFullFqn.mockResolvedValue(WIDGET_TYPE);
});

afterEach(() => {
  cleanup();
  setDefaultWsManager(null);
  releaseAllWidgetStyles();
  getWidgetTypeByFullFqn.mockReset();
});

describe('dashboard fixture referencing a custom widget fqn', () => {
  it('resolves → compiles → renders the compiled component', async () => {
    renderFixtureWidget(fixtureWidgets.w1);

    // the resolver fetched the type by FULL fqn from the fixture
    await waitFor(() => {
      expect(getWidgetTypeByFullFqn).toHaveBeenCalledWith('tenant.temp_gauge');
    });
    // the compiled widget is really on screen
    await waitFor(() => {
      expect(screen.getByTestId('temp-gauge')).toBeInTheDocument();
    });
    // config flows through the frozen contract
    expect(screen.getByText('Temperature gauge')).toBeInTheDocument();
    // settings parsed from the instance config
    expect(screen.getByTestId('temp-gauge-theme')).toHaveTextContent('dark');
    // ctx locale is the active app locale
    expect(screen.getByTestId('temp-gauge-locale')).toHaveTextContent('zh-CN');
    // antd rendered INSIDE the compiled module (P2 落地场景)
    expect(document.querySelector('.ant-typography')).not.toBeNull();
  });

  it('streams subscription data into the compiled widget', async () => {
    renderFixtureWidget(fixtureWidgets.w1);
    await waitFor(() => {
      expect(tsSubscriptions.length).toBeGreaterThan(0);
    });
    expect(tsSubscriptions).toHaveLength(1); // budget: ONE cmd for the widget
    tsSubscriptions[0].emit([
      {
        entityId: 'dev-1',
        timeseries: { temperature: [{ ts: 1_700_000_000_000, value: '21.5' }] },
      },
    ]);
    await waitFor(() => {
      expect(screen.getByTestId('temp-gauge-value')).toHaveTextContent('21.5');
    });
    // the alias-resolved datasource became one subscription for the group
    expect(
      (
        tsSubscriptions[0].params as unknown as {
          query: { entityFilter: { entityList: string[] } };
        }
      ).query.entityFilter.entityList,
    ).toEqual(['dev-1']);
  });

  it('mounts the type css under the fqn scope class', async () => {
    renderFixtureWidget(fixtureWidgets.w1);
    await waitFor(() => {
      expect(screen.getByTestId('temp-gauge')).toBeInTheDocument();
    });
    const typeNode = document.querySelector(
      'style[data-widget-style-scope="type"]',
    );
    expect(typeNode?.textContent).toContain(
      '.tbw-type-tenant-temp-gauge .gauge-body',
    );
    // the widget root carries the scope class the css targets
    expect(
      document.querySelector('.tbw-type-tenant-temp-gauge'),
    ).not.toBeNull();
  });
});
