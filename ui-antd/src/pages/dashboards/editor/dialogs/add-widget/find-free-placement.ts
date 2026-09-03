/**
 * Add-widget default placement (D2 gap, V-wave acceptance §3.2): scan the
 * target layout's occupied cells and return the first collision-free slot
 * that fits the incoming size — ui-ngx
 * dashboard-utils.service.ts widgetPossiblePosition:773-805 parity
 * (row-major scan; gridster pushItems:false/swap:false semantics, no
 * compaction, existing layout untouched).
 *
 * The scan includes the row just below the occupied bounding box, which is
 * free by construction — so a wall-to-wall layout degrades to the ui-ngx
 * end-drop (`addWidgetToLayout` else-branch: row=maxBottom, col=0) instead
 * of stacking onto existing widgets.
 */

import type { WidgetLayout } from '@/types/tb/widget';

export interface FreePlacementArgs {
  /** widget placement entries of the TARGET layout (state + layout). */
  widgets: Record<string, WidgetLayout>;
  sizeX: number;
  sizeY: number;
  /** grid columns of the target layout (gridSettings.columns, default 24). */
  columns?: number;
}

/** ui-ngx hasWidgetCollision:808-824 — open-interval rectangle overlap. */
function collides(
  row: number,
  col: number,
  sizeX: number,
  sizeY: number,
  occupied: Array<Required<Pick<WidgetLayout, 'row' | 'col' | 'sizeX' | 'sizeY'>>>,
): boolean {
  const right = col + sizeX;
  const bottom = row + sizeY;
  for (const cell of occupied) {
    if (
      col < cell.col + cell.sizeX &&
      right > cell.col &&
      row < cell.row + cell.sizeY &&
      bottom > cell.row
    ) {
      return true;
    }
  }
  return false;
}

/**
 * First free placement for the incoming widget size: row-major scan over
 * the occupied bounding box (inclusive of the free row below it), columns
 * clamped to the grid width. Never overlaps — the fallback IS the end-drop.
 */
export function findFirstFreePlacement({
  widgets,
  sizeX,
  sizeY,
  columns = 24,
}: FreePlacementArgs): { row: number; col: number } {
  const occupied = Object.values(widgets ?? {}).map((entry) => ({
    // ui-ngx addWidgetToLayout defaults: missing geometry = 1x1 at origin
    row: entry?.row ?? 0,
    col: entry?.col ?? 0,
    sizeX: entry?.sizeX ?? 1,
    sizeY: entry?.sizeY ?? 1,
  }));

  let maxRow = 0;
  let maxCol = columns;
  for (const cell of occupied) {
    maxRow = Math.max(maxRow, cell.row + cell.sizeY);
    maxCol = Math.max(maxCol, cell.col + cell.sizeX);
  }
  // candidates must fit the grid width; an oversized widget scans col 0 only
  const lastCol = Math.max(0, Math.min(maxCol, columns) - Math.max(1, sizeX));

  for (let row = 0; row <= maxRow; row++) {
    for (let col = 0; col <= lastCol; col++) {
      if (!collides(row, col, sizeX, sizeY, occupied)) {
        return { row, col };
      }
    }
  }
  // unreachable: row maxRow is free by construction (no occupied cell ends
  // past maxRow) — kept as the contract statement
  return { row: maxRow, col: 0 };
}
