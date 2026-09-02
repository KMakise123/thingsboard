/**
 * Customer-detail URL state: the active tab lives in the query string
 * (`/customers/:id?tab=attributes`) so a bookmark/refresh lands on the same
 * tab. Same shared factory as devices — this file pins the customer
 * constants: 7 tabs, NO details tab (ui-ngx customer-tabs.component.html);
 * the form lives in the page-header area instead.
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
  'attributes',
  'latest-telemetry',
  'alarm-rules',
  'alarms',
  'relations',
  'audit-logs',
  'version-control',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

/** Tabs that exist only for TENANT_ADMIN (hidden for CU like ui-ngx:
 * alarm-rules L34, audit-logs L45 + version-control). */
export const TA_ONLY_DETAIL_TABS: ReadonlySet<DetailTab> = new Set([
  'alarm-rules',
  'audit-logs',
  'version-control',
] as const);

const DEFAULT_TAB: DetailTab = 'attributes';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export function isTaOnlyDetailTab(tab: DetailTab): boolean {
  return TA_ONLY_DETAIL_TABS.has(tab);
}

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
