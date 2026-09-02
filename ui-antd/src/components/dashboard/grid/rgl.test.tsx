/**
 * Spike: prove react-grid-layout@2 works as a fully controlled, read-only
 * grid in our vitest/happy-dom setup (ADR 0003 §1.4).
 *
 * Contract verified here (and relied on by TbGridLayout in grid-layout.tsx):
 *  - explicit `width` prop drives geometry (no DOM measurement needed);
 *  - children are matched to layout items by React `key` === layout.i;
 *  - read-only = dragConfig.enabled:false + resizeConfig.enabled:false;
 *  - `noCompactor` keeps the data-driven positions verbatim, so TB's
 *    row/col placement (with deliberate gaps) is rendered untouched —
 *    the "block, don't squeeze" gridster pushItems:false equivalent;
 *  - pixel math follows calcGridItemPosition:
 *    left = (colWidth + marginX) * x + paddingX
 *    top  = (rowHeight + marginY) * y + paddingY
 *    colWidth = (containerWidth - marginX * (cols - 1) - 2 * paddingX) / cols
 */
import { cleanup, render, screen } from '@testing-library/react';
import { GridLayout, noCompactor } from 'react-grid-layout';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(cleanup);

function parseTranslate(style: string | null | undefined): {
  x: number;
  y: number;
} {
  const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(style ?? '');
  expect(match, `expected a translate() in style: ${style}`).toBeTruthy();
  return { x: Number(match?.[1]), y: Number(match?.[2]) };
}

describe('react-grid-layout v2 spike (controlled read-only)', () => {
  it('renders children matched by key and positions them per TB pixel math', () => {
    // width=960, cols=24, margin=[10,10], padding=[10,10]
    // => colWidth = (960 - 10*23 - 2*10) / 24 = 710/24 ≈ 29.5833
    // item a: left = 10, top = 10; width = 8 cols ≈ 306.67px
    render(
      <GridLayout
        width={960}
        gridConfig={{
          cols: 24,
          rowHeight: 80,
          margin: [10, 10],
          containerPadding: [10, 10],
          maxRows: Number.POSITIVE_INFINITY,
        }}
        dragConfig={{ enabled: false }}
        resizeConfig={{ enabled: false }}
        compactor={noCompactor}
        layout={[
          { i: 'a', x: 0, y: 0, w: 8, h: 2 },
          { i: 'b', x: 8, y: 2, w: 8, h: 3 },
        ]}
      >
        <div key="a">widget-a</div>
        <div key="b">widget-b</div>
      </GridLayout>,
    );

    expect(screen.getByText('widget-a')).toBeInTheDocument();
    expect(screen.getByText('widget-b')).toBeInTheDocument();

    const a = screen.getByText('widget-a').closest('.react-grid-item');
    expect(a).not.toBeNull();
    // left = 10, top = 10
    expect(parseTranslate(a?.getAttribute('style'))).toEqual({ x: 10, y: 10 });

    const b = screen.getByText('widget-b').closest('.react-grid-item');
    expect(b).not.toBeNull();
    // left = round((29.5833 + 10) * 8 + 10) = 327, top = (80 + 10) * 2 + 10 = 190
    const bPos = parseTranslate(b?.getAttribute('style'));
    expect(bPos.x).toBe(327);
    expect(bPos.y).toBe(190);
  });

  it('keeps deliberate gaps with noCompactor (block, not squeeze)', () => {
    render(
      <GridLayout
        width={960}
        gridConfig={{
          cols: 24,
          rowHeight: 80,
          margin: [10, 10],
          containerPadding: [10, 10],
          maxRows: Number.POSITIVE_INFINITY,
        }}
        dragConfig={{ enabled: false }}
        resizeConfig={{ enabled: false }}
        compactor={noCompactor}
        layout={[
          { i: 'a', x: 0, y: 0, w: 8, h: 2 },
          // 3-row vertical gap after item a: y=5 stays 5
          { i: 'b', x: 0, y: 5, w: 8, h: 2 },
        ]}
      >
        <div key="a">gap-a</div>
        <div key="b">gap-b</div>
      </GridLayout>,
    );
    const b = screen.getByText('gap-b').closest('.react-grid-item');
    expect(parseTranslate(b?.getAttribute('style'))).toEqual({
      x: 10,
      y: (80 + 10) * 5 + 10,
    });
  });

  it('is inert when drag/resize configs are disabled', () => {
    render(
      <GridLayout
        width={960}
        gridConfig={{
          cols: 24,
          rowHeight: 80,
          margin: [10, 10],
          containerPadding: [10, 10],
          maxRows: Number.POSITIVE_INFINITY,
        }}
        dragConfig={{ enabled: false }}
        resizeConfig={{ enabled: false }}
        compactor={noCompactor}
        layout={[{ i: 'a', x: 0, y: 0, w: 8, h: 2 }]}
      >
        <div key="a">inert-a</div>
      </GridLayout>,
    );
    const item = screen.getByText('inert-a').closest('.react-grid-item');
    expect(item?.className).not.toContain('react-draggable');
    // react-resizable-hide hides the (never interactive) resize handle
    expect(item?.className).toContain('react-resizable-hide');
  });
});
