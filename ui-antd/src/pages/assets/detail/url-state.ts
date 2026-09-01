/**
 * Asset-detail URL state: the active tab lives in the query string
 * (`/assets/:id?tab=attributes`) so a bookmark/refresh lands on the same tab.
 *
 * Mechanics live in the shared factory (components/entities/detail/url-state);
 * this file pins the asset constants. 8 tabs, NO details tab — the entity
 * form lives in the page-header area (coordinator ruling over ui-ngx
 * asset-tabs.component.html): attributes / latest telemetry / calculated
 * fields (TA) / alarm rules (TA) / alarms / relations / audit logs (TA) /
 * version control (TA).
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
  'attributes',
  'latest-telemetry',
  'calculated-fields',
  'alarm-rules',
  'alarms',
  'relations',
  'audit-logs',
  'version-control',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

/** Tabs that exist only for TENANT_ADMIN (hidden for CU like ui-ngx). */
export const TA_ONLY_DETAIL_TABS: ReadonlySet<DetailTab> = new Set([
  'calculated-fields',
  'alarm-rules',
  'audit-logs',
  'version-control',
] as const);

const DEFAULT_TAB: DetailTab = 'attributes';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export function isTaOnlyDetailTab(tab: DetailTab): boolean {
  return TA_ONLY_DETAIL_TABS.has(tab);
}

export const DETAIL_TAB_URL_KEY = 'tab';

export const parseDetailTab = urlState.parseDetailTab;

export const serializeDetailTab = urlState.serializeDetailTab;

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
