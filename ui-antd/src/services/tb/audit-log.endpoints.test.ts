/**
 * Audit-log transport endpoint: entity-scoped path + pageLink params.
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

import { getAuditLogsByEntityId } from './audit-log';

const get = vi.mocked(tbHttp.get);

describe('audit-log transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
  });

  it('reads the entity-scoped audit page with explicit sort', async () => {
    await getAuditLogsByEntityId(
      { entityType: EntityType.DEVICE, id: 'd-1' },
      {
        pageSize: 10,
        page: 0,
        textSearch: 'provision',
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
    );
    expect(get).toHaveBeenCalledWith('/api/audit/logs/entity/DEVICE/d-1', {
      pageSize: 10,
      page: 0,
      textSearch: 'provision',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
  });
});
