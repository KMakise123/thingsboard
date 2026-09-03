/**
 * findFirstFreePlacement — the add-widget default placement search (D2,
 * ui-ngx widgetPossiblePosition parity: row-major scan for the first
 * collision-free slot; the row just below the occupied bounding box is
 * always free, so the scan terminates with an end-drop when the layout is
 * wall-to-wall).
 */
import { describe, expect, it } from 'vitest';
import type { WidgetLayout } from '@/types/tb/widget';

import { findFirstFreePlacement } from './find-free-placement';

function layoutOf(entries: Record<string, WidgetLayout>) {
  return entries;
}

describe('findFirstFreePlacement', () => {
  it('an empty layout places at the origin', () => {
    expect(
      findFirstFreePlacement({
        widgets: layoutOf({}),
        sizeX: 8,
        sizeY: 6,
        columns: 24,
      }),
    ).toEqual({ row: 0, col: 0 });
  });

  it('occupied top-left → the first free fit in the same row', () => {
    expect(
      findFirstFreePlacement({
        widgets: layoutOf({ w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 } }),
        sizeX: 8,
        sizeY: 6,
        columns: 24,
      }),
    ).toEqual({ row: 0, col: 8 });
  });

  it('a fitting gap inside the row wins (row-major, col-first scan)', () => {
    expect(
      findFirstFreePlacement({
        widgets: layoutOf({
          w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 },
          w2: { sizeX: 8, sizeY: 6, row: 0, col: 16 },
        }),
        sizeX: 8,
        sizeY: 6,
        columns: 24,
      }),
    ).toEqual({ row: 0, col: 8 });
  });

  it('partials leave the slot right after them', () => {
    expect(
      findFirstFreePlacement({
        widgets: layoutOf({ w1: { sizeX: 4, sizeY: 3, row: 0, col: 0 } }),
        sizeX: 8,
        sizeY: 6,
        columns: 24,
      }),
    ).toEqual({ row: 0, col: 4 });
  });

  it('wall-to-wall layout → end-drop just below the occupied bounding box', () => {
    expect(
      findFirstFreePlacement({
        widgets: layoutOf({
          w1: { sizeX: 24, sizeY: 3, row: 0, col: 0 },
          w2: { sizeX: 24, sizeY: 3, row: 3, col: 0 },
        }),
        sizeX: 8,
        sizeY: 6,
        columns: 24,
      }),
    ).toEqual({ row: 6, col: 0 });
  });

  it('a widget wider than the remaining row span wraps to the next row', () => {
    expect(
      findFirstFreePlacement({
        widgets: layoutOf({ w1: { sizeX: 5, sizeY: 1, row: 0, col: 0 } }),
        sizeX: 20,
        sizeY: 2,
        columns: 24,
      }),
    ).toEqual({ row: 1, col: 0 });
  });

  it('sizeX larger than the grid clamps the column scan to 0', () => {
    expect(
      findFirstFreePlacement({
        widgets: layoutOf({ w1: { sizeX: 5, sizeY: 1, row: 0, col: 0 } }),
        sizeX: 25,
        sizeY: 1,
        columns: 24,
      }),
    ).toEqual({ row: 1, col: 0 });
  });

  it('entries with missing geometry default to a 1x1 cell at the origin', () => {
    expect(
      findFirstFreePlacement({
        widgets: layoutOf({ w1: {} as WidgetLayout }),
        sizeX: 8,
        sizeY: 6,
        columns: 24,
      }),
    ).toEqual({ row: 0, col: 1 });
  });
});
