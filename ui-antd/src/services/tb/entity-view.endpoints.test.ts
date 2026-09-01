/**
 * Entity-view transport endpoints. Paths exist on this backend's openapi
 * snapshot (RECON §3, verified 2026-09-01); double-path reads go V2 Infos.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EntityView } from '@/types/tb';
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
  assignEntityViewToCustomer,
  deleteEntityView,
  getCustomerEntityViews,
  getEntityViewInfoById,
  getEntityViewTypes,
  getTenantEntityViews,
  saveEntityView,
  unassignEntityViewFromCustomer,
} from './entity-view';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const PAGE_LINK = {
  pageSize: 10,
  page: 0,
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

describe('entity-view transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('reads the tenant page from the V2 entityViewInfos path', async () => {
    await getTenantEntityViews(PAGE_LINK, { type: 'Thermometer' });
    expect(get).toHaveBeenCalledWith('/api/tenant/entityViewInfos', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      type: 'Thermometer',
    });
  });

  it('reads the customer scope from the V2 path', async () => {
    await getCustomerEntityViews('cust-1', PAGE_LINK);
    expect(get).toHaveBeenCalledWith(
      '/api/customer/cust-1/entityViewInfos',
      expect.objectContaining({ pageSize: 10 }),
    );
  });

  it('pins the single-entity CRUD endpoints', async () => {
    await getEntityViewInfoById('ev-1');
    expect(get).toHaveBeenCalledWith('/api/entityView/info/ev-1');

    const entityView = {
      id: { entityType: EntityType.ENTITY_VIEW, id: 'ev-1' },
      createdTime: 0,
      entityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
      name: 'Room view',
      keys: { timeseries: ['temperature'] },
    } satisfies EntityView;
    await saveEntityView(entityView);
    expect(post).toHaveBeenCalledWith('/api/entityView', entityView);

    await deleteEntityView('ev-1');
    expect(del).toHaveBeenCalledWith('/api/entityView/ev-1');
  });

  it('pins assign/unassign on the customer endpoints', async () => {
    await assignEntityViewToCustomer('cust-1', 'ev-1');
    expect(post).toHaveBeenCalledWith(
      '/api/customer/cust-1/entityView/ev-1',
    );

    await unassignEntityViewFromCustomer('ev-1');
    expect(del).toHaveBeenCalledWith('/api/customer/entityView/ev-1');
  });

  it('reads the type filter source', async () => {
    await getEntityViewTypes();
    expect(get).toHaveBeenCalledWith('/api/entityView/types');
  });
});
