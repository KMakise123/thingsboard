import type { BrandConfig } from './config';
import { brand } from './config';

/**
 * Apply runtime brand assets: document title and favicon. Called once from
 * src/global.tsx so the shell never shows scaffold defaults. Config-level
 * title/logo (config/config.ts, config/defaultSettings.ts) cover the build
 * artifacts; this closes the runtime leak points.
 */
export function applyBrandAssets(config: BrandConfig = brand): void {
  if (typeof document === 'undefined') return;

  document.title = config.assets.appName;

  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = config.assets.favicon;
}
