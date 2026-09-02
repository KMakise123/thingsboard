/**
 * Asset-profile-detail URL state: the active tab lives in the query string
 * (`/assetProfiles/:id?tab=calculated-fields`). Tab set follows ui-ngx
 * asset-profile-tabs: details / calculated fields / alarm rules /
 * audit logs / version control (no transport or provisioning — assets have
 * neither).
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = [
  'details',
  'calculated-fields',
  'alarm-rules',
  'audit-logs',
  'version-control',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

const DEFAULT_TAB: DetailTab = 'details';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export const parseDetailTab = urlState.parseDetailTab;

export const serializeDetailTab = urlState.serializeDetailTab;

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
