/**
 * Relation transport (handwritten) — device relations tab.
 *
 * Base paths:
 *   GET    /api/relations/info/from/{fromType}/{fromId}   rows with names (FROM)
 *   GET    /api/relations/info/to/{toType}/{toId}         rows with names (TO)
 *   POST   /api/v2/relation                               save (create/update)
 *   DELETE /api/v2/relation                               delete one
 *   DELETE /api/relations?entityId&entityType             delete all for entity
 *   POST   /api/entitiesQuery/find                        generic entity picker
 *          (entityName filter + ENTITY_FIELD name projection)
 */

import type { QueryParams } from '@/core/http/client';
import type { EntityId, EntityType, HasVersion } from '@/types/tb';

import { tbHttp } from './http';

/** Relation type groups (RelationTypeGroup wire enum). */
export type RelationTypeGroup = 'COMMON' | 'ALARM' | 'DASHBOARD' | 'RULE_CHAIN' | 'RULE_NODE' | 'EDGE' | 'EDGE_AUTO_ASSIGN_RULE_NODE' | 'TO_ENTITY_ROUTES_FLOW';

/** One directed relation edge (openapi EntityRelation). */
export interface EntityRelation extends HasVersion {
  from: EntityId;
  to: EntityId;
  type: string;
  typeGroup?: RelationTypeGroup;
  additionalInfo?: Record<string, unknown>;
}

/** EntityRelation + the joined display names (openapi EntityRelationInfo). */
export interface EntityRelationInfo extends EntityRelation {
  fromName?: string;
  toName?: string;
}

/** POST /api/entitiesQuery/find row (entityId + projected latest fields). */
export interface EntityDataLite {
  entityId: EntityId;
  latest?: Record<string, Record<string, { ts?: number; value?: string }>>;
}

/** GET /api/relations/info/from/{type}/{id} — direction FROM, names included. */
export async function findRelationInfosByFrom(
  entityId: EntityId,
  typeGroup?: RelationTypeGroup,
): Promise<Array<EntityRelationInfo>> {
  const query: QueryParams = { relationTypeGroup: typeGroup };
  return tbHttp.get<Array<EntityRelationInfo>>(
    `/api/relations/info/from/${entityId.entityType}/${entityId.id}`,
    query,
  );
}

/** GET /api/relations/info/to/{type}/{id} — direction TO, names included. */
export async function findRelationInfosByTo(
  entityId: EntityId,
  typeGroup?: RelationTypeGroup,
): Promise<Array<EntityRelationInfo>> {
  const query: QueryParams = { relationTypeGroup: typeGroup };
  return tbHttp.get<Array<EntityRelationInfo>>(
    `/api/relations/info/to/${entityId.entityType}/${entityId.id}`,
    query,
  );
}

/** POST /api/v2/relation — create/update one edge. */
export async function saveRelation(
  relation: EntityRelation,
): Promise<EntityRelation> {
  return tbHttp.post<EntityRelation>('/api/v2/relation', relation);
}

/** DELETE /api/v2/relation — delete one edge (identified by from+type+to). */
export async function deleteRelation(
  relation: Pick<EntityRelation, 'from' | 'to' | 'type'> & {
    typeGroup?: RelationTypeGroup;
  },
): Promise<EntityRelation> {
  const query: QueryParams = {
    fromId: relation.from.id,
    fromType: relation.from.entityType,
    toId: relation.to.id,
    toType: relation.to.entityType,
    relationType: relation.type,
    relationTypeGroup: relation.typeGroup,
  };
  return tbHttp.delete<EntityRelation>('/api/v2/relation', query);
}

/** DELETE /api/relations — drop every relation touching the entity. */
export async function deleteEntityRelations(
  entityId: EntityId,
): Promise<void> {
  await tbHttp.delete('/api/relations', {
    entityId: entityId.id,
    entityType: entityId.entityType,
  });
}

/**
 * POST /api/entitiesQuery/find — entity picker source for the relation
 * dialog: prefix-search by name inside one entity type.
 */
export async function findEntitiesByNameFilter(
  entityType: EntityType,
  nameFilter: string,
  pageSize = 50,
): Promise<Array<EntityDataLite>> {
  const page = await tbHttp.post<{
    data: Array<EntityDataLite>;
  }>('/api/entitiesQuery/find', {
    entityFilter: {
      type: 'entityName',
      entityType,
      entityNameFilter: nameFilter,
    },
    pageLink: {
      pageSize,
      page: 0,
      sortOrder: {
        key: { type: 'ENTITY_FIELD', key: 'name' },
        direction: 'ASC',
      },
    },
    entityFields: [{ type: 'ENTITY_FIELD', key: 'name' }],
  });
  return page.data ?? [];
}

/** Convenience: the picker cares about the projected name only. */
export function entityDataName(row: EntityDataLite): string {
  return row.latest?.ENTITY_FIELD?.name?.value ?? row.entityId.id;
}
