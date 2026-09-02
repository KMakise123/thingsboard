/**
 * Tenant-detail URL state: the active tab lives in the query string
 * (`/tenants/:id?tab=attributes`) so a bookmark/refresh lands on the same
 * tab. ui-ngx tenant-tabs: attributes(SERVER_SCOPE) / latest telemetry /
 * events(ERROR) / relations — 4 tabs, no audit-logs/version-control.
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
  'attributes',
  'latest-telemetry',
  'events',
  'relations',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

const DEFAULT_TAB: DetailTab = 'attributes';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
