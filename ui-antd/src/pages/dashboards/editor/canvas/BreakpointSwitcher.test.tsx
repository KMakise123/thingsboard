/**
 * BreakpointSwitcher + editor-grid preview channel (spec §3.7): hidden
 * while only the default breakpoint exists, forces the bucket override
 * layout into EditorGrid, publishes the dialog-session registry, and
 * restores the width-driven preview on unmount.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { lazy } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PendingWidgetPlaceholder } from '@/components/widgets/placeholders';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhDialogs from '@/locales/zh-CN/editor-dashboard-dialogs';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import {
  clearDialogSession,
  useDialogSession,
} from '../dialogs/use-dialog-session';
import {
  BreakpointSwitcher,
  getPreviewBreakpoint,
  setPreviewBreakpoint,
} from './BreakpointSwitcher';
import { EditorGrid } from './EditorGrid';

const TEST_FQN = 'system.test.switcher';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorDashboard, ...zhDialogs },
});

beforeEach(() => {
  WIDGET_REGISTRY[TEST_FQN] = {
    component: lazy(async () => ({
      default: PendingWidgetPlaceholder as never,
    })),
  };
});

afterEach(() => {
  cleanup();
  clearDialogSession();
  setPreviewBreakpoint('default');
});

/** main layout with an xs override that moves w1 and swaps in w2. */
function dashboardJson(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Demo',
    configuration: {
      widgets: {
        w1: { typeFullFqn: TEST_FQN, config: {} },
        w2: { typeFullFqn: TEST_FQN, config: {} },
      },
      states: {
        default: {
          name: 'Root',
          root: true,
          layouts: {
            main: {
              widgets: {
                w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 },
                w2: { sizeX: 8, sizeY: 6, row: 6, col: 8 },
              },
              gridSettings: { columns: 24, margin: 10 },
              breakpoints: {
                xs: {
                  widgets: {
                    w1: { sizeX: 12, sizeY: 4, row: 9, col: 3 },
                  },
                  gridSettings: { columns: 12, margin: 4 },
                },
              },
            },
          },
        },
      },
      entityAliases: {},
    },
  } as unknown as Dashboard;
}

function setup() {
  const configuration = validateAndUpdateDashboard(dashboardJson())
    .configuration as DashboardConfiguration;
  const session = new EditorSession<DashboardConfiguration>({
    baseline: configuration,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    session,
    renderSwitcher() {
      render(
        <RawIntlProvider value={intl}>
          <BreakpointSwitcher session={session} />
        </RawIntlProvider>,
      );
    },
    renderGrid() {
      render(
        <RawIntlProvider value={intl}>
          <QueryClientProvider client={queryClient}>
            <EditorGrid
              session={session}
              stateId="default"
              layoutId="main"
              selectedWidgetId={null}
              onSelectWidget={() => undefined}
              dashboardTimewindow={
                { defaultAggregation: 'NONE', timezone: 'UTC' } as never
              }
              aliases={{}}
              states={
                {
                  currentStateId: 'default',
                  currentStateParams: {},
                  breadcrumbs: [],
                } as never
              }
              isMobile={false}
              containerWidth={1200}
            />
          </QueryClientProvider>
        </RawIntlProvider>,
      );
    },
  };
}

describe('BreakpointSwitcher (§3.7)', () => {
  it('is hidden while only the default breakpoint exists', () => {
    const { session, renderSwitcher } = setup();
    act(() => {
      session.write('drop breakpoints', (draft) => {
        delete draft.states.default.layouts.main?.breakpoints;
      });
    });
    renderSwitcher();
    expect(screen.queryByTestId('breakpoint-switcher')).toBeNull();
  });

  it('lists the defined breakpoints and forces the override into the grid', () => {
    const { renderSwitcher, renderGrid } = setup();
    renderSwitcher();
    renderGrid();
    // default preview: base layout (both widgets placed)
    expect(screen.getAllByTestId('editor-widget')).toHaveLength(2);
    act(() => {
      setPreviewBreakpoint('xs');
    });
    // xs override: w2 absent, w1 moved to 3/9, columns from the override
    const widgets = screen
      .getAllByTestId('editor-widget')
      .map((node) => node.getAttribute('data-editor-widget'));
    expect(widgets).toEqual(['w1']);
    const grid = screen.getByTestId('editor-grid');
    expect(grid.getAttribute('data-editor-cols')).toBe('12');
    expect(grid.getAttribute('data-editor-margin')).toBe('4');
    act(() => {
      setPreviewBreakpoint('default');
    });
    // restored: both base widgets visible again
    expect(screen.getAllByTestId('editor-widget')).toHaveLength(2);
  });

  it('publishes the dialog-session registry on mount', () => {
    const { session, renderSwitcher } = setup();
    renderSwitcher();
    // useDialogSession throws when nothing is published — a successful read
    // from the probe proves the switcher published the session.
    let probeResolved: unknown = null;
    function Probe() {
      // hook at the top level of the component (rules of hooks)
      probeResolved = useDialogSession();
      return null;
    }
    render(
      <RawIntlProvider value={intl}>
        <Probe />
      </RawIntlProvider>,
    );
    expect(probeResolved).toBe(session);
  });

  it('resets the preview to default on unmount', () => {
    const { session } = setup();
    const { unmount } = render(
      <RawIntlProvider value={intl}>
        <BreakpointSwitcher session={session} />
      </RawIntlProvider>,
    );
    act(() => {
      setPreviewBreakpoint('xs');
    });
    expect(getPreviewBreakpoint()).toBe('xs');
    unmount();
    expect(getPreviewBreakpoint()).toBe('default');
  });
});
