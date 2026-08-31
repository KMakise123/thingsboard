/**
 * Events-domain transport endpoints: typed GET path + pageLink params.
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

import { getEvents } from './events';

const get = vi.mocked(tbHttp.get);

const entityId = { entityType: EntityType.DEVICE, id: 'd-1' };

describe('events transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
  });

  it('reads the typed event path with tenantId and explicit sort', async () => {
    await getEvents(entityId, 't-1', 'ERROR', {
      pageSize: 10,
      page: 0,
      textSearch: 'boom',
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/api/events/DEVICE/d-1/ERROR', {
      tenantId: 't-1',
      pageSize: 10,
      page: 0,
      textSearch: 'boom',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
  });

  it('keeps debug event families on the same path shape', async () => {
    await getEvents(entityId, 't-1', 'DEBUG_RULE_NODE', {
      pageSize: 10,
      page: 2,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith(
      '/api/events/DEVICE/d-1/DEBUG_RULE_NODE',
      expect.objectContaining({ page: 2 }),
    );
  });
});
