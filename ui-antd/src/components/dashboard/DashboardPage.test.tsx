/**
 * W1 runtime smoke: the full data path 状态切换 → 布局 → 容器 on a
 * mini anchor-shaped dashboard (entity controller, like the firmware demo).
 *
 * - root state renders the entities_table cell (pending placeholder);
 * - deep-linking `?state=` into the history state swaps the layout cell and
 *   interpolates the breadcrumb from state params;
 * - alias resolution runs against the entity query transport and re-runs
 *   with the state entity when the stack moves.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { lazy } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import type { WidgetComponent } from '@/components/widgets/contract';
import { PendingWidgetPlaceholder } from '@/components/widgets/placeholders';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { objToBase64 } from '@/core/dashboard/states';
import zhDashboards from '@/locales/zh-CN/dashboards';
import type { Dashboard } from '@/types/tb/dashboard';

/**
 * W2 replaces the builtin registry's pending placeholders with real widget
 * components; this smoke test pins its OWN pending entries so the
 * states/layout/alias assertions never depend on W2's rollout progress.
 */
const TEST_FQN_TABLE = 'system.test.smoke_table';
const TEST_FQN_CHART = 'system.test.smoke_chart';

const findEntitiesByFilter = vi.hoisted(() => vi.fn());
const getTenantDashboards = vi.hoisted(() => vi.fn());
const exportDashboard = vi.hoisted(() => vi.fn());
vi.mock('@/services/tb/dashboard', () => ({
  findEntitiesByFilter: (...args: unknown[]) => findEntitiesByFilter(...args),
  // the resolver's default transport wraps the paged call
  findAllEntitiesByFilter: (filter: Record<string, unknown>) =>
    findEntitiesByFilter(filter).then(
      (result: { data: unknown[] }) => result.data,
    ),
  getTenantDashboards: (...args: unknown[]) => getTenantDashboards(...args),
  exportDashboard: (...args: unknown[]) => exportDashboard(...args),
}));

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

const dashboardJson = {
  id: { entityType: 'DASHBOARD', id: 'd1' },
  title: 'Devices',
  configuration: {
    widgets: {
      wTable: {
        typeFullFqn: TEST_FQN_TABLE,
        config: {
          datasources: [
            { type: 'entity', entityAliasId: 'all-devices', dataKeys: [] },
          ],
        },
      },
      wChart: {
        typeFullFqn: TEST_FQN_CHART,
        config: {
          useDashboardTimewindow: true,
          datasources: [
            { type: 'entity', entityAliasId: 'state-entity', dataKeys: [] },
          ],
        },
      },
    },
    states: {
      default: {
        name: 'Device list',
        root: true,
        layouts: {
          main: {
            widgets: {
              wTable: { sizeX: 12, sizeY: 6, row: 0, col: 0 },
            },
            gridSettings: { columns: 24, margin: 10 },
          },
        },
      },
      device_history: {
        // biome-ignore lint/suspicious/noTemplateCurlyInString: TB state names carry `${entityName}` templates verbatim on the wire
        name: 'History: ${entityName}',
        layouts: {
          main: {
            widgets: {
              wChart: { sizeX: 12, sizeY: 6, row: 0, col: 0 },
            },
            gridSettings: { columns: 24, margin: 10 },
          },
        },
      },
    },
    entityAliases: {
      'all-devices': {
        id: 'all-devices',
        alias: 'All devices',
        filter: {
          type: 'entityType',
          entityType: 'DEVICE',
          resolveMultiple: true,
        },
      },
      'state-entity': {
        id: 'state-entity',
        alias: 'State entity',
        filter: { type: 'stateEntity', resolveMultiple: false },
      },
    },
  },
} as unknown as Dashboard;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <DashboardPage
          dashboard={validateAndUpdateDashboard(dashboardJson)}
          isTenantAdmin
        />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

function pushUrl(search: string) {
  window.history.replaceState(null, '', `/dashboards/d1${search}`);
  fireEvent(window, new Event('popstate'));
}

function pendingEntry() {
  return {
    component: lazy(async () => ({
      default: PendingWidgetPlaceholder as WidgetComponent,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  WIDGET_REGISTRY[TEST_FQN_TABLE] = pendingEntry();
  WIDGET_REGISTRY[TEST_FQN_CHART] = pendingEntry();
  findEntitiesByFilter.mockResolvedValue({
    data: [
      {
        entityId: { entityType: 'DEVICE', id: 'dev-1' },
        latest: { ENTITY_FIELD: { name: { ts: 1, value: 'Dev 1' } } },
      },
    ],
    hasNext: false,
  });
  getTenantDashboards.mockResolvedValue({ data: [], hasNext: false });
  window.history.replaceState(null, '', '/dashboards/d1');
});

afterEach(() => {
  cleanup();
  delete WIDGET_REGISTRY[TEST_FQN_TABLE];
  delete WIDGET_REGISTRY[TEST_FQN_CHART];
});

describe('DashboardPage runtime smoke (状态切换 → 布局 → 容器)', () => {
  it('renders the root state with its widget cell and toolbar', async () => {
    renderPage();
    // root layout cell resolved through the registry → pending placeholder
    await waitFor(() => {
      expect(screen.getByText(TEST_FQN_TABLE)).toBeInTheDocument();
    });
    // only the root layout cell mounts
    expect(screen.queryByText(TEST_FQN_CHART)).toBeNull();
    // alias query ran for the entityType filter
    await waitFor(() => {
      expect(findEntitiesByFilter).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'entityType', entityType: 'DEVICE' }),
      );
    });
    // readonly toolbar: timewindow default + fullscreen affordance
    expect(screen.getByTestId('tw-picker-label').textContent).toBe(
      '最近 1 小时',
    );
    expect(document.querySelector('.anticon-expand')).not.toBeNull();
    expect(screen.getByTestId('tw-picker-label')).toBeInTheDocument();
  });

  it('deep-links a state stack, swaps layout cells and re-resolves aliases', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(TEST_FQN_TABLE)).toBeInTheDocument();
    });
    const callsBefore = findEntitiesByFilter.mock.calls.length;

    pushUrl(
      `?state=${encodeURIComponent(
        objToBase64([
          {
            id: 'default',
            params: {},
          },
          {
            id: 'device_history',
            params: {
              entityId: { entityType: 'DEVICE', id: 'dev-1' },
              entityName: 'Dev 1',
            },
          },
        ]),
      )}`,
    );

    // the history state layout mounts the chart cell
    await waitFor(() => {
      expect(screen.getByText(TEST_FQN_CHART)).toBeInTheDocument();
    });
    expect(screen.queryByText(TEST_FQN_TABLE)).toBeNull();
    // breadcrumb interpolates the state name with the entity param
    expect(screen.getByText('History: Dev 1')).toBeInTheDocument();
    // the root crumb is clickable (entity controller pops)
    expect(screen.getByText('Device list')).toBeInTheDocument();
    // alias resolution re-ran after the state change
    await waitFor(() => {
      expect(findEntitiesByFilter.mock.calls.length).toBeGreaterThan(
        callsBefore,
      );
    });
  });
});
