/**
 * Console capture window contract: the patch is scoped to open windows
 * (depth 0 = host console untouched), refcounted, and always restored —
 * including the microtask bracket and the closed-bracket helper.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  captureConsoleSync,
  enterConsoleCapture,
  enterConsoleCaptureForMicrotask,
  exitConsoleCapture,
  formatConsoleArg,
  isConsoleCaptureActive,
} from './console-capture';

afterEach(() => {
  while (isConsoleCaptureActive()) {
    exitConsoleCapture();
  }
});

describe('console capture windows', () => {
  it('routes log/info/warn/error into the sink while a window is open', () => {
    const sink = vi.fn();
    captureConsoleSync(sink, () => {
      console.log('a', 1);
      console.warn('b');
      console.error('c');
      console.info('d');
    });
    expect(sink).toHaveBeenCalledTimes(4);
    expect(sink).toHaveBeenNthCalledWith(1, 'log', 'a 1');
    expect(sink).toHaveBeenNthCalledWith(2, 'warn', 'b');
    expect(sink).toHaveBeenNthCalledWith(3, 'error', 'c');
    expect(sink).toHaveBeenNthCalledWith(4, 'info', 'd');
  });

  it('leaves the host console untouched outside any window (honest boundary)', () => {
    const sink = vi.fn();
    console.log('outside');
    expect(sink).not.toHaveBeenCalled();

    captureConsoleSync(sink, () => {
      console.log('inside');
    });
    expect(sink).toHaveBeenCalledWith('log', 'inside');

    // after the window the routing is gone (behavior assertion — the
    // restored original is a bound method, so identity would not hold)
    console.log('after');
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('refcounts nested windows and restores at depth 0', () => {
    const sink = vi.fn();
    const native = console.log;
    enterConsoleCapture(sink);
    const installed = console.log;
    expect(installed).not.toBe(native);
    enterConsoleCapture(sink);
    exitConsoleCapture();
    // still installed — one window remains
    expect(console.log).toBe(installed);
    exitConsoleCapture();
    expect(console.log).toBe(native);
    expect(isConsoleCaptureActive()).toBe(false);
  });

  it('releases the render bracket at the microtask checkpoint', async () => {
    const sink = vi.fn();
    const native = console.log;
    enterConsoleCaptureForMicrotask(sink);
    expect(isConsoleCaptureActive()).toBe(true);
    console.log('render');
    await Promise.resolve();
    expect(isConsoleCaptureActive()).toBe(false);
    expect(console.log).toBe(native);
    expect(sink).toHaveBeenCalledWith('log', 'render');
  });

  it('captureConsoleSync restores the patch when fn throws', () => {
    const sink = vi.fn();
    const native = console.log;
    expect(() =>
      captureConsoleSync(sink, () => {
        console.log('before-throw');
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(console.log).toBe(native);
    expect(isConsoleCaptureActive()).toBe(false);
    expect(sink).toHaveBeenCalledWith('log', 'before-throw');
  });
});

describe('formatConsoleArg', () => {
  it('keeps strings raw and joins multi-arg calls', () => {
    expect(formatConsoleArg('text')).toBe('text');
  });

  it('renders Errors as name: message', () => {
    expect(formatConsoleArg(new TypeError('nope'))).toBe('TypeError: nope');
  });

  it('JSON-stringifies plain objects and falls back to String()', () => {
    expect(formatConsoleArg({ a: 1 })).toBe('{"a":1}');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(formatConsoleArg(cyclic)).toBe('[object Object]');
    expect(formatConsoleArg(42)).toBe('42');
    expect(formatConsoleArg(null)).toBe('null');
  });
});
