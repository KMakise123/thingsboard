/**
 * Entity key inventory for calculated-field / alarm-rule argument pickers:
 * telemetry keys plus all-scope attribute keys of one entity, read through
 * the existing attributes service. Failures degrade to empty lists (the
 * pickers stay usable with a free-form fallback).
 */
import { useQuery } from '@tanstack/react-query';
import { getAttributes, getLatestTelemetry } from '@/services/tb/attributes';
import type { EntityId } from '@/types/tb';

export interface EntityKeyInventory {
  telemetry: Array<string>;
  attributes: Array<string>;
}

export function useEntityKeys(entityId: EntityId) {
  return useQuery({
    queryKey: ['entity-keys', entityId.entityType, entityId.id],
    queryFn: async (): Promise<EntityKeyInventory> => {
      try {
        const [telemetry, attributes] = await Promise.all([
          getLatestTelemetry(entityId),
          getAttributes(entityId),
        ]);
        return {
          telemetry: Object.keys(telemetry ?? {}),
          attributes: (attributes ?? []).map((row) => row.key),
        };
      } catch {
        return { telemetry: [], attributes: [] };
      }
    },
    staleTime: 60_000,
  });
}
