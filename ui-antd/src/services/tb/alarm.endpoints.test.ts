/**
 * Alarm-domain transport endpoints (device alarms tab + details dialog):
 * paths and comma-joined list params pinned against the openapi snapshot.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AlarmSeverity, EntityType } from '@/types/tb';

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
  ackAlarm,
  assignAlarm,
  clearAlarm,
  deleteAlarm,
  getAlarmComments,
  getAlarmInfoById,
  getAlarmTypes,
  getAlarms,
  getEntityAlarms,
  saveAlarmComment,
  unassignAlarm,
} from './alarm';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const entityId = { entityType: EntityType.DEVICE, id: 'd-1' };

describe('alarm transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(true as never);
  });

  it('entity-scoped seed reads the v2 path with comma-joined filters', async () => {
    await getEntityAlarms(
      entityId,
      { statusList: ['ACTIVE', 'UNACK'], severityList: [AlarmSeverity.CRITICAL] },
      {
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
    );
    expect(get).toHaveBeenCalledWith('/api/v2/alarm/DEVICE/d-1', {
      pageSize: 100,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      statusList: 'ACTIVE,UNACK',
      severityList: 'CRITICAL',
      typeList: undefined,
      startTime: undefined,
      endTime: undefined,
    });
  });

  it('lifecycle actions hit ack / clear / delete', async () => {
    await ackAlarm('a-1');
    expect(post).toHaveBeenCalledWith('/api/alarm/a-1/ack');
    await clearAlarm('a-1');
    expect(post).toHaveBeenCalledWith('/api/alarm/a-1/clear');
    await deleteAlarm('a-1');
    expect(del).toHaveBeenCalledWith('/api/alarm/a-1');
  });

  it('details + comments use the alarm id endpoints', async () => {
    await getAlarmInfoById('a-1');
    expect(get).toHaveBeenCalledWith('/api/alarm/info/a-1');
    await getAlarmComments('a-1', { pageSize: 100, page: 0 });
    expect(get).toHaveBeenCalledWith('/api/alarm/a-1/comment', {
      pageSize: 100,
      page: 0,
      sortProperty: 'createdTime',
      sortOrder: 'ASC',
    });
    await saveAlarmComment('a-1', 'note');
    expect(post).toHaveBeenCalledWith('/api/alarm/a-1/comment', {
      type: 'OTHER',
      comment: { text: 'note' },
    });
  });

  it('global v2 page carries the full filter incl. assignee', async () => {
    await getAlarms(
      {
        statusList: ['ACTIVE'],
        severityList: [AlarmSeverity.MAJOR],
        typeList: ['高温告警'],
        assigneeId: 'u-1',
      },
      {
        pageSize: 100,
        page: 0,
        textSearch: 'dev',
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
    );
    expect(get).toHaveBeenCalledWith('/api/v2/alarms', {
      pageSize: 100,
      page: 0,
      textSearch: 'dev',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      statusList: 'ACTIVE',
      severityList: 'MAJOR',
      typeList: '高温告警',
      assigneeId: 'u-1',
      startTime: undefined,
      endTime: undefined,
    });
  });

  it('alarm types + assign / unassign hit their endpoints', async () => {
    await getAlarmTypes();
    expect(get).toHaveBeenCalledWith('/api/alarm/types', {
      pageSize: 100,
      page: 0,
    });
    await assignAlarm('a-1', 'u-1');
    expect(post).toHaveBeenCalledWith('/api/alarm/a-1/assign/u-1');
    await unassignAlarm('a-1');
    expect(del).toHaveBeenCalledWith('/api/alarm/a-1/assign');
  });
});
