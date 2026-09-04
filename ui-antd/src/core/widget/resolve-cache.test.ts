/**
 * resolve-cache contract: keyed `fqn@version`, stable result identity per
 * key, fresh compile on version bump, no caching without a version, and the
 * editor preview path (raw compileWidget) never touching the cache.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { compileWidget } from './compile';
import { clearWidgetCompileCache, compileWidgetCached } from './resolve-cache';

const SOURCE = ['export default function W() {', '  return null;', '}'].join(
  '\n',
);

afterEach(() => {
  clearWidgetCompileCache();
});

describe('compileWidgetCached', () => {
  it('reuses one compiled result per fqn@version key (stable identity)', () => {
    const first = compileWidgetCached('tenant.demo', 3, SOURCE);
    const second = compileWidgetCached('tenant.demo', 3, SOURCE);
    if ('error' in first || 'error' in second) {
      throw new Error('unexpected compile error');
    }
    expect(second.component).toBe(first.component);
    expect(second.sourceURL).toBe(first.sourceURL);
  });

  it('compiles fresh after a version bump (save invalidates by key)', () => {
    const before = compileWidgetCached('tenant.demo', 3, SOURCE);
    const after = compileWidgetCached('tenant.demo', 4, SOURCE);
    if ('error' in before || 'error' in after) {
      throw new Error('unexpected compile error');
    }
    expect(after.component).not.toBe(before.component);
    expect(after.sourceURL).not.toBe(before.sourceURL);
  });

  it('separates keys per fqn', () => {
    const a = compileWidgetCached('tenant.a', 1, SOURCE);
    const b = compileWidgetCached('tenant.b', 1, SOURCE);
    if ('error' in a || 'error' in b) {
      throw new Error('unexpected compile error');
    }
    expect(b.sourceURL).not.toBe(a.sourceURL);
  });

  it('does not cache versionless sources (each call compiles fresh)', () => {
    const first = compileWidgetCached('tenant.demo', undefined, SOURCE);
    const second = compileWidgetCached('tenant.demo', undefined, SOURCE);
    if ('error' in first || 'error' in second) {
      throw new Error('unexpected compile error');
    }
    expect(second.sourceURL).not.toBe(first.sourceURL);
    // and nothing was stored
    const probe = compileWidgetCached('tenant.demo', 1, SOURCE);
    if ('error' in probe) {
      throw new Error('unexpected compile error');
    }
    expect(probe.sourceURL).not.toBe(first.sourceURL);
  });

  it('caches the error arm too (a broken widget stays one readable error)', () => {
    const broken = 'const x = ;';
    const first = compileWidgetCached('tenant.broken', 7, broken);
    const second = compileWidgetCached('tenant.broken', 7, broken);
    expect('error' in first).toBe(true);
    expect(second).toBe(first);
  });

  it('clearWidgetCompileCache forces a recompile for the same key', () => {
    const before = compileWidgetCached('tenant.demo', 1, SOURCE);
    clearWidgetCompileCache();
    const after = compileWidgetCached('tenant.demo', 1, SOURCE);
    if ('error' in before || 'error' in after) {
      throw new Error('unexpected compile error');
    }
    expect(after.sourceURL).not.toBe(before.sourceURL);
  });

  it('the editor preview path (raw compileWidget) bypasses the cache', () => {
    const direct = compileWidget(SOURCE, { name: 'tenant.demo' });
    const again = compileWidget(SOURCE, { name: 'tenant.demo' });
    const cached = compileWidgetCached('tenant.demo', 1, SOURCE);
    if (
      'error' in direct ||
      'error' in again ||
      'error' in direct ||
      'error' in cached
    ) {
      throw new Error('unexpected compile error');
    }
    // raw compiles are never stored or served — every call is a fresh module
    expect(cached.sourceURL).not.toBe(direct.sourceURL);
    expect(again.sourceURL).not.toBe(direct.sourceURL);
  });
});
