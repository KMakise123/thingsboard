import { describe, expect, it } from 'vitest';
import { EntityType } from '@/types/tb/entity';
import type { Widget } from '@/types/tb/widget';
import type { AliasResolution } from './alias-resolver';
import { expandWidgetDatasources } from './datasources';

const aliases: AliasResolution = {
  devices: [
    { entityType: EntityType.DEVICE, id: 'dev-1', name: 'Thermometer 1' },
    { entityType: EntityType.DEVICE, id: 'dev-2' },
  ],
};

function widget(partial: Partial<Widget['config']>): Widget {
  return { typeFullFqn: 'system.test', config: partial };
}

describe('expandWidgetDatasources', () => {
  it('expands entityAliasId against the resolved alias map', () => {
    const result = expandWidgetDatasources(
      widget({
        datasources: [
          {
            type: 'entity',
            entityAliasId: 'devices',
            name: 'Thermostats',
            dataKeys: [{ name: 'temperature', type: 'timeseries' }],
          },
        ],
      }),
      aliases,
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('entity');
    expect(result[0].entities).toEqual(aliases.devices);
    expect(result[0].entityName).toBe('Thermometer 1');
    expect(result[0].dataKeys[0].name).toBe('temperature');
  });

  it('degrades unknown alias ids and function leftovers to empty sets', () => {
    const result = expandWidgetDatasources(
      widget({
        datasources: [
          { type: 'entity', entityAliasId: 'ghost', dataKeys: [] },
          { type: 'function', dataKeys: [{ name: 'x', type: 'function' }] },
        ],
      }),
      aliases,
    );
    expect(result[0].entities).toEqual([]);
    // function → entity conversion (ui-ngx dashboard-utils :503-542)
    expect(result[1].type).toBe('entity');
    expect(result[1].entities).toEqual([]);
  });

  it('routes alarm widgets through alarmSource with the filter descriptor', () => {
    const inlineFilter = { statusList: [], severityList: [] };
    const result = expandWidgetDatasources(
      widget({
        datasources: [
          { type: 'entity', entityAliasId: 'devices', dataKeys: [] },
        ],
        alarmSource: {
          type: 'entity',
          entityAliasId: 'devices',
          filterId: null,
          dataKeys: [{ name: 'severity', type: 'alarm' }],
        },
        alarmFilterConfig: inlineFilter,
      }),
      aliases,
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('alarm');
    expect(result[0].dataKeys[0].type).toBe('alarm');
    expect(result[0].alarmFilter).toEqual(inlineFilter);
  });

  it('resolves a string alarmFilterConfig through configuration.filters', () => {
    const result = expandWidgetDatasources(
      widget({
        alarmSource: {
          type: 'entity',
          dataKeys: [],
          filterId: 'filter-1',
        },
        alarmFilterConfig: 'filter-1',
      }),
      aliases,
      {
        'filter-1': {
          id: 'filter-1',
          filter: 'Severe only',
          keyFilters: [],
        },
      },
    );
    expect(result[0].alarmFilter).toMatchObject({ filter: 'Severe only' });
  });
});
