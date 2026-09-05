/**
 * Edge-detail URL state: the active tab lives in the query string
 * (`/edges/:id?tab=downlinks`) so a bookmark/refresh lands on the same tab.
 *
 * Mechanics live in the shared factory (components/entities/detail/url-state);
 * this file pins the edge constants — the details + ngx seven-tab set
 * (R03; no version-control, the ngx Edge page never had it). CUSTOMER_USER
 * additionally never sees details/downlinks/audit-logs: the page collapses
 * to the five read-only tabs and pulls the default tab up to `attributes`
 * (spec §5.2 CU read-only shape).
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
  'details',
  'attributes',
  'latest-telemetry',
  'alarms',
  'events',
  'downlinks',
  'relations',
  'audit-logs',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

/** Tabs that exist only for TENANT_ADMIN (hidden for CU like ui-ngx). */
export const TA_ONLY_DETAIL_TABS: ReadonlySet<DetailTab> = new Set([
  'downlinks',
  'audit-logs',
] as const);

/** Tab a CU hand-typed URL falls back to (details is TA-shaped there). */
export const CU_FALLBACK_TAB: DetailTab = 'attributes';

const DEFAULT_TAB: DetailTab = 'details';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export function isTaOnlyDetailTab(tab: DetailTab): boolean {
  return TA_ONLY_DETAIL_TABS.has(tab);
}

export const DETAIL_TAB_URL_KEY = 'tab';

export const parseDetailTab = urlState.parseDetailTab;

export const serializeDetailTab = urlState.serializeDetailTab;

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
