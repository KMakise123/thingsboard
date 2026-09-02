/**
 * Device-profile-detail URL state: the active tab lives in the query string
 * (`/deviceProfiles/:id?tab=transport-configuration`) for bookmark restore.
 * Tab set follows ui-ngx device-profile-tabs: details (general form) /
 * transport-configuration / calculated-fields / alarm-rules /
 * device-provisioning / audit-logs / version-control.
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
  'details',
  'transport-configuration',
  'calculated-fields',
  'alarm-rules',
  'device-provisioning',
  'audit-logs',
  'version-control',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

const DEFAULT_TAB: DetailTab = 'details';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export const parseDetailTab = urlState.parseDetailTab;

export const serializeDetailTab = urlState.serializeDetailTab;

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
