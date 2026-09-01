/**
 * Entity-view detail URL state: the active tab lives in the query string
 * (`/entityViews/:id?tab=attributes`) so a bookmark/refresh lands on the
 * same tab. Six tabs, no details/calculated-fields/events (ui-ngx
 * entity-view-tabs); audit-logs + version-control are TA-only and the
 * default tab is attributes (there is no details tab here).
 *
 * Mechanics live in the shared factory (components/entities/detail/url-state);
 * this file pins the entity-view constants.
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
  'attributes',
  'latest-telemetry',
  'alarms',
  'relations',
  'audit-logs',
  'version-control',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

/** Tabs that exist only for TENANT_ADMIN (hidden for CU like ui-ngx). */
export const TA_ONLY_DETAIL_TABS: ReadonlySet<DetailTab> = new Set([
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
