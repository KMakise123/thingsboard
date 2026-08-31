/**
 * Customer transport (handwritten). Only what the M1 device-assign flows
 * need — the paged picker source. The rest of the customer domain lands in
 * M2 with the customers pages.
 */

import { type Customer, type PageData, type PageLink, pageLinkToQueryParams } from '@/types/tb';

import { tbHttp } from './http';

/** GET /api/customers — tenant-scope paged customer list (assign dialog source). */
export async function getCustomers(
  pageLink: PageLink,
): Promise<PageData<Customer>> {
  return tbHttp.get<PageData<Customer>>(
    '/api/customers',
    pageLinkToQueryParams(pageLink),
  );
}
