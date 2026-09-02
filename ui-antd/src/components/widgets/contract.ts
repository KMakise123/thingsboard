/**
 * Widget component contract (W1 skeleton ↔ W2 implementation).
 *
 * Every builtin widget component consumes exactly these props. The container
 * (WidgetContainer.tsx) resolves the registry entry, expands datasources
 * against the alias map and hands the result down — widgets never touch the
 * alias resolver, the grid, or the states machinery themselves.
 *
 * W2 fill-in checklist for each widget file:
 *   1. `export default function TimeSeriesChart({ ctx, widget }: WidgetComponentProps)` …
 *   2. subscribe data via core/ws hooks for `ctx.datasources` (10-cmd budget!);
 *   3. read `ctx.effectiveTimewindow` (dashboard-level or widget override);
 *   4. echarts lifecycle per TimeseriesHistoryModal.tsx:119-150 + theme/charts.ts;
 *   5. register in registry.ts replacing the pending placeholder entry.
 */

import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { AliasResolution } from '@/core/dashboard/alias-resolver';
import type { ExpandedDatasource } from '@/core/dashboard/datasources';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';

/**
 * Everything a widget may read from its dashboard at runtime.
 * v1 is strictly read-only: there is no edit context.
 */
export interface WidgetRuntimeContext {
  /**
   * Timewindow the widget should read: dashboard global timewindow, or the
   * widget's own `config.timewindow` when `useDashboardTimewindow` is false.
   */
  effectiveTimewindow: Timewindow;
  /** aliasId → resolved entities (dashboard-wide, state-aware). */
  aliases: AliasResolution;
  /** widget datasources with aliases already expanded. */
  datasources: Array<ExpandedDatasource>;
  /** states controller — entity drill-down via `states.openState(id, params)`. */
  states: StatesController;
  isMobile: boolean;
}

export interface WidgetComponentProps {
  /** fully-qualified widget type name. */
  fqn: string;
  /** key into configuration.widgets. */
  widgetId: string;
  widget: Widget;
  /** position inside the current state layout. */
  layout: WidgetLayout;
  ctx: WidgetRuntimeContext;
}

export type WidgetComponent = React.ComponentType<WidgetComponentProps>;

/** Effective timewindow per useDashboardTimewindow (default true). */
export function effectiveWidgetTimewindow(
  widget: Widget,
  dashboardTimewindow: Timewindow,
): Timewindow {
  const useDashboard = widget.config?.useDashboardTimewindow !== false;
  return useDashboard
    ? dashboardTimewindow
    : (widget.config?.timewindow ?? dashboardTimewindow);
}
