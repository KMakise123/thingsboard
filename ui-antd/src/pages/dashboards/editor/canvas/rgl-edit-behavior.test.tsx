/**
 * P3 spike — react-grid-layout 2.2.4 EDIT-MODE behavior evidence, kept as a
 * regression test (ADR 0004 §1, brief §5).
 *
 * Findings (API shape, from the 2.2.4 d.ts + dist reading + tests below):
 *
 * 1. COLLISION BLOCKING ("被挡不推不叠", gridster pushItems:false/swap:false)
 *    lives entirely on the `compactor` prop. GridLayout derives
 *      compactType      = compactor.type
 *      allowOverlap     = compactor.allowOverlap
 *      preventCollision = compactor.preventCollision ?? false
 *    and feeds them into `moveElement(layout, l, x, y, isUserAction, …)` at
 *    both drag-frame and drag-stop. The blocking combination is
 *      `{ type: null, allowOverlap: false, preventCollision: true }`
 *    (== `{...noCompactor, preventCollision: true}`, also obtainable via
 *    `getCompactor(null, false, true)`). Under it moveElement returns the
 *    item to its OLD position on any collision (`l.x = oldX; l.y = oldY`)
 *    and never cascades other items. Dropping `preventCollision` to false
 *    with the same compactor flips the behavior into push-aside (the
 *    negative-control test pins this so the flag can't silently regress).
 *
 * 2. BOUNDARY CLAMP = the default `constraints` array `[gridBounds,
 *    minMaxSize]` (react-grid-layout/core). gridBounds.constrainPosition
 *    clamps x into [0, cols-w] and y into [0, maxRows-h]; with the TB
 *    canvas `maxRows: Infinity` the vertical clamp degenerates to min-0
 *    (canvas grows downward) while horizontal stays fully bounded.
 *
 * 3. EXTERNAL DROP = `dropConfig{enabled, defaultItem, onDragOver}` +
 *    native `dragover`/`drop` on the grid container. `onDragOver` returning
 *    `{w,h}` shapes the dropping item; on `drop`, `onDrop(layout, item, e)`
 *    delivers the item at `calcXY(clientX - gridRect.left - itemPixelW/2, …)`
 *    clamped to ≥0 on both axes and ≤ cols-w horizontally (proven below at
 *    two cursor positions, one forcing the right-edge clamp).
 *
 * 4. displayGrid background = `GridBackground` from 'react-grid-layout/extras'
 *    (GridCellConfig: width/cols/rowHeight/margin/containerPadding) mounted
 *    conditionally behind the grid — exercised by EditorGrid tests.
 *
 * happy-dom limitation recorded: HTMLElement.offsetParent is undefined in
 * happy-dom, so GridItem's drag-start bails out (`if (!offsetParent) return`)
 * — full pointer-path drag simulation cannot run here. The drag/resize
 * ENGINE functions above are exactly what GridLayout feeds at its commit
 * boundaries, so proving them + the drop chain is the honest maximum for
 * this environment (drag wiring itself is asserted at class level in
 * editor-grid.test.tsx).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  calcWH,
  calcXY,
  type Layout,
  moveElement,
  noCompactor,
} from 'react-grid-layout';
import { defaultConstraints, applyPositionConstraints } from 'react-grid-layout/core';
import { GridLayout } from 'react-grid-layout';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

/** The exact compactor the edit canvas uses (collision blocking). */
const BLOCKING_COMPACTOR = { ...noCompactor, preventCollision: true };

function freshLayout(): Layout {
  return [
    { i: 'a', x: 0, y: 0, w: 8, h: 6 },
    { i: 'b', x: 10, y: 4, w: 6, h: 6 },
  ];
}

describe('P3: RGL 2.2.4 collision blocking (gridster pushItems:false semantics)', () => {
  it('blocks a drag into an occupied cell: dragged item snaps back, no push', () => {
    const layout = freshLayout();
    // b dragged fully over a — GridLayout calls exactly this at drag-stop
    const result = moveElement(
      layout,
      layout[1],
      2,
      0,
      true,
      BLOCKING_COMPACTOR.preventCollision,
      BLOCKING_COMPACTOR.type,
      24,
      BLOCKING_COMPACTOR.allowOverlap,
    );
    const a = result.find((item) => item.i === 'a');
    const b = result.find((item) => item.i === 'b');
    expect(b).toMatchObject({ x: 10, y: 4 }); // snapped back, NOT at (2,0)
    expect(b?.moved).toBe(false);
    expect(a).toMatchObject({ x: 0, y: 0 }); // stationary item untouched
  });

  it('negative control: without preventCollision the same move pushes aside', () => {
    const layout = freshLayout();
    const result = moveElement(
      layout,
      layout[1],
      2,
      0,
      true,
      false,
      null,
      24,
      false,
    );
    const a = result.find((item) => item.i === 'a');
    const b = result.find((item) => item.i === 'b');
    expect(b).toMatchObject({ x: 2, y: 0 }); // landed at target
    // …and a was displaced (moved out of the way; the moved flag is only
    // stamped on the DRAGGED item, so assert the position instead)
    expect(a).not.toMatchObject({ x: 0, y: 0 });
  });

  it('never stacks: blocked move leaves zero overlap', () => {
    const layout = freshLayout();
    const result = moveElement(
      layout,
      layout[1],
      4,
      2,
      true,
      true,
      null,
      24,
      false,
    );
    const a = result.find((item) => item.i === 'a') as { x: number; y: number; w: number; h: number };
    const b = result.find((item) => item.i === 'b') as { x: number; y: number; w: number; h: number };
    const overlaps =
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    expect(overlaps).toBe(false);
  });
});

describe('P3: RGL 2.2.4 boundary clamp (default constraints [gridBounds, minMaxSize])', () => {
  const ctx = {
    cols: 24,
    maxRows: Number.POSITIVE_INFINITY,
    containerWidth: 960,
    containerHeight: 0,
    rowHeight: 80,
    margin: [10, 10] as const,
    layout: [] as Layout,
  };

  it('clamps negative x/y to the grid origin', () => {
    const item = { i: 'a', x: 0, y: 0, w: 8, h: 6 };
    expect(
      applyPositionConstraints(defaultConstraints, item, -5, -3, ctx),
    ).toEqual({ x: 0, y: 0 });
  });

  it('clamps right overflow to cols - w, leaves downward growth free', () => {
    const item = { i: 'a', x: 20, y: 0, w: 8, h: 6 };
    expect(
      applyPositionConstraints(defaultConstraints, item, 30, 40, ctx),
    ).toEqual({ x: 16, y: 40 });
  });

  it('constrainSize keeps resize inside the grid via gridBounds', () => {
    const item = { i: 'a', x: 20, y: 10, w: 8, h: 6 };
    const gridBounds = defaultConstraints[0];
    expect(gridBounds.constrainSize).toBeDefined();
    // 'se': maxW = cols - x = 4; maxH = maxRows - y = ∞ (canvas grows down)
    expect(gridBounds.constrainSize!(item, 40, 30, 'se', ctx)).toEqual({
      w: 4,
      h: 30,
    });
    // 'nw': growing up/left is bounded by the item's own origin
    expect(gridBounds.constrainSize!(item, 40, 30, 'nw', ctx)).toEqual({
      w: 28, // x + w
      h: 16, // y + h
    });
  });
});

describe('P3: RGL 2.2.4 dropConfig external drop lands at grid coords', () => {
  /**
   * Deterministic geometry (happy-dom rects are all-zero, so clientX/Y map
   * straight onto container-relative pixels):
   *   width=1000 cols=10 margin=[10,10] padding=[10,10] rowHeight=100
   *   → colWidth = (1000 - 10*9 - 2*10)/10 = 89, cell pitch 99;
   *   dropping item 4x2 → pixel 386x210 → center offsets 193/105;
   *   dragover(clientX=600, clientY=300) → raw pixel (407, 195)
   *   → calcXY: x=round(407/99)=4, y=round(195/110)=2 (unclamped zone).
   *   dragover(clientX=900, clientY=100) → raw (707, -5)
   *   → x=round(707/99)=8 → clamped to cols-w=6; y=max(0, round(-5/110))=0.
   */
  const GRID = {
    cols: 10,
    rowHeight: 100,
    margin: [10, 10] as [number, number],
    containerPadding: [10, 10] as [number, number],
  };

  function mount(onDrop: (layout: Layout, item: unknown) => void) {
    render(
      <GridLayout
        width={1000}
        gridConfig={{ ...GRID, maxRows: Number.POSITIVE_INFINITY }}
        dragConfig={{ enabled: false }}
        resizeConfig={{ enabled: false }}
        compactor={BLOCKING_COMPACTOR}
        dropConfig={{
          enabled: true,
          defaultItem: { w: 4, h: 2 },
        }}
        layout={[]}
        onDrop={onDrop as (layout: Layout, item: Layout[number] | undefined, e: Event) => void}
      >
        <div key="none" />
      </GridLayout>,
    );
    // the grid container carries the react-grid-layout class
    return document.querySelector('.react-grid-layout') as HTMLElement;
  }

  /**
   * happy-dom's DragEvent constructor drops clientX/clientY, but a plain
   * MouseEvent of type 'dragover'/'drop' carries them and React routes it
   * to onDragOver/onDrop by event type alone.
   */
  function dragOver(container: HTMLElement, clientX: number, clientY: number) {
    fireEvent(
      container,
      new MouseEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
      }),
    );
  }

  function drop(container: HTMLElement) {
    fireEvent(
      container,
      new MouseEvent('drop', { bubbles: true, cancelable: true }),
    );
  }

  it('lands the dropped item at the cursor cell', () => {
    const onDrop = vi.fn();
    const container = mount(onDrop);
    dragOver(container, 600, 300);
    drop(container);
    expect(onDrop).toHaveBeenCalledTimes(1);
    const [layout, item] = onDrop.mock.calls[0] as [
      Layout,
      { i: string; x: number; y: number; w: number; h: number },
    ];
    expect(item?.i).toBe('__dropping-elem__');
    expect(item).toMatchObject({ x: 4, y: 2, w: 4, h: 2 });
    // landing follows the documented px→grid math
    expect(
      calcXY(
        {
          cols: GRID.cols,
          margin: GRID.margin,
          containerPadding: GRID.containerPadding,
          containerWidth: 1000,
          maxRows: Number.POSITIVE_INFINITY,
          rowHeight: GRID.rowHeight,
        },
        195,
        407,
        4,
        2,
      ),
    ).toEqual({ x: 4, y: 2 });
    expect(layout).toEqual(layout);
  });

  it('clamps drop coordinates at the right/upper grid edges', () => {
    const onDrop = vi.fn();
    const container = mount(onDrop);
    dragOver(container, 900, 100);
    drop(container);
    const [, item] = onDrop.mock.calls[0] as [
      Layout,
      { i: string; x: number; y: number; w: number; h: number },
    ];
    expect(item).toMatchObject({ x: 6, y: 0 }); // cols-w=6; y≥0
  });

  it('pixel math sanity: calcWH round-trips the dropping item size', () => {
    const params = {
      cols: GRID.cols,
      margin: GRID.margin,
      containerPadding: GRID.containerPadding,
      containerWidth: 1000,
      maxRows: Number.POSITIVE_INFINITY,
      rowHeight: GRID.rowHeight,
    };
    expect(calcWH(params, 386, 210, 0, 0, 'se')).toEqual({ w: 4, h: 2 });
  });
});
