/**
 * Timewindow helpers: preset windows and the aggregation-interval heuristic.
 */
import { describe, expect, it } from 'vitest';

import {
  CUSTOM_TIMEWINDOW_ID,
  computeAggregationInterval,
  presetRange,
  TIMEWINDOW_PRESETS,
} from './timewindow';

describe('timewindow presets', () => {
  it('covers the ui-ngx last-X family from 5 minutes to 30 days', () => {
    expect(TIMEWINDOW_PRESETS.map((preset) => preset.id)).toEqual([
      '5m',
      '15m',
      '30m',
      '1h',
      '3h',
      '6h',
      '12h',
      '24h',
      '2d',
      '7d',
      '30d',
    ]);
  });

  it('resolves a [startTs, endTs] window ending now', () => {
    const before = Date.now();
    const [startTs, endTs] = presetRange('15m') as [number, number];
    const after = Date.now();
    expect(endTs).toBeGreaterThanOrEqual(before);
    expect(endTs).toBeLessThanOrEqual(after);
    expect(endTs - startTs).toBe(15 * 60 * 1000);
  });

  it('returns null for the custom id', () => {
    expect(presetRange(CUSTOM_TIMEWINDOW_ID)).toBeNull();
  });
});

describe('aggregation interval', () => {
  it('snaps to a nice step near window/200', () => {
    expect(computeAggregationInterval(15 * 60 * 1000)).toBe(5000);
    expect(computeAggregationInterval(24 * 60 * 60 * 1000)).toBe(
      10 * 60 * 1000,
    );
    expect(computeAggregationInterval(7 * 24 * 60 * 60 * 1000)).toBe(
      60 * 60 * 1000,
    );
  });

  it('never goes below one second', () => {
    expect(computeAggregationInterval(1)).toBe(1000);
  });
});
