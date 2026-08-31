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
  clearAlarm,
  deleteAlarm,
  getAlarmComments,
  getAlarmInfoById,
  getEntityAlarms,
  saveAlarmComment,
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
});
