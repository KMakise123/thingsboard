/**
 * Dashboard entity-alias resolver (brief §1.7).
 *
 * Implemented filter types = the set verified across the six anchor JSONs:
 *   entityType, stateEntity, deviceType, singleEntity, relationsQuery,
 *   apiUsageState.
 * Anything else resolves to an empty set + console.warn (render degrades,
 * never crashes).
 *
 * Client-side types (singleEntity, stateEntity) never hit the network;
 * server-side types go through POST /api/entitiesQuery/find with full
 * pagination (findAllEntitiesByFilter). stateEntity and relationsQuery with
 * rootStateEntity read the entity from the current dashboard state params.
 *
 * Output: aliasId → resolved entities; consumed by datasource
 * `entityAliasId` references (and W2's data hooks).
 */

import {
  type EntityDataLite,
  findAllEntitiesByFilter,
} from '@/services/tb/dashboard';
import type { EntityAlias, EntityAliasFilter } from '@/types/tb/dashboard';
import type { EntityType } from '@/types/tb/entity';

/** One resolved alias entity with best-effort display fields. */
export interface ResolvedEntity {
  entityType: EntityType;
  id: string;
  name?: string;
  label?: string;
}

/** aliasId → entities; an empty array renders an empty datasource. */
export type AliasResolution = Record<string, ResolvedEntity[]>;

/** Subset of StateParams the resolver needs (state-object.ts carries the full type). */
export interface AliasStateParams {
  entityId?: { entityType: string; id: string };
  [key: string]: unknown;
}

export interface ResolveEntityAliasesArgs {
  entityAliases: Record<string, EntityAlias>;
  /** current state params for stateEntity / rootStateEntity resolution. */
  stateParams?: AliasStateParams;
  /** DI seam for tests; defaults to the transport in services/tb/dashboard. */
  fetchEntities?: (
    entityFilter: Record<string, unknown>,
  ) => Promise<EntityDataLite[]>;
}

function isEntityIdLike(
  value: unknown,
): value is { entityType: string; id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { entityType?: unknown }).entityType === 'string'
  );
}

/**
 * Entity referenced by a state filter: the param named by the filter
 * (default `entityId`), falling back to the filter's defaultStateEntity.
 */
function stateEntityOf(
  filter: Record<string, unknown>,
  stateParams?: AliasStateParams,
): { entityType: string; id: string } | null {
  const rawParam = filter.stateEntityParamName;
  const paramName =
    typeof rawParam === 'string' && rawParam.length > 0 ? rawParam : 'entityId';
  const raw = stateParams?.[paramName] ?? stateParams?.entityId;
  if (isEntityIdLike(raw)) {
    return raw;
  }
  return isEntityIdLike(filter.defaultStateEntity)
    ? filter.defaultStateEntity
    : null;
}

function toResolvedEntity(row: EntityDataLite): ResolvedEntity {
  const entityFields = row.latest?.ENTITY_FIELD;
  return {
    entityType: row.entityId.entityType as EntityType,
    id: row.entityId.id,
    name: entityFields?.name?.value,
    label: entityFields?.label?.value,
  };
}

/** Resolve one alias filter to its entity list; never throws. */
async function resolveFilter(
  aliasId: string,
  filter: EntityAliasFilter,
  stateParams: AliasStateParams | undefined,
  fetchEntities: (
    entityFilter: Record<string, unknown>,
  ) => Promise<EntityDataLite[]>,
): Promise<ResolvedEntity[]> {
  switch (filter.type) {
    case 'singleEntity':
      return isEntityIdLike(filter.singleEntity)
        ? [
            {
              entityType: filter.singleEntity.entityType as EntityType,
              id: filter.singleEntity.id,
            },
          ]
        : [];
    case 'stateEntity': {
      const entity = stateEntityOf(filter, stateParams);
      return entity
        ? [{ entityType: entity.entityType as EntityType, id: entity.id }]
        : [];
    }
    case 'entityType': {
      const rows = await fetchEntities({
        type: 'entityType',
        entityType: filter.entityType,
      });
      return rows.map(toResolvedEntity);
    }
    case 'deviceType': {
      const rows = await fetchEntities({
        type: 'deviceType',
        deviceTypes: filter.deviceTypes ?? [],
        deviceNameFilter: filter.deviceNameFilter || '',
      });
      return rows.map(toResolvedEntity);
    }
    case 'relationsQuery': {
      const rootEntity = filter.rootStateEntity
        ? stateEntityOf(filter, stateParams)
        : isEntityIdLike(filter.rootEntity)
          ? filter.rootEntity
          : null;
      if (!rootEntity) {
        return [];
      }
      const rows = await fetchEntities({
        type: 'relationsQuery',
        rootEntity,
        direction: filter.direction ?? 'FROM',
        filters: filter.filters ?? [],
        maxLevel: filter.maxLevel ?? 1,
        fetchLastLevelOnly: filter.fetchLastLevelOnly ?? false,
      });
      return rows.map(toResolvedEntity);
    }
    case 'apiUsageState': {
      const rows = await fetchEntities({ type: 'apiUsageState' });
      return rows.map(toResolvedEntity);
    }
    default:
      console.warn(
        `[dashboard] unsupported entity-alias filter type ` +
          `"${(filter as { type?: string }).type}" (alias ${aliasId}); ` +
          `resolving to an empty entity set`,
      );
      return [];
  }
}

/**
 * Resolve every alias of a dashboard configuration. One failing alias
 * degrades to an empty set (warned) instead of failing the dashboard.
 */
export async function resolveEntityAliases(
  args: ResolveEntityAliasesArgs,
): Promise<AliasResolution> {
  const { entityAliases, stateParams } = args;
  const fetchEntities =
    args.fetchEntities ??
    ((filter: Record<string, unknown>) => findAllEntitiesByFilter(filter));

  const entries = Object.entries(entityAliases);
  const settled = await Promise.all(
    entries.map(async ([aliasId, alias]) => {
      try {
        return [
          aliasId,
          await resolveFilter(
            aliasId,
            alias.filter,
            stateParams,
            fetchEntities,
          ),
        ] as const;
      } catch (error) {
        console.warn(
          `[dashboard] alias "${alias.alias}" (${aliasId}) failed to resolve:`,
          error,
        );
        return [aliasId, [] as ResolvedEntity[]] as const;
      }
    }),
  );
  return Object.fromEntries(settled);
}
