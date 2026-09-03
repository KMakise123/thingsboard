/**
 * Clipboard unit tests (spec §3.2 paste combos): copy/paste + reference
 * copy/paste semantics, guid regeneration, one-transaction-group pastes,
 * the canPasteWidgetReference guard and the reference→copy conversion.
 */
import { describe, expect, it } from 'vitest';

import {
  getRootStateId,
  validateAndUpdateDashboard,
} from '@/core/dashboard/model';
import { writeDraft } from '@/core/editor/dashboard-draft';
import { EditorSession } from '@/core/editor/session';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

import {
  canPasteWidgetReference,
  copyWidgetReferencesToClipboard,
  copyWidgetsToClipboard,
  findWidgetLayout,
  getClipboard,
  isReferenceWidget,
  pasteFromClipboard,
  replaceReferenceWithCopy,
} from './clipboard';

function dashboardJson(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Demo',
    version: 3,
    configuration: {
      widgets: {
        w1: { typeFullFqn: 'system.cards.html_value_card', config: {} },
      },
      states: {
        default: {
          name: 'Root',
          root: true,
          layouts: {
            main: {
              widgets: {
                w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 },
              },
              gridSettings: { columns: 24, margin: 10 },
            },
            right: {
              widgets: {},
              gridSettings: { columns: 24, margin: 10 },
            },
          },
        },
      },
      entityAliases: {
        aliasA: {
          id: 'aliasA',
          alias: 'All devices',
          filter: { type: 'entityType', entityType: 'DEVICE' },
        },
      },
    },
  } as unknown as Dashboard;
}

function normalize(json: Dashboard): DashboardConfiguration {
  return validateAndUpdateDashboard(json)
    .configuration as DashboardConfiguration;
}

function sessionOf(configuration: DashboardConfiguration) {
  return new EditorSession<DashboardConfiguration>({ baseline: configuration });
}

describe('editor clipboard — copy tier', () => {
  it('paste regenerates the widget-map guid and commits ONE group', () => {
    const before = normalize(dashboardJson());
    const session = sessionOf(before);
    copyWidgetsToClipboard({
      configuration: before,
      widgetIds: ['w1'],
      stateId: 'default',
      layoutId: 'main',
      dashboardId: 'd1',
    });
    const pasted = pasteFromClipboard({
      session,
      configuration: before,
      stateId: 'default',
      layoutId: 'main',
      dashboardId: 'd1',
    });
    expect(pasted).toBe(1);
    expect(session.history).toHaveLength(1); // ONE transaction group
    const after = session.current;
    expect(Object.keys(after.widgets)).toHaveLength(2);
    const newId = Object.keys(after.widgets).find((id) => id !== 'w1');
    expect(newId).toBeTruthy();
    expect(newId).not.toBe('w1'); // guid regenerated (the map key IS the id)
    expect(after.widgets[newId as string].typeFullFqn).toBe(
      'system.cards.html_value_card',
    );
    // alias references pass through untouched
    expect(after.entityAliases.aliasA).toBeDefined();
    // placement preserved verbatim (no `at`)
    expect(after.states.default.layouts.main?.widgets[newId as string]).toEqual(
      {
        sizeX: 8,
        sizeY: 6,
        row: 0,
        col: 0,
      },
    );
  });

  it('undo after paste removes the pasted widgets (single group revert)', () => {
    const before = normalize(dashboardJson());
    const session = sessionOf(before);
    copyWidgetsToClipboard({
      configuration: before,
      widgetIds: ['w1'],
      stateId: 'default',
    });
    pasteFromClipboard({
      session,
      configuration: before,
      stateId: 'default',
    });
    session.undo();
    expect(Object.keys(session.current.widgets)).toEqual(['w1']);
    expect(session.dirty).toBe(false); // 引用复位锚定
  });

  it('multi-widget paste keeps the relative arrangement', () => {
    const json = dashboardJson();
    const config = json.configuration as unknown as {
      widgets: Record<string, unknown>;
      states: {
        default: { layouts: { main: { widgets: Record<string, unknown> } } };
      };
    };
    config.widgets.w2 = { typeFullFqn: 'system.map', config: {} };
    config.states.default.layouts.main.widgets.w2 = {
      sizeX: 4,
      sizeY: 3,
      row: 10,
      col: 6,
    };
    const before = normalize(json);
    const session = sessionOf(before);
    copyWidgetsToClipboard({
      configuration: before,
      widgetIds: ['w1', 'w2'],
      stateId: 'default',
    });
    pasteFromClipboard({
      session,
      configuration: before,
      stateId: 'default',
    });
    expect(session.history).toHaveLength(1);
    const pasted = session.current.states.default.layouts.main?.widgets ?? {};
    const entries = Object.entries(pasted).filter(
      ([id]) => id !== 'w1' && id !== 'w2',
    );
    expect(entries).toHaveLength(2);
    const [a, b] = entries.map(
      ([, entry]) =>
        entry as {
          row: number;
          col: number;
        },
    );
    expect(b.row - a.row).toBe(10); // relative geometry preserved
    expect(b.col - a.col).toBe(6);
  });
});

describe('editor clipboard — reference tier', () => {
  it('reference paste adds a layout entry for the SAME widget id, no new map entry', () => {
    const before = normalize(dashboardJson());
    const session = sessionOf(before);
    copyWidgetReferencesToClipboard({
      configuration: before,
      widgetIds: ['w1'],
      stateId: 'default',
      layoutId: 'main',
      dashboardId: 'd1',
    });
    const pasted = pasteFromClipboard({
      session,
      configuration: before,
      stateId: 'default',
      layoutId: 'right',
      dashboardId: 'd1',
    });
    expect(pasted).toBe(1);
    expect(session.history).toHaveLength(1); // ONE group
    const after = session.current;
    expect(Object.keys(after.widgets)).toEqual(['w1']); // map NOT duplicated
    expect(after.states.default.layouts.right?.widgets.w1).toBeDefined();
    expect(after.states.default.layouts.main?.widgets.w1).toBeDefined();
  });

  it('canPasteWidgetReference: same layout false, other layout true, deleted widget false', () => {
    const before = normalize(dashboardJson());
    copyWidgetReferencesToClipboard({
      configuration: before,
      widgetIds: ['w1'],
      stateId: 'default',
      layoutId: 'main',
      dashboardId: 'd1',
    });
    const guard = (
      configuration: DashboardConfiguration,
      layoutId: 'main' | 'right',
    ) =>
      canPasteWidgetReference({
        configuration,
        dashboardId: 'd1',
        stateId: 'default',
        layoutId,
      });
    expect(guard(before, 'main')).toBe(false); // same source layout
    expect(guard(before, 'right')).toBe(true);
    // widget deleted from the map → reference invalid
    const withoutWidget = normalize(dashboardJson());
    delete withoutWidget.widgets.w1;
    expect(guard(withoutWidget, 'right')).toBe(false);
    expect(getClipboard()?.mode).toBe('reference');
  });

  it('isReferenceWidget: true only with more than one placement', () => {
    const before = normalize(dashboardJson());
    expect(isReferenceWidget(before, 'w1')).toBe(false);
    const rightLayout = before.states.default.layouts as Record<
      string,
      { widgets: Record<string, unknown> }
    >;
    rightLayout.right.widgets.w1 = {
      sizeX: 8,
      sizeY: 6,
      row: 0,
      col: 0,
    };
    expect(isReferenceWidget(before, 'w1')).toBe(true);
    expect(findWidgetLayout(before, 'default', 'w1')).toBe('main');
  });

  it('replaceReferenceWithCopy: fresh guid entry, layout retargeted, one group', () => {
    const before = normalize(dashboardJson());
    const rightLayout = before.states.default.layouts as Record<
      string,
      { widgets: Record<string, unknown> }
    >;
    rightLayout.right.widgets.w1 = {
      sizeX: 4,
      sizeY: 4,
      row: 2,
      col: 2,
    };
    const session = sessionOf(before);
    writeDraft(
      session,
      replaceReferenceWithCopy({
        widgetId: 'w1',
        stateId: 'default',
        layoutId: 'right',
      }),
    );
    expect(session.history).toHaveLength(1);
    const after = session.current;
    const ids = Object.keys(after.widgets);
    expect(ids).toHaveLength(2);
    const copyId = ids.find((id) => id !== 'w1');
    expect(copyId).not.toBe('w1');
    const layouts = after.states.default.layouts;
    // the RIGHT layout entry moved to the copy
    expect(layouts.right?.widgets[copyId as string]).toBeDefined();
    expect(layouts.right?.widgets.w1).toBeUndefined();
    // the MAIN layout still points at the shared original
    expect(layouts.main?.widgets.w1).toBeDefined();
  });
});

describe('editor clipboard — root state fallback', () => {
  it('copy without explicit stateId uses the root state', () => {
    const before = normalize(dashboardJson());
    copyWidgetsToClipboard({
      configuration: before,
      widgetIds: ['w1'],
    });
    expect(getClipboard()?.sourceInfo.stateId).toBe(
      getRootStateId(before.states),
    );
  });
});
