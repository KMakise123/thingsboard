/**
 * History timewindow presets for the telemetry chart dialog (aligned with
 * the ui-ngx timewindow "last X" family) plus the aggregation-interval
 * heuristic ui-ngx uses for binned reads.
 */

export interface TimewindowPreset {
  id: string;
  /** Window length in ms. */
  ms: number;
  labelKey: string;
  defaultMessage: string;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const TIMEWINDOW_PRESETS: Array<TimewindowPreset> = [
  {
    id: '5m',
    ms: 5 * MINUTE,
    labelKey: 'pages.devices.detail.tw5m',
    defaultMessage: 'Last 5 minutes',
  },
  {
    id: '15m',
    ms: 15 * MINUTE,
    labelKey: 'pages.devices.detail.tw15m',
    defaultMessage: 'Last 15 minutes',
  },
  {
    id: '30m',
    ms: 30 * MINUTE,
    labelKey: 'pages.devices.detail.tw30m',
    defaultMessage: 'Last 30 minutes',
  },
  {
    id: '1h',
    ms: HOUR,
    labelKey: 'pages.devices.detail.tw1h',
    defaultMessage: 'Last 1 hour',
  },
  {
    id: '3h',
    ms: 3 * HOUR,
    labelKey: 'pages.devices.detail.tw3h',
    defaultMessage: 'Last 3 hours',
  },
  {
    id: '6h',
    ms: 6 * HOUR,
    labelKey: 'pages.devices.detail.tw6h',
    defaultMessage: 'Last 6 hours',
  },
  {
    id: '12h',
    ms: 12 * HOUR,
    labelKey: 'pages.devices.detail.tw12h',
    defaultMessage: 'Last 12 hours',
  },
  {
    id: '24h',
    ms: DAY,
    labelKey: 'pages.devices.detail.tw24h',
    defaultMessage: 'Last 24 hours',
  },
  {
    id: '2d',
    ms: 2 * DAY,
    labelKey: 'pages.devices.detail.tw2d',
    defaultMessage: 'Last 2 days',
  },
  {
    id: '7d',
    ms: 7 * DAY,
    labelKey: 'pages.devices.detail.tw7d',
    defaultMessage: 'Last 7 days',
  },
  {
    id: '30d',
    ms: 30 * DAY,
    labelKey: 'pages.devices.detail.tw30d',
    defaultMessage: 'Last 30 days',
  },
];

export const CUSTOM_TIMEWINDOW_ID = 'custom';

/**
 * Aggregation interval for binned reads: ~200 buckets over the window,
 * snapped to a "nice" step (same intent as ui-ngx's timeService interval
 * calculation, simplified to the chart-dialog use case).
 */
export function computeAggregationInterval(windowMs: number): number {
  const target = Math.max(windowMs / 200, SECOND);
  const steps = [
    SECOND,
    5 * SECOND,
    10 * SECOND,
    30 * SECOND,
    MINUTE,
    5 * MINUTE,
    10 * MINUTE,
    15 * MINUTE,
    30 * MINUTE,
    HOUR,
    2 * HOUR,
    6 * HOUR,
    12 * HOUR,
    DAY,
    7 * DAY,
  ];
  for (const step of steps) {
    if (step >= target) {
      return step;
    }
  }
  return 30 * DAY;
}

/** Resolve [startTs, endTs] for a preset id, or null for the custom range. */
export function presetRange(presetId: string): [number, number] | null {
  const preset = TIMEWINDOW_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) {
    return null;
  }
  const endTs = Date.now();
  return [endTs - preset.ms, endTs];
}
