/**
 * Closed union of every detail-tab key M1/M2 know about. Domains pick a
 * subset in their own ordered registry; a typo'd key fails to compile.
 */
export const DETAIL_TAB_KEYS = [
  'details',
  'attributes',
  'latest-telemetry',
  'calculated-fields',
  'alarm-rules',
  'alarms',
  'events',
  'relations',
  'audit-logs',
  'version-control',
] as const;

export type DetailTabKey = (typeof DETAIL_TAB_KEYS)[number];
