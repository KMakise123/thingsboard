/**
 * WidgetContainer + registry + placeholder states. The builtin registry
 * entry renders through the lazy pending placeholder with the full contract
 * props; unknown fqns go through the /api/widgetType probe and land in one
 * of the three ADR 0003 placeholder states.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { lazy } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { DashboardStateParams } from '@/core/dashboard/states';
import zhDashboards from '@/locales/zh-CN/dashboards';
import { EntityType } from '@/types/tb/entity';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import type { WidgetComponent } from './contract';
import { PendingWidgetPlaceholder } from './placeholders';
import { WIDGET_REGISTRY } from './registry';
import { WidgetContainer } from './WidgetContainer';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

/**
 * W2 fills the builtin registry with real widgets, so the container tests
 * pin their own PENDING entry instead of depending on W2's rollout progress.
 */
const TEST_PENDING_FQN = 'system.test.pending_widget';

const getWidgetTypeByFqn = vi.hoisted(() => vi.fn());
vi.mock('@/services/tb/widget-type', () => ({
  getWidgetTypeByFullFqn: (...args: unknown[]) => getWidgetTypeByFqn(...args),
}));

/** Capture the contract props the builtin entry receives. */
const pendingProps = vi.hoisted(() => ({ current: [] as unknown[] }));
vi.mock('./placeholders', async () => {
  const React = await import('react');
  const actual =
    await vi.importActual<typeof import('./placeholders')>('./placeholders');
  return {
    ...actual,
    PendingWidgetPlaceholder: (props: { fqn: string }) => {
      pendingProps.current.push(props);
      return React.createElement(
        'div',
        { 'data-testid': 'pending-placeholder' },
        props.fqn,
      );
    },
  };
});

function makeWidget(fqn: string): Widget {
  return {
    typeFullFqn: fqn,
    config: {
      datasources: [
        {
          type: 'entity',
          entityAliasId: 'alias-1',
          dataKeys: [{ name: 'temperature', type: 'timeseries' }],
        },
      ],
    },
  };
}

const layout: WidgetLayout = { sizeX: 8, sizeY: 6, row: 0, col: 0 };

const dashboardTimewindow: Timewindow = {
  selectedTab: 'REALTIME',
  realtime: { timewindowMs: 3_600_000 },
};

const statesStub: StatesController = {
  mode: 'entity',
  stateObject: [{ id: 'default', params: {} }],
  currentStateId: 'default',
  currentStateParams: {} as DashboardStateParams,
  breadcrumbs: [{ index: 0, id: 'default', name: 'Devices' }],
  openState: vi.fn(),
  navigatePrev: vi.fn(),
  resetState: vi.fn(),
};

function renderContainer(widget: Widget) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <WidgetContainer
          widgetId="w1"
          widget={widget}
          layout={layout}
          dashboardTimewindow={dashboardTimewindow}
          aliases={{
            'alias-1': [
              { entityType: EntityType.DEVICE, id: 'dev-1', name: 'Dev 1' },
            ],
          }}
          states={statesStub}
          isMobile={false}
        />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  WIDGET_REGISTRY[TEST_PENDING_FQN] = {
    component: lazy(async () => ({
      default: PendingWidgetPlaceholder as WidgetComponent,
    })),
    meta: { label: 'test pending' },
  };
});

afterEach(() => {
  delete WIDGET_REGISTRY[TEST_PENDING_FQN];
});

describe('WidgetContainer', () => {
  it('renders a builtin registry entry via the pending placeholder', async () => {
    renderContainer(makeWidget(TEST_PENDING_FQN));
    await waitFor(() => {
      expect(screen.getByTestId('pending-placeholder')).toBeInTheDocument();
    });
    expect(screen.getByText(TEST_PENDING_FQN)).toBeInTheDocument();
    // the probe must not fire for builtin entries
    expect(getWidgetTypeByFqn).not.toHaveBeenCalled();
  });

  it('maps a probe miss (404) to the missing placeholder', async () => {
    getWidgetTypeByFqn.mockRejectedValue(
      Object.assign(new Error('[404] not found'), { status: 404 }),
    );
    renderContainer(makeWidget('system.cards.unknown_card'));
    await waitFor(() => {
      expect(
        document.querySelector('[data-widget-placeholder="missing"]'),
      ).not.toBeNull();
    });
    expect(screen.getByText('组件不存在或已被移除')).toBeInTheDocument();
    expect(getWidgetTypeByFqn).toHaveBeenCalledWith(
      'system.cards.unknown_card',
    );
  });

  it('maps an Angular descriptor (runtime missing) to unsupported-angular', async () => {
    getWidgetTypeByFqn.mockResolvedValue({
      fqn: 'system.gateway_widgets.gateway_status',
      descriptor: { type: 'latest' },
    });
    renderContainer(makeWidget('system.gateway_widgets.gateway_status'));
    await waitFor(() => {
      expect(
        document.querySelector(
          '[data-widget-placeholder="unsupported-angular"]',
        ),
      ).not.toBeNull();
    });
    expect(
      screen.getByText('该组件暂未支持（Angular 版组件），将在后续版本提供'),
    ).toBeInTheDocument();
  });

  it('maps a react-1 descriptor to unsupported-custom', async () => {
    getWidgetTypeByFqn.mockResolvedValue({
      fqn: 'system.custom.foo',
      descriptor: { runtime: 'react-1' },
    });
    renderContainer(makeWidget('system.custom.foo'));
    await waitFor(() => {
      expect(
        document.querySelector(
          '[data-widget-placeholder="unsupported-custom"]',
        ),
      ).not.toBeNull();
    });
  });

  it('expands datasources for the widget context (alias resolved)', async () => {
    pendingProps.current = [];
    renderContainer(makeWidget(TEST_PENDING_FQN));
    await waitFor(() => {
      expect(pendingProps.current.length).toBeGreaterThan(0);
    });
    const props = pendingProps.current.at(-1) as {
      fqn: string;
      widgetId: string;
      ctx: {
        effectiveTimewindow: Timewindow;
        datasources: Array<{
          type: string;
          entities: Array<{ id: string }>;
          dataKeys: Array<{ name: string }>;
        }>;
        isMobile: boolean;
      };
    };
    expect(props.fqn).toBe(TEST_PENDING_FQN);
    expect(props.widgetId).toBe('w1');
    expect(props.ctx.effectiveTimewindow).toBe(dashboardTimewindow);
    expect(props.ctx.datasources).toHaveLength(1);
    expect(props.ctx.datasources[0].type).toBe('entity');
    expect(props.ctx.datasources[0].entities).toEqual([
      { entityType: 'DEVICE', id: 'dev-1', name: 'Dev 1' },
    ]);
    expect(props.ctx.datasources[0].dataKeys[0].name).toBe('temperature');
    expect(props.ctx.isMobile).toBe(false);
  });

  it('honors the widget-private timewindow override', async () => {
    pendingProps.current = [];
    const widget = makeWidget(TEST_PENDING_FQN);
    widget.config.useDashboardTimewindow = false;
    const privateTw: Timewindow = {
      selectedTab: 'HISTORY',
      history: {
        historyType: 1,
        fixedTimewindow: { startTimeMs: 1, endTimeMs: 2 },
      },
    };
    widget.config.timewindow = privateTw;
    renderContainer(widget);
    await waitFor(() => {
      expect(pendingProps.current.length).toBeGreaterThan(0);
    });
    const props = pendingProps.current.at(-1) as unknown as {
      ctx: { effectiveTimewindow: Timewindow };
    };
    expect(props.ctx.effectiveTimewindow).toBe(privateTw);
  });
});
