/**
 * Tenant-profile-detail URL state: the active tab lives in the query string
 * (`/tenantProfiles/:id?tab=attributes`) so a bookmark/refresh lands on the
 * same tab. ui-ngx tenant-profile tabs: attributes / latest telemetry /
 * audit-logs (read mode only — tabs hide while the form is editing).
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
  'attributes',
  'latest-telemetry',
  'audit-logs',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

const DEFAULT_TAB: DetailTab = 'attributes';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
