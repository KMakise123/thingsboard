/**
 * Typed transaction recipes over the normalized DashboardConfiguration
 * (M7 brief §2 — "dashboard-draft.ts 仪表盘草稿动作集").
 *
 * Each wrapper returns a `DashboardDraftWrite` bundle (label + pure
 * `(draft) => void` recipe + optional coalesceKey) so the canvas/panels
 * commit through the one and only writer:
 *
 *   writeDraft(session, addWidget({ widget, stateId }));
 *   // = session.write(write.label, write.recipe, { coalesceKey })
 *
 * Conventions (core/dashboard/model.ts normalization contract):
 *  - `configuration.widgets` is a Record<widgetId, Widget>; the widget map
 *    key is the widget's uuid — `pasteWidgets` regenerates exactly that,
 *    remapping nothing else (alias/filter references pass through).
 *  - The authoritative placement lives in
 *    `states[id].layouts[main|right].widgets[widgetId]` (WidgetLayout);
 *    `widget.row/col/sizeX/sizeY` are legacy fields and are left untouched.
 *  - The root state is untouchable (`removeState` throws on the root-flagged
 *    state or the getRootStateId first-key fallback).
 *  - Every inserted value is deep-cloned, so the draft never aliases caller
 *    or clipboard objects (immer auto-freeze would leak into them).
 */

import { createDefaultState, getRootStateId } from '@/core/dashboard/model';
import type {
  DashboardBreakpointId,
  DashboardConfiguration,
  DashboardFilter,
  DashboardLayout,
  DashboardLayoutId,
  DashboardSettings,
  DashboardState,
  EntityAlias,
  GridSettings,
} from '@/types/tb/dashboard';
import type { Widget, WidgetConfig, WidgetLayout } from '@/types/tb/widget';
import type { EditorSession } from './session';

/** A committed-through-`writeDraft` transaction bundle. */
export interface DashboardDraftWrite {
  label: string;
  recipe: (draft: DashboardConfiguration) => void;
  coalesceKey?: string;
}

/** Widget instance + its placement in one state layout (clipboard shape). */
export interface CopiedWidget {
  widget: Widget;
  layout: WidgetLayout;
}

/**
 * Widget-map id generator — mirrors the inline fallback in
 * core/dashboard/model.ts normalizeWidgets (that helper is intentionally not
 * exported; model.ts is outside this module's file ownership).
 */
export function generateWidgetId(): string {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `widget-${Math.random().toString(36).slice(2)}`;
}

/** Commits a recipe bundle through the session's single writer. */
export function writeDraft(
  session: EditorSession<DashboardConfiguration>,
  write: DashboardDraftWrite,
): void {
  session.write(write.label, write.recipe, {
    coalesceKey: write.coalesceKey,
  });
}

// ---------------------------------------------------------------------------
// Widget lifecycle
// ---------------------------------------------------------------------------

export interface AddWidgetInput {
  widget: Widget;
  stateId: string;
  layoutId?: DashboardLayoutId;
  placement?: Partial<Pick<WidgetLayout, 'row' | 'col' | 'sizeX' | 'sizeY'>>;
}

/** One transaction group: widget map insert + layout entry (defaults 8x6@0,0). */
export function addWidget(input: AddWidgetInput): DashboardDraftWrite {
  const { widget, stateId, layoutId, placement } = input;
  return {
    label: 'add widget',
    recipe: (draft): void => {
      const layout = requireLayout(draft, stateId, layoutId);
      const id = generateWidgetId();
      draft.widgets[id] = clone(widget);
      layout.widgets[id] = {
        row: 0,
        col: 0,
        sizeX: 8,
        sizeY: 6,
        ...placement,
      };
    },
  };
}

export interface RemoveWidgetInput {
  widgetId: string;
}

/**
 * Removes the widget plus its placement entries in EVERY state/layout
 * (including breakpoint-scoped copies) — no orphans survive.
 */
export function removeWidget(input: RemoveWidgetInput): DashboardDraftWrite {
  const { widgetId } = input;
  return {
    label: 'remove widget',
    recipe: (draft): void => {
      delete draft.widgets[widgetId];
      for (const state of Object.values(draft.states)) {
        for (const layout of Object.values(state.layouts)) {
          delete layout.widgets[widgetId];
          const breakpoints = layout.breakpoints;
          if (breakpoints) {
            for (const bpId of Object.keys(
              breakpoints,
            ) as DashboardBreakpointId[]) {
              // NOTE: Omit<DashboardLayout,'breakpoints'> degrades to
              // { [key: string]: unknown } because DashboardLayout carries an
              // index signature — read the widget record through a cast.
              const breakpoint = breakpoints[bpId] as
                | { widgets: Record<string, WidgetLayout> }
                | undefined;
              if (breakpoint) {
                delete breakpoint.widgets[widgetId];
              }
            }
          }
        }
      }
    },
  };
}

export interface MoveWidgetInput {
  widgetId: string;
  stateId: string;
  layoutId?: DashboardLayoutId;
  row: number;
  col: number;
}

/** Drag-drop landing: patches row/col of the layout entry (§3.9 one group). */
export function moveWidget(input: MoveWidgetInput): DashboardDraftWrite {
  const { widgetId, stateId, layoutId, row, col } = input;
  return {
    label: 'move widget',
    recipe: (draft): void => {
      const entry = requireWidgetLayoutEntry(
        draft,
        widgetId,
        stateId,
        layoutId,
      );
      entry.row = row;
      entry.col = col;
    },
  };
}

export interface ResizeWidgetInput {
  widgetId: string;
  stateId: string;
  layoutId?: DashboardLayoutId;
  sizeX: number;
  sizeY: number;
}

export function resizeWidget(input: ResizeWidgetInput): DashboardDraftWrite {
  const { widgetId, stateId, layoutId, sizeX, sizeY } = input;
  return {
    label: 'resize widget',
    recipe: (draft): void => {
      const entry = requireWidgetLayoutEntry(
        draft,
        widgetId,
        stateId,
        layoutId,
      );
      entry.sizeX = sizeX;
      entry.sizeY = sizeY;
    },
  };
}

export interface UpdateWidgetConfigInput {
  widgetId: string;
  patch: Partial<WidgetConfig>;
}

/**
 * Shallow merge into `widgets[id].config`. Consecutive edits of the same
 * widget coalesce into one transaction (`${widgetId}:config`) — the §3.9
 * "表单连续输入合并一步" clause.
 */
export function updateWidgetConfig(
  input: UpdateWidgetConfigInput,
): DashboardDraftWrite {
  const { widgetId, patch } = input;
  return {
    label: 'update widget config',
    coalesceKey: `${widgetId}:config`,
    recipe: (draft): void => {
      const widget = draft.widgets[widgetId];
      if (!widget) {
        throw new Error(`widget "${widgetId}" not found`);
      }
      widget.config = { ...widget.config, ...clone(patch) };
    },
  };
}

export interface UpdateWidgetLayoutInput {
  widgetId: string;
  stateId: string;
  layoutId?: DashboardLayoutId;
  layout: Partial<WidgetLayout>;
}

/** Merges non-geometry layout flags (desktopHide/mobileHeight/…). */
export function updateWidgetLayout(
  input: UpdateWidgetLayoutInput,
): DashboardDraftWrite {
  const { widgetId, stateId, layoutId, layout } = input;
  return {
    label: 'update widget layout',
    recipe: (draft): void => {
      const entry = requireWidgetLayoutEntry(
        draft,
        widgetId,
        stateId,
        layoutId,
      );
      Object.assign(entry, clone(layout));
    },
  };
}

// ---------------------------------------------------------------------------
// Paste / copy
// ---------------------------------------------------------------------------

export interface PasteWidgetsInput {
  widgets: CopiedWidget[];
  stateId: string;
  layoutId?: DashboardLayoutId;
  /** Landing top-left; omitted = keep the copied geometry verbatim. */
  at?: { row: number; col: number };
}

/**
 * One transaction group: every pasted widget gets a fresh generated id (the
 * map key IS the guid); relative arrangement is preserved against `at`;
 * alias/filter references are NOT remapped. Payload objects are cloned, so
 * the clipboard stays independent.
 */
export function pasteWidgets(input: PasteWidgetsInput): DashboardDraftWrite {
  const { widgets, stateId, layoutId, at } = input;
  return {
    label: 'paste widgets',
    recipe: (draft): void => {
      if (widgets.length === 0) {
        return;
      }
      const layout = requireLayout(draft, stateId, layoutId);
      const minRow = Math.min(...widgets.map((copied) => copied.layout.row));
      const minCol = Math.min(...widgets.map((copied) => copied.layout.col));
      for (const copied of widgets) {
        const id = generateWidgetId();
        draft.widgets[id] = clone(copied.widget);
        const entry = clone(copied.layout);
        if (at) {
          entry.row = at.row + (copied.layout.row - minRow);
          entry.col = at.col + (copied.layout.col - minCol);
        }
        layout.widgets[id] = entry;
      }
    },
  };
}

export interface CopyWidgetsInput {
  configuration: DashboardConfiguration;
  widgetIds: string[];
  stateId?: string;
  layoutId?: DashboardLayoutId;
}

/**
 * Pure extractor (NOT a draft write): returns plain deep copies for the
 * clipboard. Ids missing from the widget map or not placed in the target
 * layout are skipped.
 */
export function copyWidgets(input: CopyWidgetsInput): CopiedWidget[] {
  const { configuration, widgetIds, stateId, layoutId } = input;
  const resolvedStateId = stateId ?? getRootStateId(configuration.states);
  const layout =
    configuration.states[resolvedStateId]?.layouts[layoutId ?? 'main'];
  const copied: CopiedWidget[] = [];
  for (const widgetId of widgetIds) {
    const widget = configuration.widgets[widgetId];
    const layoutEntry = layout?.widgets[widgetId];
    if (widget && layoutEntry) {
      copied.push({
        widget: clone(widget),
        layout: clone(layoutEntry),
      });
    }
  }
  return copied;
}

// ---------------------------------------------------------------------------
// Entity aliases & filters
// ---------------------------------------------------------------------------

/** Insert-or-update an entity alias; consecutive edits coalesce per alias. */
export function upsertEntityAlias(alias: EntityAlias): DashboardDraftWrite {
  return {
    label: 'upsert entity alias',
    coalesceKey: `alias:${alias.id}`,
    recipe: (draft): void => {
      draft.entityAliases[alias.id] = clone(alias);
    },
  };
}

/**
 * Deletes the alias entry only. Referential integrity is the dialog's job
 * (TB blocks deletion while widgets still reference the alias).
 */
export function removeEntityAlias(aliasId: string): DashboardDraftWrite {
  return {
    label: 'remove entity alias',
    recipe: (draft): void => {
      delete draft.entityAliases[aliasId];
    },
  };
}

/** Insert-or-update a dashboard filter; consecutive edits coalesce per filter. */
export function updateFilter(filter: DashboardFilter): DashboardDraftWrite {
  return {
    label: 'update filter',
    coalesceKey: `filter:${filter.id}`,
    recipe: (draft): void => {
      draft.filters ??= {};
      draft.filters[filter.id] = clone(filter);
    },
  };
}

export function removeFilter(filterId: string): DashboardDraftWrite {
  return {
    label: 'remove filter',
    recipe: (draft): void => {
      delete draft.filters?.[filterId];
    },
  };
}

// ---------------------------------------------------------------------------
// States & layouts
// ---------------------------------------------------------------------------

export interface AddStateInput {
  stateId: string;
  name?: string;
}

/** New states are never root and start with a default main layout. */
export function addState(input: AddStateInput): DashboardDraftWrite {
  const { stateId, name } = input;
  return {
    label: 'add state',
    recipe: (draft): void => {
      if (draft.states[stateId]) {
        throw new Error(`state "${stateId}" already exists`);
      }
      draft.states[stateId] = createDefaultState(name ?? stateId, false);
    },
  };
}

export interface UpdateStateInput {
  stateId: string;
  name?: string;
}

export function updateState(input: UpdateStateInput): DashboardDraftWrite {
  const { stateId, name } = input;
  return {
    label: 'update state',
    recipe: (draft): void => {
      const state = requireState(draft, stateId);
      if (name !== undefined) {
        state.name = name;
      }
    },
  };
}

export interface RemoveStateInput {
  stateId: string;
}

/** The root state (flag or first-key fallback) is protected — throws. */
export function removeState(input: RemoveStateInput): DashboardDraftWrite {
  const { stateId } = input;
  return {
    label: 'remove state',
    recipe: (draft): void => {
      if (stateId === getRootStateId(draft.states)) {
        throw new Error(`cannot remove the root state "${stateId}"`);
      }
      delete draft.states[stateId];
    },
  };
}

export interface SetLayoutsInput {
  stateId: string;
  layouts: Partial<Record<DashboardLayoutId, DashboardLayout>>;
}

/** Whole-layouts replacement for a state (states dialogs add/remove layouts). */
export function setLayouts(input: SetLayoutsInput): DashboardDraftWrite {
  const { stateId, layouts } = input;
  return {
    label: 'set layouts',
    recipe: (draft): void => {
      const state = requireState(draft, stateId);
      state.layouts = clone(layouts);
    },
  };
}

// ---------------------------------------------------------------------------
// Grid settings / dashboard settings / top-level configuration fields
// ---------------------------------------------------------------------------

export interface UpdateGridSettingsInput {
  stateId: string;
  layoutId?: DashboardLayoutId;
  gridSettings: Partial<GridSettings>;
}

export function updateGridSettings(
  input: UpdateGridSettingsInput,
): DashboardDraftWrite {
  const { stateId, layoutId, gridSettings } = input;
  return {
    label: 'update grid settings',
    recipe: (draft): void => {
      const layout = requireLayout(draft, stateId, layoutId);
      layout.gridSettings = { ...layout.gridSettings, ...clone(gridSettings) };
    },
  };
}

export interface UpdateDashboardSettingsInput {
  settings: Partial<DashboardSettings>;
}

export function updateDashboardSettings(
  input: UpdateDashboardSettingsInput,
): DashboardDraftWrite {
  const { settings } = input;
  return {
    label: 'update dashboard settings',
    recipe: (draft): void => {
      draft.settings = { ...(draft.settings ?? {}), ...clone(settings) };
    },
  };
}

/**
 * Sets a top-level configuration field (title-level fields such as
 * `description`; works for any plain-data value).
 */
export function updateDashboardConfigField(
  field: string,
  value: unknown,
): DashboardDraftWrite {
  return {
    label: `update ${field}`,
    recipe: (draft): void => {
      draft[field] = clone(value);
    },
  };
}

// ---------------------------------------------------------------------------
// Guards & helpers
// ---------------------------------------------------------------------------

function requireState(
  draft: DashboardConfiguration,
  stateId: string,
): DashboardState {
  const state = draft.states[stateId];
  if (!state) {
    throw new Error(`state "${stateId}" not found`);
  }
  return state;
}

function requireLayout(
  draft: DashboardConfiguration,
  stateId: string,
  layoutId?: DashboardLayoutId,
): DashboardLayout {
  const state = requireState(draft, stateId);
  const layout = state.layouts[layoutId ?? 'main'];
  if (!layout) {
    throw new Error(
      `layout "${layoutId ?? 'main'}" not found in state "${stateId}"`,
    );
  }
  return layout;
}

function requireWidgetLayoutEntry(
  draft: DashboardConfiguration,
  widgetId: string,
  stateId: string,
  layoutId?: DashboardLayoutId,
): WidgetLayout {
  const layout = requireLayout(draft, stateId, layoutId);
  const entry = layout.widgets[widgetId];
  if (!entry) {
    throw new Error(
      `widget "${widgetId}" has no layout entry in state "${stateId}"` +
        (layoutId ? `/${layoutId}` : ''),
    );
  }
  return entry;
}

/** Drafts must own their data — immer auto-freeze would leak into shared refs. */
function clone<T>(value: T): T {
  return structuredClone(value);
}
