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

import { clearEvents, getEvents, getEventsByFilter } from './events';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);

const entityId = { entityType: EntityType.DEVICE, id: 'd-1' };

describe('events transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
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

describe('events filter transport (M8 wave-3 D, additive)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({} as never);
  });

  it('POSTs the discriminated filter body with tenantId and paging', async () => {
    await getEventsByFilter(
      { entityType: EntityType.RULE_NODE, id: 'rn-1' },
      't-1',
      { eventType: 'DEBUG_RULE_NODE', msgDirectionType: 'IN', isError: true },
      {
        pageSize: 20,
        page: 1,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
    );
    expect(post).toHaveBeenCalledWith(
      '/api/events/RULE_NODE/rn-1',
      { eventType: 'DEBUG_RULE_NODE', msgDirectionType: 'IN', isError: true },
      {
        tenantId: 't-1',
        pageSize: 20,
        page: 1,
        textSearch: undefined,
        sortProperty: 'createdTime',
        sortOrder: 'DESC',
        startTime: undefined,
        endTime: undefined,
      },
    );
  });

  it('keeps the rule-chain debug table on the same endpoint', async () => {
    await getEventsByFilter(
      { entityType: EntityType.RULE_CHAIN, id: 'rc-1' },
      't-1',
      { eventType: 'DEBUG_RULE_CHAIN' },
      { pageSize: 10, page: 0 },
    );
    expect(post).toHaveBeenCalledWith(
      '/api/events/RULE_CHAIN/rc-1',
      { eventType: 'DEBUG_RULE_CHAIN' },
      expect.objectContaining({ page: 0, sortProperty: 'createdTime' }),
    );
  });

  it('clear posts the filter to the clear path with the tenant query', async () => {
    await clearEvents(
      { entityType: EntityType.RULE_NODE, id: 'rn-1' },
      't-1',
      { eventType: 'DEBUG_RULE_NODE', msgType: 'POST_TELEMETRY_REQUEST' },
    );
    expect(post).toHaveBeenCalledWith(
      '/api/events/RULE_NODE/rn-1/clear',
      { eventType: 'DEBUG_RULE_NODE', msgType: 'POST_TELEMETRY_REQUEST' },
      { tenantId: 't-1' },
    );
  });
});
