/**
 * Widgets-bundle transport (M11 wave 1B).
 *
 * Endpoints verified against backend WidgetsBundleController.java (the
 * bundle-widget collection reads live in WidgetTypeController.java) and
 * the openapi snapshot. ui-ngx parity anchor: core/http/widget.service.ts.
 *
 * Wire realities pinned here (verified against the controllers, NOT the
 * ui-ngx client):
 *   - the paged list and the by-ids/full reads share the `/api/widgetsBundles`
 *     path but are DIFFERENT handlers (params-dispatched); the by-ids read
 *     has a documented twin at `/api/widgetsBundles/list` — this layer uses
 *     the documented twin and never the @Hidden original;
 *   - the bundle-widget collection update is SET-replacement semantics:
 *     POST /api/widgetsBundle/{id}/widgetTypeFqns replaces the whole
 *     membership with the posted fqn array (ui-ngx addWidgetFqnToWidgetBundle
 *     = read current fqns → push → post the merged array);
 *   - the bundle export read is the plain by-id read with
 *     `?inlineImages=true` — relative image URLs come back inlined as
 *     base64 data URLs so the JSON file is self-contained.
 */

import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';
import type {
  WidgetsBundle,
  WidgetsBundleListQuery,
} from '@/types/tb/widgets-bundle';
import type {
  WidgetType,
  WidgetTypeDetails,
  WidgetTypeInfo,
  WidgetTypeListQuery,
} from '@/types/tb/widget-type';

import { tbHttp } from './http';

/**
 * GET /api/widgetsBundles?pageSize&page… — the paged list. SA sessions see
 * the system bundles; TA sessions see system + own unless `tenantOnly`.
 * Sort property accepts `createdTime | title | tenantId` via pageLink.sortOrder.
 */
export async function getWidgetsBundles(
  pageLink: PageLink,
  query?: WidgetsBundleListQuery,
): Promise<PageData<WidgetsBundle>> {
  return tbHttp.get<PageData<WidgetsBundle>>('/api/widgetsBundles', {
    ...pageLinkToQueryParams(pageLink),
    ...(query?.tenantOnly === undefined ? {} : { tenantOnly: query.tenantOnly }),
    ...(query?.fullSearch === undefined ? {} : { fullSearch: query.fullSearch }),
    ...(query?.scadaFirst === undefined ? {} : { scadaFirst: query.scadaFirst }),
  });
}

/**
 * GET /api/widgetsBundles/all — full (unpaged) list of every bundle visible
 * to the session, title-sorted client-side upstream. The pickers that need
 * "all bundles" (e.g. bundle membership dialogs) use this instead of
 * paging through the list endpoint.
 */
export async function getAllWidgetsBundles(): Promise<WidgetsBundle[]> {
  return tbHttp.get<WidgetsBundle[]>('/api/widgetsBundles/all');
}

/**
 * GET /api/widgetsBundles/list?widgetsBundleIds=a,b — the documented by-ids
 * read (twin of the @Hidden params-dispatched variant on the same path).
 */
export async function getWidgetsBundlesByIds(
  widgetsBundleIds: string[],
): Promise<WidgetsBundle[]> {
  return tbHttp.get<WidgetsBundle[]>('/api/widgetsBundles/list', {
    widgetsBundleIds: widgetsBundleIds.join(','),
  });
}

/** GET /api/widgetsBundle/{widgetsBundleId} — single bundle by id. */
export async function getWidgetsBundleById(
  widgetsBundleId: string,
): Promise<WidgetsBundle> {
  return tbHttp.get<WidgetsBundle>(`/api/widgetsBundle/${widgetsBundleId}`);
}

/**
 * GET /api/widgetsBundle/{widgetsBundleId}?inlineImages=true — the EXPORT
 * read: identical entity, but relative image URLs are inlined as base64
 * data URLs so the downloaded JSON is self-contained.
 */
export async function exportWidgetsBundle(
  widgetsBundleId: string,
): Promise<WidgetsBundle> {
  return tbHttp.get<WidgetsBundle>(`/api/widgetsBundle/${widgetsBundleId}`, {
    inlineImages: true,
  });
}

/**
 * POST /api/widgetsBundle — create (no id) or update (with id). The server
 * mints `alias` on create and forces `tenantId`; a stale `version`
 * surfaces as a 409 ServerError (conflict handling is the caller's job).
 */
export async function saveWidgetsBundle(
  widgetsBundle: WidgetsBundle,
): Promise<WidgetsBundle> {
  return tbHttp.post<WidgetsBundle>('/api/widgetsBundle', widgetsBundle);
}

/** DELETE /api/widgetsBundle/{widgetsBundleId} — bundle membership links are dropped, widget types survive. */
export async function deleteWidgetsBundle(
  widgetsBundleId: string,
): Promise<void> {
  await tbHttp.delete(`/api/widgetsBundle/${widgetsBundleId}`);
}

/**
 * POST /api/widgetsBundle/{widgetsBundleId}/widgetTypes — replace the
 * bundle's widget-type membership with the given ordered id list (SET
 * replacement, upstream updateWidgetsBundleWidgetTypes).
 */
export async function updateWidgetsBundleWidgetTypes(
  widgetsBundleId: string,
  widgetTypeIds: string[],
): Promise<void> {
  await tbHttp.post<void>(
    `/api/widgetsBundle/${widgetsBundleId}/widgetTypes`,
    widgetTypeIds,
  );
}

/**
 * POST /api/widgetsBundle/{widgetsBundleId}/widgetTypeFqns — replace the
 * bundle's widget-type membership with the given ordered fqn list. The
 * fqn channel survives cross-tenant types (a system fqn can be pinned
 * without the caller resolving its id), which is why the import flow and
 * the add-by-fqn helper below land here.
 */
export async function updateWidgetsBundleWidgetFqns(
  widgetsBundleId: string,
  widgetTypeFqns: string[],
): Promise<void> {
  await tbHttp.post<void>(
    `/api/widgetsBundle/${widgetsBundleId}/widgetTypeFqns`,
    widgetTypeFqns,
  );
}

/**
 * GET /api/widgetTypeFqns?widgetsBundleId= — the CURRENT membership as
 * short fqn strings, in bundle order. Combine with
 * `updateWidgetsBundleWidgetFqns` for a read-modify-write add/remove
 * (upstream addWidgetFqnToWidgetBundle parity).
 */
export async function getBundleWidgetTypeFqns(
  widgetsBundleId: string,
): Promise<string[]> {
  return tbHttp.get<string[]>('/api/widgetTypeFqns', { widgetsBundleId });
}

/**
 * GET /api/widgetsBundle/{widgetsBundleId}/widgetTypes — current membership
 * as plain WidgetType rows (descriptor included, no info fields).
 */
export async function getBundleWidgetTypes(
  widgetsBundleId: string,
): Promise<WidgetType[]> {
  return tbHttp.get<WidgetType[]>(
    `/api/widgetsBundle/${widgetsBundleId}/widgetTypes`,
  );
}

/**
 * GET /api/widgetTypesDetails?widgetsBundleId=&includeResources= — current
 * membership as FULL details rows; `includeResources` also pulls the
 * resource export payloads so the bundle export file is self-contained.
 */
export async function getBundleWidgetTypesDetails(
  widgetsBundleId: string,
  includeResources?: boolean,
): Promise<WidgetTypeDetails[]> {
  return includeResources
    ? tbHttp.get<WidgetTypeDetails[]>('/api/widgetTypesDetails', {
        widgetsBundleId,
        includeResources: true,
      })
    : tbHttp.get<WidgetTypeDetails[]>('/api/widgetTypesDetails', {
        widgetsBundleId,
      });
}

/**
 * GET /api/widgetTypesInfos?widgetsBundleId=&pageSize&page… — the bundle's
 * membership as paged WidgetTypeInfo rows (the row shape the bundle-widgets
 * manager renders). Same filter params as the global widgetTypes list.
 */
export async function getBundleWidgetTypeInfos(
  pageLink: PageLink,
  widgetsBundleId: string,
  query?: Pick<WidgetTypeListQuery, 'fullSearch' | 'deprecatedFilter' | 'widgetTypeList'>,
): Promise<PageData<WidgetTypeInfo>> {
  return tbHttp.get<PageData<WidgetTypeInfo>>('/api/widgetTypesInfos', {
    ...pageLinkToQueryParams(pageLink),
    widgetsBundleId,
    ...(query?.fullSearch === undefined ? {} : { fullSearch: query.fullSearch }),
    ...(query?.deprecatedFilter === undefined
      ? {}
      : { deprecatedFilter: query.deprecatedFilter }),
    ...(query?.widgetTypeList?.length
      ? { widgetTypeList: query.widgetTypeList.join(',') }
      : {}),
  });
}

/**
 * Convenience over `getBundleWidgetTypeInfos`: the whole membership in ONE
 * call (upstream getBundleWidgetTypeInfosList parity — fixed 1024 page,
 * ALL deprecated filter), for manager pages that edit the set locally and
 * save it back in one shot.
 */
export async function getBundleWidgetTypeInfoList(
  widgetsBundleId: string,
): Promise<WidgetTypeInfo[]> {
  const page = await getBundleWidgetTypeInfos(
    { pageSize: 1024, page: 0, sortOrder: { property: 'createdTime', direction: 'DESC' } },
    widgetsBundleId,
  );
  return page.data;
}

/**
 * Read-modify-write add of ONE fqn to the bundle's membership
 * (upstream addWidgetFqnToWidgetBundle parity: read current fqns → append →
 * post the merged array). Import callers that already hold the full target
 * set should call `updateWidgetsBundleWidgetFqns` directly instead.
 */
export async function addWidgetFqnToWidgetsBundle(
  widgetsBundleId: string,
  fqn: string,
): Promise<void> {
  const fqns = await getBundleWidgetTypeFqns(widgetsBundleId);
  if (fqns.includes(fqn)) {
    return;
  }
  await updateWidgetsBundleWidgetFqns(widgetsBundleId, [...fqns, fqn]);
}
