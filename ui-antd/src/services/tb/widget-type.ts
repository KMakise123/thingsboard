/**
 * Widget-type transport (M9 wave-1 F surface).
 *
 * Endpoints verified against backend WidgetTypeController.java
 * (application/.../controller/WidgetTypeController.java, SA/TA-scoped,
 * list also CUSTOMER_USER) and the openapi snapshot:
 *
 *   GET    /api/widgetType?fqn={scope-qualified fqn}  → WidgetType
 *          (hidden upstream, present in the openapi snapshot; NOTE it
 *          returns the BASE entity — descriptor included, details fields
 *          absent — exactly what the registry resolver chain needs)
 *   GET    /api/widgetType/{id}?includeResources=     → WidgetTypeDetails
 *   POST   /api/widgetType?updateExistingByFqn=       → WidgetTypeDetails
 *          (upsert: with id = update, without = create; tenantId is
 *          force-overwritten server-side; fqn is immutable on update)
 *   DELETE /api/widgetType/{id}                       → 200, void
 *   GET    /api/widgetTypes?pageSize&page&…           → PageData<WidgetTypeInfo>
 *   GET    /api/widgetTypeInfo/{id}                   → WidgetTypeInfo (M11)
 */

import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';
import type {
  WidgetType,
  WidgetTypeDetails,
  WidgetTypeInfo,
  WidgetTypeListQuery,
} from '@/types/tb/widget-type';


import { tbHttp } from './http';

/**
 * GET /api/widgetType?fqn= — read by FQN. `fqn` must be scope-qualified
 * (`tenant.my_widget` / `system.my_widget`), i.e. the form carried by
 * dashboards' `Widget.typeFullFqn`; the entity's own `fqn` field is the
 * short scope-less name and will NOT work here (backend throws
 * BAD_REQUEST_PARAMS). Returns the base WidgetType — descriptor included,
 * image/description/tags/resources absent.
 *
 * The M9 wave-2 registry resolver folded the old v1 dashboard-service
 * existence probe (`getWidgetTypeByFqn` in services/tb/dashboard.ts) into
 * this typed function — the single widgetType-by-fqn read path.
 */
export async function getWidgetTypeByFullFqn(fqn: string): Promise<WidgetType> {
  return tbHttp.get<WidgetType>('/api/widgetType', { fqn });
}

/**
 * GET /api/widgetType/{widgetTypeId} — full details (editor entry /
 * /widgets/editor/:widgetTypeId load). `includeResources` attaches the
 * resource export metadata for round-trip exports (P10 half-item).
 */
export async function getWidgetTypeById(
  widgetTypeId: string,
  options?: { includeResources?: boolean },
): Promise<WidgetTypeDetails> {
  return options?.includeResources
    ? tbHttp.get<WidgetTypeDetails>(`/api/widgetType/${widgetTypeId}`, {
        includeResources: true,
      })
    : tbHttp.get<WidgetTypeDetails>(`/api/widgetType/${widgetTypeId}`);
}

/**
 * POST /api/widgetType — create or update (upsert; server forces tenantId,
 * rejects fqn changes). Returns the SAVED details with the new optimistic-
 * lock `version` backfilled. `updateExistingByFqn` updates an existing
 * type matched by fqn instead of creating a new one. A stale `version`
 * surfaces as a 409 ServerError (conflict handling is the caller's job).
 */
export async function saveWidgetType(
  details: WidgetTypeDetails,
  updateExistingByFqn?: boolean,
): Promise<WidgetTypeDetails> {
  return updateExistingByFqn === undefined
    ? tbHttp.post<WidgetTypeDetails>('/api/widgetType', details)
    : tbHttp.post<WidgetTypeDetails>('/api/widgetType', details, {
        updateExistingByFqn,
      });
}

/** DELETE /api/widgetType/{widgetTypeId} — dashboards referencing the fqn degrade to placeholders. */
export async function deleteWidgetType(widgetTypeId: string): Promise<void> {
  await tbHttp.delete(`/api/widgetType/${widgetTypeId}`);
}

/**
 * GET /api/widgetTypes — paged WidgetTypeInfo list (NO descriptor; the
 * restricted-derivation source for built-in types). Sort property accepts
 * `createdTime | name | deprecated | tenantId` via `pageLink.sortOrder`.
 */
export async function getWidgetTypes(
  pageLink: PageLink,
  query?: WidgetTypeListQuery,
): Promise<PageData<WidgetTypeInfo>> {
  return tbHttp.get<PageData<WidgetTypeInfo>>('/api/widgetTypes', {
    ...pageLinkToQueryParams(pageLink),
    ...(query?.tenantOnly === undefined ? {} : { tenantOnly: query.tenantOnly }),
    ...(query?.fullSearch === undefined ? {} : { fullSearch: query.fullSearch }),
    ...(query?.deprecatedFilter === undefined
      ? {}
      : { deprecatedFilter: query.deprecatedFilter }),
    ...(query?.widgetTypeList?.length
      ? { widgetTypeList: query.widgetTypeList.join(',') }
      : {}),
    ...(query?.scadaFirst === undefined ? {} : { scadaFirst: query.scadaFirst }),
  });
}

/**
 * GET /api/widgetTypeInfo/{widgetTypeId} — the listing-row variant of one
 * type (descriptor absent, image thumbnail + description + tags + widget
 * kind + bundle chips present). The library detail face renders from this
 * (M11 wave 1B); the EDITOR keeps loading the full
 * `getWidgetTypeById` details instead (descriptor required there).
 */
export async function getWidgetTypeInfoById(
  widgetTypeId: string,
): Promise<WidgetTypeInfo> {
  return tbHttp.get<WidgetTypeInfo>(`/api/widgetTypeInfo/${widgetTypeId}`);
}
