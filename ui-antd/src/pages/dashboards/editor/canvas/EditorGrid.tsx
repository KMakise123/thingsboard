/**
 * EditorGrid — the RGL edit-mode grid for ONE state layout (M7 brief §3 C
 * wave; ADR 0004 §1). Extends the TbGridLayout patterns (grid-math
 * geometry, explicit width) with the editor surface:
 *
 *  - fully controlled layout derived from the session draft on every render;
 *  - drag/resize enabled only in edit mode (this component is edit-only —
 *    the readonly page keeps TbGridLayout);
 *  - collision blocking = `{...noCompactor, preventCollision: true}`
 *    (gridster pushItems:false/swap:false; P3 evidence in
 *    rgl-edit-behavior.test.tsx);
 *  - boundary clamp via the RGL default `[gridBounds, minMaxSize]`
 *    constraints (horizontal hard clamp; canvas grows downward);
 *  - NO frame-level writes: `onDragStop`/`onResizeStop`/`onLayoutChange`
 *    are the only commit boundaries, each one session transaction group
 *    (moveWidget / resizeWidget / single reconciling group);
 *  - displayGrid 3-state (gridSettings.displayGrid, default
 *    'onDrag&Resize'): the GridBackground extras component is conditionally
 *    mounted; during drag/resize or under the EditorCanvasContext
 *    `displayGridAlways` override it shows on demand;
 *  - selection is component state ABOVE this grid (not in the undo stack).
 *
 * Memo boundary (P7): each cell wraps a memoized WidgetCellInner — the
 * selection outline / context-menu chrome lives on the (non-memoized)
 * wrapper, so selecting never re-renders widget content.
 */

import type { MenuProps } from 'antd';
import { Dropdown, theme } from 'antd';
import { memo, useState } from 'react';
import {
  type Compactor,
  GridLayout,
  type Layout,
  type LayoutItem,
  noCompactor,
  type ResizeHandleAxis,
  useContainerWidth,
} from 'react-grid-layout';
import { GridBackground } from 'react-grid-layout/extras';
import { buildGridLayout } from '@/components/dashboard/grid/grid-math';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import { WidgetContainer } from '@/components/widgets/WidgetContainer';
import type { AliasResolution } from '@/core/dashboard/alias-resolver';
import {
  moveWidget,
  resizeWidget,
  writeDraft,
} from '@/core/editor/dashboard-draft';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import type {
  DashboardConfiguration,
  DashboardFilter,
  DashboardLayoutId,
} from '@/types/tb/dashboard';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';

import { useEditorCanvasOverride } from './editor-canvas-context';

/** gridster pushItems:false / swap:false semantics (P3-proven shape). */
export const EDITOR_COMPACTOR: Compactor = {
  ...noCompactor,
  preventCollision: true,
};

/** TB resizes widgets from any edge/corner (gridster handles: all true). */
export const EDITOR_RESIZE_HANDLES: ResizeHandleAxis[] = [
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
  'nw',
];

export interface EditorGridProps {
  session: EditorSession<DashboardConfiguration>;
  stateId: string;
  layoutId: DashboardLayoutId;
  selectedWidgetId: string | null;
  onSelectWidget: (widgetId: string | null) => void;
  /** Context menu payload for a widget (Unit 5 wires the Dropdown). */
  onWidgetContextMenu?: (widgetId: string) => void;
  /** Builds the widget-level context menu (antd Dropdown, contextMenu trigger). */
  widgetMenu?: (widgetId: string) => MenuProps;
  dashboardTimewindow: Timewindow;
  aliases: AliasResolution;
  states: StatesController;
  isMobile: boolean;
  /** optional override for tests; defaults to the measured container width. */
  containerWidth?: number;
  /** measured viewport height for autofill math passthrough. */
  containerHeight?: number;
}

/**
 * Memo boundary around widget CONTENT: selection/chrome props stay on the
 * wrapper element and never reach here, so a click-select re-renders only
 * the two wrapper divs, not the widget subtree. Content updates flow
 * through immer reference changes of `widget`/`layoutEntry` (config 引用订阅
 * — a single widget's config edit re-renders exactly that widget).
 */
const WidgetCellInner = memo(function WidgetCellInner({
  widgetId,
  widget,
  layoutEntry,
  filters,
  dashboardTimewindow,
  aliases,
  states,
  isMobile,
}: {
  widgetId: string;
  widget: Widget;
  layoutEntry: WidgetLayout;
  filters?: Record<string, DashboardFilter>;
  dashboardTimewindow: Timewindow;
  aliases: AliasResolution;
  states: StatesController;
  isMobile: boolean;
}) {
  return (
    <WidgetContainer
      widgetId={widgetId}
      widget={widget}
      layout={layoutEntry}
      dashboardTimewindow={dashboardTimewindow}
      aliases={aliases}
      filters={filters}
      states={states}
      isMobile={isMobile}
    />
  );
});

export function EditorGrid({
  session,
  stateId,
  layoutId,
  selectedWidgetId,
  onSelectWidget,
  onWidgetContextMenu,
  widgetMenu,
  dashboardTimewindow,
  aliases,
  states,
  isMobile,
  containerWidth: containerWidthProp,
  containerHeight,
}: EditorGridProps) {
  const { token } = theme.useToken();
  const { width: measuredWidth, containerRef, mounted } = useContainerWidth();
  const width = containerWidthProp ?? measuredWidth;

  const snapshot = useEditorSession(session);
  const configuration = snapshot.current;

  const state = configuration.states[stateId];
  const layout = state?.layouts[layoutId];

  const geometry = layout
    ? buildGridLayout({
        layout,
        widgets: configuration.widgets,
        containerWidth: width,
        containerHeight,
        isMobile: false, // the editor always edits the default (desktop) layout
      })
    : null;

  // displayGrid 3-state + interaction state + dialog override (§3.3).
  const override = useEditorCanvasOverride();
  const [interacting, setInteracting] = useState(false);
  const displayGrid =
    (layout?.gridSettings?.displayGrid as string | undefined) ??
    'onDrag&Resize';
  const showGrid =
    override.displayGridAlways ||
    displayGrid === 'always' ||
    (displayGrid === 'onDrag&Resize' && interacting);

  const commitMove = (
    _l: Layout,
    _oldItem: LayoutItem | null,
    newItem: LayoutItem | null,
  ) => {
    if (!newItem) {
      return;
    }
    const current = geometry?.items.find((item) => item.i === newItem.i);
    if (!current || (current.x === newItem.x && current.y === newItem.y)) {
      return;
    }
    writeDraft(
      session,
      moveWidget({
        widgetId: newItem.i,
        stateId,
        layoutId,
        row: newItem.y,
        col: newItem.x,
      }),
    );
  };

  const commitResize = (
    _l: Layout,
    _oldItem: LayoutItem | null,
    newItem: LayoutItem | null,
  ) => {
    if (!newItem) {
      return;
    }
    const current = geometry?.items.find((item) => item.i === newItem.i);
    if (!current || (current.w === newItem.w && current.h === newItem.h)) {
      return;
    }
    writeDraft(
      session,
      resizeWidget({
        widgetId: newItem.i,
        stateId,
        layoutId,
        sizeX: newItem.w,
        sizeY: newItem.h,
      }),
    );
  };

  /**
   * Reconciling boundary: catches any residual geometry drift in ONE group
   * (compared against the LIVE draft — stale closure safe; identical-value
   * assignments produce no immer patches, so no feedback loop).
   */
  const reconcileLayout = (next: Layout) => {
    const live = session.current;
    const liveLayout = live.states[stateId]?.layouts[layoutId];
    if (!liveLayout) {
      return;
    }
    const diffs = next.filter((item) => {
      const entry = liveLayout.widgets[item.i];
      if (!entry) {
        return false;
      }
      return (
        entry.col !== item.x ||
        entry.row !== item.y ||
        entry.sizeX !== item.w ||
        entry.sizeY !== item.h
      );
    });
    if (diffs.length === 0) {
      return;
    }
    writeDraft(session, {
      label: 'update widget layout',
      recipe: (draft) => {
        const target = draft.states[stateId]?.layouts[layoutId];
        if (!target) {
          return;
        }
        for (const item of diffs) {
          const entry = target.widgets[item.i];
          if (entry) {
            entry.col = item.x;
            entry.row = item.y;
            entry.sizeX = item.w;
            entry.sizeY = item.h;
          }
        }
      },
    });
  };

  if (!geometry || !layout) {
    return (
      <div
        ref={containerRef}
        data-testid="editor-grid"
        data-editor-grid={layoutId}
        style={{ width: '100%' }}
      />
    );
  }

  // Canvas content height for the displayGrid background rows:'auto' math.
  const contentHeight =
    geometry.containerPadding * 2 +
    geometry.items.reduce((max, item) => Math.max(max, item.y + item.h), 0) *
      (geometry.rowHeight + geometry.margin) -
    geometry.margin;

  return (
    <div
      ref={containerRef}
      data-testid="editor-grid"
      data-editor-grid={layoutId}
      data-editor-display-grid={showGrid ? 'visible' : 'hidden'}
      style={{
        width: '100%',
        position: 'relative',
        backgroundColor: layout.gridSettings?.backgroundColor,
      }}
      onClick={() => onSelectWidget(null)}
    >
      {mounted || containerWidthProp !== undefined ? (
        <>
          {showGrid ? (
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 0 }}
              data-testid="editor-grid-background"
            >
              <GridBackground
                width={width}
                cols={geometry.cols}
                rowHeight={geometry.rowHeight}
                margin={[geometry.margin, geometry.margin]}
                containerPadding={[
                  geometry.containerPadding,
                  geometry.containerPadding,
                ]}
                rows={containerHeight ? 'auto' : 20}
                height={containerHeight ?? contentHeight}
                color={token.colorBorderSecondary}
              />
            </div>
          ) : null}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <GridLayout
              width={width}
              gridConfig={{
                cols: geometry.cols,
                rowHeight: geometry.rowHeight,
                margin: [geometry.margin, geometry.margin],
                containerPadding: [
                  geometry.containerPadding,
                  geometry.containerPadding,
                ],
                maxRows: Number.POSITIVE_INFINITY,
              }}
              dragConfig={{ enabled: true, bounded: false }}
              resizeConfig={{ enabled: true, handles: EDITOR_RESIZE_HANDLES }}
              compactor={EDITOR_COMPACTOR}
              layout={geometry.items}
              onDragStart={() => setInteracting(true)}
              onDragStop={(l, oldItem, newItem) => {
                setInteracting(false);
                commitMove(l, oldItem, newItem);
              }}
              onResizeStart={() => setInteracting(true)}
              onResizeStop={(l, oldItem, newItem) => {
                setInteracting(false);
                commitResize(l, oldItem, newItem);
              }}
              onLayoutChange={reconcileLayout}
            >
              {geometry.placed.map((entry) => {
                const content = (
                  <WidgetCellInner
                    widgetId={entry.id}
                    widget={entry.widget}
                    layoutEntry={entry.layout}
                    filters={
                      configuration.filters as Record<string, DashboardFilter>
                    }
                    dashboardTimewindow={dashboardTimewindow}
                    aliases={aliases}
                    states={states}
                    isMobile={isMobile}
                  />
                );
                const menu = widgetMenu?.(entry.id);
                // The Dropdown must NOT be the direct RGL child: the
                // Resizable wrapper injects a second child (the resize
                // handle) into the direct child, which antd Dropdown
                // (single-child only) cannot host.
                return (
                  <div
                    key={entry.id}
                    data-testid="editor-widget"
                    data-editor-widget={entry.id}
                    data-selected={selectedWidgetId === entry.id || undefined}
                    style={{
                      overflow: 'hidden',
                      height: '100%',
                      outline:
                        selectedWidgetId === entry.id
                          ? `2px solid ${token.colorPrimary}`
                          : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectWidget(entry.id);
                    }}
                    onContextMenu={(event) => {
                      // the cell-level Dropdown owns this event; stopping
                      // propagation keeps the dashboard-level menu shut
                      event.stopPropagation();
                      onSelectWidget(entry.id);
                      onWidgetContextMenu?.(entry.id);
                    }}
                  >
                    {menu ? (
                      <Dropdown menu={menu} trigger={['contextMenu']}>
                        {content}
                      </Dropdown>
                    ) : (
                      content
                    )}
                  </div>
                );
              })}
            </GridLayout>
          </div>
        </>
      ) : null}
    </div>
  );
}

// (no module tail — helpers intentionally colocated above)
