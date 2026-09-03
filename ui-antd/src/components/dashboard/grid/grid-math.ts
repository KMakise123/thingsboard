/**
 * TB grid semantics → react-grid-layout v2 geometry translation (brief §1.4).
 *
 * Semantics aligned with ui-ngx dashboard.component.ts + dashboard-widget
 * rows/widgetOrder + dashboard-layout.component.ts columns:
 *   - cols = gridSettings.minColumns || columns || 24 (desktop);
 *   - margin = gridSettings.margin || 10; outerMargin adds container padding;
 *   - desktop rowHeight: autoFillHeight → Fit math
 *     (parentHeight - margin*(totalRows + (outerMargin ? 1 : -1))) / totalRows;
 *     otherwise 'match' (row ≈ column width, gridster default);
 *   - mobile (<768px): single-column stack; widget spans =
 *     layout.mobileHeight ?? config.mobileHeight ?? sizeY*24/minCols
 *     (floor, min 1); order = mobileOrder (layout → config) then row,
 *     unordered keep position; mobileRowHeight (default 70) or
 *     mobileAutoFillHeight Fit math over the stacked row total;
 *   - desktopHide filters the desktop grid, mobileHide the mobile stack;
 *   - layout.breakpoints: viewport-bucketed full replacement of
 *     widgets/gridSettings when that bucket is defined (default when not
 *     mobile), ui-ngx MediaBreakpoints: xs<600, sm<960, md<1280, lg<1920;
 *   - SCADA layouts (gridSettings.layoutType === 'scada', §3.6): never
 *     degrade to the mobile stack, margin forced 0 + outerMargin false,
 *     autoFill/mobileAutoFill height forced off (also forced off under
 *     editMode — ui-ngx dashboard-layout `(isEdit || isScada) ? false`).
 *
 * Compaction: none (noCompactor) — positions render verbatim, collisions
 * block instead of squeezing (gridster pushItems:false equivalent; layout
 * data is trusted because v1 has no editor).
 */

import type { LayoutItem } from 'react-grid-layout';
import type {
  DashboardBreakpointId,
  DashboardLayout,
  GridSettings,
  Widget,
  WidgetLayout,
} from '@/types/tb/dashboard';

/** ui-ngx MediaBreakpoints viewport buckets (upper bounds exclusive). */
export const BREAKPOINT_WIDTHS: Record<
  Exclude<DashboardBreakpointId, 'default'>,
  number
> = { xs: 600, sm: 960, md: 1280, lg: 1920, xl: Number.POSITIVE_INFINITY };

export function breakpointForWidth(
  width: number,
): Exclude<DashboardBreakpointId, 'default'> {
  if (width < BREAKPOINT_WIDTHS.xs) return 'xs';
  if (width < BREAKPOINT_WIDTHS.sm) return 'sm';
  if (width < BREAKPOINT_WIDTHS.md) return 'md';
  if (width < BREAKPOINT_WIDTHS.lg) return 'lg';
  return 'xl';
}

/** Breakpoint override resolution: mobile never applies bucket overrides. */
export function resolveBreakpointOverride(
  layout: DashboardLayout,
  isMobile: boolean,
  width: number,
): DashboardLayout {
  if (isMobile) {
    return layout;
  }
  const bucket = breakpointForWidth(width);
  const override = layout.breakpoints?.[bucket] as
    | {
        widgets: Record<string, WidgetLayout>;
        gridSettings: GridSettings;
      }
    | undefined;
  if (!override) {
    return layout;
  }
  return {
    ...layout,
    widgets: override.widgets,
    gridSettings: override.gridSettings,
  };
}

export const DEFAULT_MOBILE_ROW_HEIGHT = 70;

/**
 * SCADA column clamp (ui-ngx dashboard-settings-dialog.component.ts:203-207
 * + M7 §3.6): scada columns are multiples of 24 in 24..1008; an illegal
 * stored value rounds UP to the next multiple (capped at 1008).
 */
export function scadaColumnClamp(columns: number): number {
  const safe = Math.max(24, Math.floor(columns || 24));
  if (safe % 24 === 0) {
    return Math.min(1008, safe);
  }
  return Math.min(1008, 24 * Math.ceil(safe / 24));
}

/** Mobile stack rows of one widget (ui-ngx LayoutWidgetInfo.rows mobile arm). */
export function mobileRowSpan(
  layout: WidgetLayout,
  widget: Widget | undefined,
  minCols: number,
): number {
  const explicit =
    layout.mobileHeight ??
    (typeof widget?.config?.mobileHeight === 'number'
      ? widget.config.mobileHeight
      : undefined);
  if (explicit) {
    return Math.max(Math.floor(explicit), 1);
  }
  const sizeY = layout.sizeY ?? widget?.sizeY ?? 6;
  return Math.max(Math.floor((sizeY * 24) / minCols), 1);
}

/** Sort key mirroring ui-ngx widgetOrder + sortWidgets (ties by col). */
function mobileSortKey(
  layout: WidgetLayout,
  widget: Widget | undefined,
): [number, number] {
  const order =
    (typeof layout.mobileOrder === 'number' && layout.mobileOrder >= 0
      ? layout.mobileOrder
      : undefined) ??
    (typeof widget?.config?.mobileOrder === 'number' &&
    widget.config.mobileOrder >= 0
      ? (widget.config.mobileOrder as number)
      : undefined);
  // ordered widgets first (ascending), unordered keep relative position
  return order === undefined
    ? [Number.MAX_SAFE_INTEGER, layout.col ?? 0]
    : [order, layout.col ?? 0];
}

export interface ResolvedGridGeometry {
  cols: number;
  margin: number;
  containerPadding: number;
  rowHeight: number;
  items: LayoutItem[];
  /** widgets actually placed, in render (stack) order for mobile. */
  placed: Array<{ id: string; widget: Widget; layout: WidgetLayout }>;
}

export interface BuildGridLayoutArgs {
  layout: DashboardLayout;
  widgets: Record<string, Widget>;
  containerWidth: number;
  /** measured height of the scroll viewport; required for autofill math. */
  containerHeight?: number;
  isMobile: boolean;
  /**
   * Edit mode (editor canvas): autofill is forced off (§3.7 parity —
   * ui-ngx dashboard-layout.component.ts autoFillHeight getter:
   * `(isEdit || isScada) ? false : …`).
   */
  editMode?: boolean;
}

export function buildGridLayout(
  args: BuildGridLayoutArgs,
): ResolvedGridGeometry {
  const { layout, widgets, containerWidth, containerHeight, editMode } = args;
  const gridSettings: GridSettings = layout.gridSettings ?? {};
  const isScada = gridSettings.layoutType === 'scada';
  // SCADA layouts never degrade to the mobile single-column stack
  // (§3.6 差异表; ui-ngx isMobileDisabled: `widgetEditMode || isScada || …`).
  const isMobile = args.isMobile && !isScada;
  // scada forces margin 0 + outerMargin false (full-bleed canvas);
  // scada/edit force autofill off.
  const margin = isScada ? 0 : (gridSettings.margin ?? 10);
  const outerMargin = isScada ? false : (gridSettings.outerMargin ?? true);
  const autofillAllowed = !isScada && !editMode;
  const containerPadding = outerMargin ? margin : 0;

  const entries: Array<{ id: string; widget: Widget; layout: WidgetLayout }> =
    [];
  for (const [id, widgetLayout] of Object.entries(layout.widgets ?? {})) {
    const widget = widgets[id];
    if (!widget || !widgetLayout) {
      continue;
    }
    entries.push({ id, widget, layout: widgetLayout });
  }

  if (isMobile) {
    const mobileEntries = entries.filter(
      (entry) => entry.layout.mobileHide !== true,
    );
    mobileEntries.sort(
      (a, b) =>
        // stable sort keeps declaration order for equal keys (JS sort)
        mobileSortKey(a.layout, a.widget)[0] -
          mobileSortKey(b.layout, b.widget)[0] ||
        mobileSortKey(a.layout, a.widget)[1] -
          mobileSortKey(b.layout, b.widget)[1],
    );
    const minCols = gridSettings.minColumns ?? gridSettings.columns ?? 24;
    const spans = mobileEntries.map((entry) =>
      mobileRowSpan(entry.layout, entry.widget, minCols),
    );
    const totalRows = spans.reduce((sum, span) => sum + span, 0);
    let rowHeight = gridSettings.mobileRowHeight ?? DEFAULT_MOBILE_ROW_HEIGHT;
    if (
      autofillAllowed &&
      gridSettings.mobileAutoFillHeight &&
      totalRows > 0 &&
      containerHeight
    ) {
      rowHeight =
        (containerHeight - margin * (totalRows + (outerMargin ? 1 : -1))) /
        totalRows;
    }
    let cursorY = 0;
    const items: LayoutItem[] = mobileEntries.map((entry, index) => {
      const span = spans[index];
      const item: LayoutItem = {
        i: entry.id,
        x: 0,
        y: cursorY,
        w: 1,
        h: span,
      };
      cursorY += span;
      return item;
    });
    return {
      cols: 1,
      margin,
      containerPadding,
      rowHeight,
      items,
      placed: mobileEntries,
    };
  }

  const cols = gridSettings.minColumns ?? gridSettings.columns ?? 24;
  const desktopEntries = entries.filter(
    (entry) => entry.layout.desktopHide !== true,
  );
  const items: LayoutItem[] = desktopEntries.map((entry) => ({
    i: entry.id,
    x: Math.max(0, Math.floor(entry.layout.col ?? 0)),
    y: Math.max(0, Math.floor(entry.layout.row ?? 0)),
    w: Math.max(1, Math.floor(entry.layout.sizeX ?? 8)),
    h: Math.max(1, Math.floor(entry.layout.sizeY ?? 6)),
  }));
  const totalRows = items.reduce(
    (max, item) => Math.max(max, item.y + item.h),
    0,
  );

  let rowHeight: number;
  if (autofillAllowed && gridSettings.autoFillHeight) {
    if (totalRows > 0 && containerHeight) {
      rowHeight =
        (containerHeight - margin * (totalRows + (outerMargin ? 1 : -1))) /
        totalRows;
    } else {
      // fallback until measured: match-height grid
      const colWidth =
        (containerWidth - margin * (cols - 1) - containerPadding * 2) / cols;
      rowHeight = colWidth;
    }
  } else {
    // gridster default rowHeight 'match': row height equals column width
    const colWidth =
      (containerWidth - margin * (cols - 1) - containerPadding * 2) / cols;
    rowHeight = colWidth;
  }

  return {
    cols,
    margin,
    containerPadding,
    rowHeight,
    items,
    placed: desktopEntries,
  };
}
