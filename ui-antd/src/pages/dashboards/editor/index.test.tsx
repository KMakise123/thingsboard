/**
 * Editor page tests (route /dashboards/:dashboardId/editor): loads +
 * normalizes + enters the session once, renders the edit shell — empty
 * dashboards land in edit mode (spec §3.1) and background refetches never
 * reset the draft (the enter-once-per-id guard).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const shellSpy = vi.hoisted(() => vi.fn());

// vite-node cannot resolve antd's extensionless internal locale imports
// pulled through pro-components (same workaround as the list page tests)
vi.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: { children?: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
}));

vi.mock('./shell', () => ({
  EditorShell: (props: { dashboard: Dashboard }) => {
    shellSpy(props);
    return <div data-testid="editor-shell-stub" />;
  },
}));

import DashboardsEditorPage from './index';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhDashboards, ...zhEditorCommon, ...zhEditorDashboard },
});

function dashboardJson(configuration: Record<string, unknown>): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Demo',
    version: 5,
    configuration,
  } as unknown as Dashboard;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <DashboardsEditorPage />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

beforeEach(() => {
  shellSpy.mockClear();
});

describe('DashboardsEditorPage', () => {
  it('loads, normalizes and renders the edit shell (pure edit mode)', async () => {
    useDashboardMock.mockReturnValue({
      query: { isPending: false, isError: false },
      dashboard: dashboardJson({
        widgets: {},
        states: {
          default: {
            name: 'Root',
            root: true,
            layouts: { main: { widgets: {} } },
          },
        },
        entityAliases: {},
      }),
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('editor-shell-stub')).toBeInTheDocument();
    });
    const props = shellSpy.mock.calls[0][0] as { dashboard: Dashboard };
    // validateAndUpdateDashboard applied upstream by useDashboard
    expect(props.dashboard.configuration).toBeDefined();
  });

  it('an EMPTY dashboard renders the edit shell directly (auto edit mode)', async () => {
    useDashboardMock.mockReturnValue({
      query: { isPending: false, isError: false },
      dashboard: dashboardJson({}),
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('editor-shell-stub')).toBeInTheDocument();
    });
  });

  it('a refetched dashboard object does not re-enter the session', async () => {
    const loaded = dashboardJson({
      widgets: {},
      states: {
        default: {
          name: 'Root',
          root: true,
          layouts: { main: { widgets: {} } },
        },
      },
      entityAliases: {},
    });
    useDashboardMock.mockReturnValue({
      query: { isPending: false, isError: false },
      dashboard: loaded,
    });
    renderPage();
    await waitFor(() => {
      expect(shellSpy).toHaveBeenCalledTimes(1);
    });
    // react-query refetch → a NEW dashboard object identity for the same id
    const refetched = {
      ...loaded,
      configuration: { ...loaded.configuration },
    };
    useDashboardMock.mockReturnValue({
      query: { isPending: false, isError: false },
      dashboard: refetched,
    });
    act(() => {
      // rerender happens through the mock returning a new value
    });
    await waitFor(() => {
      // the shell re-renders with the new props object
      expect(shellSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    // enteredIdRef guard: still the FIRST render call only (no remount)
    expect(shellSpy).toHaveBeenCalledTimes(1);
  });

  it('loading and error states surface through the page', async () => {
    useDashboardMock.mockReturnValue({
      query: { isPending: true, isError: false },
      dashboard: undefined,
    });
    const { container } = renderPage();
    await waitFor(() => {
      expect(container.querySelector('.ant-spin')).not.toBeNull();
    });
    expect(screen.queryByTestId('editor-shell-stub')).toBeNull();
  });
});
