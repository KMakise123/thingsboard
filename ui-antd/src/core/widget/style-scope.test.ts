/**
 * style-scope behavior contract + P10 half-item evidence (ADR 0004
 * appendix A): CSS prefixer correctness for @media and @keyframes, plus the
 * injection lifecycle (refcount, update, release).
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  mountedWidgetStyleCount,
  mountWidgetStyle,
  releaseAllWidgetStyles,
  scopeWidgetCss,
  type WidgetStyleHandle,
  widgetScopeClass,
} from './style-scope';

const SCOPE = 'tbw-type-system-demo';

describe('scopeWidgetCss — plain rules', () => {
  it('prefixes every selector of a comma list under the scope class', () => {
    expect(
      scopeWidgetCss('.a { color: red; }\n.b, .c { margin: 0; }', SCOPE),
    ).toBe(
      `.${SCOPE} .a { color: red; }\n.${SCOPE} .b, .${SCOPE} .c { margin: 0; }`,
    );
  });

  it('keeps declaration bodies verbatim (including semicolons in strings)', () => {
    const css = `.x { content: "a;b"; font-size: 12px; }`;
    expect(scopeWidgetCss(css, SCOPE)).toBe(
      `.${SCOPE} .x { content: "a;b"; font-size: 12px; }`,
    );
  });
});

describe('scopeWidgetCss — @media / @supports (P10 half-item)', () => {
  it('keeps the @media prelude and re-scopes the inner selectors', () => {
    const css = '@media (max-width: 600px) { .card { padding: 4px; } }';
    expect(scopeWidgetCss(css, SCOPE)).toBe(
      `@media (max-width: 600px) { .${SCOPE} .card { padding: 4px; } }`,
    );
  });

  it('re-scopes nested @supports inside @media', () => {
    const css = [
      '@media screen {',
      '  @supports (display: grid) {',
      '    .grid { display: grid; }',
      '  }',
      '}',
    ].join('\n');
    expect(scopeWidgetCss(css, SCOPE)).toBe(
      `@media screen { @supports (display: grid) { .${SCOPE} .grid { display: grid; } } }`,
    );
  });
});

describe('scopeWidgetCss — @keyframes (P10 half-item)', () => {
  it('namespaces the keyframe name and leaves frame bodies untouched', () => {
    const css = '@keyframes pulse { from { opacity: 0; } to { opacity: 1; } }';
    expect(scopeWidgetCss(css, SCOPE)).toBe(
      `@keyframes ${SCOPE}-pulse { from { opacity: 0; } to { opacity: 1; } }`,
    );
  });

  it('rewrites animation references, including shorthand and forward refs', () => {
    const css = [
      '.spinner { animation: spin 1s linear infinite; }',
      '.slow { animation-name: spin; }',
      '@keyframes spin { to { transform: rotate(360deg); } }',
    ].join('\n');
    const scoped = scopeWidgetCss(css, SCOPE);
    expect(scoped).toContain(`animation: ${SCOPE}-spin 1s linear infinite;`);
    expect(scoped).toContain(`animation-name: ${SCOPE}-spin;`);
    expect(scoped).toContain(`@keyframes ${SCOPE}-spin {`);
    // the original names must be gone entirely
    expect(scoped).not.toMatch(/(^|[^-\w])spin(?![\w-])/);
  });

  it('does not collide when two scopes rename the same keyframe name', () => {
    const css =
      '.a { animation: pulse 2s; } @keyframes pulse { to { opacity: 1; } }';
    const scopedA = scopeWidgetCss(css, 'tbw-type-widget-a');
    const scopedB = scopeWidgetCss(css, 'tbw-type-widget-b');
    expect(scopedA).toContain('@keyframes tbw-type-widget-a-pulse');
    expect(scopedB).toContain('@keyframes tbw-type-widget-b-pulse');
  });

  it('leaves @font-face bodies verbatim', () => {
    const css = '@font-face { font-family: "X"; src: url(x.woff2); }';
    expect(scopeWidgetCss(css, SCOPE)).toBe(css);
  });

  it('handles vendor-prefixed keyframes', () => {
    const css = '@-webkit-keyframes slide { from { left: 0; } }';
    expect(scopeWidgetCss(css, SCOPE)).toBe(
      `@-webkit-keyframes ${SCOPE}-slide { from { left: 0; } }`,
    );
  });
});

describe('widgetScopeClass', () => {
  it('derives stable class names per layer and scope key', () => {
    expect(widgetScopeClass('type', 'tenant.my_widget')).toBe(
      'tbw-type-tenant-my-widget',
    );
    expect(widgetScopeClass('instance', '01HX8W')).toBe('tbw-inst-01hx8w');
  });
});

describe('mountWidgetStyle — injection lifecycle', () => {
  afterEach(() => {
    releaseAllWidgetStyles();
  });

  function mountedNodes(): HTMLStyleElement[] {
    return [
      ...document.head.querySelectorAll<HTMLStyleElement>(
        'style[data-widget-style-scope]',
      ),
    ];
  }

  it('mounts one scoped style node and removes it on release', () => {
    const handle = mountWidgetStyle(
      'type',
      'tenant.demo',
      '.a { color: red; }',
    );
    const nodes = mountedNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].dataset.widgetStyleScope).toBe('type');
    expect(nodes[0].dataset.widgetStyleKey).toBe('tenant.demo');
    expect(nodes[0].textContent).toBe(
      '.tbw-type-tenant-demo .a { color: red; }',
    );
    handle.release();
    expect(mountedNodes()).toHaveLength(0);
    expect(mountedWidgetStyleCount()).toBe(0);
  });

  it('refcounts shared type styles across instances of one widget type', () => {
    const first: WidgetStyleHandle = mountWidgetStyle(
      'type',
      'tenant.demo',
      '.a { color: red; }',
    );
    const second = mountWidgetStyle(
      'type',
      'tenant.demo',
      '.a { color: red; }',
    );
    expect(mountedWidgetStyleCount()).toBe(1);
    first.release();
    expect(mountedWidgetStyleCount()).toBe(1); // still held by the second ref
    second.release();
    expect(mountedWidgetStyleCount()).toBe(0);
  });

  it('keeps type and instance scopes on separate nodes', () => {
    const type = mountWidgetStyle('type', 'tenant.demo', '.a { color: red; }');
    const inst = mountWidgetStyle('instance', 'widget-1', '.b { margin: 0; }');
    const nodes = mountedNodes();
    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.dataset.widgetStyleScope)).toEqual([
      'type',
      'instance',
    ]);
    expect(nodes[1].textContent).toContain('.tbw-inst-widget-1 .b');
    type.release();
    inst.release();
  });

  it('update() re-scopes new css and ignores identical text / stale handles', () => {
    const handle = mountWidgetStyle(
      'type',
      'tenant.demo',
      '.a { color: red; }',
    );
    handle.update('.a { color: blue; }');
    expect(mountedNodes()[0].textContent).toBe(
      '.tbw-type-tenant-demo .a { color: blue; }',
    );
    handle.update('.a { color: blue; }'); // unchanged → no-op
    expect(mountedNodes()[0].textContent).toBe(
      '.tbw-type-tenant-demo .a { color: blue; }',
    );
    handle.release();
    // stale handle must not resurrect the node
    handle.update('.a { color: green; }');
    expect(mountedNodes()).toHaveLength(0);
  });
});
