/**
 * Editor feature-memory clipboard (M7 brief §2, ADR 0004 §2): an in-module
 * singleton — NOT localStorage (dirty lifecycle, no cross-UI value after the
 * one-step switch). BroadcastChannel remains a future cross-tab upgrade.
 *
 * Two tiers, ui-ngx item-buffer.service parity:
 *  - 'copy'      : deep widget copies; paste regenerates the widget-map
 *                  guids (dashboard-draft pasteWidgets — ONE group).
 *  - 'reference' : only the widget ids + source placement travel; paste
 *                  adds NEW LAYOUT ENTRIES pointing at the SAME widgets-map
 *                  ids (ui-ngx addWidgetToLayout: `if (!widgets[widget.id])
 *                  widgets[widget.id] = widget` — the map entry is shared,
 *                  config edits reflect everywhere). Guarded like
 *                  canPasteWidgetReference: same dashboard, a target
 *                  state/layout pair different from the source, and the
 *                  widget must still exist.
 */

import { getRootStateId } from '@/core/dashboard/model';
import {
  type CopiedWidget,
  copyWidgets,
  type DashboardDraftWrite,
  pasteWidgets,
  writeDraft,
} from '@/core/editor/dashboard-draft';
import type { EditorSession } from '@/core/editor/session';
import type {
  DashboardConfiguration,
  DashboardLayoutId,
} from '@/types/tb/dashboard';

export type ClipboardMode = 'copy' | 'reference';

export interface ClipboardSourceInfo {
  dashboardId?: string;
  stateId: string;
  layoutId: DashboardLayoutId;
}

export interface EditorClipboard {
  mode: ClipboardMode;
  /** deep copies (mode 'copy'). */
  widgets: CopiedWidget[];
  /** widget-map ids (mode 'reference'). */
  widgetIds: string[];
  sourceInfo: ClipboardSourceInfo;
}

let current: EditorClipboard | null = null;

export function getClipboard(): EditorClipboard | null {
  return current;
}

export function setClipboard(clip: EditorClipboard): void {
  current = clip;
}

export function clearClipboard(): void {
  current = null;
}

export function hasClipboard(): boolean {
  return current !== null;
}

/** Extract + store copies (ctrl+c / 复制 menu). */
export function copyWidgetsToClipboard(args: {
  configuration: DashboardConfiguration;
  widgetIds: string[];
  stateId?: string;
  layoutId?: DashboardLayoutId;
  dashboardId?: string;
}): number {
  const widgets = copyWidgets(args);
  if (widgets.length === 0) {
    return 0;
  }
  const stateId = args.stateId ?? getRootStateId(args.configuration.states);
  const layoutId = args.layoutId ?? 'main';
  setClipboard({
    mode: 'copy',
    widgets,
    widgetIds: [],
    sourceInfo: {
      dashboardId: args.dashboardId,
      stateId,
      layoutId,
    },
  });
  return widgets.length;
}

/** Store id references only (ctrl+r / 复制引用 menu). */
export function copyWidgetReferencesToClipboard(args: {
  configuration: DashboardConfiguration;
  widgetIds: string[];
  stateId?: string;
  layoutId?: DashboardLayoutId;
  dashboardId?: string;
}): number {
  const stateId = args.stateId ?? getRootStateId(args.configuration.states);
  const layoutId = args.layoutId ?? 'main';
  const ids = args.widgetIds.filter(
    (id) =>
      args.configuration.widgets[id] &&
      args.configuration.states[stateId]?.layouts[layoutId]?.widgets[id],
  );
  if (ids.length === 0) {
    return 0;
  }
  setClipboard({
    mode: 'reference',
    widgets: [],
    widgetIds: ids,
    sourceInfo: {
      dashboardId: args.dashboardId,
      stateId,
      layoutId,
    },
  });
  return ids.length;
}

/**
 * ui-ngx canPasteWidgetReference parity: same dashboard, target pair
 * different from the source, and every referenced widget still exists.
 */
export function canPasteWidgetReference(args: {
  configuration: DashboardConfiguration;
  dashboardId?: string;
  stateId: string;
  layoutId?: DashboardLayoutId;
}): boolean {
  const clip = current;
  if (clip?.mode !== 'reference') {
    return false;
  }
  if (
    clip.sourceInfo.dashboardId &&
    clip.sourceInfo.dashboardId !== args.dashboardId
  ) {
    return false;
  }
  const targetLayoutId = args.layoutId ?? 'main';
  const sameTarget =
    clip.sourceInfo.stateId === args.stateId &&
    clip.sourceInfo.layoutId === targetLayoutId;
  if (sameTarget) {
    return false;
  }
  const targetLayout =
    args.configuration.states[args.stateId]?.layouts[targetLayoutId];
  if (!targetLayout) {
    return false;
  }
  return clip.widgetIds.every((id) => Boolean(args.configuration.widgets[id]));
}

/**
 * Reference-paste transaction: new layout entries for the SAME widget ids
 * in the target layout (geometry copied from the source placement, ids
 * already present in the target layout are skipped), one group.
 */
export function pasteWidgetReferences(input: {
  clip: EditorClipboard;
  stateId: string;
  layoutId?: DashboardLayoutId;
}): DashboardDraftWrite {
  const { clip, stateId, layoutId } = input;
  const targetLayoutId = layoutId ?? 'main';
  return {
    label: 'paste widget references',
    recipe: (draft) => {
      const target = draft.states[stateId]?.layouts[targetLayoutId];
      if (!target) {
        return;
      }
      for (const id of clip.widgetIds) {
        if (!draft.widgets[id] || target.widgets[id]) {
          continue;
        }
        const sourceEntry =
          draft.states[clip.sourceInfo.stateId]?.layouts[
            clip.sourceInfo.layoutId
          ]?.widgets[id];
        // draft reads are immer proxies — never structuredClone them; a
        // spread/json round-trip unwraps to plain data
        target.widgets[id] = sourceEntry
          ? { ...sourceEntry }
          : { row: 0, col: 0, sizeX: 8, sizeY: 6 };
      }
    },
  };
}

/**
 * Paste the current clipboard into a target layout as ONE transaction
 * group. Returns the number of widgets pasted (0 = nothing to do).
 */
export function pasteFromClipboard(args: {
  session: EditorSession<DashboardConfiguration>;
  configuration: DashboardConfiguration;
  stateId: string;
  layoutId?: DashboardLayoutId;
  dashboardId?: string;
}): number {
  const clip = current;
  if (!clip) {
    return 0;
  }
  const targetLayoutId = args.layoutId ?? 'main';
  if (
    clip.mode === 'reference' &&
    !canPasteWidgetReference({
      configuration: args.configuration,
      dashboardId: args.dashboardId,
      stateId: args.stateId,
      layoutId: targetLayoutId,
    })
  ) {
    return 0;
  }
  if (clip.mode === 'copy') {
    writeDraft(
      args.session,
      pasteWidgets({
        widgets: clip.widgets,
        stateId: args.stateId,
        layoutId: targetLayoutId,
      }),
    );
    return clip.widgets.length;
  }
  writeDraft(
    args.session,
    pasteWidgetReferences({
      clip,
      stateId: args.stateId,
      layoutId: targetLayoutId,
    }),
  );
  return clip.widgetIds.length;
}

/**
 * ui-ngx isReferenceWidget parity: a widget is a "reference" when it has
 * MORE THAN ONE placement entry across every state/layout/breakpoint.
 */
export function isReferenceWidget(
  configuration: DashboardConfiguration,
  widgetId: string,
): boolean {
  let found = 0;
  for (const state of Object.values(configuration.states)) {
    for (const layout of Object.values(state.layouts)) {
      if (layout.widgets[widgetId]) {
        found += 1;
      }
      const breakpoints = layout.breakpoints as
        | Record<string, { widgets: Record<string, unknown> }>
        | undefined;
      if (breakpoints) {
        for (const breakpoint of Object.values(breakpoints)) {
          if (breakpoint?.widgets?.[widgetId]) {
            found += 1;
          }
        }
      }
    }
  }
  return found > 1;
}

/**
 * Which standard layout of `stateId` currently places the widget (menus
 * need the owning layout for copy/reference/remove targets).
 */
export function findWidgetLayout(
  configuration: DashboardConfiguration,
  stateId: string,
  widgetId: string,
): DashboardLayoutId | null {
  const state = configuration.states[stateId];
  if (!state) {
    return null;
  }
  for (const layoutId of ['main', 'right'] as const) {
    if (state.layouts[layoutId]?.widgets[widgetId]) {
      return layoutId;
    }
  }
  return null;
}

/**
 * 引用转副本 (ui-ngx replaceReferenceWithWidgetCopy): deep-copies the
 * widget under a fresh guid, retargets THIS layout entry to the copy and
 * leaves every other placement on the shared original — one group.
 */
export function replaceReferenceWithCopy(input: {
  widgetId: string;
  stateId: string;
  layoutId?: DashboardLayoutId;
}): DashboardDraftWrite {
  const { widgetId, stateId, layoutId } = input;
  const targetLayoutId = layoutId ?? 'main';
  return {
    label: 'replace reference with copy',
    recipe: (draft) => {
      const widget = draft.widgets[widgetId];
      const layout = draft.states[stateId]?.layouts[targetLayoutId];
      const entry = layout?.widgets[widgetId];
      if (!widget || !layout || !entry) {
        return;
      }
      // dashboard configuration is pure JSON — a json round-trip is the
      // deep copy (and unwraps immer proxies, which cannot be cloned)
      const copy = JSON.parse(JSON.stringify(widget)) as typeof widget;
      const newId = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `widget-${Math.random().toString(36).slice(2)}`;
      draft.widgets[newId] = copy;
      layout.widgets[newId] = { ...entry };
      delete layout.widgets[widgetId];
    },
  };
}
