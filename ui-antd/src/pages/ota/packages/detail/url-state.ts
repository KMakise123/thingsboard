/**
 * OTA-package-detail URL state (M14 wave-7, spec 6.2-8): the active tab
 * lives in the query string (`/otaPackages/:id?tab=version-control`) so a
 * bookmark/refresh lands on the same tab — same shape as the entity-detail
 * pages. 2 tabs: details (default) / version-control (the ngx
 * ota-update-tabs second tab; the tab itself only renders for tenant
 * packages — see the page guard).
 */
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';

export const DETAIL_TABS = ['details', 'version-control'] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

const DEFAULT_TAB: DetailTab = 'details';

const urlState = createDetailTabUrlState(DETAIL_TABS, DEFAULT_TAB);

export const DETAIL_TAB_URL_KEY = 'tab';

export const parseDetailTab = urlState.parseDetailTab;

export const serializeDetailTab = urlState.serializeDetailTab;

export const useDetailTabUrlState = urlState.useDetailTabUrlState;
