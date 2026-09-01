/**
 * Calculated-field transport (handwritten) — entity calculated-fields tab.
 *
 * Base paths:
 *   GET    /api/calculatedField/{entityType}/{entityId}   entity-scoped page
 *   POST   /api/calculatedField                           save
 *   DELETE /api/calculatedField/{calculatedFieldId}       delete
 */

import type { QueryParams } from '@/core/http/client';
import type {
  BaseData,
  EntityId,
  EntityType,
  HasTenantIdAndCustomer,
  HasVersion,
  PageData,
  PageLink,
} from '@/types/tb';

import { tbHttp } from './http';

/** Wire enum (openapi CalculatedFieldType). */
export type CalculatedFieldType =
  | 'SIMPLE'
  | 'SCRIPT'
  | 'GEOFENCING'
  | 'ALARM'
  | 'PROPAGATION'
  | 'RELATED_ENTITIES_AGGREGATION'
  | 'ENTITY_AGGREGATION';

/** Opaque configuration blob (type-discriminated upstream; M1 round-trips it). */
export type CalculatedFieldConfiguration = Record<string, unknown>;

/** GET/POST row (openapi CalculatedField). */
export interface CalculatedField
  extends BaseData<{ entityType: EntityType; id: string }>,
    HasTenantIdAndCustomer,
    HasVersion {
  entityId: EntityId;
  type: CalculatedFieldType;
  name: string;
  debugMode?: boolean;
  configurationVersion?: number;
  configuration: CalculatedFieldConfiguration;
  additionalInfo?: Record<string, unknown>;
}

/** GET /api/calculatedField/{entityType}/{entityId} — entity-scoped page. */
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

/** POST /api/calculatedField — create/update. */
export async function saveCalculatedField(
  field: CalculatedField,
): Promise<CalculatedField> {
  return tbHttp.post<CalculatedField>('/api/calculatedField', field);
}

/** DELETE /api/calculatedField/{id}. */
export async function deleteCalculatedField(
  calculatedFieldId: string,
): Promise<boolean> {
  return tbHttp.delete<boolean>(`/api/calculatedField/${calculatedFieldId}`);
}
