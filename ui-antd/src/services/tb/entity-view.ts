/**
 * Entity-view transport (handwritten). Mirrors the device/asset domains:
 * double-path endpoints always use the V2 Infos shape; every paged call
 * passes an explicit sort.
 */

import type { QueryParams } from '@/core/http/client';
import {
  type EntitySubtype,
  type EntityView,
  type EntityViewInfo,
  type PageData,
  type PageLink,
  pageLinkToQueryParams,
} from '@/types/tb';

import { tbHttp } from './http';

export interface EntityViewListFilter {
  /** Entity-view type name (free tag filter; no profile concept here). */
  type?: string;
}

function entityViewListQuery(
  pageLink: PageLink,
  filter: EntityViewListFilter = {},
): QueryParams {
  return {
    ...pageLinkToQueryParams(pageLink),
    type: filter.type,
  };
}

/** GET /api/tenant/entityViewInfos (V2 joined row). */
export async function getTenantEntityViews(
  pageLink: PageLink,
  filter: EntityViewListFilter = {},
): Promise<PageData<EntityViewInfo>> {
  return tbHttp.get<PageData<EntityViewInfo>>(
    '/api/tenant/entityViewInfos',
    entityViewListQuery(pageLink, filter),
  );
}

/** GET /api/customer/{customerId}/entityViewInfos (V2). */
export async function getCustomerEntityViews(
  customerId: string,
  pageLink: PageLink,
  filter: EntityViewListFilter = {},
): Promise<PageData<EntityViewInfo>> {
  return tbHttp.get<PageData<EntityViewInfo>>(
    `/api/customer/${customerId}/entityViewInfos`,
    entityViewListQuery(pageLink, filter),
  );
}

/** GET /api/entityView/info/{entityViewId} (V2 joined row). */
export async function getEntityViewInfoById(
  entityViewId: string,
): Promise<EntityViewInfo> {
  return tbHttp.get<EntityViewInfo>(`/api/entityView/info/${entityViewId}`);
}

/** POST /api/entityView (create and update). */
export async function saveEntityView(
  entityView: EntityView,
): Promise<EntityView> {
  return tbHttp.post<EntityView>('/api/entityView', entityView);
}

/** DELETE /api/entityView/{entityViewId} */
export async function deleteEntityView(entityViewId: string): Promise<void> {
  await tbHttp.delete(`/api/entityView/${entityViewId}`);
}

/** POST /api/customer/{customerId}/entityView/{entityViewId} */
export async function assignEntityViewToCustomer(
  customerId: string,
  entityViewId: string,
): Promise<EntityView> {
  return tbHttp.post<EntityView>(
    `/api/customer/${customerId}/entityView/${entityViewId}`,
  );
}

/** DELETE /api/customer/entityView/{entityViewId} */
export async function unassignEntityViewFromCustomer(
  entityViewId: string,
): Promise<void> {
  await tbHttp.delete(`/api/customer/entityView/${entityViewId}`);
}

/** POST /api/customer/public/entityView/{entityViewId} (ui-ngx make-public). */
export async function makeEntityViewPublic(
  entityViewId: string,
): Promise<EntityView> {
  return tbHttp.post<EntityView>(
    `/api/customer/public/entityView/${entityViewId}`,
  );
}

/** GET /api/entityView/types — type names for filters. */
export async function getEntityViewTypes(): Promise<Array<EntitySubtype>> {
  return tbHttp.get<Array<EntitySubtype>>('/api/entityView/types');
}
