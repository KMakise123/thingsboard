/**
 * Scoped console capture for the widget editor preview (spec §5.5 console
 * channel).
 *
 * HONEST WINDOW BOUNDARY — the host console is NEVER patched while no
 * preview window is open (depth 0 → the app's own console.* is untouched
 * and unswallowed). Capture windows, all refcounted on one global depth:
 *   - RUN window   — the synchronous ctrl+enter/mount pass: compileWidget
 *                    (module top-level console output), defaultConfig
 *                    parsing and the initial random series generation;
 *   - TICK window  — every function-datasource tick callback (series
 *                    evaluation);
 *   - RENDER window— the compiled component's render pass, opened at the
 *                    render-phase wrapper and closed at the NEAREST
 *                    MICROTASK CHECKPOINT (`enterForMicrotask`). React 19
 *                    usually commits inside the same task, so widget
 *                    render-phase logs land here; commit-phase passive
 *                    effects scheduled after that checkpoint, and any
 *                    console output elsewhere in the host app, are OUTSIDE
 *                    the capture and reach the real console untouched.
 *
 * `captureSync(fn)` is the closed bracket for RUN/TICK (enter → fn → exit,
 * always restored in `finally`); the render wrapper uses the microtask
 * bracket so an exception mid-render can never leak the patch.
 */

import type { WidgetConsoleLevel } from './console';

let depth = 0;

const ORIGINAL: Record<WidgetConsoleLevel, (...args: unknown[]) => void> = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

export type ConsoleSink = (level: WidgetConsoleLevel, text: string) => void;

let sink: ConsoleSink | null = null;

/** Single-line rendering of one console call (multi-arg joins with a space). */
export function formatConsoleArg(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg;
  }
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function install(): void {
  if (depth !== 0) {
    return;
  }
  const levels: WidgetConsoleLevel[] = ['log', 'info', 'warn', 'error'];
  for (const level of levels) {
    console[level] = (...args: unknown[]) => {
      if (sink && depth > 0) {
        sink(level, args.map(formatConsoleArg).join(' '));
      }
      ORIGINAL[level](...args);
    };
  }
}

function uninstall(): void {
  if (depth !== 0) {
    return;
  }
  const levels: WidgetConsoleLevel[] = ['log', 'info', 'warn', 'error'];
  for (const level of levels) {
    console[level] = ORIGINAL[level];
  }
}

/** Open a capture window (refcounted — nested windows just bump the count). */
export function enterConsoleCapture(route: ConsoleSink): void {
  if (depth === 0) {
    install();
    sink = route;
  }
  depth += 1;
}

/** Close one capture window; the host console is restored at depth 0. */
export function exitConsoleCapture(): void {
  if (depth === 0) {
    return;
  }
  depth -= 1;
  if (depth === 0) {
    uninstall();
    sink = null;
  }
}

/**
 * Render-window bracket: enter now, release at the nearest microtask
 * checkpoint (see the module doc for the honest boundary).
 */
export function enterConsoleCaptureForMicrotask(route: ConsoleSink): void {
  enterConsoleCapture(route);
  queueMicrotask(() => {
    exitConsoleCapture();
  });
}

/** Closed-bracket helper for the synchronous RUN/TICK windows. */
export function captureConsoleSync<T>(route: ConsoleSink, fn: () => T): T {
  enterConsoleCapture(route);
  try {
    return fn();
  } finally {
    exitConsoleCapture();
  }
}

/** Test hook: is the patch currently installed (depth > 0)? */
export function isConsoleCaptureActive(): boolean {
  return depth > 0;
}
