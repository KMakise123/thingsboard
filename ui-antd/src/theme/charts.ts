import { brand } from './brand/config';
import type { ThemeMode } from './brand/theme';
import { getDesignTokens } from './brand/theme';

/**
 * Chart theming — the ONLY place chart colors are decided.
 *
 * Rules (ADR 0007):
 * - Chart chrome (axis lines, labels, gridlines, tooltip surface) derives
 *   from antd tokens via getDesignTokens, never from hardcoded hex — the
 *   canvas cannot resolve CSS variables.
 * - Series colors come from brand.chartPalette in fixed slot order. A
 *   per-series override (dataKey.color) always wins over the palette.
 * - Chart components must not inline hex values.
 */

/** Structural slice of the echarts theme object (kept import-free). */
export interface EChartsThemeLike {
  color?: string[];
  backgroundColor?: string;
  textStyle?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Registered theme name passed to `echarts.init(el, CHART_THEME_NAME)`. */
export const CHART_THEME_NAME = 'tb-light';

/**
 * Resolve the color of one series.
 * Priority: dataKey-level override > chartPalette slot (by index).
 */
export function resolveSeriesColor(
  index: number,
  dataKeyColor?: string,
): string {
  if (dataKeyColor) return dataKeyColor;
  const { categorical } = brand.chartPalette;
  return categorical[index % categorical.length];
}

/** Ordered palette for a whole chart; overrides map 1:1 by position. */
export function resolveChartColors(dataKeyColors?: Array<string | undefined>) {
  if (!dataKeyColors?.length) return [...brand.chartPalette.categorical];
  return dataKeyColors.map((color, index) => resolveSeriesColor(index, color));
}

/**
 * Build the echarts theme for `mode` (v1 implements light; the parameter
 * reserves the dark shape). Chrome colors come from antd tokens so charts
 * follow token-level rebranding automatically.
 */
export function buildEChartsTheme(mode: ThemeMode = 'light'): EChartsThemeLike {
  const token = getDesignTokens(mode);
  return {
    color: [...brand.chartPalette.categorical],
    backgroundColor: 'transparent',
    textStyle: {
      color: token.colorText,
      fontFamily: token.fontFamily,
      fontSize: token.fontSize,
    },
    legend: {
      textColor: token.colorTextSecondary,
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: token.colorBorder } },
      axisTick: { lineStyle: { color: token.colorBorderSecondary } },
      axisLabel: { color: token.colorTextSecondary },
      splitLine: { show: false },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: token.colorTextSecondary },
      splitLine: { lineStyle: { color: token.colorSplit } },
    },
    tooltip: {
      backgroundColor: token.colorBgElevated,
      borderColor: token.colorBorderSecondary,
      textStyle: { color: token.colorText },
      axisPointer: { lineStyle: { color: token.colorBorder } },
    },
  };
}

/**
 * Map an app locale to the echarts built-in locale passed as the third
 * init argument: `echarts.init(el, CHART_THEME_NAME, { locale })`.
 * Unknown locales fall back to EN.
 */
export function getEChartsLocale(locale: string): 'ZH' | 'EN' {
  return locale.toLowerCase().startsWith('zh') ? 'ZH' : 'EN';
}
