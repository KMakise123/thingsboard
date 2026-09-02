import { describe, expect, it } from 'vitest';
import type {
  DashboardLayout,
  GridSettings,
  Widget,
  WidgetLayout,
} from '@/types/tb/dashboard';
import {
  breakpointForWidth,
  buildGridLayout,
  mobileRowSpan,
  resolveBreakpointOverride,
} from './grid-math';

function widgetLayout(partial: Partial<WidgetLayout>): WidgetLayout {
  return { sizeX: 8, sizeY: 6, row: 0, col: 0, ...partial };
}

const widgets: Record<string, Widget> = {
  w1: {
    typeFullFqn: 'system.cards.entities_table',
    config: { datasources: [] },
  },
  w2: { typeFullFqn: 'system.time_series_chart', config: { datasources: [] } },
  w3: { typeFullFqn: 'system.map', config: { datasources: [] } },
};

function layoutOf(
  widgetLayouts: Record<string, WidgetLayout>,
  gridSettings: GridSettings = {},
): DashboardLayout {
  return { widgets: widgetLayouts, gridSettings };
}

describe('breakpointForWidth (ui-ngx MediaBreakpoints)', () => {
  it('buckets viewport widths', () => {
    expect(breakpointForWidth(500)).toBe('xs');
    expect(breakpointForWidth(800)).toBe('sm');
    expect(breakpointForWidth(1000)).toBe('md');
    expect(breakpointForWidth(1500)).toBe('lg');
    expect(breakpointForWidth(2500)).toBe('xl');
  });
});

describe('resolveBreakpointOverride', () => {
  it('replaces widgets+gridSettings when the bucket is defined', () => {
    const base = layoutOf({ w1: widgetLayout({}) }, { columns: 24 });
    const layout: DashboardLayout = {
      ...base,
      breakpoints: {
        md: {
          widgets: { w2: widgetLayout({}) },
          gridSettings: { columns: 12 },
        },
      },
    };
    const resolved = resolveBreakpointOverride(layout, false, 1000);
    expect(resolved.widgets).toEqual({ w2: widgetLayout({}) });
    expect(resolved.gridSettings.columns).toBe(12);
  });

  it('never applies bucket overrides in mobile (stack wins)', () => {
    const layout: DashboardLayout = {
      ...layoutOf({ w1: widgetLayout({}) }, { columns: 24 }),
      breakpoints: {
        xs: { widgets: { w3: widgetLayout({}) }, gridSettings: {} },
      },
    };
    const resolved = resolveBreakpointOverride(layout, true, 400);
    expect(resolved.widgets).toEqual({ w1: widgetLayout({}) });
  });

  it('falls back to base when the bucket is missing', () => {
    const base = layoutOf({ w1: widgetLayout({}) }, { columns: 24 });
    expect(resolveBreakpointOverride(base, false, 1000).widgets).toEqual({
      w1: widgetLayout({}),
    });
  });
});

describe('buildGridLayout (desktop)', () => {
  it('computes columns, match row height and verbatim positions', () => {
    const geometry = buildGridLayout({
      layout: layoutOf(
        {
          w1: widgetLayout({ row: 0, col: 0, sizeX: 12, sizeY: 4 }),
          w2: widgetLayout({ row: 4, col: 12, sizeX: 12, sizeY: 6 }),
        },
        { columns: 24, margin: 10, outerMargin: true },
      ),
      widgets,
      containerWidth: 970,
      isMobile: false,
    });
    expect(geometry.cols).toBe(24);
    expect(geometry.margin).toBe(10);
    expect(geometry.containerPadding).toBe(10);
    // match: rowHeight = colWidth = (970 - 10*23 - 2*10) / 24
    expect(geometry.rowHeight).toBeCloseTo((970 - 230 - 20) / 24, 5);
    expect(geometry.items).toEqual([
      { i: 'w1', x: 0, y: 0, w: 12, h: 4 },
      { i: 'w2', x: 12, y: 4, w: 12, h: 6 },
    ]);
  });

  it('honors minColumns over columns and filters desktopHide', () => {
    const geometry = buildGridLayout({
      layout: layoutOf(
        {
          w1: widgetLayout({}),
          w2: widgetLayout({ desktopHide: true }),
        },
        { columns: 48, minColumns: 12 },
      ),
      widgets,
      containerWidth: 970,
      isMobile: false,
    });
    expect(geometry.cols).toBe(12);
    expect(geometry.items).toHaveLength(1);
    expect(geometry.placed.map((entry) => entry.id)).toEqual(['w1']);
  });

  it('applies autoFillHeight Fit math over the tallest bottom', () => {
    const geometry = buildGridLayout({
      layout: layoutOf(
        {
          w1: widgetLayout({ row: 0, col: 0, sizeY: 4 }),
          w2: widgetLayout({ row: 4, col: 0, sizeY: 6 }),
        },
        { columns: 24, margin: 10, outerMargin: true, autoFillHeight: true },
      ),
      widgets,
      containerWidth: 970,
      containerHeight: 800,
      isMobile: false,
    });
    // totalRows = 10 → (800 - 10*(10+1)) / 10
    expect(geometry.rowHeight).toBeCloseTo((800 - 110) / 10, 5);
  });

  it('skips layout entries without a widget (dangling ids tolerated)', () => {
    const geometry = buildGridLayout({
      layout: layoutOf({ ghost: widgetLayout({}) }, { columns: 24 }),
      widgets,
      containerWidth: 970,
      isMobile: false,
    });
    expect(geometry.items).toEqual([]);
  });
});

describe('buildGridLayout (mobile stack)', () => {
  const mWidgets: Record<string, Widget> = {
    a: { typeFullFqn: 'x', config: { datasources: [] } },
    b: { typeFullFqn: 'x', config: { datasources: [] } },
    c: { typeFullFqn: 'x', config: { datasources: [] } },
    d: { typeFullFqn: 'x', config: { datasources: [] } },
  };

  it('stacks one column with mobileOrder, spans and mobileHide', () => {
    const geometry = buildGridLayout({
      layout: layoutOf(
        {
          a: widgetLayout({ row: 0, col: 0, sizeY: 6, mobileOrder: 1 }),
          b: widgetLayout({ row: 6, col: 0, sizeY: 12, mobileHide: true }),
          c: widgetLayout({ row: 12, col: 0, sizeY: 6 }),
          d: widgetLayout({ row: 0, col: 0, sizeY: 6, mobileOrder: 0 }),
        },
        { columns: 24, mobileRowHeight: 70 },
      ),
      widgets: mWidgets,
      containerWidth: 400,
      isMobile: true,
    });
    expect(geometry.cols).toBe(1);
    // d (order 0) then a (order 1) then c (unordered keeps position)
    expect(geometry.placed.map((entry) => entry.id)).toEqual(['d', 'a', 'c']);
    // span fallback = sizeY * 24 / minCols(24) = sizeY
    expect(geometry.items).toEqual([
      { i: 'd', x: 0, y: 0, w: 1, h: 6 },
      { i: 'a', x: 0, y: 6, w: 1, h: 6 },
      { i: 'c', x: 0, y: 12, w: 1, h: 6 },
    ]);
    expect(geometry.rowHeight).toBe(70);
  });

  it('uses layout/config mobileHeight before the sizeY fallback', () => {
    expect(
      mobileRowSpan(
        widgetLayout({ sizeY: 20, mobileHeight: 3 }),
        widgets.w1,
        24,
      ),
    ).toBe(3);
    const configHeight: Widget = {
      typeFullFqn: 'x',
      sizeY: 20,
      config: { datasources: [], mobileHeight: 5 },
    };
    expect(mobileRowSpan(widgetLayout({ sizeY: 20 }), configHeight, 24)).toBe(
      5,
    );
    // fallback normalizes to a 24-col reference: sizeY*24/minCols
    expect(mobileRowSpan(widgetLayout({ sizeY: 12 }), widgets.w1, 48)).toBe(6);
    expect(mobileRowSpan(widgetLayout({ sizeY: 12 }), widgets.w1, 24)).toBe(12);
  });

  it('applies mobileAutoFillHeight over the stacked row total', () => {
    const geometry = buildGridLayout({
      layout: layoutOf(
        {
          a: widgetLayout({ sizeY: 6, mobileHeight: 4 }),
          b: widgetLayout({ sizeY: 6, mobileHeight: 6 }),
        },
        {
          columns: 24,
          margin: 10,
          outerMargin: true,
          mobileAutoFillHeight: true,
        },
      ),
      widgets: mWidgets,
      containerWidth: 400,
      containerHeight: 700,
      isMobile: true,
    });
    // totalRows = 10 → (700 - 10*(10+1)) / 10
    expect(geometry.rowHeight).toBeCloseTo((700 - 110) / 10, 5);
  });
});
