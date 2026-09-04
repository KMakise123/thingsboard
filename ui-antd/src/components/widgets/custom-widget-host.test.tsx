/**
 * CustomWidgetHost adapter contract: WidgetComponentProps → CustomWidgetProps
 * mapping (config/settings/datasources/data/latestData/timewindow/actions/
 * ctx), the one-cmd latest-rides-the-ts-channel budget behavior, the
 * type/instance style mounting, and the runtime error-boundary degradation.
 * The full render closed loop (resolver → compile → mount) lives in
 * custom-widget-dashboard.test.tsx.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { AliasResolution } from '@/core/dashboard/alias-resolver';
import type { DashboardStateParams } from '@/core/dashboard/states';
import { compileWidget } from '@/core/widget/compile';
import { releaseAllWidgetStyles } from '@/core/widget/style-scope';
import type { CustomWidgetProps } from '@/core/widget/types';
import type {
  EntityDataParams,
  EntityDataWire,
  EntityTimeseriesParams,
  EntityTimeseriesRow,
  WsManager,
  WsStatus,
  WsSubscription,
} from '@/core/ws';
import { setDefaultWsManager } from '@/core/ws';
import zhWidgetKit from '@/locales/zh-CN/widget-kit';
import { EntityType } from '@/types/tb/entity';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import type { WidgetComponentProps } from './contract';
import {
  CustomWidgetEditContext,
  createCustomWidgetHost,
} from './custom-widget-host';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhWidgetKit } });

// --- WS manager stub (timeseries-chart.test.tsx pattern) --------------------

interface StubSubscription<T> extends WsSubscription<T> {
  params: unknown;
  emit: (value: T) => void;
}

let tsSubscriptions: Array<StubSubscription<Array<EntityTimeseriesRow>>>;
let dataSubscriptions: Array<StubSubscription<Array<EntityDataWire>>>;

function makeStubManager(): WsManager {
  tsSubscriptions = [];
  dataSubscriptions = [];
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
    subscribeEntityData: (params: EntityDataParams) => {
      const listeners = new Set<() => void>();
      let snapshot: Array<EntityDataWire> = [];
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
        emit(rows: Array<EntityDataWire>) {
          snapshot = rows;
          for (const listener of listeners) {
            listener();
          }
        },
      };
      dataSubscriptions.push(subscription);
      return subscription;
    },
    close: vi.fn(),
  } as unknown as WsManager;
}

// --- props harness -----------------------------------------------------------

const timewindow: Timewindow = {
  selectedTab: 'REALTIME',
  realtime: { timewindowMs: 3_600_000 },
};

const aliases: AliasResolution = {
  'alias-1': [{ entityType: EntityType.DEVICE, id: 'dev-1', name: 'Dev 1' }],
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

function widgetWith(overrides: Partial<Widget['config']>): Widget {
  return {
    typeFullFqn: 'tenant.temp_gauge',
    config: {
      title: 'Temperature gauge',
      datasources: [
        {
          type: 'entity',
          entityAliasId: 'alias-1',
          dataKeys: [
            { name: 'temperature', type: 'timeseries', units: '°C' },
            { name: 'firmware', type: 'attribute' },
          ],
        },
      ],
      settings: { theme: 'dark' },
      actions: { headerButton: { name: 'act' } },
      ...overrides,
    },
  };
}

const layout: WidgetLayout = { sizeX: 4, sizeY: 3, row: 0, col: 0 };

/** Props the last rendered host instance received (captured by the probe). */
const captured = vi.hoisted(() => ({ current: [] as CustomWidgetProps[] }));

function renderHost(
  widget: Widget,
  options?: { componentSource?: string; typeCss?: string },
) {
  // the capture rides through a compiled module writing into a global shim
  // (compiled code cannot import the test module); default probe just
  // records its props and renders nothing
  const probeSource =
    options?.componentSource ??
    [
      'export default function Probe(props: CustomWidgetProps) {',
      '  globalThis.__m9Captured.push(props);',
      '  return null;',
      '}',
    ].join('\n');
  const result = compileWidget(probeSource, { name: 'host-probe' });
  if ('error' in result) {
    throw new Error(`unexpected compile error: ${result.error.message}`);
  }
  const Host = createCustomWidgetHost({
    component: result.component,
    typeCss: options?.typeCss,
  });
  const props: WidgetComponentProps = {
    fqn: 'tenant.temp_gauge',
    widgetId: 'w1',
    widget,
    layout,
    ctx: {
      effectiveTimewindow: timewindow,
      aliases,
      datasources: (widget.config.datasources ?? []).flatMap((datasource) => {
        const entities = aliases[datasource.entityAliasId ?? ''] ?? [];
        return [
          {
            type: datasource.type,
            entities,
            entityName: entities[0]?.name,
            dataKeys: datasource.dataKeys,
          },
        ];
      }),
      states: statesStub,
      isMobile: false,
    },
  };
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <CustomWidgetEditContext.Provider value>
          <Host {...props} />
        </CustomWidgetEditContext.Provider>
      </AntdApp>
    </RawIntlProvider>,
  );
}

beforeEach(() => {
  setDefaultWsManager(makeStubManager());
  captured.current = [];
  (globalThis as { __m9Captured?: unknown[] }).__m9Captured = captured.current;
});

afterEach(() => {
  cleanup();
  setDefaultWsManager(null);
  releaseAllWidgetStyles();
});

function lastProps(): CustomWidgetProps {
  if (captured.current.length === 0) {
    throw new Error('compiled widget never rendered');
  }
  return captured.current[captured.current.length - 1];
}

/** The compiled component mounts through a lazy payload — wait for it. */
async function renderedProps(): Promise<CustomWidgetProps> {
  await waitFor(() => {
    expect(captured.current.length).toBeGreaterThan(0);
  });
  return lastProps();
}

describe('CustomWidgetHost — CustomWidgetProps mapping', () => {
  it('feeds config/settings/actions through and expands datasources with entity ids', async () => {
    renderHost(widgetWith({}));
    const props = await renderedProps();
    expect(props.config.title).toBe('Temperature gauge');
    expect(props.settings).toEqual({ theme: 'dark' });
    expect(props.actions).toEqual({ headerButton: { name: 'act' } });
    expect(props.datasources).toHaveLength(1);
    expect(props.datasources[0].entityId).toEqual({
      entityType: 'DEVICE',
      id: 'dev-1',
    });
    expect(props.datasources[0].name).toBe('Dev 1');
    expect(props.datasources[0].dataKeys[0].name).toBe('temperature');
  });

  it('maps the timeseries channel into data: key → rows of [ts, value]', async () => {
    renderHost(widgetWith({}));
    expect(tsSubscriptions).toHaveLength(1); // one channel for the whole widget
    tsSubscriptions[0].emit([
      {
        entityId: 'dev-1',
        timeseries: { temperature: [{ ts: 111, value: '21.5', count: 2 }] },
      },
    ]);
    await waitFor(() => {
      expect(lastProps().data.temperature).toBeDefined();
    });
    expect(lastProps().data.temperature).toEqual([[111, '21.5', 2]]);
  });

  it('carries latest values on the SAME ts cmd — no extra ENTITY_DATA cmd', () => {
    renderHost(widgetWith({}));
    // the ts cmd requests the latest columns (attribute + timeseries keys)
    expect(dataSubscriptions).toHaveLength(0);
    expect(tsSubscriptions).toHaveLength(1);
    const latestValues = (
      tsSubscriptions[0].params as unknown as {
        query: { latestValues: Array<{ type: string; key: string }> };
      }
    ).query.latestValues;
    expect(latestValues).toEqual([
      { type: 'TIME_SERIES', key: 'temperature' },
      { type: 'ATTRIBUTE', key: 'firmware' },
    ]);
    tsSubscriptions[0].emit([
      {
        entityId: 'dev-1',
        timeseries: {},
        latest: { 'dev-1': { temperature: { ts: 222, value: '21.9' } } },
      },
    ]);
    return waitFor(() => {
      expect(lastProps().latestData.temperature).toEqual([[222, '21.9']]);
    });
  });

  it('uses the ENTITY_DATA channel only for latest-only widgets', async () => {
    renderHost(
      widgetWith({
        datasources: [
          {
            type: 'entity',
            entityAliasId: 'alias-1',
            dataKeys: [{ name: 'firmware', type: 'attribute' }],
          },
        ],
      }),
    );
    expect(tsSubscriptions).toHaveLength(0);
    expect(dataSubscriptions).toHaveLength(1);
    dataSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
        latest: { 'dev-1': { firmware: { ts: 333, value: '1.0.0' } } },
      },
    ]);
    await waitFor(() => {
      expect(lastProps().latestData.firmware).toEqual([[333, '1.0.0']]);
    });
    expect(lastProps().data).toEqual({});
  });

  it('fills ctx: container size, locale, isEdit via context, host toast, private-tw stub', async () => {
    renderHost(widgetWith({ useDashboardTimewindow: false }));
    const ctx = (await renderedProps()).ctx;
    expect(ctx.isEdit).toBe(true); // provided through CustomWidgetEditContext
    expect(ctx.isPreview).toBe(false);
    expect(ctx.locale).toBe('zh-CN');
    expect(typeof ctx.toast).toBe('function');
    expect(typeof ctx.updateTimewindow).toBe('function'); // stub present
    expect(ctx.width).toBe(0); // ResizeObserver has not fired yet
  });

  it('omits updateTimewindow for dashboard-timewindow widgets and keeps the timewindow mapped', async () => {
    renderHost(widgetWith({}));
    const props = await renderedProps();
    expect(props.ctx.updateTimewindow).toBeUndefined();
    expect(props.timewindow).toBe(timewindow);
  });

  it('mounts the type css under the fqn scope and instance css under the widget id', () => {
    renderHost(widgetWith({ widgetCss: '.bar { margin: 1px; }' }), {
      typeCss: '.foo { color: red; }',
    });
    const nodes = [
      ...document.head.querySelectorAll<HTMLStyleElement>(
        'style[data-widget-style-scope]',
      ),
    ];
    expect(nodes).toHaveLength(2);
    const byScope = new Map(
      nodes.map((node) => [node.dataset.widgetStyleScope, node.textContent]),
    );
    expect(byScope.get('type')).toContain('.tbw-type-tenant-temp-gauge .foo');
    expect(byScope.get('instance')).toContain('.tbw-inst-w1 .bar');
    // the widget root carries both scope classes so the css can hit
    expect(
      document.querySelector('.tbw-type-tenant-temp-gauge'),
    ).not.toBeNull();
    expect(document.querySelector('.tbw-inst-w1')).not.toBeNull();
  });

  it('degrades a runtime crash inside the compiled widget to the broken card', async () => {
    renderHost(widgetWith({}), {
      componentSource: [
        'export default function Boom() {',
        "  throw new Error('m9 boom');",
        '}',
      ].join('\n'),
    });
    await waitFor(() => {
      expect(
        document.querySelector('[data-widget-broken="runtime"]'),
      ).not.toBeNull();
    });
    expect(screen.getByText('m9 boom')).toBeInTheDocument();
    expect(screen.getByText('自定义组件运行出错')).toBeInTheDocument();
  });
});
