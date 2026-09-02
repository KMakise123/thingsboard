/**
 * Shared echarts lifecycle for W2 chart-shaped widgets (line/bar chart,
 * gauge). The init/ResizeObserver/dispose choreography follows the
 * TimeseriesHistoryModal.tsx:119-150 template (ADR 0007 theming: the
 * registered tb-light theme carries all chrome colors — components never
 * inline hex).
 */

import * as echarts from 'echarts';
import { useEffect, useRef, useState } from 'react';
import {
  buildEChartsTheme,
  CHART_THEME_NAME,
  getEChartsLocale,
} from '@/theme/charts';

// Register once per module load; re-registering the same name is a no-op.
echarts.registerTheme(CHART_THEME_NAME, buildEChartsTheme('light'));

/** A live chart instance still bound to the current container node. */
function isUsable(
  chart: echarts.ECharts | null,
  node: HTMLDivElement | null,
): boolean {
  if (!chart || !node) {
    return false;
  }
  try {
    if (typeof chart.isDisposed === 'function' && chart.isDisposed()) {
      return false;
    }
    if (typeof chart.getDom === 'function' && chart.getDom() !== node) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

export interface EchartsHandle {
  /** Attach to the chart container via `<div ref={setNode} … />`. */
  setNode: (node: HTMLDivElement | null) => void;
  /**
   * The bound container node. Data-driven effects must depend on it: a
   * container that mounts AFTER the data arrives (empty state → data state)
   * would otherwise never trigger its first paint (same reasoning as the
   * TimeseriesHistoryModal chartNode dependency).
   */
  node: HTMLDivElement | null;
  /** Paint (or repaint) the option; no-op until the chart is bound. */
  paint: (option: echarts.EChartsOption) => void;
  /** Clear all rendered content (empty-data state). */
  clear: () => void;
}

export function useEcharts(locale: string): EchartsHandle {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const boundNode = useRef<HTMLDivElement | null>(null);

  // (Re)init when the node mounts/changes; resize with the container; keep
  // the instance alive across repaints.
  useEffect(() => {
    if (!node) {
      return;
    }
    if (!isUsable(chartRef.current, node)) {
      chartRef.current?.dispose();
      chartRef.current = echarts.init(node, CHART_THEME_NAME, {
        locale: getEChartsLocale(locale),
        renderer: 'canvas',
      });
    }
    boundNode.current = node;
    const observer = new ResizeObserver(() => {
      if (isUsable(chartRef.current, node)) {
        chartRef.current?.resize();
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node, locale]);

  useEffect(
    () => () => {
      chartRef.current?.dispose();
      chartRef.current = null;
      boundNode.current = null;
    },
    [],
  );

  return {
    setNode,
    node,
    paint(option) {
      if (isUsable(chartRef.current, boundNode.current)) {
        chartRef.current?.setOption(option);
      }
    },
    clear() {
      if (isUsable(chartRef.current, boundNode.current)) {
        chartRef.current?.clear();
      }
    },
  };
}
