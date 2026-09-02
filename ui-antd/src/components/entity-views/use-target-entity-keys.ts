/**
 * Key inventory for the entity-view form's four key lists (ui-ngx
 * entity-keys-list data source): telemetry keys plus all-scope attribute
 * keys of the selected TARGET entity (device or asset).
 *
 * Local wrapper of the shared `useEntityKeys` (read-only foundation) — this
 * copy adds the enabled gate so no request fires before a target entity is
 * picked, and failures degrade to empty lists exactly like the shared hook.
 */
import { useQuery } from '@tanstack/react-query';
import { getAttributes, getLatestTelemetry } from '@/services/tb/attributes';
import type { EntityId } from '@/types/tb';

export interface TargetEntityKeyInventory {
  telemetry: Array<string>;
  attributes: Array<string>;
}

export function useTargetEntityKeys(entityId: EntityId | null) {
  return useQuery({
    queryKey: ['entity-keys', entityId?.entityType, entityId?.id],
    queryFn: async (): Promise<TargetEntityKeyInventory> => {
      if (!entityId) {
        return { telemetry: [], attributes: [] };
      }
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
    enabled: !!entityId?.id,
    staleTime: 60_000,
  });
}
