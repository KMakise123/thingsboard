/**
 * Session compile cache for dashboard-side custom widgets (ADR 0004 §4).
 *
 * Keyed `fqn@version`: the optimistic-lock version of the WidgetType makes a
 * recompiled-after-save widget land on a NEW key, so stale compiled
 * components can never survive a save. The cache holds the whole
 * WidgetCompileResult (including the error arm) — a broken widget keeps
 * showing the same readable error instead of re-exploding on every mount,
 * and the lazy component identity stays STABLE across dashboard re-renders
 * (recompiling per render would remount the widget subtree every time).
 *
 * Editor preview NEVER goes through here: it calls `compileWidget` directly
 * (compile.ts is intentionally uncached) so ctrl+enter always runs the
 * freshly edited source — that is the "preview path always bypasses the
 * cache" contract from ADR 0004 §4.
 */

import { type WidgetCompileResult, compileWidget } from './compile';

const cache = new Map<string, WidgetCompileResult>();

/**
 * Compile (or reuse) a custom widget for one type fqn at one version.
 * `version` must be a number for caching to engage — an unsaved/versionless
 * descriptor compiles fresh and is NOT stored (its source could differ call
 * to call, and a wrong cached component would be unflushable).
 */
export function compileWidgetCached(
  fqn: string,
  version: number | undefined,
  source: string,
): WidgetCompileResult {
  if (typeof version !== 'number') {
    return compileWidget(source, { name: fqn });
  }
  const key = `${fqn}@${version}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const fresh = compileWidget(source, { name: fqn });
  cache.set(key, fresh);
  return fresh;
}

/**
 * Drop the whole session cache. The dashboard resolver does not need this
 * (versions keys handle invalidation); it exists for tests and for a future
 * "hard refresh custom widgets" affordance.
 */
export function clearWidgetCompileCache(): void {
  cache.clear();
}
