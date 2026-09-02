import { describe, expect, it } from 'vitest';
import { AggregationType } from '@/types/tb/telemetry';
import type { Timewindow } from '@/types/tb/timewindow';
import {
  computeAggregationIntervalMs,
  HOUR,
  presetIdForWindow,
  resolveTimewindow,
  TIMEWINDOW_PRESETS,
} from './timewindow';

const NOW = 1_700_000_000_000;

describe('TIMEWINDOW_PRESETS (ui-ngx defaultTimeIntervals)', () => {
  it('ships the full 25-preset family in upstream order', () => {
    expect(TIMEWINDOW_PRESETS).toHaveLength(25);
    expect(TIMEWINDOW_PRESETS[0]).toMatchObject({ id: 's1', ms: 1000 });
    expect(TIMEWINDOW_PRESETS[11]).toMatchObject({ id: 'h1' });
    expect(TIMEWINDOW_PRESETS.at(-1)).toMatchObject({ id: 'quarter' });
    const ids = new Set(TIMEWINDOW_PRESETS.map((preset) => preset.id));
    expect(ids.size).toBe(25);
  });
});

describe('computeAggregationIntervalMs', () => {
  it('snaps to ~200 buckets on a nice step', () => {
    // 1 hour / 200 = 18s → step 30s
    expect(computeAggregationIntervalMs(HOUR)).toBe(30_000);
    // 1 day / 200 = 7.2min → step 10min
    expect(computeAggregationIntervalMs(86_400_000)).toBe(600_000);
    expect(computeAggregationIntervalMs(1000)).toBe(1000);
  });
});

describe('resolveTimewindow', () => {
  it('falls back to the dashboard default for undefined input', () => {
    const resolved = resolveTimewindow(undefined, NOW);
    expect(resolved).toMatchObject({
      tab: 'REALTIME',
      streaming: true,
      startTs: NOW - HOUR,
      endTs: NOW,
      aggType: AggregationType.NONE,
      limit: 50000,
    });
    expect(resolved.aggIntervalMs).toBeUndefined();
  });

  it('resolves a realtime preset window', () => {
    const resolved = resolveTimewindow(
      {
        selectedTab: 'REALTIME',
        realtime: { realtimeType: 0, timewindowMs: 86_400_000 },
        aggregation: { type: AggregationType.AVG, limit: 25000 },
      },
      NOW,
    );
    expect(resolved.startTs).toBe(NOW - 86_400_000);
    expect(resolved.aggType).toBe(AggregationType.AVG);
    expect(resolved.aggIntervalMs).toBe(600_000);
    expect(resolved.limit).toBe(25000);
  });

  it('resolves a history fixed window verbatim', () => {
    const resolved = resolveTimewindow(
      {
        selectedTab: 1,
        history: {
          historyType: 1,
          fixedTimewindow: { startTimeMs: 100, endTimeMs: 200 },
        },
        aggregation: { type: AggregationType.NONE },
      },
      NOW,
    );
    expect(resolved.tab).toBe('HISTORY');
    expect(resolved.streaming).toBe(false);
    expect(resolved.startTs).toBe(100);
    expect(resolved.endTs).toBe(200);
  });

  it('degrades quickInterval realtime and FOR_ALL_TIME history to defaults', () => {
    const realtime = resolveTimewindow(
      {
        selectedTab: 0,
        realtime: { realtimeType: 1, quickInterval: 'CURRENT_DAY' },
      },
      NOW,
    );
    expect(realtime.endTs).toBe(NOW);
    expect(realtime.startTs).toBe(NOW - HOUR);

    const history = resolveTimewindow(
      { selectedTab: 'HISTORY', history: { historyType: 3 } },
      NOW,
    );
    expect(history.startTs).toBe(NOW - HOUR);
    expect(history.endTs).toBe(NOW);
  });
});

describe('presetIdForWindow', () => {
  it('matches exact preset lengths and reports custom otherwise', () => {
    expect(presetIdForWindow(HOUR)).toBe('h1');
    expect(presetIdForWindow(123_456)).toBe('custom');
    expect(presetIdForWindow(undefined)).toBe('custom');
  });
});
