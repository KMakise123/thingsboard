/**
 * Function-datasource random series contract (spec §5.4), anchored on
 * ui-ngx entity-data-subscription: funcBody evaluated as
 * `new Function('timeIndex','time','prevValue', body)`, every key starting
 * from prevValue = 0 with the value threaded forward, a 60-point initial
 * series @ 1s cadence, single-point latest keys, and per-key error
 * isolation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WidgetConfig } from '@/types/tb/widget';

import {
  createFunctionSubscription,
  FUNCTION_TICK_MS,
  INITIAL_SERIES_POINTS,
} from './function-subscription';

function configWith(datasources: WidgetConfig['datasources']): WidgetConfig {
  return { datasources };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createFunctionSubscription — initial series', () => {
  it('generates the upstream-shaped initial series threading prevValue forward', () => {
    const onData = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'function',
          dataKeys: [
            {
              name: 'temp',
              type: 'timeseries',
              funcBody: 'return prevValue + 1;',
            },
          ],
        },
      ]),
      { onData, onLatest: vi.fn(), onError: vi.fn() },
    );
    sub.start();

    expect(onData).toHaveBeenCalledTimes(1);
    const data = onData.mock.calls[0][0];
    const series = data.temp;
    expect(series).toHaveLength(INITIAL_SERIES_POINTS);
    // prevValue starts at 0 and only the value threads forward
    expect(series[0][1]).toBe(1);
    expect(series[1][1]).toBe(2);
    expect(series[INITIAL_SERIES_POINTS - 1][1]).toBe(INITIAL_SERIES_POINTS);
    // timestamps step backwards from "now" by the tick period
    const last = series[INITIAL_SERIES_POINTS - 1][0] as number;
    const first = series[0][0] as number;
    expect(last - first).toBe((INITIAL_SERIES_POINTS - 1) * FUNCTION_TICK_MS);
    sub.stop();
  });

  it('passes timeIndex and time to the funcBody', () => {
    const onData = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'function',
          dataKeys: [
            {
              name: 't',
              type: 'timeseries',
              funcBody: 'return [timeIndex, time];',
            },
          ],
        },
      ]),
      { onData, onLatest: vi.fn(), onError: vi.fn() },
    );
    sub.start();
    const series = onData.mock.calls[0][0].t;
    expect(series[0][1]).toEqual([0, series[0][0]]);
    expect(series[3][1]).toEqual([3, series[3][0]]);
    sub.stop();
  });

  it('emits latest keys as a single "now" point (generateLatest parity)', () => {
    const onLatest = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'function',
          dataKeys: [{ name: 'ts', type: 'timeseries', funcBody: 'return 1;' }],
          latestDataKeys: [
            {
              name: 'latest',
              type: 'function',
              funcBody: 'return prevValue + 5;',
            },
          ],
        },
      ]),
      { onData: vi.fn(), onLatest, onError: vi.fn() },
    );
    sub.start();
    expect(onLatest).toHaveBeenCalledTimes(1);
    const latest = onLatest.mock.calls[0][0];
    expect(latest.latest).toHaveLength(1);
    expect(latest.latest[0][1]).toBe(5);
    sub.stop();
  });

  it('ignores non-function datasources and empty funcBodies', () => {
    const onData = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'entity',
          dataKeys: [{ name: 'e', type: 'timeseries', funcBody: 'return 1;' }],
        },
        {
          type: 'function',
          dataKeys: [{ name: 'blank', type: 'timeseries', funcBody: '   ' }],
        },
      ]),
      { onData, onLatest: vi.fn(), onError: vi.fn() },
    );
    sub.start();
    expect(onData).toHaveBeenCalledWith({});
    sub.stop();
  });
});

describe('createFunctionSubscription — tick advancement', () => {
  it('appends one point per key per 1s tick and rewrites the latest point', () => {
    const onData = vi.fn();
    const onLatest = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'function',
          dataKeys: [
            {
              name: 'temp',
              type: 'timeseries',
              funcBody: 'return prevValue + 1;',
            },
          ],
          latestDataKeys: [
            {
              name: 'now',
              type: 'function',
              funcBody: 'return prevValue + 1;',
            },
          ],
        },
      ]),
      { onData, onLatest, onError: vi.fn() },
    );
    sub.start();
    vi.advanceTimersByTime(FUNCTION_TICK_MS * 2);

    const series = onData.mock.calls.at(-1)[0].temp;
    expect(series).toHaveLength(INITIAL_SERIES_POINTS + 2);
    expect(series.at(-1)?.[1]).toBe(INITIAL_SERIES_POINTS + 2);
    // latest stays a single rolling point — its own prevValue chain:
    // initial 1, then +1 per tick
    const latest = onLatest.mock.calls.at(-1)[0].now;
    expect(latest).toHaveLength(1);
    expect(latest[0][1]).toBe(3);
    sub.stop();
  });

  it('stops cleanly — no further ticks after stop()', () => {
    const onData = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'function',
          dataKeys: [
            { name: 'temp', type: 'timeseries', funcBody: 'return 1;' },
          ],
        },
      ]),
      { onData, onLatest: vi.fn(), onError: vi.fn() },
    );
    sub.start();
    const callsAfterStart = onData.mock.calls.length;
    sub.stop();
    vi.advanceTimersByTime(FUNCTION_TICK_MS * 3);
    expect(onData).toHaveBeenCalledTimes(callsAfterStart);
  });

  it('trims the series at the cap so long sessions stay bounded', () => {
    const onData = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'function',
          dataKeys: [
            { name: 'temp', type: 'timeseries', funcBody: 'return 1;' },
          ],
        },
      ]),
      { onData, onLatest: vi.fn(), onError: vi.fn() },
    );
    sub.start();
    vi.advanceTimersByTime(FUNCTION_TICK_MS * (INITIAL_SERIES_POINTS * 5 + 10));
    const series = onData.mock.calls.at(-1)[0].temp;
    expect(series.length).toBeLessThanOrEqual(INITIAL_SERIES_POINTS * 5);
    sub.stop();
  });
});

describe('createFunctionSubscription — error isolation', () => {
  it('reports a broken funcBody once and disables just that key', () => {
    const onError = vi.fn();
    const onData = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'function',
          dataKeys: [
            {
              name: 'bad',
              type: 'timeseries',
              funcBody: 'throw new Error("key boom");',
            },
            { name: 'good', type: 'timeseries', funcBody: 'return 7;' },
          ],
        },
      ]),
      { onData, onLatest: vi.fn(), onError },
    );
    sub.start();
    vi.advanceTimersByTime(FUNCTION_TICK_MS * 2);

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe('key boom');
    const data = onData.mock.calls.at(-1)[0];
    expect(data.bad).toBeUndefined();
    expect(data.good?.at(-1)?.[1]).toBe(7);
    sub.stop();
  });

  it('reports a funcBody that fails to COMPILE (syntax error)', () => {
    const onError = vi.fn();
    const sub = createFunctionSubscription(
      configWith([
        {
          type: 'function',
          dataKeys: [
            { name: 'broken', type: 'timeseries', funcBody: 'return (((;' },
          ],
        },
      ]),
      { onData: vi.fn(), onLatest: vi.fn(), onError },
    );
    sub.start();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(SyntaxError);
    sub.stop();
  });
});
