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
  getCalculatedFieldById,
  getCalculatedFieldNames,
  getCalculatedFields,
  getCalculatedFieldsByEntityId,
  getLatestCalculatedFieldDebugEvent,
  saveCalculatedField,
  testCalculatedFieldScript,
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

  it('queries the tenant-wide page with flattened filters (M14 wave-1)', async () => {
    await getCalculatedFields(
      {
        pageSize: 10,
        page: 0,
        textSearch: 'temp',
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
      {
        types: ['SIMPLE', 'SCRIPT'],
        entityType: 'DEVICE',
        entities: ['d-1', 'd-2'],
        names: ['a', 'b'],
      },
    );
    expect(get).toHaveBeenCalledWith('/api/calculatedFields', {
      pageSize: 10,
      page: 0,
      textSearch: 'temp',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      // Repeatable wire params (`types`, `entities`, `name`) are joined —
      // Spring binds the comma form to the array params.
      types: 'SIMPLE,SCRIPT',
      entityType: 'DEVICE',
      entities: 'd-1,d-2',
      name: 'a,b',
    });

    // No filters → the filter params disappear entirely.
    await getCalculatedFields({
      pageSize: 10,
      page: 0,
      sortOrder: { property: 'name', direction: 'ASC' },
    });
    expect(get).toHaveBeenLastCalledWith('/api/calculatedFields', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'name',
      sortOrder: 'ASC',
      types: undefined,
      entityType: undefined,
      entities: undefined,
      name: undefined,
    });
  });

  it('reads names with the type param and no sortProperty (backend pins name)', async () => {
    await getCalculatedFieldNames('SIMPLE', {
      pageSize: 50,
      page: 0,
      textSearch: 'dou',
      sortOrder: { property: 'name', direction: 'ASC' },
    });
    expect(get).toHaveBeenCalledWith('/api/calculatedFields/names', {
      type: 'SIMPLE',
      pageSize: 50,
      page: 0,
      textSearch: 'dou',
      sortOrder: 'ASC',
    });
  });

  it('reads a single calculated field by id', async () => {
    await getCalculatedFieldById('cf-9');
    expect(get).toHaveBeenCalledWith('/api/calculatedField/cf-9');
  });

  it('posts the testScript probe (errors live in the 200 envelope)', async () => {
    post.mockResolvedValue({ error: 'boom' } as never);
    const payload = { expression: 'return 1;', arguments: {} };
    const result = await testCalculatedFieldScript(payload);
    expect(post).toHaveBeenCalledWith('/api/calculatedField/testScript', payload);
    expect(result).toEqual({ error: 'boom' });
  });

  it('reads the latest debug event', async () => {
    get.mockResolvedValue({ arguments: {} } as never);
    await getLatestCalculatedFieldDebugEvent('cf-9');
    expect(get).toHaveBeenCalledWith('/api/calculatedField/cf-9/debug');
  });
});
