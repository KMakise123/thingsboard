/**
 * Compile pipeline for `runtime: 'react-1'` custom widgets (ADR 0004 §4).
 *
 * Sucrase (typescript + jsx + imports, automatic runtime, production) turns
 * the editor's TSX source into a CommonJS module body; the body runs through
 * `new Function('require','module','exports', …)` — never eval — with a
 * WHITELISTED require shim. Host react/react-dom are passed as the host's
 * own single instances so compiled code can never land a second React copy
 * (Invalid hook call guard). `widget-kit` is the only dependency facade
 * (see widget-kit.ts — the future iframe bridge point).
 *
 * Error contract: `compileWidget` never throws. Transform and module-init
 * failures come back as `{ error: { stage, message, line?, column? } }`
 * with line/column mapped to EDITOR source lines. Runtime (render-time)
 * failures surface later at the error boundary; `sourceURL` + `lineOffset`
 * let it map a stack frame back to the editor line
 * (resolveRuntimeErrorLocation).
 *
 * Line mapping (P1, ADR appendix A): Sucrase preserves source line numbers
 * (its prologue is injected on line 1), so transform errors are already
 * source-aligned. For runtime frames the compiled body is
 *
 *     <1 banner line>          ← body line 1
 *     <editor source line L>   ← body line L + BANNER_LINE_COUNT
 *     //# sourceURL=<name>     ← V8 names stack frames after it
 *
 * and V8 reports `sourceURL:(bodyLine + WRAPPER_LINES)`. The engine wrapper
 * offset is measured once (engineBodyLineOffset), not hard-coded, so the
 * mapping survives engine differences; editor line = reported − lineOffset.
 *
 * NOTE: this module is intentionally uncached — the dashboard resolver goes
 * through resolve-cache.ts (`fqn@version`), while the widget editor preview
 * always recompiles fresh (ADR 0004 §4: preview never hits the cache).
 */

import type { ComponentType, LazyExoticComponent } from 'react';
import * as hostReact from 'react';
import { lazy } from 'react';
import * as hostJsxRuntime from 'react/jsx-runtime';
import * as hostReactDOM from 'react-dom';
import * as hostReactDOMClient from 'react-dom/client';
import { transform } from 'sucrase';

import type { CustomWidgetProps } from './types';
import * as widgetKit from './widget-kit';

// ---------------------------------------------------------------------------
// require whitelist — the ONLY modules compiled code may import
// ---------------------------------------------------------------------------

/**
 * Same host instance objects for every compiled module (react/react-dom are
 * the app's own single copies — a second React copy inside a compiled
 * widget is the classic Invalid hook call).
 */
const HOST_MODULE_REGISTRY: Record<string, unknown> = {
  react: hostReact,
  'react/jsx-runtime': hostJsxRuntime,
  'react-dom': hostReactDOM,
  'react-dom/client': hostReactDOMClient,
  'widget-kit': widgetKit,
};

const WHITELIST_HINT =
  'Allowed modules: react, react/jsx-runtime, react-dom, react-dom/client, widget-kit. ' +
  'Import UI/chart/date/value-format helpers from "widget-kit" (e.g. `import { antd, recharts } from "widget-kit"`).';

/**
 * The require shim handed to every compiled module. Whitelist misses throw
 * a readable error — this text lands in the widget editor console and the
 * browser console, so it must name the module and point at the facade.
 */
export function createWidgetRequire(): (name: string) => unknown {
  return (name: string) => {
    const module = HOST_MODULE_REGISTRY[name];
    if (module === undefined) {
      throw new Error(
        `[widget] module "${name}" is not available to custom widgets. ${WHITELIST_HINT}`,
      );
    }
    return module;
  };
}

// ---------------------------------------------------------------------------
// Line mapping (P1)
// ---------------------------------------------------------------------------

const WIDGET_SOURCE_BANNER =
  '/* Compiled from widget editor source by the M9 pipeline — editor line = stack line - lineOffset. */';
const BANNER_LINE_COUNT = 1;

/** V8's fallback wrapper offset (`function anonymous(…) {\n<body>\n}`), used only if calibration cannot parse a stack. */
const FALLBACK_ENGINE_OFFSET = 2;

let engineBodyLineOffsetCache: number | undefined;

/** First `at` stack frame tagged with `sourceURL` → { line, column }. */
export function reportedStackLocation(
  error: unknown,
  sourceURL: string,
): { line: number; column: number } | undefined {
  const stack =
    typeof (error as Error)?.stack === 'string' ? (error as Error).stack : '';
  if (!stack) {
    return undefined;
  }
  const pattern = new RegExp(
    `${sourceURL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+):(\\d+)`,
  );
  const frames = stack
    .split('\n')
    .filter((frame) => frame.trimStart().startsWith('at '));
  for (const frame of frames) {
    const match = pattern.exec(frame);
    if (match) {
      return { line: Number(match[1]), column: Number(match[2]) };
    }
  }
  return undefined;
}

/**
 * Measure how many lines the engine's Function wrapper adds before the body
 * (V8: 2). Probed once per session by throwing from a known body line and
 * reading the reported line back with the same stack parser the runtime
 * error mapping uses — so parser and offset can never drift apart.
 */
function engineBodyLineOffset(): number {
  if (engineBodyLineOffsetCache !== undefined) {
    return engineBodyLineOffsetCache;
  }
  const calibrationURL = 'm9-widget-line-calibration.js';
  const probe = new Function(
    'require',
    'module',
    'exports',
    `throw new Error('m9 widget line calibration');\n//# sourceURL=${calibrationURL}`,
  );
  let measured = FALLBACK_ENGINE_OFFSET;
  try {
    probe(() => undefined, { exports: {} }, {});
  } catch (error) {
    const reported = reportedStackLocation(error, calibrationURL);
    if (reported !== undefined) {
      measured = reported.line - 1;
    }
  }
  engineBodyLineOffsetCache = measured;
  return measured;
}

// ---------------------------------------------------------------------------
// compileWidget
// ---------------------------------------------------------------------------

export interface WidgetCompileError {
  /** `transform` = Sucrase parse/emit failure; `execute` = module top-level throw. */
  stage: 'transform' | 'execute';
  message: string;
  /** 1-based line in the EDITOR source (already offset-mapped). */
  line?: number;
  column?: number;
}

export interface CompiledWidget {
  /** lazy-wrapped custom widget component (same registration face as builtins). */
  component: LazyExoticComponent<ComponentType<CustomWidgetProps>>;
  /** sourceURL tag embedded in the compiled body — stack frame attribution. */
  sourceURL: string;
  /** editor source line = stack line − lineOffset (for sourceURL-tagged frames). */
  lineOffset: number;
}

export type WidgetCompileResult =
  | CompiledWidget
  | { error: WidgetCompileError };

let compileSequence = 0;

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'widget';
}

function isComponentLike(value: unknown): boolean {
  if (typeof value === 'function') {
    return true;
  }
  return (
    typeof value === 'object' &&
    value !== null &&
    '$$typeof' in (value as Record<string, unknown>)
  );
}

/**
 * Compile + execute a custom widget source. Synchronous; never throws.
 * `options.name` only shapes the sourceURL (debugging/attribution).
 */
export function compileWidget(
  source: string,
  options?: { name?: string },
): WidgetCompileResult {
  const sourceURL = `m9-widget-${++compileSequence}-${slugify(options?.name ?? 'widget')}.tsx`;

  let compiled: string;
  try {
    compiled = transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: true,
      filePath: sourceURL,
    }).code;
  } catch (error) {
    const loc = (error as { loc?: { line?: number; column?: number } }).loc;
    return {
      error: {
        stage: 'transform',
        message: error instanceof Error ? error.message : String(error),
        // explicit checks, not `?:` — exactOptionalPropertyTypes forbids
        // assigning undefined to an optional field
        ...(loc?.line === undefined ? {} : { line: loc.line }),
        ...(loc?.column === undefined ? {} : { column: loc.column }),
      },
    };
  }

  const body = `${WIDGET_SOURCE_BANNER}\n${compiled}\n//# sourceURL=${sourceURL}`;
  const lineOffset = BANNER_LINE_COUNT + engineBodyLineOffset();

  try {
    const factory = new Function('require', 'module', 'exports', body);
    const moduleObject = { exports: {} as Record<string, unknown> };
    factory(createWidgetRequire(), moduleObject, moduleObject.exports);

    const exported = moduleObject.exports.default;
    if (!isComponentLike(exported)) {
      return {
        error: {
          stage: 'execute',
          message:
            'The module has no usable default export — add `export default function MyWidget(props: CustomWidgetProps) { … }`.',
        },
      };
    }

    const component = exported as ComponentType<CustomWidgetProps>;
    return {
      // lazy wrapper: the compiled component joins the exact registration
      // face the builtin registry entries use (ADR 0004 §4)
      component: lazy(async () => ({ default: component })),
      sourceURL,
      lineOffset,
    };
  } catch (error) {
    const reported = reportedStackLocation(error, sourceURL);
    return {
      error: {
        stage: 'execute',
        message: error instanceof Error ? error.message : String(error),
        ...(reported === undefined
          ? {}
          : { line: reported.line - lineOffset, column: reported.column }),
      },
    };
  }
}

/**
 * Map a RUNTIME (render-time) error captured by an error boundary back to
 * the editor source. Returns undefined when the stack carries no frame for
 * this widget's sourceURL (e.g. the error was thrown by host code).
 * Editor line = reported − lineOffset — the P1 contract.
 */
export function resolveRuntimeErrorLocation(
  error: unknown,
  compiled: Pick<CompiledWidget, 'sourceURL' | 'lineOffset'>,
): { line: number; column: number } | undefined {
  const reported = reportedStackLocation(error, compiled.sourceURL);
  if (reported === undefined) {
    return undefined;
  }
  return { line: reported.line - compiled.lineOffset, column: reported.column };
}
