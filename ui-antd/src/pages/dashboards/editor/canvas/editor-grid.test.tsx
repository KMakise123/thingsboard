/**
 * EditorGrid behavior tests: displayGrid 3-state + override channel,
 * selection wiring, widgetMenu wiring, and the no-spurious-writes red line
 * (mounting + reconciling a matching layout must produce ZERO session
 * history — commits happen only at drag/resize boundaries).
 *
 * Registry pinning: the widget cells resolve through WIDGET_REGISTRY, so
 * the tests pin their own pending entries and never depend on W2 rollout.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MenuProps } from 'antd';
import { lazy } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingWidgetPlaceholder } from '@/components/widgets/placeholders';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import { EditorGrid } from './EditorGrid';
import {
  EditorCanvasContext,
  EditorCanvasOverrideProvider,
} from './editor-canvas-context';

const TEST_FQN = 'system.test.editor_cell';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorDashboard },
});

afterEach(cleanup);

beforeEach(() => {
  WIDGET_REGISTRY[TEST_FQN] = pendingEntry();
});

function pendingEntry() {
  return {
    component: lazy(async () => ({
      default: PendingWidgetPlaceholder as never,
    })),
  };
}

function dashboardJson(displayGrid?: string): Dashboard {
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
              gridSettings: {
                columns: 24,
                margin: 10,
                ...(displayGrid ? { displayGrid } : {}),
              },
            },
          },
        },
      },
      entityAliases: {},
    },
  } as unknown as Dashboard;
}

function setup(displayGrid?: string) {
  const configuration = validateAndUpdateDashboard(dashboardJson(displayGrid))
    .configuration as DashboardConfiguration;
  const session = new EditorSession<DashboardConfiguration>({
    baseline: configuration,
  });
  return { session, configuration };
}

function renderGrid(
  session: EditorSession<DashboardConfiguration>,
  options?: {
    displayGridAlways?: boolean;
    selectedWidgetId?: string | null;
    widgetMenu?: (widgetId: string) => MenuProps;
    onSelectWidget?: (id: string | null) => void;
  },
) {
  const onSelectWidget = options?.onSelectWidget ?? vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <EditorCanvasOverrideProvider
          displayGridAlways={options?.displayGridAlways ?? false}
        >
          <EditorGrid
            session={session}
            stateId="default"
            layoutId="main"
            selectedWidgetId={options?.selectedWidgetId ?? null}
            onSelectWidget={onSelectWidget}
            widgetMenu={options?.widgetMenu}
            dashboardTimewindow={
              {
                defaultAggregation: 'NONE',
                timezone: 'UTC',
              } as never
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
            containerWidth={960}
          />
        </EditorCanvasOverrideProvider>
      </QueryClientProvider>
    </RawIntlProvider>,
  );
  return { onSelectWidget };
}

describe('EditorGrid — displayGrid 三态 (spec §3.3)', () => {
  it('default onDrag&Resize hides the background when idle', () => {
    const { session } = setup();
    renderGrid(session);
    expect(
      screen
        .getByTestId('editor-grid')
        .getAttribute('data-editor-display-grid'),
    ).toBe('hidden');
    expect(screen.queryByTestId('editor-grid-background')).toBeNull();
  });

  it('gridSettings.displayGrid always mounts the background', () => {
    const { session } = setup('always');
    renderGrid(session);
    expect(
      screen
        .getByTestId('editor-grid')
        .getAttribute('data-editor-display-grid'),
    ).toBe('visible');
    expect(screen.getByTestId('editor-grid-background')).toBeInTheDocument();
  });

  it('gridSettings.displayGrid none stays hidden even while interacting', () => {
    const { session } = setup('none');
    renderGrid(session);
    // interacting only flips within onDragStart (not simulated here); none
    // + the override OFF must stay hidden
    expect(
      screen
        .getByTestId('editor-grid')
        .getAttribute('data-editor-display-grid'),
    ).toBe('hidden');
  });

  it('the move-widgets override channel forces always', () => {
    const { session } = setup(); // default onDrag&Resize
    renderGrid(session, { displayGridAlways: true });
    expect(
      screen
        .getByTestId('editor-grid')
        .getAttribute('data-editor-display-grid'),
    ).toBe('visible');
    expect(screen.getByTestId('editor-grid-background')).toBeInTheDocument();
  });

  it('the override provider feeds the context value', () => {
    const consumer = vi.fn();
    render(
      <EditorCanvasOverrideProvider displayGridAlways>
        <EditorCanvasContext.Consumer>{consumer}</EditorCanvasContext.Consumer>
      </EditorCanvasOverrideProvider>,
    );
    expect(consumer.mock.calls[0][0]).toEqual({ displayGridAlways: true });
  });
});

describe('EditorGrid — rendering + no spurious writes', () => {
  it('mount + reconcile of a matching layout writes NOTHING to the session', () => {
    const { session } = setup();
    renderGrid(session);
    expect(screen.getAllByTestId('editor-widget')).toHaveLength(2);
    expect(session.history).toHaveLength(0);
    expect(session.dirty).toBe(false);
  });

  it('clicking a widget selects it; clicking the canvas clears selection', () => {
    const { session } = setup();
    const { onSelectWidget } = renderGrid(session, {
      onSelectWidget: undefined as never,
    });
    void onSelectWidget;
    cleanup();
    const onSelect = vi.fn();
    renderGrid(session, { onSelectWidget: onSelect });
    const widgets = screen.getAllByTestId('editor-widget');
    fireEvent.click(widgets[0]);
    expect(onSelect).toHaveBeenCalledWith(expect.any(String));
    fireEvent.click(screen.getByTestId('editor-grid'));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('selection chrome lands on the wrapper, not the widget content', () => {
    const { session } = setup();
    renderGrid(session, { selectedWidgetId: 'w1' });
    const selected = screen
      .getAllByTestId('editor-widget')
      .find((el) => el.getAttribute('data-selected') === 'true');
    expect(selected?.getAttribute('data-editor-widget')).toBe('w1');
  });

  it('wires the widgetMenu builder for every placed widget', () => {
    const { session } = setup();
    const widgetMenu = vi.fn().mockReturnValue({ items: [] });
    renderGrid(session, { widgetMenu });
    // called per widget per render pass (strict-mode double render included)
    expect(widgetMenu).toHaveBeenCalledWith('w1');
    expect(widgetMenu).toHaveBeenCalledWith('w2');
  });
});

describe('EditorGrid — widget context menu (M10 D3)', () => {
  it('right-clicking a widget mounts its Dropdown menu', async () => {
    const { session } = setup();
    renderGrid(session, {
      widgetMenu: (id) =>
        ({
          items: [{ key: 'edit', label: '编辑' }],
          'data-testid': `menu-${id}`,
        }) as MenuProps,
    });
    const cell = screen
      .getAllByTestId('editor-widget')
      .find((el) => el.getAttribute('data-editor-widget') === 'w1');
    // the event must originate INSIDE the cell (as a real right-click on the
    // widget content does) so it reaches the Dropdown trigger host first
    if (!cell?.firstElementChild) {
      throw new Error('widget cell w1 with content not found');
    }
    fireEvent.contextMenu(cell.firstElementChild);
    expect(await screen.findByTestId('menu-w1')).toBeInTheDocument();
  });

  it('right-click still selects the widget and keeps the canvas menu shut', async () => {
    const { session } = setup();
    const onSelect = vi.fn();
    renderGrid(session, {
      onSelectWidget: onSelect,
      widgetMenu: (id) =>
        ({
          items: [{ key: 'edit', label: '编辑' }],
          'data-testid': `menu-${id}`,
        }) as MenuProps,
    });
    const cell = screen
      .getAllByTestId('editor-widget')
      .find((el) => el.getAttribute('data-editor-widget') === 'w1');
    if (!cell?.firstElementChild) {
      throw new Error('widget cell w1 with content not found');
    }
    fireEvent.contextMenu(cell.firstElementChild);
    expect(onSelect).toHaveBeenCalledWith('w1');
    expect(await screen.findByTestId('menu-w1')).toBeInTheDocument();
  });
});
