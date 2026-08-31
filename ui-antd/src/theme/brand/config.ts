/**
 * Brand configuration — the single white-labeling seam (issue #8).
 *
 * Everything user-visible that identifies the product reads from this object:
 * seed design tokens, the chart palette and the runtime assets (app name,
 * logo, favicon, login background). Replacing the values here rebrands the
 * app; no other file may hardcode a brand value.
 *
 * The three historical leak points (defaultSettings, ProLayout token,
 * runtime document.title/favicon) all resolve through this config.
 */

/** Seed-level antd tokens. Derived tokens come from antd's algorithm. */
export interface BrandSeedTokens {
  colorPrimary: string;
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorInfo: string;
  borderRadius: number;
  /**
   * Latin-first CJK stack: Latin faces render ASCII, then PingFang SC /
   * Hiragino Sans GB / Microsoft YaHei / Noto Sans SC cover CJK.
   * Keep src/global.less body font-family in sync (Less cannot import TS).
   */
  fontFamily: string;
}

/**
 * Categorical chart palette, independent from colorPrimary by design —
 * series identity must not shift when the brand primary changes.
 *
 * 8 slots, fixed assignment order (slot N is always the same hue; a 9th
 * series folds into "Other", it is never a generated hue). Validated
 * (dataviz six-checks) against the antd light surface #ffffff:
 * lightness band / chroma floor / adjacent CVD Delta E 9.1 / normal-vision
 * Delta E 19.6 all PASS. Three slots (aqua, yellow, magenta) sit below 3:1
 * contrast on white — the relief rule applies: charts using them ship
 * direct labels or a table view.
 */
export interface ChartPalette {
  categorical: string[];
}

/** Runtime-replaceable brand assets (paths are served from public/). */
export interface BrandAssets {
  appName: string;
  logo: string;
  favicon: string;
  /** Optional login page background; falls back to token-derived styling. */
  loginBackground?: string;
}

export interface BrandConfig {
  seedTokens: BrandSeedTokens;
  chartPalette: ChartPalette;
  assets: BrandAssets;
}

export const brand: BrandConfig = {
  seedTokens: {
    // Placeholder brand color: antd blue. The real white-label decision
    // lands with the design wave; changing it here is the only edit needed.
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1677ff',
    borderRadius: 6,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  },
  chartPalette: {
    categorical: [
      '#2a78d6', // blue
      '#eb6834', // orange
      '#1baf7a', // aqua
      '#eda100', // yellow
      '#e87ba4', // magenta
      '#008300', // green
      '#4a3aa7', // violet
      '#e34948', // red
    ],
  },
  assets: {
    // Placeholder art (scaffold public/ assets). The white-label wave swaps
    // the files in public/ and, if needed, the paths here.
    appName: 'ThingsBoard',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },
};
