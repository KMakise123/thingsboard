/**
 * D1 regression (V-wave acceptance §3.1 gap row): the editor ROUTE must
 * survive the「Software」demo shape — 6 states + entity state controller +
 * an entityCount html_value_card on the root state.
 *
 * The crash was NOT route assembly itself: EditorCanvas mounts its widgets
 * with `aliases = {}` (alias resolution lands asynchronously), and the
 * shared useWidgetValues hook built an entityCount subscription over ZERO
 * resolved entities (`countSubs[0]` → undefined → `.subscribe` TypeError at
 * mount). One throwing widget cell took the whole route into the app error
 * boundary — and with it the user's unsaved draft. This test pins the
 * route-level assembly through the REAL shell/canvas/widgets chain: no
 * cell may throw, and the value channel must wire up once aliases resolve.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Component } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import type { WsManager, WsStatus, WsSubscription } from '@/core/ws';
import { setDefaultWsManager } from '@/core/ws';
import zhDashboards from '@/locales/zh-CN/dashboards';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import type { Dashboard } from '@/types/tb/dashboard';

const historyMock = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
const paramsMock = vi.hoisted(() => ({ dashboardId: 'd1' }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => paramsMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const useDashboardMock = vi.hoisted(() => vi.fn());
vi.mock('@/components/dashboard/use-dashboard', () => ({
  useDashboard: useDashboardMock,
}));

// vite-node cannot resolve antd's extensionless internal locale imports
// pulled through pro-components (same workaround as index.test.tsx)
vi.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: { children?: ReactNode }) => (
    <div>{props.children}</div>
  ),
}));

const widgetTypeProbeMock = vi.hoisted(() => vi.fn());

const dashboardServiceMock = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  saveDashboard: vi.fn(),
  exportDashboard: vi.fn(),
  getTenantDashboards: vi.fn(),
  findAllEntitiesByFilter: vi.fn(),
  findEntitiesByFilter: vi.fn(),
}));
vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);
vi.mock('@/services/tb/widget-type', () => ({
  getWidgetTypeByFullFqn: widgetTypeProbeMock,
}));

import DashboardsEditorPage from './index';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhDashboards, ...zhEditorCommon, ...zhEditorDashboard },
});

// --- the「Software」demo shape (6 states, entity controller, entityCount
//     html_value_card on the root state), trimmed to the crashing seam ----

const SOFTWARE_STATES = [
  'default',
  'device_software_history',
  'device_waiting',
  'device_updating',
  'device_updated',
  'device_error',
] as const;

function softwareShapeDashboard(): Dashboard {
  const states = Object.fromEntries(
    SOFTWARE_STATES.map((id) => [
      id,
      {
        name:
          id === 'device_software_history'
            ? // biome-ignore lint/suspicious/noTemplateCurlyInString: TB data literal (state-name template), not a JS template string
              'Software history: ${entityName}'
            : id,
        root: id === 'default',
        layouts: {
          main: {
            widgets: { w1: { sizeX: 8, sizeY: 3, row: 0, col: 0 } },
          },
        },
      },
    ]),
  );
  const raw = {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Software',
    configuration: {
      states,
      settings: { stateControllerId: 'entity', showTitle: false },
      widgets: {
        w1: {
          typeFullFqn: 'system.cards.html_value_card',
          sizeX: 8,
          sizeY: 3,
          row: 0,
          col: 0,
          config: {
            title: 'Device Waiting',
            datasources: [
              {
                type: 'entityCount',
                entityAliasId: 'all-devices',
                dataKeys: [
                  { name: 'count', type: 'count', label: 'waitingNumber' },
                ],
              },
            ],
            // biome-ignore lint/suspicious/noTemplateCurlyInString: TB data literal (card HTML template), not a JS template string
            settings: { cardHtml: '<div>${waitingNumber}</div>' },
          },
        },
      },
      entityAliases: {
        'all-devices': {
          id: 'all-devices',
          alias: 'All devices',
          filter: {
            type: 'entityType',
            resolveMultiple: true,
            entityType: 'DEVICE',
          },
        },
      },
    },
  } as unknown as Dashboard;
  // the route consumes useDashboard's output — normalization included
  return validateAndUpdateDashboard(raw);
}

// --- WS stub (the seam html-value-card rides; records entityCount queries) --

let stubCountQueries: Array<Record<string, unknown>>;

function makeStubManager(): WsManager {
  stubCountQueries = [];
  return {
    subscribeEntityCount: (params: { query: Record<string, unknown> }) => {
      stubCountQueries.push(params.query);
      const subscription: WsSubscription<number> = {
        getSnapshot: () => 0,
        getStatus: (): WsStatus => 'open',
        subscribe: () => () => undefined,
        unsubscribe: vi.fn(),
      };
      return subscription;
    },
    subscribeLatestTelemetry: () => {
      const subscription = {
        getSnapshot: () => [] as Array<{ key: string; value: unknown }>,
        getStatus: (): WsStatus => 'open',
        subscribe: () => () => undefined,
        unsubscribe: vi.fn(),
      };
      return subscription as unknown as WsSubscription<
        Array<{ key: string; value: unknown }>
      >;
    },
    close: vi.fn(),
  } as unknown as WsManager;
}

// --- test error boundary: turns a route crash into a deterministic marker --

class CrashProbe extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) {
      return <div data-testid="route-crashed" />;
    }
    return this.props.children;
  }
}

function renderPage(dashboard: Dashboard) {
  useDashboardMock.mockReturnValue({
    query: { isPending: false, isError: false },
    dashboard,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <CrashProbe>
          <DashboardsEditorPage />
        </CrashProbe>
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

describe('DashboardsEditorPage — entity-controller dashboard (D1)', () => {
  beforeEach(() => {
    setDefaultWsManager(makeStubManager());
    dashboardServiceMock.findAllEntitiesByFilter.mockResolvedValue([
      {
        entityId: { entityType: 'DEVICE', id: 'dev-1' },
        latest: {
          ENTITY_FIELD: {
            name: { value: 'Dev 1' },
            label: { value: 'Dev 1' },
          },
        },
      },
    ]);
    dashboardServiceMock.findEntitiesByFilter.mockResolvedValue({ data: [] });
    widgetTypeProbeMock.mockResolvedValue(undefined);
  });

  it('opens the editor route without crashing and wires the value channel', async () => {
    renderPage(softwareShapeDashboard());

    // the shell mounts and STAYS mounted (no error boundary takeover)
    await waitFor(() => {
      expect(screen.getByTestId('editor-shell')).toBeInTheDocument();
    });
    // the html_value_card cell renders through the real canvas chain
    await waitFor(
      () => {
        expect(
          document.querySelector(
            '[data-widget="system.cards.html_value_card"]',
          ),
        ).not.toBeNull();
      },
      { timeout: 4000 },
    );
    // aliases resolved afterwards → the entityCount channel re-subscribes
    // with the resolved device list (first pass rides the empty set)
    await waitFor(() => {
      expect(stubCountQueries.length).toBeGreaterThan(0);
    });
    expect(stubCountQueries[0]).toMatchObject({
      entityFilter: { type: 'entityList', entityList: ['dev-1'] },
    });
    expect(screen.queryByTestId('route-crashed')).toBeNull();
    expect(screen.getByTestId('editor-shell')).toBeInTheDocument();
  });
});
