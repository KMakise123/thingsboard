/**
 * Dashboard model utilities: defaults + import normalization.
 *
 * Aligned with ui-ngx core/services/dashboard-utils.service.ts
 * (validateAndUpdateDashboard :88-199, createDefaultGridSettings :470-479,
 * createDefaultState :487-493, validateAndUpdateLayout :554-567,
 * getRootStateId :629-637).
 *
 * Unlike ui-ngx (in-place mutation), everything here returns a structural
 * copy: dashboards arrive from react-query caches and must stay immutable.
 */

import type {
  Dashboard,
  DashboardConfiguration,
  DashboardLayout,
  DashboardLayoutId,
  DashboardSettings,
  DashboardState,
  GridSettings,
} from '@/types/tb/dashboard';
import type { Widget, WidgetLayout } from '@/types/tb/widget';

/** Viewport width below which dashboards render the mobile single-column stack. */
export const MOBILE_BREAKPOINT_PX = 768;

export const DEFAULT_GRID_MARGIN = 10;

export function createDefaultGridSettings(): GridSettings {
  return {
    layoutType: 'default',
    backgroundColor: '#eeeeee',
    columns: 24,
    margin: DEFAULT_GRID_MARGIN,
    outerMargin: true,
    backgroundSizeMode: '100%',
  };
}

export function createDefaultLayouts(): Record<'main', DashboardLayout> {
  return {
    main: {
      widgets: {},
      gridSettings: createDefaultGridSettings(),
    },
  };
}

export function createDefaultState(
  name: string,
  root: boolean,
): DashboardState {
  return {
    name,
    root,
    layouts: createDefaultLayouts(),
  };
}

/**
 * Root state of a dashboard: the state flagged `root`, else the first key
 * (ui-ngx getRootStateId).
 */
export function getRootStateId(states: Record<string, DashboardState>): string {
  for (const stateId of Object.keys(states)) {
    if (states[stateId]?.root) {
      return stateId;
    }
  }
  return Object.keys(states)[0];
}

function validateAndUpdateLayout(layout: DashboardLayout): DashboardLayout {
  const gridSettings: GridSettings = layout.gridSettings
    ? { ...layout.gridSettings }
    : createDefaultGridSettings();
  // legacy `margins: [x, y]` array was collapsed to `margin` upstream
  const legacy = gridSettings as { margins?: unknown };
  if (Array.isArray(legacy.margins) && legacy.margins.length === 2) {
    gridSettings.margin = legacy.margins[0] as number;
    delete legacy.margins;
  }
  gridSettings.outerMargin = gridSettings.outerMargin ?? true;
  gridSettings.margin = gridSettings.margin ?? DEFAULT_GRID_MARGIN;
  gridSettings.layoutType = gridSettings.layoutType ?? 'default';
  return { ...layout, gridSettings };
}

function validateAndUpdateState(state: DashboardState): DashboardState {
  const next: DashboardState = { ...state, root: state.root ?? false };
  if (!next.layouts || Object.keys(next.layouts).length === 0) {
    next.layouts = createDefaultLayouts();
  }
  const layouts: Partial<Record<DashboardLayoutId, DashboardLayout>> = {};
  for (const layoutId of Object.keys(next.layouts) as DashboardLayoutId[]) {
    const layout = next.layouts[layoutId];
    if (layout) {
      layouts[layoutId] = validateAndUpdateLayout(layout);
    }
  }
  next.layouts = layouts;
  return next;
}

function normalizeWidgets(
  configuration: DashboardConfiguration,
): Record<string, Widget> {
  const raw: unknown = configuration.widgets;
  if (raw === undefined || raw === null) {
    return {};
  }
  if (!Array.isArray(raw)) {
    return raw as Record<string, Widget>;
  }
  // legacy exports carry widgets as an array without map keys
  const map: Record<string, Widget> = {};
  for (const widget of raw as Widget[]) {
    const id =
      (widget as { id?: string }).id ??
      (globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `widget-${Math.random().toString(36).slice(2)}`);
    map[id] = widget;
  }
  return map;
}

function validateAndUpdateSettings(
  settings: DashboardSettings | undefined,
): DashboardSettings {
  if (!settings) {
    return {
      stateControllerId: 'entity',
      showTitle: false,
      showDashboardsSelect: true,
      showEntitiesSelect: true,
      showDashboardTimewindow: true,
      showDashboardExport: true,
      toolbarAlwaysOpen: true,
    };
  }
  if (!settings.stateControllerId) {
    return { ...settings, stateControllerId: 'entity' };
  }
  return settings;
}

function normalizeStates(
  configuration: DashboardConfiguration,
): Record<string, DashboardState> {
  if (configuration.states && Object.keys(configuration.states).length > 0) {
    const states: Record<string, DashboardState> = {};
    let rootFound = false;
    for (const stateId of Object.keys(configuration.states)) {
      const state = validateAndUpdateState(configuration.states[stateId]);
      rootFound = rootFound || Boolean(state.root);
      states[stateId] = state;
    }
    if (!rootFound) {
      const firstId = Object.keys(states)[0];
      if (firstId !== undefined) {
        states[firstId] = { ...states[firstId], root: true };
      }
    }
    return states;
  }
  // no states: materialize a `default` state from the widgets' own geometry
  const state = createDefaultState('default', true);
  const mainLayout = state.layouts.main;
  if (!mainLayout) {
    return { default: state };
  }
  const widgets: Record<string, WidgetLayout> = {};
  for (const [widgetId, widget] of Object.entries(configuration.widgets)) {
    const layout: WidgetLayout = {
      sizeX: widget.sizeX ?? 8,
      sizeY: widget.sizeY ?? 6,
      row: widget.row ?? 0,
      col: widget.col ?? 0,
    };
    if (widget.config?.mobileHeight !== undefined) {
      layout.mobileHeight = widget.config.mobileHeight as number;
    }
    if (widget.config?.mobileOrder !== undefined) {
      layout.mobileOrder = widget.config.mobileOrder as number;
    }
    widgets[widgetId] = layout;
  }
  mainLayout.widgets = widgets;
  return { default: state };
}

/**
 * Full normalization pass on a dashboard loaded from the REST API or an
 * import file. Returns a new object; the input is never mutated.
 */
export function validateAndUpdateDashboard(dashboard: Dashboard): Dashboard {
  const rawConfiguration: DashboardConfiguration =
    dashboard.configuration ?? ({} as DashboardConfiguration);
  const configuration: DashboardConfiguration = {
    ...rawConfiguration,
    widgets: normalizeWidgets(rawConfiguration),
    entityAliases: rawConfiguration.entityAliases ?? {},
    filters: rawConfiguration.filters ?? {},
  };
  configuration.states = normalizeStates(configuration);
  configuration.settings = validateAndUpdateSettings(rawConfiguration.settings);
  return { ...dashboard, configuration };
}
