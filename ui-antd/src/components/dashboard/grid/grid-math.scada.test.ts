/**
 * SCADA grid-math semantics (spec §3.6 差异表 + §3.7 autofill parity,
 * ui-ngx dashboard-layout.component.ts:85-104 + dashboard.component.ts
 * rowHeight math):
 *  - scada: mobile never degrades to the single-column stack;
 *  - scada: margin forced 0 + outerMargin false (full-bleed);
 *  - autofill forced false when edit mode OR scada (parity condition);
 *  - scadaColumnClamp: multiples of 24 in 24..1008, illegal rounds UP.
 */
import { describe, expect, it } from 'vitest';
import type { DashboardLayout, Widget } from '@/types/tb/dashboard';
import { buildGridLayout, scadaColumnClamp } from './grid-math';

const WIDGETS: Record<string, Widget> = {
  w1: { typeFullFqn: 'system.test', config: {} },
};

function scadaLayout(overrides?: Partial<DashboardLayout>): DashboardLayout {
  return {
    widgets: { w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 } },
    gridSettings: {
      layoutType: 'scada',
      columns: 24,
      margin: 10,
      outerMargin: true,
    },
    ...overrides,
  };
}

describe('grid-math SCADA semantics (§3.6)', () => {
  it('scada forces margin 0 and outerMargin false', () => {
    const geometry = buildGridLayout({
      layout: scadaLayout(),
      widgets: WIDGETS,
      containerWidth: 1000,
      isMobile: false,
    });
    expect(geometry.margin).toBe(0);
    expect(geometry.containerPadding).toBe(0);
  });

  it('scada never degrades to the mobile single-column stack', () => {
    const geometry = buildGridLayout({
      layout: scadaLayout({
        widgets: { w1: { sizeX: 8, sizeY: 6, row: 2, col: 4 } },
      }),
      widgets: WIDGETS,
      containerWidth: 500,
      isMobile: true, // narrow viewport — must be ignored for scada
    });
    expect(geometry.cols).not.toBe(1);
    expect(geometry.items[0]).toMatchObject({ x: 4, y: 2 });
  });

  it('non-scada layouts still degrade to the mobile stack', () => {
    const layout = scadaLayout();
    layout.gridSettings.layoutType = 'default';
    const geometry = buildGridLayout({
      layout,
      widgets: WIDGETS,
      containerWidth: 500,
      isMobile: true,
    });
    expect(geometry.cols).toBe(1);
  });

  it('scada forces autofill off even with autoFillHeight set', () => {
    const layout = scadaLayout();
    layout.gridSettings.autoFillHeight = true;
    const geometry = buildGridLayout({
      layout,
      widgets: WIDGETS,
      containerWidth: 1000,
      containerHeight: 600,
      isMobile: false,
    });
    // 'match' math (row = column width), not the Fit math
    const expected = (1000 - 0 * 23 - 0) / 24;
    expect(geometry.rowHeight).toBeCloseTo(expected, 6);
  });

  it('editMode forces autofill off on non-scada layouts', () => {
    const layout = scadaLayout();
    layout.gridSettings.layoutType = 'default';
    layout.gridSettings.autoFillHeight = true;
    const geometry = buildGridLayout({
      layout,
      widgets: WIDGETS,
      containerWidth: 1000,
      containerHeight: 600,
      isMobile: false,
      editMode: true,
    });
    const expected = (1000 - 10 * 23 - 20) / 24;
    expect(geometry.rowHeight).toBeCloseTo(expected, 6);
  });

  it('autofill still applies on non-scada readonly layouts', () => {
    const layout = scadaLayout();
    layout.gridSettings.layoutType = 'default';
    layout.gridSettings.autoFillHeight = true;
    const geometry = buildGridLayout({
      layout,
      widgets: WIDGETS,
      containerWidth: 1000,
      containerHeight: 601,
      isMobile: false,
    });
    // Fit math consumes the container height (NOT the match fallback)
    expect(geometry.rowHeight).toBeCloseTo((601 - 10 * (6 + 1)) / 6, 6);
  });
});

describe('scadaColumnClamp (§3.6 列数, ui-ngx :203-207)', () => {
  it('keeps legal multiples of 24', () => {
    expect(scadaColumnClamp(24)).toBe(24);
    expect(scadaColumnClamp(480)).toBe(480);
    expect(scadaColumnClamp(1008)).toBe(1008);
  });

  it('rounds illegal values UP to the next multiple of 24', () => {
    expect(scadaColumnClamp(25)).toBe(48);
    expect(scadaColumnClamp(30)).toBe(48);
    expect(scadaColumnClamp(47)).toBe(48);
  });

  it('caps at 1008 and floors at 24', () => {
    expect(scadaColumnClamp(2000)).toBe(1008);
    expect(scadaColumnClamp(10)).toBe(24);
    expect(scadaColumnClamp(0)).toBe(24);
  });
});
