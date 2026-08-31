import type { ThemeConfig } from 'antd';
import { theme } from 'antd';
import type { GlobalToken } from 'antd/es/theme/interface';
import { brand } from './config';

/**
 * Color mode of the app shell. v1 ships light only; the parameter shape
 * keeps `dark` reserved so the buildEChartsTheme/getThemeConfig call sites
 * do not change when a dark mode lands.
 */
export type ThemeMode = 'light';

export function getAlgorithm(mode: ThemeMode) {
  // `dark` maps to theme.darkAlgorithm when introduced.
  return mode === 'light' ? theme.defaultAlgorithm : theme.defaultAlgorithm;
}

/**
 * Resolved antd tokens for `mode` — the bridge used by chart chrome styling
 * (src/theme/charts.ts) and any code that needs concrete token values
 * outside React context.
 */
export function getDesignTokens(mode: ThemeMode = 'light'): GlobalToken {
  return theme.getDesignToken({
    token: brand.seedTokens,
    algorithm: getAlgorithm(mode),
  });
}

/**
 * ThemeConfig for the root ConfigProvider. Call once and keep the returned
 * object stable — flipping between undefined and an object remounts the
 * whole React tree.
 */
export function getThemeConfig(mode: ThemeMode = 'light'): ThemeConfig {
  return {
    algorithm: getAlgorithm(mode),
    token: brand.seedTokens,
  };
}
