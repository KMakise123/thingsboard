/**
 * Queue transport endpoints (M14 wave-1): the serviceType pinning and the
 * explicit createdTime DESC default are the wire contract here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { deleteQueue, getQueueById, getQueues, saveQueue } from './queue';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

describe('queue transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('lists queues with serviceType pinned and an explicit default sort', async () => {
    await getQueues({ pageSize: 10, page: 0, textSearch: 'smoke' });
    expect(get).toHaveBeenCalledWith('/api/queues', {
      pageSize: 10,
      page: 0,
      textSearch: 'smoke',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      serviceType: 'TB_RULE_ENGINE',
    });

    // A caller-pinned sort wins over the default.
    await getQueues({
      pageSize: 10,
      page: 2,
      sortOrder: { property: 'name', direction: 'ASC' },
    });
    expect(get).toHaveBeenLastCalledWith('/api/queues', {
      pageSize: 10,
      page: 2,
      textSearch: undefined,
      sortProperty: 'name',
      sortOrder: 'ASC',
      serviceType: 'TB_RULE_ENGINE',
    });
  });

  it('reads a queue by id', async () => {
    await getQueueById('q-1');
    expect(get).toHaveBeenCalledWith('/api/queues/q-1');
  });

  it('saves with serviceType as a query param (never in the body)', async () => {
    const queue = {
      name: 'smoke14',
      topic: 'tb_rule_engine.smoke14',
      pollInterval: 25,
      partitions: 10,
      consumerPerPartition: false,
      packProcessingTimeout: 2000,
      submitStrategy: { type: 'BURST', batchSize: 1000 },
      processingStrategy: {
        type: 'RETRY_FAILED',
        retries: 3,
        failurePercentage: 0,
        pauseBetweenRetries: 3,
        maxPauseBetweenRetries: 3,
      },
    };
    await saveQueue(queue as never);
    expect(post).toHaveBeenCalledWith(
      '/api/queues',
      queue,
      { serviceType: 'TB_RULE_ENGINE' },
    );
  });

  it('deletes by id', async () => {
    await deleteQueue('q-1');
    expect(del).toHaveBeenCalledWith('/api/queues/q-1');
  });
});
