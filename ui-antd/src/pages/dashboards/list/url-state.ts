/**
 * Dashboards list URL state: page / pageSize / sort / textSearch live in the
 * query string so a bookmark or refresh restores them (spec 3.11). Same
 * factory as the customer-scope pages; the dashboards domain has no extra
 * filter keys (recon §4 — the ui-ngx table carries none beyond search).
 *
 * Server pages are 0-based, UI pages 1-based; toPageLink() converts.
 */
import { createListUrlState } from '@/pages/customers/list-url-state';

export const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});
