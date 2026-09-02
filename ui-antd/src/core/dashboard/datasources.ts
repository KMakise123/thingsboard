/**
 * Widget datasource expansion: map raw widget config datasources against a
 * resolved alias map so widget components receive ready-to-subscribe
 * datasources (brief §1.7/§1.8).
 *
 * Quirks handled:
 *  - alarm widgets source rows from `config.alarmSource` instead of
 *    `config.datasources` (anchor: alarms_table);
 *  - `type: 'function'` datasources are widgetType defaultConfig leftovers:
 *    converted to `entity` per ui-ngx dashboard-utils :503-542 and resolve
 *    to an empty entity set when no alias is attached (render degrades,
 *    never crashes);
 *  - missing alias ids resolve to empty entity sets.
 */

import type { DashboardFilter } from '@/types/tb/dashboard';
import type {
  AlarmSource,
  Datasource,
  DatasourceType,
  Widget,
} from '@/types/tb/widget';
import type { AliasResolution } from './alias-resolver';

/** A datasource with its alias already expanded to concrete entities. */
export interface ExpandedDatasource {
  type: DatasourceType;
  /** raw datasource name (display hint from the dashboard author). */
  name?: string | null;
  /** resolved entities (empty for unresolved aliases / function leftovers). */
  entities: AliasResolution[string];
  /** first entity display name, for row headers (entities[0]). */
  entityName?: string;
  dataKeys: Datasource['dataKeys'];
  latestDataKeys?: Datasource['latestDataKeys'];
  /** alarm widgets only. */
  alarmSource?: AlarmSource;
  /** alarm filter descriptor: inline object or `configuration.filters` id. */
  alarmFilter?: unknown;
}

function expandDatasource(
  datasource: Datasource,
  aliases: AliasResolution,
): ExpandedDatasource {
  const type: DatasourceType =
    datasource.type === 'function' ? 'entity' : datasource.type;
  const entities =
    datasource.entityAliasId !== undefined
      ? (aliases[datasource.entityAliasId] ?? [])
      : [];
  return {
    type,
    name: datasource.name ?? undefined,
    entities,
    entityName: entities[0]?.name ?? entities[0]?.label,
    dataKeys: datasource.dataKeys ?? [],
    latestDataKeys: datasource.latestDataKeys,
  };
}

/**
 * Expand every datasource of a widget. Alarm widgets yield exactly one
 * expanded datasource built from their alarmSource.
 */
export function expandWidgetDatasources(
  widget: Widget,
  aliases: AliasResolution,
  filters?: Record<string, DashboardFilter>,
): Array<ExpandedDatasource> {
  const config = widget.config;
  if (config?.alarmSource) {
    const alarmSource = config.alarmSource;
    const entities =
      alarmSource.entityAliasId !== undefined
        ? (aliases[alarmSource.entityAliasId] ?? [])
        : [];
    const filterRef = config.alarmFilterConfig;
    const alarmFilter =
      typeof filterRef === 'string' ? filters?.[filterRef] : filterRef;
    return [
      {
        type: 'alarm',
        name: alarmSource.name ?? undefined,
        entities,
        entityName: entities[0]?.name ?? entities[0]?.label,
        dataKeys: alarmSource.dataKeys ?? [],
        alarmSource,
        alarmFilter,
      },
    ];
  }
  return (config?.datasources ?? []).map((datasource) =>
    expandDatasource(datasource, aliases),
  );
}
