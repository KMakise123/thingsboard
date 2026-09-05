/**
 * Closed union of every detail-tab key M1/M2 know about. Domains pick a
 * subset in their own ordered registry; a typo'd key fails to compile.
 * `downlinks` (M13): the Edge detail page's sync-event tab — Edge-only,
 * which is why the device asset never had it.
 */
export const DETAIL_TAB_KEYS = [
  'details',
  'attributes',
  'latest-telemetry',
  'calculated-fields',
  'alarm-rules',
  'alarms',
  'events',
  'downlinks',
  'relations',
  'audit-logs',
  'version-control',
] as const;

export type DetailTabKey = (typeof DETAIL_TAB_KEYS)[number];
