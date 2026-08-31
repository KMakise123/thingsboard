import { describe, expect, it } from 'vitest';
import { brand } from './brand/config';
import { getDesignTokens, getThemeConfig } from './brand/theme';
import {
  buildEChartsTheme,
  getEChartsLocale,
  resolveChartColors,
  resolveSeriesColor,
} from './charts';

describe('theme/brand', () => {
  it('exposes a categorical palette of 8-10 independent slots', () => {
    expect(brand.chartPalette.categorical.length).toBeGreaterThanOrEqual(8);
    expect(brand.chartPalette.categorical.length).toBeLessThanOrEqual(10);
  });

  it('keeps the app name, logo and favicon in one place', () => {
    expect(brand.assets.appName).toBeTruthy();
    expect(brand.assets.logo).toBeTruthy();
    expect(brand.assets.favicon).toBeTruthy();
  });

  it('embeds the CJK font stack after Latin faces', () => {
    const latin = brand.seedTokens.fontFamily.indexOf('Segoe UI');
    const cjk = brand.seedTokens.fontFamily.indexOf('PingFang SC');
    const fallback = brand.seedTokens.fontFamily.lastIndexOf('sans-serif');
    expect(latin).toBeGreaterThan(-1);
    expect(cjk).toBeGreaterThan(latin);
    expect(fallback).toBeGreaterThan(cjk);
  });

  it('returns a stable ThemeConfig shape for the root ConfigProvider', () => {
    const config = getThemeConfig('light');
    expect(config.token?.colorPrimary).toBe(brand.seedTokens.colorPrimary);
  });
});

describe('theme/charts', () => {
  it('prefers dataKey.color over the chart palette', () => {
    expect(resolveSeriesColor(0, '#123456')).toBe('#123456');
    expect(resolveSeriesColor(0)).toBe(brand.chartPalette.categorical[0]);
  });

  it('maps overrides positionally and falls back per slot', () => {
    expect(resolveChartColors([undefined, '#abcdef'])).toEqual([
      brand.chartPalette.categorical[0],
      '#abcdef',
    ]);
    expect(resolveChartColors()).toEqual(brand.chartPalette.categorical);
  });

  it('builds light-mode chrome colors from antd tokens, not hex', () => {
    const tokens = getDesignTokens('light');
    const chartTheme = buildEChartsTheme('light');
    // Series palette is present verbatim...
    expect(chartTheme.color).toEqual(brand.chartPalette.categorical);
    // ...while every chrome color is a resolved antd token value.
    const tooltip = chartTheme.tooltip as { backgroundColor?: string };
    expect(tooltip.backgroundColor).toBe(tokens.colorBgElevated);
    expect(chartTheme.textStyle?.color).toBe(tokens.colorText);
    expect(chartTheme.textStyle?.fontFamily).toBe(tokens.fontFamily);
    expect(
      (
        chartTheme.valueAxis as {
          splitLine?: { lineStyle?: { color?: string } };
        }
      )?.splitLine?.lineStyle?.color,
    ).toBe(tokens.colorSplit);
  });

  it('maps locales to echarts built-in locale codes', () => {
    expect(getEChartsLocale('zh-CN')).toBe('ZH');
    expect(getEChartsLocale('en-US')).toBe('EN');
    expect(getEChartsLocale('fr-FR')).toBe('EN');
  });
});
