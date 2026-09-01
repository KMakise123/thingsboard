/**
 * Calculated-field transport endpoints (exists on this backend's openapi
 * snapshot — verified before building the tab). The alarm-rule family lives
 * in alarm-rules.endpoints.test.ts.
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
  deleteCalculatedField,
  getCalculatedFieldsByEntityId,
  saveCalculatedField,
} from './calculated-fields';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const entityId = { entityType: EntityType.DEVICE, id: 'd-1' };

describe('calculated-field transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(true as never);
  });

  it('reads the entity-scoped page with optional type filter', async () => {
    await getCalculatedFieldsByEntityId(entityId, {
      pageSize: 100,
      page: 0,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/api/calculatedField/DEVICE/d-1', {
      pageSize: 100,
      page: 0,
      type: undefined,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
  });

  it('saves and deletes through the calculatedField endpoints', async () => {
    await saveCalculatedField({
      entityId,
      type: 'SIMPLE',
      name: 'double',
      configuration: { type: 'SIMPLE' },
    } as never);
    expect(post).toHaveBeenCalledWith('/api/calculatedField', {
      entityId,
      type: 'SIMPLE',
      name: 'double',
      configuration: { type: 'SIMPLE' },
    });
    await deleteCalculatedField('cf-1');
    expect(del).toHaveBeenCalledWith('/api/calculatedField/cf-1');
  });
});
