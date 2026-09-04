/**
 * Two-layer style namespace for custom widgets (ADR 0004 §4, brief §2).
 *
 * Same-page preview + shared dashboard mean author CSS can never be trusted
 * to the document scope. Every rule is prefixed under a scope class:
 *   - TYPE layer    — descriptor `source.css`, scoped per widget type fqn
 *                     (`.tbw-type-…`), shared (refcounted) by all instances;
 *   - INSTANCE layer— `config.widgetCss`, scoped per widget instance id
 *                     (`.tbw-inst-…`).
 *
 * At-rule correctness (P10 half-item, locked by style-scope.test.ts):
 *   - @media / @supports / @container / @layer keep their prelude and their
 *     bodies get the selector prefix (recursive descent);
 *   - @font-face / @page / @property … are emitted verbatim (no selectors —
 *     prefixing their bodies would corrupt them);
 *   - @keyframes names are NAMESPACED (`pulse` → `<scope>-pulse`) so two
 *     widget types declaring the same keyframe name never clobber each
 *     other, frame bodies stay untouched, and `animation` / `animation-name`
 *     values anywhere in the same stylesheet are rewritten to the scoped
 *     names (forward references included).
 *
 * Injection lifecycle is explicit and testable: `mountWidgetStyle` creates
 * (or refcounts onto) one <style> node per scope and returns a handle with
 * update/release; release at refs → 0 removes the node. Style tags (not
 * adoptedStyleSheets) keep the whole surface assertable in tests.
 *
 * Grammar: recursive brace descent — like the html_value_card scopeCss
 * precedent, declarations are assumed brace-free (base64/URL alphabets are
 * brace-free; the same limitation the builtin widget carries).
 */

export type WidgetStyleLayer = 'type' | 'instance';

/** The scope class a widget root element must carry for its scoped CSS. */
export function widgetScopeClass(
  layer: WidgetStyleLayer,
  scopeKey: string,
): string {
  const sanitized = scopeKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `tbw-${layer === 'type' ? 'type' : 'inst'}-${sanitized}`;
}

// ---------------------------------------------------------------------------
// Scoping
// ---------------------------------------------------------------------------

/** At-rules whose block bodies contain selectors and must be re-scoped. */
const NESTABLE_AT_RULE = /^@(media|supports|container|layer)\b/i;
/** `@keyframes <name>` (vendor prefixes included). */
const KEYFRAMES_AT_RULE = /^@(-[a-z]+-)?keyframes\s+/i;
/** `animation:` / `animation-name:` declaration whose value may reference a keyframe. */
const ANIMATION_VALUE = /(animation-name|animation)(\s*:\s*)([^;}]+)/gi;

/**
 * Prefix every selector in `text` with `.scope`, recursing through
 * @media/@supports/@container/@layer, NAMESPACING @keyframes names, and
 * leaving selector-less at-rules (@font-face, @page, @property, …)
 * untouched. Keyframe renames are collected into `renames` (shared across
 * the whole stylesheet) and applied afterwards, so references that appear
 * BEFORE the @keyframes rule (forward references) rewrite correctly.
 */
function scopeSheet(
  text: string,
  scope: string,
  renames: Map<string, string>,
): string {
  let index = 0;

  /** Consume text up to the next brace; cursor lands ON the brace.
   * Returns the RAW text (whitespace preserved) so the output keeps the
   * author's rule separation/indentation. */
  const readHeader = (): string => {
    const start = index;
    while (index < text.length && text[index] !== '{' && text[index] !== '}') {
      index += 1;
    }
    return text.slice(start, index);
  };

  /** Consume one `{ … }` block; cursor lands AFTER the closing brace. */
  const readBlock = (): string => {
    index += 1; // cursor is on '{'
    const start = index;
    let depth = 1;
    while (index < text.length && depth > 0) {
      if (text[index] === '{') {
        depth += 1;
      } else if (text[index] === '}') {
        depth -= 1;
      }
      index += 1;
    }
    return text.slice(start, index - 1);
  };

  const prefixSelectors = (trimmed: string): string =>
    trimmed
      .split(',')
      .map((selector) => `${scope} ${selector.trim()}`)
      .join(', ');

  const parse = (): string => {
    let out = '';
    let rawHeader = readHeader();
    while (index < text.length) {
      const trimmed = rawHeader.trim();
      // leading whitespace only — the rule's own layout newlines/indent
      const lead = trimmed
        ? rawHeader.slice(0, rawHeader.indexOf(trimmed))
        : '';
      if (text[index] === '{') {
        const keyframes = KEYFRAMES_AT_RULE.exec(trimmed);
        if (keyframes) {
          const name = trimmed.slice(keyframes[0].length).trim();
          const scopedName = name ? `${scope.slice(1)}-${name}` : name;
          if (name) {
            renames.set(name, scopedName);
          }
          const body = readBlock().trim();
          // frame bodies (from/to/percent steps) carry no selectors — verbatim
          out += `${lead}${keyframes[0]}${scopedName} { ${body} }`;
        } else if (trimmed.startsWith('@')) {
          const body = readBlock();
          out += NESTABLE_AT_RULE.test(trimmed)
            ? // @media/@supports/…: prelude stays, body re-scopes
              `${lead}${trimmed} { ${scopeSheet(body, scope, renames).trim()} }`
            : // @font-face/@page/@property/…: selector-less, body verbatim
              `${lead}${trimmed} {${body}}`;
        } else {
          const body = readBlock();
          if (body.includes('{')) {
            // nested rule block (CSS nesting): re-scope the body recursively
            out += `${lead}${prefixSelectors(trimmed)} { ${scopeSheet(body, scope, renames).trim()} }`;
          } else {
            out += `${lead}${prefixSelectors(trimmed)} { ${body.trim()} }`;
          }
        }
        rawHeader = readHeader();
        continue;
      }
      // '}' — end of the current sheet fragment (malformed at top level)
      index += 1;
      return out + lead;
    }
    // sheet exhausted: rawHeader is the trailing whitespace tail
    return out + rawHeader;
  };

  return parse();
}

/**
 * Scope a widget stylesheet under one class. See the module doc for the
 * layer model and the at-rule contract.
 */
export function scopeWidgetCss(css: string, scopeClass: string): string {
  const renames = new Map<string, string>();
  const scoped = scopeSheet(css, `.${scopeClass}`, renames);
  if (renames.size === 0) {
    return scoped;
  }
  // post-pass: point animation/animation-name values at the scoped names.
  // Only values AFTER `animation:` / `animation-name:` are touched, so
  // property names and keyframe headers can never be mangled.
  return scoped.replace(
    ANIMATION_VALUE,
    (_match: string, property: string, separator: string, value: string) => {
      let rewritten = value;
      for (const [from, to] of renames) {
        // identifier boundaries both sides — never mangles e.g. `-spin`
        rewritten = rewritten.replace(
          new RegExp(`(?<![\\w-])${from}(?![\\w-])`, 'g'),
          to,
        );
      }
      return `${property}${separator}${rewritten}`;
    },
  );
}

// ---------------------------------------------------------------------------
// Injection lifecycle
// ---------------------------------------------------------------------------

export interface WidgetStyleHandle {
  /** Swap the CSS for this scope (no-op when the text is unchanged). */
  update(css: string): void;
  /** Drop one reference; the style node is removed at refs → 0. */
  release(): void;
}

interface MountedStyle {
  element: HTMLStyleElement;
  refs: number;
  css: string;
}

const mountedStyles = new Map<string, MountedStyle>();

function styleNodeKey(layer: WidgetStyleLayer, scopeKey: string): string {
  return `${layer}:${scopeKey}`;
}

/**
 * Mount author CSS under a layer scope. TYPE-layer styles are refcounted per
 * scope key so N instances of one widget type share a single <style> node;
 * INSTANCE-layer styles are 1:1 per widget instance id. Mounting the same
 * scope twice returns two handles onto the same node (each +1 ref).
 */
export function mountWidgetStyle(
  layer: WidgetStyleLayer,
  scopeKey: string,
  css: string,
): WidgetStyleHandle {
  const key = styleNodeKey(layer, scopeKey);
  let mounted = mountedStyles.get(key);
  if (!mounted) {
    const element = document.createElement('style');
    element.dataset.widgetStyleScope = layer;
    element.dataset.widgetStyleKey = scopeKey;
    element.textContent = scopeWidgetCss(
      css,
      widgetScopeClass(layer, scopeKey),
    );
    document.head.append(element);
    mounted = { element, refs: 0, css };
    mountedStyles.set(key, mounted);
  }
  mounted.refs += 1;
  const entry = mounted;

  return {
    update(nextCss: string) {
      // a released handle must never resurrect a removed node
      if (nextCss === entry.css || mountedStyles.get(key) !== entry) {
        return;
      }
      entry.css = nextCss;
      entry.element.textContent = scopeWidgetCss(
        nextCss,
        widgetScopeClass(layer, scopeKey),
      );
    },
    release() {
      entry.refs -= 1;
      if (entry.refs <= 0 && mountedStyles.get(key) === entry) {
        entry.element.remove();
        mountedStyles.delete(key);
      }
    },
  };
}

/** Test/diagnostic hook: how many style nodes are currently mounted. */
export function mountedWidgetStyleCount(): number {
  return mountedStyles.size;
}

/**
 * Drop every mounted style at once (refs → 0, nodes removed). Diagnostic
 * hook for test isolation and hot-reload/route teardown; production widget
 * code always releases through its handles.
 */
export function releaseAllWidgetStyles(): void {
  for (const entry of mountedStyles.values()) {
    entry.element.remove();
  }
  mountedStyles.clear();
}
