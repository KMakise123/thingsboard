/**
 * Relation-domain transport endpoints: info reads by direction, v2 save /
 * delete with the full edge identity, and the generic entity picker query.
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
  deleteEntityRelations,
  deleteRelation,
  findEntitiesByNameFilter,
  findRelationInfosByFrom,
  findRelationInfosByTo,
  saveRelation,
} from './relations';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const deviceId = { entityType: EntityType.DEVICE, id: 'd-1' };
const assetId = { entityType: EntityType.ASSET, id: 'a-1' };

describe('relation transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue([] as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue({} as never);
  });

  it('reads relation infos by direction with names', async () => {
    await findRelationInfosByFrom(deviceId);
    expect(get).toHaveBeenCalledWith('/api/relations/info/from/DEVICE/d-1', {
      relationTypeGroup: undefined,
    });
    await findRelationInfosByTo(deviceId, 'COMMON');
    expect(get).toHaveBeenCalledWith('/api/relations/info/to/DEVICE/d-1', {
      relationTypeGroup: 'COMMON',
    });
  });

  it('saves through the v2 relation endpoint', async () => {
    await saveRelation({
      from: deviceId,
      to: assetId,
      type: 'Contains',
      typeGroup: 'COMMON',
    });
    expect(post).toHaveBeenCalledWith('/api/v2/relation', {
      from: deviceId,
      to: assetId,
      type: 'Contains',
      typeGroup: 'COMMON',
    });
  });

  it('deletes one edge by its full identity', async () => {
    await deleteRelation({ from: deviceId, to: assetId, type: 'Contains' });
    expect(del).toHaveBeenCalledWith('/api/v2/relation', {
      fromId: 'd-1',
      fromType: 'DEVICE',
      toId: 'a-1',
      toType: 'ASSET',
      relationType: 'Contains',
      relationTypeGroup: undefined,
    });
  });

  it('drops every relation of an entity via /api/relations', async () => {
    await deleteEntityRelations(deviceId);
    expect(del).toHaveBeenCalledWith('/api/relations', {
      entityId: 'd-1',
      entityType: 'DEVICE',
    });
  });

  it('entity picker posts the entityName filter query', async () => {
    post.mockResolvedValue({
      data: [
        {
          entityId: assetId,
          latest: {
            ENTITY_FIELD: { name: { value: 'Boiler' } },
          },
        },
      ],
    } as never);
    const rows = await findEntitiesByNameFilter(EntityType.ASSET, 'Boi');
    expect(post).toHaveBeenCalledWith('/api/entitiesQuery/find', {
      entityFilter: {
        type: 'entityName',
        entityType: 'ASSET',
        entityNameFilter: 'Boi',
      },
      pageLink: {
        pageSize: 50,
        page: 0,
        sortOrder: {
          key: { type: 'ENTITY_FIELD', key: 'name' },
          direction: 'ASC',
        },
      },
      entityFields: [{ type: 'ENTITY_FIELD', key: 'name' }],
    });
    expect(rows[0]?.latest?.ENTITY_FIELD?.name?.value).toBe('Boiler');
  });
});
