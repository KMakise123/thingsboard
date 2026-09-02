/**
 * streaming-window point filtering (W4 fix). A realtime window's endTs is
 * frozen at subscribe time; points streamed in AFTER that moment must still
 * render (the subscription's whole purpose), otherwise live charts stay on
 * their empty state forever even though WS updates arrive.
 */

import { describe, expect, it } from 'vitest';
import { AggregationType } from '@/types/tb/telemetry';
import { numericPoints } from './timeseries-chart';

const STREAMING_WINDOW = {
  tab: 'REALTIME' as const,
  streaming: true,
  startTs: 1_000,
  endTs: 2_000,
  aggType: AggregationType.NONE,
};

const FIXED_WINDOW = {
  tab: 'HISTORY' as const,
  streaming: false,
  startTs: 1_000,
  endTs: 2_000,
  aggType: AggregationType.NONE,
};

describe('numericPoints', () => {
  it('keeps a streamed point newer than the frozen realtime endTs', () => {
    const points = [
      { ts: 1_500, value: '20' },
      { ts: 2_800, value: '42.5' },
    ];
    expect(numericPoints(points, STREAMING_WINDOW, 3_000)).toEqual([
      { ts: 1_500, value: 20 },
      { ts: 2_800, value: 42.5 },
    ]);
  });

  it('drops streamed points in a fixed history window (no streaming edge)', () => {
    const points = [
      { ts: 1_500, value: '20' },
      { ts: 2_800, value: '42.5' },
    ];
    expect(numericPoints(points, FIXED_WINDOW, 3_000)).toEqual([
      { ts: 1_500, value: 20 },
    ]);
  });

  it('still drops non-numeric values and points before the window start', () => {
    const points = [
      { ts: 500, value: '1' },
      { ts: 1_500, value: 'NaN-ish' },
      { ts: 2_500, value: null as unknown as string },
      { ts: 2_500, value: '7' },
    ];
    expect(numericPoints(points, STREAMING_WINDOW, 3_000)).toEqual([
      { ts: 2_500, value: 7 },
    ]);
  });
});
