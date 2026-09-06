/**
 * Calculated-field transport (handwritten) — entity calculated-fields tab
 * (M1) + the M14 tenant-wide list family (wave-1).
 *
 * Base paths:
 *   GET    /api/calculatedFields                         tenant-wide page (6-dim filters; types default = all minus ALARM)
 *   GET    /api/calculatedFields/names                   tenant-wide name page (backend pins sortProperty=name)
 *   GET    /api/calculatedField/{entityType}/{entityId}  entity-scoped page
 *   GET    /api/calculatedField/{calculatedFieldId}      by id
 *   POST   /api/calculatedField                          save
 *   POST   /api/calculatedField/testScript               TBEL dry-run (200 + {output, error} envelope)
 *   GET    /api/calculatedField/{calculatedFieldId}/debug latest debug event
 *   DELETE /api/calculatedField/{calculatedFieldId}      delete
 */

import type { QueryParams } from '@/core/http/client';
import type { EntityId } from '@/types/tb/entity';
import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';
import type {
  CalculatedField,
  CalculatedFieldInfo,
  CalculatedFieldType,
} from '@/types/tb/calculated-fields';

import { tbHttp } from './http';

// Wire types moved to the types layer (M14 R07); re-exported so existing
// `@/services/tb/calculated-fields` import paths keep working.
export type {
  CalculatedField,
  CalculatedFieldInfo,
  CalculatedFieldType,
} from '@/types/tb/calculated-fields';

/** Filter for the tenant-wide list (openapi getCalculatedFields). */
export interface CalculatedFieldsFilter {
  /**
   * Type filter. Omitted = every type EXCEPT ALARM (server default) — the
   * standalone page never passes ALARM here (panel-arch R18).
   */
  types?: CalculatedFieldType[];
  entityType?: CalculatedFieldsFilterEntityType;
  /** Target-entity UUIDs for the entityType filter. */
  entities?: string[];
  /** Exact-name filter (wire accepts repeatable `name` params; joined here). */
  names?: string[];
}

/** Entity types that can host calculated fields (Java SUPPORTED_ENTITIES). */
export type CalculatedFieldsFilterEntityType =
  | 'DEVICE'
  | 'ASSET'
  | 'DEVICE_PROFILE'
  | 'ASSET_PROFILE'
  | 'CUSTOMER';

/**
 * GET /api/calculatedFields — tenant-wide page. Sort whitelist is
 * `createdTime | name` ONLY: the dao has no column mappings for aliases,
 * so anything else (entityName, type, ...) 500s (contract #17/#18).
 */
export async function getCalculatedFields(
  pageLink: PageLink,
  filter: CalculatedFieldsFilter = {},
): Promise<PageData<CalculatedFieldInfo>> {
  const params: QueryParams = {
    ...pageLinkToQueryParams(pageLink),
    types: filter.types?.length ? filter.types.join(',') : undefined,
    entityType: filter.entityType,
    entities: filter.entities?.length ? filter.entities.join(',') : undefined,
    name: filter.names?.length ? filter.names.join(',') : undefined,
  };
  return tbHttp.get<PageData<CalculatedFieldInfo>>(
    '/api/calculatedFields',
    params,
  );
}

/**
 * GET /api/calculatedFields/names — paged tenant-wide CF names for one
 * type (autocomplete fodder). The backend pins sortProperty=name itself
 * and the endpoint takes NO sortProperty param — only the direction is
 * forwarded (contract #17).
 */
export async function getCalculatedFieldNames(
  type: CalculatedFieldType,
  pageLink: PageLink,
): Promise<PageData<string>> {
  const params: QueryParams = {
    type,
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    sortOrder: pageLink.sortOrder?.direction,
  };
  return tbHttp.get<PageData<string>>('/api/calculatedFields/names', params);
}

/**
 * GET /api/calculatedField/{entityType}/{entityId} — entity-scoped page
 * (v1 calculated-fields tab; type omitted = all types INCLUDING ALARM).
 */
export async function getCalculatedFieldsByEntityId(
  entityId: EntityId,
  pageLink: PageLink,
  type?: CalculatedFieldType,
): Promise<PageData<CalculatedField>> {
  const params: QueryParams = {
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    type,
    textSearch: pageLink.textSearch,
    sortProperty: pageLink.sortOrder?.property,
    sortOrder: pageLink.sortOrder?.direction,
  };
  return tbHttp.get<PageData<CalculatedField>>(
    `/api/calculatedField/${entityId.entityType}/${entityId.id}`,
    params,
  );
}

/** GET /api/calculatedField/{id} — full single field. */
export async function getCalculatedFieldById(
  calculatedFieldId: string,
): Promise<CalculatedField> {
  return tbHttp.get<CalculatedField>(
    `/api/calculatedField/${calculatedFieldId}`,
  );
}

/**
 * POST /api/calculatedField — create/update. The entityId is an OBJECT
 * ({entityType, id}) and immutable after creation (changing it 400s with
 * "Changing the calculated field target entity after initialization is
 * prohibited." — lock the entity selector in edit mode).
 */
export async function saveCalculatedField(
  field: CalculatedField,
): Promise<CalculatedField> {
  return tbHttp.post<CalculatedField>('/api/calculatedField', field);
}

/**
 * POST /api/calculatedField/testScript — TBEL dry-run. Errors do NOT throw
 * HTTP errors: a 200 body of `{output, error}` with a non-empty `error`
 * means the expression failed (render inline, never toast). Two HTTP-level
 * exceptions: 400 "TBEL script engine is disabled!" and the 20s execution
 * timeout surfacing inside `error`. The payload is `{expression, arguments}`
 * with the same argument-value shapes the debug events carry.
 */
export async function testCalculatedFieldScript(
  payload: Record<string, unknown>,
): Promise<{ output?: unknown; error?: string }> {
  return tbHttp.post<{ output?: unknown; error?: string }>(
    '/api/calculatedField/testScript',
    payload,
  );
}

/**
 * GET /api/calculatedField/{id}/debug — latest debug event, null body when
 * the field never ran. The event shape is the shared debug-event envelope
 * (same family the EventsPanel reads for DEBUG_CALCULATED_FIELD).
 */
export async function getLatestCalculatedFieldDebugEvent(
  calculatedFieldId: string,
): Promise<Record<string, unknown> | null> {
  return tbHttp.get<Record<string, unknown> | null>(
    `/api/calculatedField/${calculatedFieldId}/debug`,
  );
}

/** DELETE /api/calculatedField/{id}. */
export async function deleteCalculatedField(
  calculatedFieldId: string,
): Promise<boolean> {
  return tbHttp.delete<boolean>(`/api/calculatedField/${calculatedFieldId}`);
}
