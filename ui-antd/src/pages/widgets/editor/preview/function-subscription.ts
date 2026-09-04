/**
 * Function-datasource random series for the widget editor preview
 * (spec §5.4 defaultConfig 解析订阅).
 *
 * Semantics anchor — ui-ngx `entity-data-subscription.ts` (the
 * dashboard-side generator the preview mirrors):
 *   - `funcBody` compiles through `new Function(...args, body)` exactly as
 *     `compileTbFunction` does (js-function.models.ts); the preview binds
 *     `('timeIndex','time','prevValue')` — a superset of the upstream
 *     `('time','prevValue')` signature, so upstream funcBodies run
 *     unchanged and richer scripts may use the step index;
 *   - `generateSeries` starts every key from `prevValue = 0`
 *     (prevSeries = [0, 0] when no history exists) and threads only the
 *     VALUE forward (prevValue = previous value, never the timestamp);
 *   - the tick period is the upstream default `frequency = 1000ms`
 *     (entity-data-subscription.ts:780), and the initial series covers the
 *     upstream default realtime window (60s @ 1s ⇒ 60 points) ending at
 *     "now", then one point per tick;
 *   - latest keys emit a single [now, value] point per round
 *     (`generateLatest` parity), on the same 1s cadence.
 *
 * Deviations (kept honest): series are capped at the initial window size ×
 * 5 so a long-lived editor session cannot grow unbounded (upstream trims
 * through its data aggregator window — same "keep recent data" outcome);
 * a key whose funcBody throws is reported ONCE through `onError` and then
 * disabled instead of poisoning the whole preview subscription.
 */

import type {
  SubscriptionData,
  SubscriptionDataEntry,
} from '@/types/tb/telemetry';
import type { DataKey, Datasource, WidgetConfig } from '@/types/tb/widget';

/** Upstream default tick period (entity-data-subscription.ts frequency). */
export const FUNCTION_TICK_MS = 1000;

/** Initial series length = upstream default realtime window (60s) @ 1s. */
export const INITIAL_SERIES_POINTS = 60;

/** Series cap: initial window × 5 — see the module doc deviation note. */
export const MAX_SERIES_POINTS = INITIAL_SERIES_POINTS * 5;

type FunctionGenerator = (
  timeIndex: number,
  time: number,
  prevValue: unknown,
) => unknown;

interface CompiledKey {
  name: string;
  generator: FunctionGenerator;
  latest: boolean;
  /** running prevValue (upstream threads the previous VALUE forward). */
  prevValue: unknown;
  series: SubscriptionDataEntry[];
  /** next timeIndex handed to the generator (continuous per key). */
  nextIndex: number;
  /** a throwing funcBody reports once, then the key is disabled. */
  disabled: boolean;
}

export interface FunctionSubscriptionHandlers {
  /** timeseries channel — the full `data` snapshot after each round. */
  onData: (data: SubscriptionData) => void;
  /** latest channel — the full `latestData` snapshot after each round. */
  onLatest: (latest: SubscriptionData) => void;
  /** a funcBody threw during compilation or evaluation. */
  onError: (error: unknown) => void;
}

export interface FunctionSubscription {
  start(): void;
  stop(): void;
}

/**
 * Optional lifecycle hooks. `wrapWindow` brackets every synchronous
 * evaluation+emit window (initial series generation and each tick) — the
 * preview routes it through the scoped console capture so funcBody
 * console output lands in the editor console pane (TICK window).
 */
export interface FunctionSubscriptionHooks {
  wrapWindow?: <T>(fn: () => T) => T;
}

/** Non-optional form of `wrapWindow` for consumers that always bracket. */
export type WrapWindow = <T>(fn: () => T) => T;

function compileGenerator(funcBody: string): FunctionGenerator {
  return new Function(
    'timeIndex',
    'time',
    'prevValue',
    funcBody,
  ) as FunctionGenerator;
}

function collectKeys(
  datasources: Datasource[],
  report: (error: unknown) => void,
): CompiledKey[] {
  const keys: CompiledKey[] = [];
  const seen = new Set<string>();
  for (const datasource of datasources) {
    if (datasource.type !== 'function') {
      continue;
    }
    const groups: Array<{ keys: DataKey[] | undefined; latest: boolean }> = [
      { keys: datasource.dataKeys, latest: false },
      { keys: datasource.latestDataKeys, latest: true },
    ];
    for (const group of groups) {
      for (const dataKey of group.keys ?? []) {
        const funcBody =
          typeof dataKey.funcBody === 'string' ? dataKey.funcBody.trim() : '';
        if (!funcBody || seen.has(dataKey.name)) {
          continue;
        }
        seen.add(dataKey.name);
        try {
          keys.push({
            name: dataKey.name,
            generator: compileGenerator(funcBody),
            latest: group.latest,
            prevValue: 0,
            series: [],
            nextIndex: 0,
            disabled: false,
          });
        } catch (error) {
          report(error);
        }
      }
    }
  }
  return keys;
}

function evaluateKey(
  key: CompiledKey,
  time: number,
  report: (error: unknown) => void,
): void {
  if (key.disabled) {
    return;
  }
  let value: unknown;
  try {
    value = key.generator(key.nextIndex, time, key.prevValue);
  } catch (error) {
    key.disabled = true;
    report(error);
    return;
  }
  if (key.latest) {
    // upstream generateLatest parity: a rolling single point, not a series
    key.series = [[time, value]];
  } else {
    key.series.push([time, value] as SubscriptionDataEntry);
    if (key.series.length > MAX_SERIES_POINTS) {
      key.series.shift();
    }
  }
  key.prevValue = value;
  key.nextIndex += 1;
}

function snapshotOf(keys: CompiledKey[]): SubscriptionData {
  const out: SubscriptionData = {};
  for (const key of keys) {
    if (!key.disabled) {
      out[key.name] = [...key.series];
    }
  }
  return out;
}

/**
 * Build the preview subscription for one parsed widget config. Only
 * `type: 'function'` datasources participate (spec §5.4); key names map
 * straight onto the SubscriptionData keys (first key wins on duplicates).
 */
export function createFunctionSubscription(
  config: WidgetConfig,
  handlers: FunctionSubscriptionHandlers,
  hooks?: FunctionSubscriptionHooks,
): FunctionSubscription {
  let keys: CompiledKey[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;
  const wrap = hooks?.wrapWindow ?? (<T>(fn: () => T): T => fn());

  const report = (error: unknown) => {
    handlers.onError(error);
  };

  const emit = () => {
    // both channels always fire so the preview props stay total (`data: {}`
    // when the config carries no timeseries keys, etc.)
    handlers.onData(snapshotOf(keys.filter((key) => !key.latest)));
    handlers.onLatest(snapshotOf(keys.filter((key) => key.latest)));
  };

  const tick = () => {
    wrap(() => {
      const now = Date.now();
      for (const key of keys) {
        evaluateKey(key, now, report);
      }
      emit();
    });
  };

  return {
    start() {
      wrap(() => {
        keys = collectKeys(config.datasources ?? [], report);
        const now = Date.now();
        for (const key of keys) {
          if (key.latest) {
            // upstream generateLatest parity: a single "now" point
            evaluateKey(key, now, report);
            continue;
          }
          for (let step = INITIAL_SERIES_POINTS; step > 0; step -= 1) {
            evaluateKey(key, now - (step - 1) * FUNCTION_TICK_MS, report);
          }
        }
        emit();
      });
      // no function keys → nothing to tick: skip the interval entirely so a
      // widget without function datasources never wakes the preview up
      if (keys.length > 0) {
        timer = setInterval(tick, FUNCTION_TICK_MS);
      }
    },
    stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      keys = [];
    },
  };
}
