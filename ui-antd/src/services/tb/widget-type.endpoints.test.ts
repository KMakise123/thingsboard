/**
 * Widget-type transport endpoints (M9 wave-1 F). Pins every REST path the
 * widget editor / registry resolver chain uses: by-FQN read, by-id details
 * read, upsert save, delete and the paged list. Endpoint shapes verified
 * against backend WidgetTypeController.java and the openapi snapshot.
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

import {
  deleteWidgetType,
  getWidgetTypeInfoById,
  getWidgetTypeById,
  getWidgetTypeByFullFqn,
  getWidgetTypes,
  saveWidgetType,
} from './widget-type';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

describe('widget type transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('pins the by-FQN read to GET /api/widgetType with the scope-qualified fqn', async () => {
    await getWidgetTypeByFullFqn('tenant.my_widget');
    expect(get).toHaveBeenCalledWith('/api/widgetType', {
      fqn: 'tenant.my_widget',
    });
  });

  it('pins the details read to GET /api/widgetType/{id} (includeResources optional)', async () => {
    await getWidgetTypeById('wt1');
    expect(get).toHaveBeenCalledWith('/api/widgetType/wt1');

    await getWidgetTypeById('wt1', { includeResources: true });
    expect(get).toHaveBeenLastCalledWith('/api/widgetType/wt1', {
      includeResources: true,
    });
  });

  it('pins the upsert to POST /api/widgetType (updateExistingByFqn optional)', async () => {
    const details = {
      name: 'My widget',
      descriptor: { type: 'latest' },
      version: 3,
    } as never;
    await saveWidgetType(details);
    expect(post).toHaveBeenCalledWith('/api/widgetType', details);

    await saveWidgetType(details, true);
    expect(post).toHaveBeenLastCalledWith('/api/widgetType', details, {
      updateExistingByFqn: true,
    });
  });

  it('pins delete to DELETE /api/widgetType/{id}', async () => {
    await deleteWidgetType('wt1');
    expect(del).toHaveBeenCalledWith('/api/widgetType/wt1');
  });

  it('pins the paged list to GET /api/widgetTypes with PageLink + filters', async () => {
    await getWidgetTypes({
      pageSize: 20,
      page: 0,
      textSearch: 'card',
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(get).toHaveBeenCalledWith('/api/widgetTypes', {
      pageSize: 20,
      page: 0,
      textSearch: 'card',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });

    await getWidgetTypes(
      { pageSize: 10, page: 2 },
      {
        tenantOnly: true,
        fullSearch: true,
        deprecatedFilter: 'ACTUAL',
        widgetTypeList: ['latest', 'timeseries'],
        scadaFirst: false,
      },
    );
    expect(get).toHaveBeenLastCalledWith('/api/widgetTypes', {
      pageSize: 10,
      page: 2,
      tenantOnly: true,
      fullSearch: true,
      deprecatedFilter: 'ACTUAL',
      widgetTypeList: 'latest,timeseries',
      scadaFirst: false,
    });
  });

  it('pins the info read to GET /api/widgetTypeInfo/{id} (M11 library detail face)', async () => {
    await getWidgetTypeInfoById('wt1');
    expect(get).toHaveBeenCalledWith('/api/widgetTypeInfo/wt1');
  });
});
