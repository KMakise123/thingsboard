/**
 * TbGridLayout — read-only dashboard grid on top of react-grid-layout v2
 * (ADR 0003 §1.4). RGL is used purely for grid geometry (px math); all TB
 * semantics (columns/margins/row heights/mobile stack/breakpoints) are
 * computed in grid-math.ts and fed in as a fully controlled layout.
 *
 * Read-only contract: dragging and resizing are disabled grid-wide, the
 * noCompactor keeps the data-driven positions verbatim (gaps preserved).
 *
 * React 19 + RGL v2 require the CSS side (react-grid-layout/css/styles.css);
 * it is imported here once.
 */
import { GridLayout, noCompactor, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

import type { DashboardLayout, Widget } from '@/types/tb/dashboard';
import { buildGridLayout, resolveBreakpointOverride } from './grid-math';

export interface TbGridLayoutProps {
  /** state layout (main or right) to render. */
  layout: DashboardLayout;
  /** configuration.widgets map. */
  widgets: Record<string, Widget>;
  /** measured viewport height (window/page area) for autofill math. */
  containerHeight?: number;
  isMobile: boolean;
  /** optional override for tests; defaults to the measured container width. */
  containerWidth?: number;
  /** background layering applied to the grid wrapper. */
  backgroundColor?: string;
  backgroundImageUrl?: string | null;
  renderWidget: (widgetId: string) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function TbGridLayout({
  layout,
  widgets,
  containerHeight,
  isMobile,
  containerWidth: containerWidthProp,
  backgroundColor,
  backgroundImageUrl,
  renderWidget,
  className,
  style,
}: TbGridLayoutProps) {
  const { width: measuredWidth, containerRef, mounted } = useContainerWidth();
  const width = containerWidthProp ?? measuredWidth;

  const effectiveLayout = resolveBreakpointOverride(layout, isMobile, width);
  const geometry = buildGridLayout({
    layout: effectiveLayout,
    widgets,
    containerWidth: width,
    containerHeight,
    isMobile,
  });

  const backgroundStyle: React.CSSProperties = {};
  if (backgroundColor) {
    backgroundStyle.backgroundColor = backgroundColor;
  }
  if (backgroundImageUrl) {
    backgroundStyle.backgroundImage = `url(${backgroundImageUrl})`;
    backgroundStyle.backgroundSize = 'cover';
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', ...backgroundStyle, ...style }}
    >
      {mounted || containerWidthProp !== undefined ? (
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
          dragConfig={{ enabled: false }}
          resizeConfig={{ enabled: false }}
          compactor={noCompactor}
          layout={geometry.items}
        >
          {geometry.placed.map((entry) => (
            <div key={entry.id} style={{ overflow: 'hidden' }}>
              {renderWidget(entry.id)}
            </div>
          ))}
        </GridLayout>
      ) : null}
    </div>
  );
}
