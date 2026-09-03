/**
 * Panel targeting + write plumbing (M7 wave K).
 *
 * The frozen panel props carry only `widgetId`; every section write needs
 * the owning (state, layout) pair, resolved here once per selection:
 * root state first, then any other state that places the widget — mirroring
 * clipboard.ts findWidgetLayout semantics but across ALL states.
 *
 * Config edits go through `updateWidgetConfig` (coalesceKey `id:config`,
 * §3.9 continuous-typing merge). Layout-flag edits go through
 * `updateWidgetLayout`. Breakpoint-scoped layout edits have no recipe in
 * dashboard-draft.ts, so the panel ships ONE labeled inline recipe here
 * (`update widget breakpoint layout`) — same discipline: session.write is
 * the only writer.
 */
import { getRootStateId } from '@/core/dashboard/model';
import {
  updateWidgetConfig,
  writeDraft,
  type DashboardDraftWrite,
} from '@/core/editor/dashboard-draft';
import type { EditorSession } from '@/core/editor/session';
import type {
  DashboardBreakpointId,
  DashboardConfiguration,
  DashboardLayoutId,
  GridSettings,
} from '@/types/tb/dashboard';
import type { WidgetConfig, WidgetLayout } from '@/types/tb/widget';

/** Widget id + the state/layout pair that places it. */
export interface PanelTarget {
  widgetId: string;
  stateId: string;
  layoutId: DashboardLayoutId;
}

const LAYOUT_IDS: readonly DashboardLayoutId[] = ['main', 'right'];

/**
 * Where is this widget placed? Root state first, then remaining states in
 * map order; main before right. null = widget unknown / not placed.
 */
export function resolvePanelTarget(
  configuration: DashboardConfiguration,
  widgetId: string,
): PanelTarget | null {
  if (!configuration.widgets[widgetId]) {
    return null;
  }
  const rootStateId = getRootStateId(configuration.states);
  const stateIds = [
    rootStateId,
    ...Object.keys(configuration.states).filter((id) => id !== rootStateId),
  ];
  for (const stateId of stateIds) {
    const state = configuration.states[stateId];
    if (!state) {
      continue;
    }
    for (const layoutId of LAYOUT_IDS) {
      if (state.layouts[layoutId]?.widgets[widgetId]) {
        return { widgetId, stateId, layoutId };
      }
    }
  }
  return null;
}

/** The default-placement layout entry of the targeted widget. */
export function panelLayoutOf(
  configuration: DashboardConfiguration,
  target: PanelTarget,
): WidgetLayout | undefined {
  return configuration.states[target.stateId]?.layouts[
    target.layoutId
  ]?.widgets[target.widgetId];
}

/** Grid settings of the layout the targeted widget lives in. */
export function panelGridSettingsOf(
  configuration: DashboardConfiguration,
  target: PanelTarget,
): GridSettings | undefined {
  return configuration.states[target.stateId]?.layouts[target.layoutId]
    ?.gridSettings;
}

/** Coalesced shallow config patch — the §3.9 continuous-typing path. */
export function patchWidgetConfig(
  session: EditorSession<DashboardConfiguration>,
  widgetId: string,
  patch: Partial<WidgetConfig>,
): void {
  writeDraft(session, updateWidgetConfig({ widgetId, patch }));
}

/**
 * Reads a config key as a string. Most presentation keys (colors, padding,
 * widgetCss…) live on WidgetConfig's index signature (`unknown`) — sections
 * go through these accessors instead of sprinkling casts.
 */
export function cfgStr(
  config: WidgetConfig,
  key: string,
): string | undefined {
  const value = (config as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** cfgStr with a fallback ('' for free inputs). */
export function cfgStrOr(config: WidgetConfig, key: string, fallback: string): string {
  return cfgStr(config, key) ?? fallback;
}

/** Shape of a breakpoint-scoped layout replacement (index-signature read). */
export interface BreakpointLayoutEntry {
  widgets: Record<string, WidgetLayout>;
  gridSettings?: GridSettings;
  [key: string]: unknown;
}

export function breakpointLayoutOf(
  configuration: DashboardConfiguration,
  target: PanelTarget,
  breakpoint: DashboardBreakpointId,
): WidgetLayout | undefined {
  const layout = configuration.states[target.stateId]?.layouts[
    target.layoutId
  ];
  const breakpoints = layout?.breakpoints as
    | Partial<Record<DashboardBreakpointId, BreakpointLayoutEntry>>
    | undefined;
  return breakpoints?.[breakpoint]?.widgets?.[target.widgetId];
}

export interface UpdateWidgetBreakpointLayoutInput {
  widgetId: string;
  stateId: string;
  layoutId?: DashboardLayoutId;
  breakpoint: DashboardBreakpointId;
  patch: Partial<WidgetLayout>;
}

/**
 * Patches the widget's flag set inside a breakpoint-scoped layout copy,
 * materializing the copy on first edit (full snapshot of the parent layout
 * — ui-ngx editWidget-in-breakpoint parity: breakpoint layouts are complete
 * replacements, so later parent edits do NOT bleed into a created copy).
 * One labeled transaction group.
 */
export function updateWidgetBreakpointLayout(
  input: UpdateWidgetBreakpointLayoutInput,
): DashboardDraftWrite {
  const { widgetId, stateId, layoutId, breakpoint, patch } = input;
  return {
    label: 'update widget breakpoint layout',
    recipe: (draft): void => {
      const layout = draft.states[stateId]?.layouts[layoutId ?? 'main'];
      if (!layout) {
        throw new Error(
          `layout "${layoutId ?? 'main'}" not found in state "${stateId}"`,
        );
      }
      if (!layout.breakpoints) {
        layout.breakpoints = {};
      }
      const breakpoints = layout.breakpoints as Record<
        string,
        BreakpointLayoutEntry
      >;
      let entry = breakpoints[breakpoint];
      if (!entry) {
        // JSON round-trip: deep copy AND unwrap immer proxies.
        entry = JSON.parse(
          JSON.stringify({
            widgets: layout.widgets,
            gridSettings: layout.gridSettings,
          }),
        ) as BreakpointLayoutEntry;
        breakpoints[breakpoint] = entry;
      }
      const widgetEntry = entry.widgets[widgetId];
      if (!widgetEntry) {
        throw new Error(
          `widget "${widgetId}" has no layout entry in ${stateId}/${layoutId ?? 'main'}@${breakpoint}`,
        );
      }
      Object.assign(widgetEntry, JSON.parse(JSON.stringify(patch)));
    },
  };
}
