/**
 * Alarm-rule transport endpoints (entity alarm-rules tab). Paths exist on
 * this backend's openapi snapshot — verified before building the tab.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityType } from '@/types/tb';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  alarmRuleSeverities,
  deleteAlarmRule,
  getAlarmRulesByEntityId,
  saveAlarmRule,
} from './alarm-rules';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const entityId = { entityType: EntityType.DEVICE, id: 'd-1' };

describe('alarm-rule transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(true as never);
  });

  it('reads the entity-scoped rule page', async () => {
    await getAlarmRulesByEntityId(entityId, {
      pageSize: 100,
      page: 0,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/api/alarm/rules/DEVICE/d-1', {
      pageSize: 100,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
  });

  it('saves and deletes through the alarm/rule endpoints', async () => {
    await saveAlarmRule({
      entityId,
      type: 'ALARM',
      name: 'High temperature',
      configuration: {
        type: 'ALARM',
        arguments: {},
        createRules: {},
      },
    } as never);
    expect(post).toHaveBeenCalledWith('/api/alarm/rule', {
      entityId,
      type: 'ALARM',
      name: 'High temperature',
      configuration: { type: 'ALARM', arguments: {}, createRules: {} },
    });
    await deleteAlarmRule('r-1');
    expect(del).toHaveBeenCalledWith('/api/alarm/rule/r-1');
  });

  it('derives the severity list in display order', () => {
    const rule = {
      configuration: {
        createRules: {
          WARNING: {},
          CRITICAL: {},
        },
      },
    } as never;
    expect(alarmRuleSeverities(rule)).toEqual(['CRITICAL', 'WARNING']);
  });
});
