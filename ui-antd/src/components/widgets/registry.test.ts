/**
 * Registry resolver react-1 upgrade (ADR 0003 chain + ADR 0004 §4):
 * mapping rules of resolveWidgetTypeResolution, incl. the cached compile
 * and the custom-broken arm. Rendering closed loop lives in
 * custom-widget-dashboard.test.tsx.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { clearWidgetCompileCache } from '@/core/widget/resolve-cache';
import { EntityType } from '@/types/tb/entity';
import type { WidgetType } from '@/types/tb/widget-type';

import { resolveWidgetTypeResolution, type WidgetResolution } from './registry';

const FQN = 'tenant.temp_gauge';

const GOOD_SOURCE = [
  'export default function W() {',
  '  return null;',
  '}',
].join('\n');

function widgetType(partial: Partial<WidgetType>): WidgetType {
  return {
    id: { entityType: EntityType.WIDGET_TYPE, id: 'wt-1' },
    version: 1,
    ...partial,
  };
}

function expectCustom(
  resolution: WidgetResolution,
): Extract<WidgetResolution, { kind: 'custom' }> {
  if (resolution.kind !== 'custom') {
    throw new Error(`expected custom resolution, got ${resolution.kind}`);
  }
  return resolution;
}

afterEach(() => {
  clearWidgetCompileCache();
});

describe('resolveWidgetTypeResolution', () => {
  it('maps a missing fetch to the missing placeholder', () => {
    expect(resolveWidgetTypeResolution(FQN, undefined)).toEqual({
      kind: 'missing',
      fqn: FQN,
    });
  });

  it('maps a runtime-missing (Angular CE) descriptor to unsupported-angular', () => {
    const resolution = resolveWidgetTypeResolution(
      FQN,
      widgetType({
        descriptor: {
          type: 'latest',
          controllerScript: 'self.onDataUpdate = …;',
        },
      }),
    );
    expect(resolution).toEqual({ kind: 'unsupported-angular', fqn: FQN });
  });

  it('compiles a react-1 descriptor into the custom arm (lazy adapter)', () => {
    const resolution = resolveWidgetTypeResolution(
      FQN,
      widgetType({
        descriptor: {
          runtime: 'react-1',
          schemaVersion: 1,
          source: { tsx: GOOD_SOURCE, css: '.a { color: red; }' },
        },
      }),
    );
    const custom = expectCustom(resolution);
    expect(custom.fqn).toBe(FQN);
    expect(typeof custom.component).toBe('object'); // lazy face, same as builtins
  });

  it('reuses the compile cache across resolutions of the same fqn@version', async () => {
    const descriptor = {
      runtime: 'react-1' as const,
      schemaVersion: 1,
      source: { tsx: GOOD_SOURCE },
    };
    const first = expectCustom(
      resolveWidgetTypeResolution(FQN, widgetType({ version: 5, descriptor })),
    );
    const second = expectCustom(
      resolveWidgetTypeResolution(FQN, widgetType({ version: 5, descriptor })),
    );
    // each call wraps a fresh lazy adapter (container memoizes the
    // resolution), but BOTH resolve to the SAME cached compiled module —
    // verify through the lazy payloads (pinned React 19 internals, same
    // seam as compile.test.ts)
    const init = (component: unknown) =>
      (
        component as {
          _payload: { _result: () => Promise<{ default: unknown }> };
        }
      )._payload._result();
    const [firstModule, secondModule] = await Promise.all([
      init(first.component),
      init(second.component),
    ]);
    expect(secondModule.default).toBe(firstModule.default);
  });

  it('maps a compile failure to custom-broken with the readable error', () => {
    const resolution = resolveWidgetTypeResolution(
      FQN,
      widgetType({
        descriptor: {
          runtime: 'react-1',
          schemaVersion: 1,
          source: { tsx: 'const broken = ;' },
        },
      }),
    );
    if (resolution.kind !== 'custom-broken') {
      throw new Error(`expected custom-broken, got ${resolution.kind}`);
    }
    expect(resolution.fqn).toBe(FQN);
    expect(resolution.error.stage).toBe('transform');
    expect(resolution.error.line).toBe(1);
  });

  it('maps a react-1 descriptor without source to custom-broken', () => {
    const resolution = resolveWidgetTypeResolution(
      FQN,
      widgetType({ descriptor: { runtime: 'react-1', schemaVersion: 1 } }),
    );
    if (resolution.kind !== 'custom-broken') {
      throw new Error(`expected custom-broken, got ${resolution.kind}`);
    }
    expect(resolution.error.message).toContain('source.tsx');
  });
});
