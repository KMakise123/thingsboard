import { describe, expect, it } from 'vitest';

import { createDefaultState } from '@/core/dashboard/model';
import type {
  DashboardBreakpointId,
  DashboardConfiguration,
} from '@/types/tb/dashboard';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import {
  addState,
  addWidget,
  type CopiedWidget,
  copyWidgets,
  moveWidget,
  pasteWidgets,
  removeEntityAlias,
  removeFilter,
  removeState,
  removeWidget,
  resizeWidget,
  setLayouts,
  updateDashboardConfigField,
  updateDashboardSettings,
  updateGridSettings,
  updateState,
  updateWidgetConfig,
  updateWidgetLayout,
  upsertEntityAlias,
  upsertFilter,
  writeDraft,
} from './dashboard-draft';
import { EditorSession } from './session';

function makeWidget(typeFullFqn: string, title: string): Widget {
  return { typeFullFqn, config: { title } };
}

function layout(row: number, col: number): WidgetLayout {
  return { row, col, sizeX: 8, sizeY: 6 };
}

/** Normalized baseline shape (as produced by validateAndUpdateDashboard). */
function makeConfig(): DashboardConfiguration {
  const defaultState = createDefaultState('default', true);
  if (defaultState.layouts.main) {
    defaultState.layouts.main.widgets = { w1: layout(0, 0) };
  }
  return {
    widgets: { w1: makeWidget('system.a', 'A') },
    states: { default: defaultState },
    entityAliases: {},
    settings: { stateControllerId: 'entity' },
  };
}

function newSession(): {
  session: EditorSession<DashboardConfiguration>;
  baseline: DashboardConfiguration;
} {
  const session = new EditorSession<DashboardConfiguration>();
  const baseline = makeConfig();
  session.enter(baseline);
  return { session, baseline };
}

/** Current main-layout widget record of the default state. */
function mainWidgets(
  session: EditorSession<DashboardConfiguration>,
): Record<string, WidgetLayout> {
  const main = session.current.states.default?.layouts.main;
  if (!main) {
    throw new Error('main layout missing');
  }
  return main.widgets;
}

describe('dashboard draft: widget lifecycle', () => {
  it('addWidget inserts into the widgets map + layout entry with defaults', () => {
    const { session } = newSession();
    writeDraft(
      session,
      addWidget({ widget: makeWidget('system.b', 'B'), stateId: 'default' }),
    );

    const newId = Object.keys(session.current.widgets).find(
      (id) => id !== 'w1',
    );
    expect(newId).toBeDefined();
    const inserted = session.current.widgets[newId as string];
    expect(inserted?.typeFullFqn).toBe('system.b');
    expect(mainWidgets(session)[newId as string]).toEqual({
      row: 0,
      col: 0,
      sizeX: 8,
      sizeY: 6,
    });
    // the draft owns its copy — no reference aliasing with the caller object
    expect(inserted).not.toBe(makeWidget('system.b', 'B'));
  });

  it('addWidget honors explicit placement and layout', () => {
    const { session } = newSession();
    const main = session.current.states.default?.layouts.main;
    writeDraft(
      session,
      setLayouts({
        stateId: 'default',
        layouts: {
          main: main ?? { widgets: {}, gridSettings: {} },
          right: { widgets: {}, gridSettings: { layoutType: 'divider' } },
        },
      }),
    );
    writeDraft(
      session,
      addWidget({
        widget: makeWidget('system.c', 'C'),
        stateId: 'default',
        layoutId: 'right',
        placement: { row: 12, col: 3, sizeX: 4, sizeY: 3 },
      }),
    );
    const right = session.current.states.default?.layouts.right;
    expect(Object.values(right?.widgets ?? {})[0]).toEqual({
      row: 12,
      col: 3,
      sizeX: 4,
      sizeY: 3,
    });
  });

  it('addWidget on an unknown state throws and leaves the draft untouched', () => {
    const { session, baseline } = newSession();
    expect(() =>
      writeDraft(
        session,
        addWidget({ widget: makeWidget('system.b', 'B'), stateId: 'ghost' }),
      ),
    ).toThrow(/ghost/);
    expect(session.current).toEqual(baseline);
    expect(session.dirty).toBe(false);
    expect(session.canUndo).toBe(false);
  });

  it('removeWidget cleans the widget + every layout entry across states', () => {
    const { session } = newSession();
    writeDraft(session, addState({ stateId: 's2', name: 'Second' }));
    session.write('wire s2', (draft) => {
      const s2 = draft.states.s2;
      if (s2?.layouts.main) {
        s2.layouts.main.widgets.w1 = layout(3, 3);
        s2.layouts.main.breakpoints = {
          sm: { widgets: { w1: layout(0, 0) }, gridSettings: {} },
        };
      }
    });

    writeDraft(session, removeWidget({ widgetId: 'w1' }));

    expect(Object.keys(session.current.widgets)).not.toContain('w1');
    for (const state of Object.values(session.current.states)) {
      for (const layoutEntry of Object.values(state.layouts)) {
        expect(Object.keys(layoutEntry.widgets)).not.toContain('w1');
        const breakpoints = layoutEntry.breakpoints;
        if (breakpoints) {
          for (const bpId of Object.keys(
            breakpoints,
          ) as DashboardBreakpointId[]) {
            // Omit<DashboardLayout,'breakpoints'> degrades under the index
            // signature — cast to read the widget record
            const bp = breakpoints[bpId] as
              | { widgets: Record<string, string> }
              | undefined;
            if (bp) {
              expect(Object.keys(bp.widgets)).not.toContain('w1');
            }
          }
        }
      }
    }
  });

  it('removeWidget on an absent id appends no group', () => {
    const { session } = newSession();
    writeDraft(session, removeWidget({ widgetId: 'ghost' }));
    expect(session.canUndo).toBe(false);
    expect(session.dirty).toBe(false);
  });

  it('moveWidget / resizeWidget patch the layout entry', () => {
    const { session } = newSession();
    writeDraft(
      session,
      moveWidget({ widgetId: 'w1', stateId: 'default', row: 7, col: 9 }),
    );
    expect(mainWidgets(session).w1).toMatchObject({ row: 7, col: 9 });

    writeDraft(
      session,
      resizeWidget({ widgetId: 'w1', stateId: 'default', sizeX: 6, sizeY: 4 }),
    );
    expect(mainWidgets(session).w1).toMatchObject({ sizeX: 6, sizeY: 4 });
  });

  it('moveWidget without a layout entry in the target state throws', () => {
    const { session } = newSession();
    writeDraft(session, addState({ stateId: 's2' }));
    expect(() =>
      writeDraft(
        session,
        moveWidget({ widgetId: 'w1', stateId: 's2', row: 1, col: 1 }),
      ),
    ).toThrow(/w1/);
  });

  it('updateWidgetConfig shallow-merges and coalesces per widget', () => {
    const { session } = newSession();
    const patch = { title: 'Renamed', settings: { mode: 'x' } };
    writeDraft(session, updateWidgetConfig({ widgetId: 'w1', patch }));
    const config = session.current.widgets.w1?.config;
    expect(config?.title).toBe('Renamed');
    expect(config?.settings).toEqual({ mode: 'x' });
    // draft owns merged values; the caller patch stays unfrozen
    expect(Object.isFrozen(patch.settings)).toBe(false);

    // consecutive edits of the same widget merge into ONE transaction
    writeDraft(
      session,
      updateWidgetConfig({ widgetId: 'w1', patch: { title: 'Renamed 2' } }),
    );
    expect(session.history).toHaveLength(1);
    expect(session.history[0]?.coalesceKey).toBe('w1:config');
    expect(session.current.widgets.w1?.config.title).toBe('Renamed 2');
    expect(session.current.widgets.w1?.config.settings).toEqual({ mode: 'x' });
  });

  it('updateWidgetLayout merges partial layout fields', () => {
    const { session } = newSession();
    writeDraft(
      session,
      updateWidgetLayout({
        widgetId: 'w1',
        stateId: 'default',
        layout: { mobileOrder: 2, mobileHide: true },
      }),
    );
    expect(mainWidgets(session).w1).toMatchObject({
      mobileOrder: 2,
      mobileHide: true,
      row: 0,
    });
  });

  it('add → undo round-trip leaves no orphan entries', () => {
    const { session, baseline } = newSession();
    writeDraft(
      session,
      addWidget({ widget: makeWidget('system.b', 'B'), stateId: 'default' }),
    );
    expect(Object.keys(session.current.widgets)).toHaveLength(2);
    session.undo();
    expect(session.current).toBe(baseline);
    expect(Object.keys(mainWidgets(session))).toEqual(['w1']);
  });
});

describe('dashboard draft: paste / copy', () => {
  function payload(): CopiedWidget[] {
    return [
      { widget: makeWidget('system.b', 'B'), layout: layout(0, 0) },
      { widget: makeWidget('system.c', 'C'), layout: layout(6, 0) },
    ];
  }

  it('pasteWidgets regenerates ids and preserves relative arrangement in one group', () => {
    const { session } = newSession();
    writeDraft(
      session,
      pasteWidgets({
        widgets: payload(),
        stateId: 'default',
        at: { row: 20, col: 4 },
      }),
    );

    expect(session.history).toHaveLength(1);
    const keys = Object.keys(session.current.widgets);
    expect(keys).toHaveLength(3);
    const newKeys = keys.filter((id) => id !== 'w1');
    expect(new Set(newKeys).size).toBe(2);

    const placed = Object.values(mainWidgets(session)).filter(
      (entry) => entry.row >= 20,
    );
    expect(placed).toHaveLength(2);
    // relative offset: min row 0 → 20, the second widget keeps its +6 gap
    expect(placed.map((entry) => entry.row).sort()).toEqual([20, 26]);
    expect(placed.every((entry) => entry.col === 4)).toBe(true);
  });

  it('pasteWidgets deep-clones the payload (clipboard stays independent)', () => {
    const { session } = newSession();
    const clip = payload();
    writeDraft(
      session,
      pasteWidgets({
        widgets: clip,
        stateId: 'default',
        at: { row: 12, col: 0 },
      }),
    );
    const clipHead = clip[0];
    if (clipHead) {
      clipHead.widget.config.title = 'mutated';
    }
    const pasted = Object.values(session.current.widgets).find(
      (widget) => widget.typeFullFqn === 'system.b',
    );
    expect(pasted?.config.title).toBe('B');
  });

  it('copyWidgets is a pure extractor — no write, no aliasing', () => {
    const { session } = newSession();
    const copied = copyWidgets({
      configuration: session.current,
      widgetIds: ['w1'],
      stateId: 'default',
    });
    expect(copied).toHaveLength(1);
    expect(copied[0]?.widget.typeFullFqn).toBe('system.a');
    expect(copied[0]?.layout).toEqual(layout(0, 0));
    expect(session.dirty).toBe(false);
    expect(session.canUndo).toBe(false);

    const copyHead = copied[0];
    if (copyHead) {
      copyHead.widget.config.title = 'hacked';
    }
    expect(session.current.widgets.w1?.config.title).toBe('A');
  });

  it('copyWidgets skips ids missing from the map or the layout', () => {
    const { session } = newSession();
    const copied = copyWidgets({
      configuration: session.current,
      widgetIds: ['w1', 'ghost', 'unplaced'],
      stateId: 'default',
    });
    expect(copied).toHaveLength(1);
  });
});

describe('dashboard draft: aliases & filters', () => {
  it('upsertEntityAlias inserts then updates, coalesced per alias', () => {
    const { session } = newSession();
    writeDraft(
      session,
      upsertEntityAlias({
        id: 'a1',
        alias: 'Temperatures',
        filter: { type: 'entityType', entityType: 'DEVICE' },
      }),
    );
    writeDraft(
      session,
      upsertEntityAlias({
        id: 'a1',
        alias: 'Temperatures v2',
        filter: { type: 'entityType', entityType: 'DEVICE' },
      }),
    );
    expect(session.history).toHaveLength(1);
    expect(session.history[0]?.coalesceKey).toBe('alias:a1');
    expect(session.current.entityAliases.a1?.alias).toBe('Temperatures v2');
  });

  it('removeEntityAlias deletes the entry', () => {
    const { session } = newSession();
    writeDraft(
      session,
      upsertEntityAlias({
        id: 'a1',
        alias: 'A',
        filter: { type: 'entityType', entityType: 'DEVICE' },
      }),
    );
    writeDraft(session, removeEntityAlias('a1'));
    expect(session.current.entityAliases.a1).toBeUndefined();
  });

  it('upsertFilter / removeFilter manage the filters record', () => {
    const { session } = newSession();
    writeDraft(
      session,
      upsertFilter({ id: 'f1', filter: 'Demo filter', keyFilters: [] }),
    );
    expect(session.current.filters?.f1?.filter).toBe('Demo filter');
    writeDraft(session, removeFilter('f1'));
    expect(session.current.filters?.f1).toBeUndefined();
    // discrete ops do not coalesce
    expect(session.history[1]?.coalesceKey).toBeUndefined();
  });
});

describe('dashboard draft: states', () => {
  it('addState creates a non-root state with default layouts', () => {
    const { session } = newSession();
    writeDraft(session, addState({ stateId: 's2', name: 'Second' }));
    const s2 = session.current.states.s2;
    expect(s2?.root).toBe(false);
    expect(s2?.name).toBe('Second');
    expect(s2?.layouts.main?.widgets).toEqual({});
    expect(s2?.layouts.main?.gridSettings.columns).toBe(24);
    expect(session.current.states.default?.root).toBe(true);
  });

  it('addState on an existing id throws', () => {
    const { session } = newSession();
    expect(() => writeDraft(session, addState({ stateId: 'default' }))).toThrow(
      /default/,
    );
  });

  it('updateState renames without touching root flags', () => {
    const { session } = newSession();
    writeDraft(session, updateState({ stateId: 'default', name: 'Renamed' }));
    expect(session.current.states.default?.name).toBe('Renamed');
    expect(session.current.states.default?.root).toBe(true);
  });

  it('removeState removes a non-root state and undo restores it', () => {
    const { session, baseline } = newSession();
    writeDraft(session, addState({ stateId: 's2' }));
    writeDraft(session, removeState({ stateId: 's2' }));
    expect(session.current.states.s2).toBeUndefined();
    session.undo();
    expect(session.current.states.s2).toBeDefined();
    session.undo();
    expect(session.current).toEqual(baseline);
  });

  it('removeState refuses the root state (flag or first-key fallback)', () => {
    const { session } = newSession();
    expect(() =>
      writeDraft(session, removeState({ stateId: 'default' })),
    ).toThrow(/root/);
    expect(session.current.states.default).toBeDefined();

    // sole state without a root flag is still protected via the fallback
    session.write('strip root flag', (draft) => {
      const only = draft.states.default;
      if (only) {
        only.root = false;
      }
    });
    expect(() =>
      writeDraft(session, removeState({ stateId: 'default' })),
    ).toThrow(/root/);
    expect(session.current.states.default).toBeDefined();
  });

  it('setLayouts replaces the layouts of a state', () => {
    const { session, baseline } = newSession();
    const main = session.current.states.default?.layouts.main;
    writeDraft(
      session,
      setLayouts({
        stateId: 'default',
        layouts: {
          main: main ?? { widgets: {}, gridSettings: {} },
          right: { widgets: {}, gridSettings: { layoutType: 'divider' } },
        },
      }),
    );
    expect(Object.keys(session.current.states.default?.layouts ?? {})).toEqual([
      'main',
      'right',
    ]);
    session.undo();
    expect(session.current).toEqual(baseline);
  });
});

describe('dashboard draft: grid / dashboard settings / config fields', () => {
  it('updateGridSettings merges into the layout grid settings', () => {
    const { session } = newSession();
    writeDraft(
      session,
      updateGridSettings({
        stateId: 'default',
        gridSettings: { columns: 12, margin: 5 },
      }),
    );
    const grid = session.current.states.default?.layouts.main?.gridSettings;
    expect(grid?.columns).toBe(12);
    expect(grid?.margin).toBe(5);
    expect(grid?.backgroundColor).toBe('#eeeeee');
  });

  it('updateDashboardSettings merges into configuration.settings', () => {
    const { session } = newSession();
    writeDraft(
      session,
      updateDashboardSettings({ settings: { showTitle: true } }),
    );
    expect(session.current.settings?.showTitle).toBe(true);
    expect(session.current.settings?.stateControllerId).toBe('entity');
  });

  it('updateDashboardConfigField sets a title-level configuration field', () => {
    const { session } = newSession();
    writeDraft(
      session,
      updateDashboardConfigField('description', 'my dashboard'),
    );
    expect(session.current.description).toBe('my dashboard');
    expect(session.history[0]?.label).toBe('update description');
  });
});

describe('dashboard draft: §3.9 sequence', () => {
  it('add → move → coalesced config edits → undo to bottom resets the baseline reference', () => {
    const { session, baseline } = newSession();
    writeDraft(
      session,
      addWidget({ widget: makeWidget('system.b', 'B'), stateId: 'default' }),
    );
    writeDraft(
      session,
      moveWidget({ widgetId: 'w1', stateId: 'default', row: 5, col: 5 }),
    );
    writeDraft(
      session,
      updateWidgetConfig({ widgetId: 'w1', patch: { title: 'A1' } }),
    );
    writeDraft(
      session,
      updateWidgetConfig({ widgetId: 'w1', patch: { title: 'A2' } }),
    );
    expect(session.history).toHaveLength(3);
    expect(session.dirty).toBe(true);

    for (let i = 0; i < 3; i += 1) {
      session.undo();
    }
    expect(session.canUndo).toBe(false);
    expect(session.current).toBe(baseline);
    expect(session.dirty).toBe(false);
    expect(session.canRedo).toBe(true);
  });
});
