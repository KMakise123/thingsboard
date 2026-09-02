/**
 * Global alarms WS channel contract: query shape (backend pins), filter
 * mapping, and the client-side merge of the two entityType channels.
 */
import { describe, expect, it } from 'vitest';
import { type AlarmData, AlarmSeverity, EntityType } from '@/types/tb';
import {
  buildGlobalAlarmDataQuery,
  mergeAlarmChannels,
} from './use-global-alarm-data';

function row(id: string, createdTime: number): AlarmData {
  return {
    id: { entityType: EntityType.ALARM, id },
    createdTime,
  } as AlarmData;
}

describe('buildGlobalAlarmDataQuery', () => {
  it('uses an entityType filter and pins the backend contract fields', () => {
    const query = buildGlobalAlarmDataQuery(
      EntityType.DEVICE,
      {
        statusList: ['ACTIVE'],
        severityList: [AlarmSeverity.MAJOR],
        typeList: ['高温告警'],
        assigneeId: 'u-1',
        searchPropagatedAlarms: true,
        textSearch: 'dev',
        timeWindowMs: 7 * 86_400_000,
      },
      { pageSize: 50 },
    ) as {
      entityFilter: { type: string; entityType: string };
      pageLink: Record<string, unknown>;
      latestValues: Array<unknown>;
    };

    expect(query.entityFilter).toEqual({
      type: 'entityType',
      entityType: 'DEVICE',
    });
    expect(query.pageLink).toMatchObject({
      page: 0,
      pageSize: 50,
      // Backend contract (TbAlarmDataSubCtx): the only supported alarm sort.
      sortOrder: {
        key: { type: 'ALARM_FIELD', key: 'createdTime' },
        direction: 'DESC',
      },
      statusList: ['ACTIVE'],
      severityList: ['MAJOR'],
      typeList: ['高温告警'],
      assigneeId: 'u-1',
      searchPropagatedAlarms: true,
      textSearch: 'dev',
      // Backend contract: positive timeWindow, never null/undefined.
      timeWindow: 7 * 86_400_000,
    });
    // Backend contract: latestValues must be an array (server iterates it).
    expect(query.latestValues).toEqual([]);
  });

  it('falls back to the for-all-time window and omits empty filters', () => {
    const query = buildGlobalAlarmDataQuery(EntityType.ASSET, {
      statusList: [],
      severityList: [],
      typeList: [],
      searchPropagatedAlarms: false,
    }) as { pageLink: Record<string, unknown> };
    expect(query.pageLink.timeWindow).toBeGreaterThan(0);
    expect(query.pageLink).not.toHaveProperty('statusList');
    expect(query.pageLink).not.toHaveProperty('textSearch');
    expect(query.pageLink.searchPropagatedAlarms).toBe(false);
  });
});

describe('mergeAlarmChannels', () => {
  it('dedupes by alarm id and sorts newest first', () => {
    const merged = mergeAlarmChannels([
      [row('d1', 100), row('d2', 300)],
      [row('a1', 200), row('d2', 999)],
    ]);
    expect(merged.map((entry) => entry.id.id)).toEqual(['d2', 'a1', 'd1']);
    // The later channel row (update) wins for the same id.
    expect(merged[0].createdTime).toBe(999);
  });
});
