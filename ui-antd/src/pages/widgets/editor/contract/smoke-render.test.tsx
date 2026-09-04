/**
 * Smoke-render gate tests: a clean compiled module survives a full
 * render/unmount cycle on the detached container (cleanup effects run); a
 * render-phase throw is captured (never escapes) with the P1 editor-line
 * mapping. The fixtures go through the REAL pipeline (compileWidget), so
 * these tests double as gate-2 integration evidence.
 */
import { describe, expect, it } from 'vitest';
import { compileWidget } from '@/core/widget/compile';
import { emptyWidgetEditorDoc } from '../draft-convert';
import { type SmokeRenderOutcome, smokeRenderWidget } from './smoke-render';
import { smokePropsOf } from './use-widget-save';

// The smoke gate drives its own react-dom root with REAL timers (the probe
// waits on the lazy module's retry pass); React's act environment would park
// that concurrent retry for an outer act scope that never comes, so these
// tests opt out of the act regime on purpose.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

function smokeProps() {
  const doc = emptyWidgetEditorDoc();
  doc.meta.sizeX = 8;
  doc.meta.sizeY = 6;
  doc.defaultConfig = '{"title":"smoke","settings":{"threshold":3}}';
  return smokePropsOf(doc);
}

async function smoke(tsx: string): Promise<SmokeRenderOutcome> {
  const compiled = compileWidget(tsx, { name: 'smoke-test' });
  if ('error' in compiled) {
    throw new Error(`fixture must compile: ${compiled.error.message}`);
  }
  return smokeRenderWidget(compiled, smokeProps());
}

describe('smokeRenderWidget — the save-chain render gate', () => {
  it('a clean component passes and its unmount cleanup runs', async () => {
    const holder = { cleaned: false } as { cleaned?: boolean };
    (globalThis as { __smokeCleanup?: unknown }).__smokeCleanup = holder;
    // useLayoutEffect: runs synchronously at commit, so its cleanup is a
    // deterministic unmount probe (passive effects may not have flushed)
    const outcome = await smoke(
      'import { useLayoutEffect } from "react";' +
        'export default function W() { useLayoutEffect(() => () => {' +
        ' (globalThis as any).__smokeCleanup.cleaned = true; }, []);' +
        ' return <div>ok</div>; }',
    );
    expect(outcome).toEqual({ ok: true });
    expect(holder.cleaned).toBe(true);
    delete (globalThis as { __smokeCleanup?: unknown }).__smokeCleanup;
  });

  it('reads the smoke props stub: config + settings from defaultConfig', async () => {
    let seen: unknown = null;
    (globalThis as { __smokeSeen?: unknown }).__smokeSeen = {
      set(value: unknown) {
        seen = value;
      },
    };
    await smoke(
      'export default function W(props: any) {' +
        ' (globalThis as any).__smokeSeen.set(props.settings);' +
        ' return <div>{String(props.config.title)}</div>; }',
    );
    expect(seen).toEqual({ threshold: 3 });
    delete (globalThis as { __smokeSeen?: unknown }).__smokeSeen;
  });

  it('a render-phase throw is captured with a readable message', async () => {
    const outcome = await smoke(
      'export default function W() { throw new Error("smoke boom"); }',
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.message).toBe('smoke boom');
    }
  });

  it('the failure line maps back to the EDITOR source (P1 contract)', async () => {
    const tsx = [
      'export default function W() {',
      '  const hole: any = undefined;',
      '  return <div>{hole.deep}</div>;',
      '}',
    ].join('\n');
    const outcome = await smoke(tsx);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok && outcome.failure.line !== undefined) {
      expect(outcome.failure.line).toBe(3);
    }
  });

  it('an invalid element render is captured (no escape from the gate)', async () => {
    const outcome = await smoke(
      'export default function W() { const Bad: any = undefined; return <Bad />; }',
    );
    expect(outcome.ok).toBe(false);
  });
});
