/**
 * Device-detail URL state: the active tab lives in the query string
 * (`/devices/:id?tab=attributes`) so a bookmark/refresh lands on the same tab.
 *
 * Mechanics live in the shared factory (components/entities/detail/url-state);
 * this file pins the device constants — other M2 domains copy the pattern
 * with their own tab set.
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
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

export type DetailTab = (typeof DETAIL_TABS)[number];

/** Tabs that exist only for TENANT_ADMIN (hidden for CU like ui-ngx). */
export const TA_ONLY_DETAIL_TABS: ReadonlySet<DetailTab> = new Set([
  'calculated-fields',
  'alarm-rules',
  'version-control',
] as const);

const DEFAULT_TAB: DetailTab = 'details';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export function isTaOnlyDetailTab(tab: DetailTab): boolean {
  return TA_ONLY_DETAIL_TABS.has(tab);
}

export const DETAIL_TAB_URL_KEY = 'tab';

export const parseDetailTab = urlState.parseDetailTab;

export const serializeDetailTab = urlState.serializeDetailTab;

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
