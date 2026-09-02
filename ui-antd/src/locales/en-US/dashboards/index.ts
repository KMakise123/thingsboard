/**
 * en-US dashboards domain keys (M5). Must stay key-for-key identical with
 * zh-CN/dashboards/index.ts (check-locale).
 */
export default {
  // ---- widget placeholders (ADR 0003 three states + W2 pending slot) ----
  'dashboards.widget.unsupported': 'Not supported yet',
  'dashboards.widget.unsupportedAngular':
    'This widget is not supported yet (Angular-only component)',
  'dashboards.widget.unsupportedCustom':
    'Custom widgets are not supported yet; they will arrive with the editor',
  'dashboards.widget.missing': 'Widget not found or has been removed',
  'dashboards.widget.pending': 'Widget is on its way',

  // ---- global timewindow picker ----
  'dashboards.tw.tabRealtime': 'Realtime',
  'dashboards.tw.tabHistory': 'History',
  'dashboards.tw.custom': 'Custom',
  'dashboards.tw.aggregation': 'Aggregation',
  'dashboards.tw.aggInterval': 'Aggregation interval',
  'dashboards.tw.auto': 'auto',

  // ---- timewindow presets (ui-ngx defaultTimeIntervals, 25 entries) ----
  'dashboards.tw.preset.s1': 'Last 1 second',
  'dashboards.tw.preset.s5': 'Last 5 seconds',
  'dashboards.tw.preset.s10': 'Last 10 seconds',
  'dashboards.tw.preset.s15': 'Last 15 seconds',
  'dashboards.tw.preset.s30': 'Last 30 seconds',
  'dashboards.tw.preset.m1': 'Last 1 minute',
  'dashboards.tw.preset.m2': 'Last 2 minutes',
  'dashboards.tw.preset.m5': 'Last 5 minutes',
  'dashboards.tw.preset.m10': 'Last 10 minutes',
  'dashboards.tw.preset.m15': 'Last 15 minutes',
  'dashboards.tw.preset.m30': 'Last 30 minutes',
  'dashboards.tw.preset.h1': 'Last 1 hour',
  'dashboards.tw.preset.h2': 'Last 2 hours',
  'dashboards.tw.preset.h5': 'Last 5 hours',
  'dashboards.tw.preset.h6': 'Last 6 hours',
  'dashboards.tw.preset.h8': 'Last 8 hours',
  'dashboards.tw.preset.h10': 'Last 10 hours',
  'dashboards.tw.preset.h12': 'Last 12 hours',
  'dashboards.tw.preset.d1': 'Last 1 day',
  'dashboards.tw.preset.d7': 'Last 7 days',
  'dashboards.tw.preset.week': 'Last week',
  'dashboards.tw.preset.weekIso': 'Last ISO week',
  'dashboards.tw.preset.d30': 'Last 30 days',
  'dashboards.tw.preset.month': 'Last month',
  'dashboards.tw.preset.quarter': 'Last quarter',
};
