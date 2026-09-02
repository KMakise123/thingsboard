/**
 * Widget datasource → WS entity-query plumbing (brief §1.8).
 *
 * The alias resolver hands widgets CONCRETE entities, but the WS ENTITY_DATA
 * family takes an entityFilter. The bridge is the server-side `entityList`
 * filter: one filter per entityType carrying the resolved ids, so a whole
 * widget (any number of datasources/entities) costs ONE subscription per
 * entity type instead of one per entity.
 */

import type { ResolvedEntity } from '@/core/dashboard/alias-resolver';

/** Server-side entityList filter (ui-ngx AliasFilterType.ENTITY_LIST). */
export interface EntityListFilter {
  type: 'entityList';
  entityType: string;
  entityIds: Array<string>;
}

/** PageLink large enough to stream every alias-matched entity in one page. */
export const WIDGET_ENTITY_PAGE_SIZE = 1024;

/**
 * Group resolved entities into entityList filters (one per entityType,
 * stable insertion order, ids deduped).
 */
export function toEntityListFilters(
  entities: Array<ResolvedEntity>,
): Array<EntityListFilter> {
  const byType = new Map<string, Array<string>>();
  for (const entity of entities) {
    const ids = byType.get(entity.entityType) ?? [];
    if (!ids.includes(entity.id)) {
      ids.push(entity.id);
    }
    byType.set(entity.entityType, ids);
  }
  return [...byType.entries()].map(([entityType, entityIds]) => ({
    type: 'entityList',
    entityType,
    entityIds,
  }));
}
