/**
 * useWidgetValues — label → value map for value-card widgets (brief §1.8).
 *
 * Anchor reality (lead-adjudicated): firmware/software html_value_cards read
 * `entityCount` datasources ({name:'count', type:'count'}) with a
 * datasource-level filterId — a LIVE device count under keyFilters, not a
 * latest-telemetry read. Dual channel:
 *   - entityCount datasource → subscribeEntityCount (+ keyFilters);
 *   - entity datasource      → subscribeLatestTelemetry per entity.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExpandedDatasource } from '@/core/dashboard/datasources';
import { getDefaultWsManager } from '@/core/ws';
import type { AttributeData } from '@/types/tb';
import { toEntityListFilters } from './entity-filter';
import { toWireKeyFilters } from './key-filters';

/** label/name of the first dataKey (the value placeholder binding). */
function valueBindingOf(datasource: ExpandedDatasource): string {
  const key = datasource.dataKeys?.[0];
  return key ? (key.label ?? key.name) : '';
}

function latestToRecord(
  datasource: ExpandedDatasource,
  data: Array<AttributeData>,
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const key of datasource.dataKeys ?? []) {
    const found = data.find((entry) => entry.key === key.name);
    if (found) {
      record[key.label ?? key.name] = found.value;
    }
  }
  return record;
}

export function useWidgetValues(
  datasources: Array<ExpandedDatasource>,
): Record<string, unknown> {
  const manager = getDefaultWsManager();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const readers = useRef<Array<() => Record<string, unknown>>>([]);

  const signature = useMemo(
    () =>
      datasources
        .map(
          (datasource) =>
            `${datasource.type}:${valueBindingOf(datasource)}:${datasource.entities
              .map((entity) => entity.id)
              .join(
                '|',
              )}:${JSON.stringify(datasource.filter?.keyFilters ?? null)}`,
        )
        .join('#'),
    [datasources],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: datasources enters as `signature`, its content projection — the html_value_card caller passes ctx.datasources (a per-render reference, ctx is not memoized), so identity deps would tear down and rebuild the value subscriptions on every parent render (same pattern as DashboardPage.tsx stateEntityKey)
  useEffect(() => {
    interface Job {
      datasource: ExpandedDatasource;
      entityId?: {
        entityType: ExpandedDatasource['entities'][number]['entityType'];
        id: string;
      };
    }
    const jobs: Array<Job> = [];
    for (const datasource of datasources) {
      if (datasource.type === 'entityCount') {
        jobs.push({ datasource });
      } else {
        for (const entity of datasource.entities) {
          jobs.push({
            datasource,
            entityId: { entityType: entity.entityType, id: entity.id },
          });
        }
      }
    }
    if (jobs.length === 0) {
      setValues({});
      return;
    }

    const publish = () => {
      setValues(Object.assign({}, ...readers.current.map((read) => read())));
    };

    const subscriptions = jobs.map((job) => {
      if (job.entityId) {
        const keys = (job.datasource.dataKeys ?? []).map((key) => key.name);
        const subscription = manager.subscribeLatestTelemetry({
          entityId: job.entityId,
          keys,
        });
        return {
          subscription,
          read: () =>
            latestToRecord(job.datasource, subscription.getSnapshot()),
        };
      }
      // entityCount: one cmd per entityType group under the datasource filters
      const groups = toEntityListFilters(job.datasource.entities);
      const keyFilters = toWireKeyFilters(job.datasource.filter?.keyFilters);
      const countSubs = groups.map((group) => {
        // keyFilters ride the wire EntityCountQuery (structural passthrough)
        const query: { entityFilter: Record<string, unknown> } & Record<
          string,
          unknown
        > = {
          entityFilter: group as unknown as Record<string, unknown>,
          ...(Array.isArray(keyFilters) && keyFilters.length > 0
            ? { keyFilters }
            : {}),
        };
        return manager.subscribeEntityCount({ query });
      });
      return {
        subscription: countSubs[0],
        read: () => {
          const binding = valueBindingOf(job.datasource);
          // multiple entity type groups sum into one count
          const count = countSubs.reduce(
            (sum, sub) => sum + (sub.getSnapshot() ?? 0),
            0,
          );
          return { [binding]: count };
        },
      };
    });

    readers.current = subscriptions.map((entry) => entry.read);
    const disposers = subscriptions.map((entry) =>
      entry.subscription.subscribe(publish),
    );

    return () => {
      for (const dispose of disposers) {
        dispose();
      }
      for (const entry of subscriptions) {
        entry.subscription.unsubscribe();
      }
      readers.current = [];
    };
  }, [manager, signature]);

  return values;
}
