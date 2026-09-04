/**
 * Compile pipeline contract + ADR 0004 appendix A PoC evidence.
 *
 * P1 — Sucrase compile errors and runtime errors map back to the EDITOR
 *      source lines of multi-line JSX modules (transform `loc` passthrough;
 *      runtime frames via `//# sourceURL` + calibrated `lineOffset`).
 * P2 — the require shim hands compiled code the HOST's single react
 *      instance and the host's own antd module objects (identity +
 *      `$$typeof` same-source assertions), and antd components actually
 *      work inside the compiled output (rendered below).
 *
 * Tests resolve the raw component through React's lazy payload
 * (`_payload._result` is the init ctor before first render — pinned React
 * 19 internals; a React major breaking this fails loudly here, which is
 * the point of evidence tests).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import * as hostAntd from 'antd';
import * as hostReact from 'react';
import * as hostJsxRuntime from 'react/jsx-runtime';
import { afterEach, describe, expect, it } from 'vitest';

import type { CompiledWidget } from './compile';
import {
  compileWidget,
  createWidgetRequire,
  resolveRuntimeErrorLocation,
} from './compile';
import type { CustomWidgetProps } from './types';

function makeProps(): CustomWidgetProps {
  return {
    config: {},
    settings: {},
    datasources: [],
    data: {},
    latestData: {},
    timewindow: null,
    actions: {},
    ctx: {
      width: 120,
      height: 80,
      isEdit: false,
      isPreview: true,
      locale: 'zh-CN',
      toast: () => {},
    },
  };
}

type RawComponent = (props: CustomWidgetProps) => unknown;

/** Resolve the raw (pre-lazy) component out of the compiled payload. */
async function rawComponentOf(compiled: CompiledWidget): Promise<RawComponent> {
  const init = (
    compiled.component as unknown as {
      _payload: { _result: () => Promise<{ default: RawComponent }> };
    }
  )._payload._result;
  return (await init()).default;
}

afterEach(cleanup);

describe('compileWidget — happy path', () => {
  it('returns a lazy-wrapped component with line-mapping metadata', async () => {
    const result = compileWidget(
      'export default function W() { return null; }',
      { name: 'meta-probe' },
    );
    if ('error' in result) {
      throw new Error(`unexpected compile error: ${result.error.message}`);
    }
    expect(typeof result.component).toBe('object');
    expect(result.component.$$typeof).toBe(
      (
        hostReact.lazy(async () => ({ default: () => null })) as {
          $$typeof: unknown;
        }
      ).$$typeof,
    );
    expect(result.sourceURL).toMatch(/^m9-widget-\d+-meta-probe\.tsx$/);
    expect(result.lineOffset).toBeGreaterThan(0);
    const raw = await rawComponentOf(result);
    expect(raw(makeProps())).toBeNull();
  });
});

describe('compileWidget — transform errors (P1, compile-time)', () => {
  it('reports the exact editor line/column of a syntax error in multi-line source', () => {
    const source = [
      'import { antd } from "widget-kit";',
      '',
      'const ok = 1;',
      'const more = 2;',
      '',
      'const broken = ;', // line 6 — sucrase loc pins here
      '',
      'export default function W() {',
      '  return null;',
      '}',
    ].join('\n');
    const result = compileWidget(source, { name: 'broken-syntax' });
    if (!('error' in result)) {
      throw new Error('expected a compile error');
    }
    expect(result.error.stage).toBe('transform');
    expect(result.error.line).toBe(6);
    expect(result.error.column).toBe(16);
    expect(result.error.message).toContain('broken-syntax');
  });

  it('reports an editor line for a JSX parse error in multi-line JSX', () => {
    const source = [
      'export default function W() {',
      '  return (',
      '    <div>',
      '      <span>text', // line 4 — never closed
      '    </div>',
      '  );',
      '}',
    ].join('\n');
    const result = compileWidget(source, { name: 'broken-jsx' });
    if (!('error' in result)) {
      throw new Error('expected a compile error');
    }
    expect(result.error.stage).toBe('transform');
    // sucrase reports the token position where JSX parsing fails — here the
    // `</div>` on editor line 6 that cannot close the open <span>
    expect(result.error.line).toBe(6);
    expect(result.error.column).toBe(3);
  });
});

describe('compileWidget — P2 require shim single instances', () => {
  it('serves every whitelisted name from the host module objects', () => {
    const widgetRequire = createWidgetRequire();
    expect(widgetRequire('react')).toBe(hostReact);
    expect(widgetRequire('react/jsx-runtime')).toBe(hostJsxRuntime);
    const kit = widgetRequire('widget-kit') as typeof import('./widget-kit');
    expect(kit.antd.Button).toBe(hostAntd.Button);
  });

  it('gives the compiled module the host react functions and host antd Button ($$typeof same-source)', async () => {
    const result = compileWidget(
      [
        "import { antd } from 'widget-kit';",
        "import * as reactNs from 'react';",
        '',
        'export default function Refs() {',
        '  return {',
        '    antdButton: antd.Button,',
        '    react: reactNs,',
        '    element: <div data-probe="el" />,', // created INSIDE compiled code
        '  };',
        '}',
      ].join('\n'),
      { name: 'singletons' },
    );
    if ('error' in result) {
      throw new Error(`unexpected compile error: ${result.error.message}`);
    }
    const refs = (await rawComponentOf(result))(makeProps()) as {
      antdButton: unknown;
      react: Record<string, unknown>;
      element: { $$typeof: unknown };
    };
    // single-instance guarantees: THE host objects (or their direct
    // references) reach compiled code — a second React copy is impossible.
    // (sucrase's `import * as` interop copies the namespace shell, so
    // function-level identity is the assertion that matters; the shim-level
    // namespace identity is pinned in the test above.)
    expect(refs.antdButton).toBe(hostAntd.Button); // named import, no interop copy
    expect(refs.react.createElement).toBe(hostReact.createElement);
    expect(refs.react.useState).toBe(hostReact.useState);
    // $$typeof same-source assertions
    expect(String(refs.element.$$typeof)).toBe(
      String(
        (hostReact.createElement('div') as unknown as { $$typeof: unknown })
          .$$typeof,
      ),
    );
    expect((refs.antdButton as { $$typeof: unknown }).$$typeof).toBe(
      (hostAntd.Button as { $$typeof: unknown }).$$typeof,
    );
  });

  it('renders a multi-line JSX widget using host antd through widget-kit', async () => {
    const result = compileWidget(
      [
        "import { antd } from 'widget-kit';",
        '',
        'export default function HelloWidget(props: CustomWidgetProps) {',
        '  return (',
        '    <div data-testid="m9-compiled-root">',
        '      <h1>hello compiled</h1>',
        '      <antd.Button type="primary">compiled button</antd.Button>',
        '      <span>{String(props.ctx.isPreview)}</span>',
        '    </div>',
        '  );',
        '}',
      ].join('\n'),
      { name: 'hello-widget' },
    );
    if ('error' in result) {
      throw new Error(`unexpected compile error: ${result.error.message}`);
    }
    render(
      <hostReact.Suspense fallback={<span>loading</span>}>
        {hostReact.createElement(result.component, makeProps())}
      </hostReact.Suspense>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('m9-compiled-root')).toBeInTheDocument();
    });
    expect(screen.getByText('hello compiled')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'compiled button' });
    expect(button.className).toContain('ant-btn'); // antd truly rendered
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('rejects non-whitelisted modules with a readable, module-naming error', () => {
    // the import must be USED as a value — TypeScript elision (which sucrase
    // mirrors) drops never-referenced imports before the require fires
    const result = compileWidget(
      [
        "import _ from 'lodash';",
        '',
        'export default function W() {',
        "  return <span>{_.camelCase('a b')}</span>;",
        '}',
      ].join('\n'),
      { name: 'wants-lodash' },
    );
    if (!('error' in result)) {
      throw new Error('expected a compile error');
    }
    expect(result.error.stage).toBe('execute');
    expect(result.error.message).toContain('lodash');
    expect(result.error.message).toContain('widget-kit');
    expect(result.error.message).toContain('react/jsx-runtime');
  });

  it('rejects a module without a usable default export with guidance', () => {
    const result = compileWidget('export const notDefault = 1;', {
      name: 'no-default',
    });
    if (!('error' in result)) {
      throw new Error('expected a compile error');
    }
    expect(result.error.stage).toBe('execute');
    expect(result.error.message).toContain('default');
  });

  it('compiles JSX that relies on the injected react/jsx-runtime require', async () => {
    // no explicit react import at all — the automatic runtime must resolve
    // 'react/jsx-runtime' through the whitelist or this explodes
    const result = compileWidget(
      [
        'export default function W() {',
        '  return <p data-testid="jsx-only">jsx only</p>;',
        '}',
      ].join('\n'),
      { name: 'jsx-only' },
    );
    if ('error' in result) {
      throw new Error(`unexpected compile error: ${result.error.message}`);
    }
    render(
      <hostReact.Suspense fallback={<span>loading</span>}>
        {hostReact.createElement(result.component, makeProps())}
      </hostReact.Suspense>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('jsx-only')).toBeInTheDocument();
    });
  });
});

describe('compileWidget — runtime errors (P1, sourceURL line mapping)', () => {
  const DIRECT_SOURCE = [
    'function frame() {',
    '  return explode();', // line 2 — call site
    '}',
    'function explode(): never {',
    "  throw new Error('m9 runtime boom');", // line 4 — throw site
    '}',
    'export default function Direct() {',
    '  return frame();', // line 7 — entry call site
    '}',
  ].join('\n');

  async function captureRuntimeError() {
    const compiled = compileWidget(DIRECT_SOURCE, { name: 'runtime-direct' });
    if ('error' in compiled) {
      throw new Error(`unexpected compile error: ${compiled.error.message}`);
    }
    const raw = await rawComponentOf(compiled);
    let thrown: unknown;
    try {
      raw(makeProps());
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    return { compiled, thrown: thrown as Error };
  }

  it('maps the throw-site stack line back to the exact editor source line', async () => {
    const { compiled, thrown } = await captureRuntimeError();
    expect(thrown.message).toBe('m9 runtime boom');
    const location = resolveRuntimeErrorLocation(thrown, compiled);
    expect(location).toBeDefined();
    expect(location?.line).toBe(5); // the `throw` line in the editor source
  });

  it('maps the call-site frame with the same calibrated offset', async () => {
    const { compiled, thrown } = await captureRuntimeError();
    const frames = (thrown.stack ?? '')
      .split('\n')
      .filter((frame) => frame.trimStart().startsWith('at '))
      .map((frame) => frame.trim());
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(frames[0]).toContain(compiled.sourceURL); // named by //# sourceURL
    const reportedCallLine = Number(/:(\d+):\d+\)?\$?$/.exec(frames[1])?.[1]);
    expect(reportedCallLine - compiled.lineOffset).toBe(2); // `return explode();`
  });

  it('returns undefined for errors whose stack carries no widget frame', () => {
    expect(
      resolveRuntimeErrorLocation(new Error('host-side'), {
        sourceURL: 'm9-widget-999-never.tsx',
        lineOffset: 3,
      }),
    ).toBeUndefined();
  });
});
