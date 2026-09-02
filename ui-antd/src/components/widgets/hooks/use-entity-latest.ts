/**
 * useEntityLatestData — the entities-table data hook (brief §1.8).
 *
 * One ENTITY_DATA subscription per (datasource, entityType group): latest
 * values for every dataKey (attribute + timeseries-latest), entity name/label
 * fields, datasource-level keyFilters (M5 W2 contract increment) applied
 * server-side, sorted by entity name. Rows arrive tagged with their
 * datasource so a multi-datasource table stays attributable.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExpandedDatasource } from '@/core/dashboard/datasources';
import {
  type EntityDataWire,
  getDefaultWsManager,
  type WsStatus,
} from '@/core/ws';
import {
  entityKeyTypeOfDataKey,
  toEntityListFilters,
  WIDGET_ENTITY_PAGE_SIZE,
} from './entity-filter';

/** One latest-values row: which datasource it belongs to + the wire row. */
export interface EntityLatestEntry {
  datasourceIndex: number;
  row: EntityDataWire;
}

/** EntityKey refs for the widget's dataKeys (timeseries keys read as latest). */
export function dataKeysToLatestValues(
  datasource: ExpandedDatasource,
): Array<{ type: string; key: string }> {
  return (datasource.dataKeys ?? [])
    .filter((key) => key.type === 'attribute' || key.type === 'timeseries')
    .map((key) => ({ type: entityKeyTypeOfDataKey(key.type), key: key.name }));
}

export function useEntityLatestData(datasources: Array<ExpandedDatasource>): {
  entries: Array<EntityLatestEntry>;
  status: WsStatus;
} {
  const manager = getDefaultWsManager();
  const [entries, setEntries] = useState<Array<EntityLatestEntry>>([]);
  const [status, setStatus] = useState<WsStatus>('idle');
  const buffers = useRef<Array<Array<EntityDataWire>>>([]);

  // stable signature: datasource identity (container memoizes ctx)
  const signature = datasources
    .map(
      (datasource) =>
        `${datasource.entities.map((entity) => entity.id).join('|')}::${dataKeysToLatestValues(
          datasource,
        )
          .map((k) => `${k.type}:${k.key}`)
          .join(
            '|',
          )}::${JSON.stringify(datasource.filter?.keyFilters ?? null)}`,
    )
    .join('#');

  useEffect(() => {
    const jobs = datasources.flatMap((datasource, datasourceIndex) =>
      toEntityListFilters(datasource.entities).map((group) => ({
        datasource,
        datasourceIndex,
        group,
      })),
    );
    if (jobs.length === 0) {
      buffers.current = [];
      setEntries([]);
      setStatus('idle');
      return;
    }
    buffers.current = jobs.map(() => []);

    const subscriptions = jobs.map((job) => {
      const latestValues = dataKeysToLatestValues(job.datasource);
      const keyFilters = job.datasource.filter?.keyFilters;
      return manager.subscribeEntityData({
        query: {
          entityFilter: job.group as unknown as Record<string, unknown>,
          pageLink: {
            pageSize: WIDGET_ENTITY_PAGE_SIZE,
            page: 0,
            sortOrder: {
              key: { type: 'ENTITY_FIELD', key: 'name' },
              direction: 'ASC',
            },
          },
          entityFields: [
            { type: 'ENTITY_FIELD', key: 'name' },
            { type: 'ENTITY_FIELD', key: 'label' },
          ],
          latestValues,
          ...(Array.isArray(keyFilters) && keyFilters.length > 0
            ? { keyFilters }
            : {}),
        },
      });
    });

    const publish = () => {
      setEntries(
        buffers.current.flatMap((rows, index) =>
          rows.map((row) => ({
            datasourceIndex: jobs[index].datasourceIndex,
            row,
          })),
        ),
      );
      setStatus(
        subscriptions.every((s) => s.getStatus() === 'open')
          ? 'open'
          : (subscriptions[0]?.getStatus() ?? 'idle'),
      );
    };
    const disposers = subscriptions.map((subscription, index) =>
      subscription.subscribe(() => {
        buffers.current[index] = subscription.getSnapshot();
        publish();
      }),
    );

    return () => {
      for (const dispose of disposers) {
        dispose();
      }
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: `signature` is the stable projection of datasources
  }, [manager, signature]);

  return { entries, status };
}
