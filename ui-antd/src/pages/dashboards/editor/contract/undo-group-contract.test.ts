/**
 * §3.9 行为契约 — the structural-op → transaction-group matrix, pinned at
 * the draft-recipe seam the canvas/dialogs actually call
 * (core/editor/dashboard-draft). One structural operation = exactly ONE
 * undo group carrying the contract label:
 *
 *   添加 'add widget' / 删除 'remove widget' / 拖拽落格 'move widget' /
 *   resize 'resize widget' / 粘贴 'paste widgets'（copy + reference 两种剪
 *   贴板形态都是一组）.
 *
 * Session mechanics (coalescing, redo-clear, checkpoint, patch budget,
 * save semantics) are pinned by core/editor/session.test.ts; the
 * save-≠-checkpoint dashboard flow is pinned by
 * contract/save-with-conflict.test.ts — this file references, not repeats.
 */
import { describe, expect, it } from 'vitest';
import {
  addWidget,
  moveWidget,
  removeWidget,
  resizeWidget,
  writeDraft,
} from '@/core/editor/dashboard-draft';
import { EditorSession } from '@/core/editor/session';
import {
  copyWidgetReferencesToClipboard,
  copyWidgetsToClipboard,
  getClipboard,
  pasteFromClipboard,
} from '@/pages/dashboards/editor/clipboard';
import type { DashboardConfiguration, EntityAlias } from '@/types/tb/dashboard';
import type { Widget } from '@/types/tb/widget';

function baseline(): DashboardConfiguration {
  return {
    widgets: {
      w1: { typeFullFqn: 'system.cards.test', config: {} } as Widget,
    },
    states: {
      default: {
        name: 'Root',
        root: true,
        layouts: {
          main: {
            widgets: { w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 } },
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
      a1: {
        id: 'a1',
        alias: 'A',
        filter: { type: 'entityType', entityType: 'DEVICE' },
      } as EntityAlias,
    },
  } as DashboardConfiguration;
}

function makeSession(): EditorSession<DashboardConfiguration> {
  return new EditorSession<DashboardConfiguration>({ baseline: baseline() });
}

const MAIN = { stateId: 'default', layoutId: 'main' } as const;

describe('§3.9 structural ops — one transaction group each (contract labels)', () => {
  it('add widget → one group labeled "add widget"', () => {
    const session = makeSession();
    writeDraft(
      session,
      addWidget({
        widget: { typeFullFqn: 'system.cards.test', config: {} } as Widget,
        ...MAIN,
        placement: { row: 6, col: 0 },
      }),
    );
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('add widget');
    expect(session.dirty).toBe(true);
  });

  it('remove widget → one group labeled "remove widget" (no orphans across layouts)', () => {
    const session = makeSession();
    writeDraft(session, removeWidget({ widgetId: 'w1' }));
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('remove widget');
    expect(Object.keys(session.current.widgets)).toEqual([]);
  });

  it('drop/move widget → one group labeled "move widget"', () => {
    const session = makeSession();
    writeDraft(
      session,
      moveWidget({ widgetId: 'w1', ...MAIN, row: 4, col: 8 }),
    );
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('move widget');
    expect(
      session.current.states.default.layouts?.main?.widgets.w1,
    ).toMatchObject({ row: 4, col: 8 });
  });

  it('resize widget → one group labeled "resize widget"', () => {
    const session = makeSession();
    writeDraft(
      session,
      resizeWidget({ widgetId: 'w1', ...MAIN, sizeX: 12, sizeY: 4 }),
    );
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('resize widget');
    expect(
      session.current.states.default.layouts?.main?.widgets.w1,
    ).toMatchObject({ sizeX: 12, sizeY: 4 });
  });

  it('paste (copy clipboard) → one group labeled "paste widgets"', () => {
    const session = makeSession();
    const configuration = session.current;
    copyWidgetsToClipboard({
      configuration,
      widgetIds: ['w1'],
      ...MAIN,
      dashboardId: 'd1',
    });
    expect(getClipboard()?.mode).toBe('copy');
    const pasted = pasteFromClipboard({
      session,
      configuration,
      ...MAIN,
      dashboardId: 'd1',
    });
    expect(pasted).toBe(1);
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('paste widgets');
  });

  it('paste (reference clipboard) is ALSO one group — 含引用组 (ui-ngx same-widget-ids parity)', () => {
    const session = makeSession();
    const configuration = session.current;
    copyWidgetReferencesToClipboard({
      configuration,
      widgetIds: ['w1'],
      stateId: 'default',
      layoutId: 'main',
      dashboardId: 'd1',
    });
    expect(getClipboard()?.mode).toBe('reference');
    // reference paste requires a DIFFERENT target pair than the source
    const pasted = pasteFromClipboard({
      session,
      configuration,
      stateId: 'default',
      layoutId: 'right',
      dashboardId: 'd1',
    });
    expect(pasted).toBe(1);
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('paste widget references');
    // the SAME widget id gained a placement in the right layout
    expect(
      session.current.states.default.layouts?.right?.widgets.w1,
    ).toMatchObject({ row: 0, col: 0 });
  });
});

describe('§3.9 stack discipline at the recipe seam', () => {
  it('a sequence of structural ops yields one group per op, in order, with the labels an undo menu renders', () => {
    const session = makeSession();
    writeDraft(
      session,
      addWidget({
        widget: { typeFullFqn: 'system.cards.test', config: {} } as Widget,
        ...MAIN,
        placement: { row: 6, col: 0 },
      }),
    );
    writeDraft(
      session,
      resizeWidget({ widgetId: 'w1', ...MAIN, sizeX: 4, sizeY: 4 }),
    );
    writeDraft(
      session,
      moveWidget({ widgetId: 'w1', ...MAIN, row: 2, col: 2 }),
    );
    expect(session.history.map((group) => group.label)).toEqual([
      'add widget',
      'resize widget',
      'move widget',
    ]);
    expect(session.canRedo).toBe(false);
  });

  it('any new group clears the redo stack (undo → new write → redo lost)', () => {
    const session = makeSession();
    writeDraft(
      session,
      resizeWidget({ widgetId: 'w1', ...MAIN, sizeX: 4, sizeY: 4 }),
    );
    session.undo();
    expect(session.canRedo).toBe(true);
    writeDraft(
      session,
      moveWidget({ widgetId: 'w1', ...MAIN, row: 1, col: 1 }),
    );
    expect(session.canRedo).toBe(false);
    expect(session.history).toHaveLength(1);
  });

  it('each structural op is individually undoable back to the entered baseline', () => {
    const session = makeSession();
    writeDraft(
      session,
      addWidget({
        widget: { typeFullFqn: 'system.cards.test', config: {} } as Widget,
        ...MAIN,
        placement: { row: 6, col: 0 },
      }),
    );
    writeDraft(session, removeWidget({ widgetId: 'w1' }));
    session.undo();
    session.undo();
    expect(session.dirty).toBe(false); // 引用复位锚定 — §3.8 leave precision
    expect(session.canRedo).toBe(true);
  });
});
