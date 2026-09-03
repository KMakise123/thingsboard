/**
 * P7 memo-boundary evidence (ADR 0004 appendix A / brief §5): a 120-widget
 * editor grid with render counters pinned through WIDGET_REGISTRY.
 *
 * What is provable here is the RE-RENDER TOPOLOGY, not wall-clock fps
 * (happy-dom has no layout/paint pipeline — brief §5 honest-evidence rule):
 *
 *  1. memo boundary: a `session.write(updateWidgetConfig)` on ONE widget
 *     re-renders exactly that widget's content (immer swaps only the edited
 *     widget's reference; EditorGrid rebuilds geometry but the WidgetCellInner
 *     memo compares referentially-equal props for the other 119 cells) —
 *     every other cell's render counter does not move;
 *  2. selection channel: click-select re-renders the editor chrome
 *     (wrapper outline) but ZERO widget content counters move — the selected
 *     state lives on the wrapper and in component state above the grid,
 *     never reaching WidgetCellInner props (ADR 0004 §2).
 *
 * Harness note: the FIRST act flush after mount also drains the pending
 * Suspense retry work of the lazy registry stubs (one extra content render
 * per cell, once). It is a lazy-warm-up artifact of the test harness, not a
 * memo failure — probes with plain (non-lazy) stubs show zero spurious
 * renders on the very first write. Each test therefore performs a throwaway
 * warm-up write first and snapshots per-cell baselines afterwards.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { lazy, useState } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WidgetComponentProps } from '@/components/widgets/contract';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { updateWidgetConfig, writeDraft } from '@/core/editor/dashboard-draft';
import { EditorSession } from '@/core/editor/session';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import { EditorGrid } from './EditorGrid';
import { EditorCanvasOverrideProvider } from './editor-canvas-context';

const TEST_FQN = 'system.test.perf_memo';
const WIDGET_COUNT = 120;
const TARGET = 'w42';

/** module-level render counter keyed by widget id (probe into content). */
const renderCounts = new Map<string, number>();

function CountingStub({ widgetId }: WidgetComponentProps) {
  renderCounts.set(widgetId, (renderCounts.get(widgetId) ?? 0) + 1);
  return <div data-testid={`perf-stub-${widgetId}`} />;
}

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorDashboard },
});

afterEach(cleanup);

beforeEach(() => {
  renderCounts.clear();
  WIDGET_REGISTRY[TEST_FQN] = {
    component: lazy(async () => ({ default: CountingStub as never })),
  };
});

function dashboardJson(): Dashboard {
  const widgets: Record<string, { typeFullFqn: string; config: object }> = {};
  const layoutWidgets: Record<
    string,
    { sizeX: number; sizeY: number; row: number; col: number }
  > = {};
  for (let i = 0; i < WIDGET_COUNT; i += 1) {
    const id = `w${i}`;
    widgets[id] = { typeFullFqn: TEST_FQN, config: { index: i } };
    // 4 per row on a 24-col grid (sizeX 6), 3 rows tall
    layoutWidgets[id] = {
      sizeX: 6,
      sizeY: 3,
      row: Math.floor(i / 4) * 3,
      col: (i % 4) * 6,
    };
  }
  return {
    id: { entityType: 'DASHBOARD', id: 'perf' },
    title: 'Perf',
    configuration: {
      widgets,
      states: {
        default: {
          name: 'Root',
          root: true,
          layouts: {
            main: {
              widgets: layoutWidgets,
              gridSettings: { columns: 24, margin: 10 },
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
  return { session };
}

/** stable across host re-renders — mirrors the shell's prop discipline. */
const QUERY_CLIENT = new QueryClient();
const DASHBOARD_TIMEWINDOW = {
  defaultAggregation: 'NONE',
  timezone: 'UTC',
} as never;
const ALIASES = {};
const STATES = {
  currentStateId: 'default',
  currentStateParams: {},
  breadcrumbs: [],
} as never;

/** stateful host: mirrors the shell — selection is component state above the grid. */
function PerfHost({
  session,
  onSelectWidget,
}: {
  session: EditorSession<DashboardConfiguration>;
  onSelectWidget: (id: string | null) => void;
}) {
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const select = (id: string | null) => {
    setSelectedWidgetId(id);
    onSelectWidget(id);
  };
  return (
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={QUERY_CLIENT}>
        <EditorCanvasOverrideProvider displayGridAlways={false}>
          <EditorGrid
            session={session}
            stateId="default"
            layoutId="main"
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={select}
            dashboardTimewindow={DASHBOARD_TIMEWINDOW}
            aliases={ALIASES}
            states={STATES}
            isMobile={false}
            containerWidth={960}
          />
        </EditorCanvasOverrideProvider>
      </QueryClientProvider>
    </RawIntlProvider>
  );
}

async function renderAll(
  session: EditorSession<DashboardConfiguration>,
  onSelectWidget: (id: string | null) => void = () => {},
) {
  render(<PerfHost session={session} onSelectWidget={onSelectWidget} />);
  // lazy registry entries resolve one microtask later
  await waitFor(() => {
    expect(renderCounts.size).toBe(WIDGET_COUNT);
  });
  // drain the one-off lazy/Suspense retry flush, then snapshot baselines
  act(() => {
    writeDraft(
      session,
      updateWidgetConfig({ widgetId: 'w0', patch: { warmUp: true } }),
    );
    session.undo();
  });
  return new Map(renderCounts);
}

/** ids whose content rendered more often than their baseline, except target. */
function movedCells(baseline: Map<string, number>, target: string): string[] {
  const moved: string[] = [];
  for (const [id, count] of renderCounts) {
    if (id !== target && count !== baseline.get(id)) {
      moved.push(id);
    }
  }
  return moved;
}

function findCell(widgetId: string): HTMLElement | undefined {
  return screen
    .getAllByTestId('editor-widget')
    .find((el) => el.getAttribute('data-editor-widget') === widgetId);
}

describe('EditorGrid memo boundary — P7 evidence (brief §5)', () => {
  it(`a single-widget config write re-renders exactly ${TARGET} of ${WIDGET_COUNT} cells`, async () => {
    const { session } = setup();
    const baseline = await renderAll(session);

    act(() => {
      writeDraft(
        session,
        updateWidgetConfig({ widgetId: TARGET, patch: { title: 'edited' } }),
      );
    });

    await waitFor(() => {
      expect(renderCounts.get(TARGET)).toBe((baseline.get(TARGET) ?? 0) + 1);
    });
    expect(movedCells(baseline, TARGET)).toEqual([]);

    const delta = [...renderCounts.entries()].reduce(
      (sum, [id, count]) => sum + (count - (baseline.get(id) ?? 0)),
      0,
    );
    // exactly one content re-render across the whole 120-widget canvas —
    // the memo boundary held
    expect(delta).toBe(1);
  });

  it('a second write to the same widget costs one more content render only', async () => {
    const { session } = setup();
    const baseline = await renderAll(session);

    act(() => {
      writeDraft(
        session,
        updateWidgetConfig({ widgetId: TARGET, patch: { title: 'a' } }),
      );
    });
    act(() => {
      writeDraft(
        session,
        updateWidgetConfig({ widgetId: TARGET, patch: { title: 'b' } }),
      );
    });

    await waitFor(() => {
      expect(renderCounts.get(TARGET)).toBe((baseline.get(TARGET) ?? 0) + 2);
    });
    expect(movedCells(baseline, TARGET)).toEqual([]);
  });

  it('click-select re-renders zero widget content (selection = wrapper channel)', async () => {
    const { session } = setup();
    const onSelect = vi.fn();
    const baseline = await renderAll(session, onSelect);

    const cell = findCell(TARGET);
    expect(cell).toBeDefined();
    fireEvent.click(cell as HTMLElement);

    // selection applied to the grid chrome…
    expect(findCell(TARGET)?.getAttribute('data-selected')).toBe('true');
    // …but no widget content re-rendered (all counters at baseline)
    expect(movedCells(baseline, '')).toEqual([]);

    fireEvent.click(screen.getByTestId('editor-grid'));
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(movedCells(baseline, '')).toEqual([]);
  });
});
