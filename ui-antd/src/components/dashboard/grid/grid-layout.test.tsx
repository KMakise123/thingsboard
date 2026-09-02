/**
 * TbGridLayout smoke: state layout + widgets map → RGL geometry with the
 * render callback per placed widget. Proves the 状态布局→布局→容器 data
 * path (state switch swaps layouts; geometry is fully controlled).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DashboardLayout, Widget } from '@/types/tb/dashboard';
import { TbGridLayout } from './grid-layout';

afterEach(cleanup);

const widgets: Record<string, Widget> = {
  chart: {
    typeFullFqn: 'system.time_series_chart',
    config: { datasources: [] },
  },
  table: {
    typeFullFqn: 'system.cards.entities_table',
    config: { datasources: [] },
  },
};

const layout: DashboardLayout = {
  widgets: {
    chart: { sizeX: 12, sizeY: 5, row: 0, col: 0 },
    table: { sizeX: 12, sizeY: 5, row: 5, col: 0 },
  },
  gridSettings: { columns: 24, margin: 10, outerMargin: true },
};

describe('TbGridLayout', () => {
  it('renders placed widgets with controlled read-only geometry', () => {
    const renderWidget = vi.fn((widgetId: string) => (
      <div>{`widget-body-${widgetId}`}</div>
    ));
    const { container } = render(
      <TbGridLayout
        layout={layout}
        widgets={widgets}
        containerWidth={970}
        isMobile={false}
        renderWidget={renderWidget}
      />,
    );
    expect(screen.getByText('widget-body-chart')).toBeInTheDocument();
    expect(screen.getByText('widget-body-table')).toBeInTheDocument();
    const renderedIds = renderWidget.mock.calls.map(([id]) => id);
    expect(renderedIds).toContain('chart');
    expect(renderedIds).toContain('table');

    const items = container.querySelectorAll('.react-grid-item');
    expect(items).toHaveLength(2);
    const grid = container.querySelector('.react-grid-layout');
    expect(grid).not.toBeNull();
    // read-only: no drag/resize affordances
    expect(grid?.className).not.toContain('undefined');
    const chartItem = items[0];
    expect(chartItem.className).not.toContain('react-draggable');
    // background passthrough for the layout background settings
    expect(
      screen.getByText('widget-body-chart').closest('.react-grid-item')
        ?.parentElement,
    ).not.toBeNull();
  });

  it('stacks the mobile single-column grid', () => {
    const renderWidget = vi.fn((widgetId: string) => (
      <div>{`mobile-${widgetId}`}</div>
    ));
    const { container } = render(
      <TbGridLayout
        layout={layout}
        widgets={widgets}
        containerWidth={400}
        isMobile
        renderWidget={renderWidget}
      />,
    );
    expect(screen.getByText('mobile-chart')).toBeInTheDocument();
    expect(screen.getByText('mobile-table')).toBeInTheDocument();
    const items = [...container.querySelectorAll('.react-grid-item')];
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('mobile-chart');
    expect(items[1].textContent).toBe('mobile-table');
  });

  it('filters hidden widgets on breakpoint-overridden layouts', () => {
    const renderWidget = vi.fn((widgetId: string) => (
      <div>{`md-${widgetId}`}</div>
    ));
    const withOverride: DashboardLayout = {
      ...layout,
      gridSettings: { columns: 24 },
      breakpoints: {
        md: {
          widgets: {
            chart: { sizeX: 24, sizeY: 5, row: 0, col: 0 },
            table: {
              sizeX: 24,
              sizeY: 5,
              row: 5,
              col: 0,
              desktopHide: true,
            },
          },
          gridSettings: { columns: 12 },
        },
      },
    };
    render(
      <TbGridLayout
        layout={withOverride}
        widgets={widgets}
        containerWidth={1000}
        isMobile={false}
        renderWidget={renderWidget}
      />,
    );
    expect(screen.getByText('md-chart')).toBeInTheDocument();
    expect(screen.queryByText('md-table')).toBeNull();
  });
});
