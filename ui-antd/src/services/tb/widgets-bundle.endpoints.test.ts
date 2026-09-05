/**
 * Widgets-bundle transport endpoints (M11 wave 1B). Pins every REST path
 * the resources-library bundle faces use: paged + full + by-ids reads,
 * single CRUD, the inlineImages export read, the two membership
 * set-replacement posts and the fqn/details info reads. Endpoint shapes
 * verified against backend WidgetsBundleController.java (+ the shared
 * reads in WidgetTypeController.java) and the openapi snapshot.
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
  addWidgetFqnToWidgetsBundle,
  deleteWidgetsBundle,
  exportWidgetsBundle,
  getAllWidgetsBundles,
  getBundleWidgetTypeFqns,
  getBundleWidgetTypeInfoList,
  getBundleWidgetTypeInfos,
  getBundleWidgetTypes,
  getBundleWidgetTypesDetails,
  getWidgetsBundles,
  getWidgetsBundlesByIds,
  getWidgetsBundleById,
  saveWidgetsBundle,
  updateWidgetsBundleWidgetFqns,
  updateWidgetsBundleWidgetTypes,
} from './widgets-bundle';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);

const PAGE_LINK = {
  pageSize: 20,
  page: 1,
  textSearch: 'cards',
  sortOrder: { property: 'title', direction: 'ASC' as const },
};

describe('widgets bundle transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
  });

  it('pins the paged list to GET /api/widgetsBundles with PageLink + filters', async () => {
    await getWidgetsBundles(PAGE_LINK, {
      tenantOnly: true,
      fullSearch: true,
      scadaFirst: false,
    });
    expect(get).toHaveBeenCalledWith('/api/widgetsBundles', {
      pageSize: 20,
      page: 1,
      textSearch: 'cards',
      sortProperty: 'title',
      sortOrder: 'ASC',
      tenantOnly: true,
      fullSearch: true,
      scadaFirst: false,
    });

    await getWidgetsBundles({ pageSize: 10, page: 0 });
    expect(get).toHaveBeenLastCalledWith('/api/widgetsBundles', {
      pageSize: 10,
      page: 0,
    });
  });

  it('pins the full list to the documented /all path', async () => {
    await getAllWidgetsBundles();
    expect(get).toHaveBeenCalledWith('/api/widgetsBundles/all');
  });

  it('pins the by-ids read to the documented /list twin path', async () => {
    await getWidgetsBundlesByIds(['b-1', 'b-2']);
    expect(get).toHaveBeenCalledWith('/api/widgetsBundles/list', {
      widgetsBundleIds: 'b-1,b-2',
    });
  });

  it('pins single-entity CRUD and the inlineImages export read', async () => {
    await getWidgetsBundleById('b-1');
    expect(get).toHaveBeenCalledWith('/api/widgetsBundle/b-1');

    await exportWidgetsBundle('b-1');
    expect(get).toHaveBeenLastCalledWith('/api/widgetsBundle/b-1', {
      inlineImages: true,
    });

    const bundle = { title: 'Cards', version: 2 } as never;
    await saveWidgetsBundle(bundle);
    expect(post).toHaveBeenCalledWith('/api/widgetsBundle', bundle);

    await deleteWidgetsBundle('b-1');
    expect(del).toHaveBeenCalledWith('/api/widgetsBundle/b-1');
  });

  it('pins the membership set-replacement posts', async () => {
    await updateWidgetsBundleWidgetTypes('b-1', ['wt-2', 'wt-1']);
    expect(post).toHaveBeenCalledWith('/api/widgetsBundle/b-1/widgetTypes', [
      'wt-2',
      'wt-1',
    ]);

    await updateWidgetsBundleWidgetFqns('b-1', ['system.x', 'tenant.y']);
    expect(post).toHaveBeenCalledWith(
      '/api/widgetsBundle/b-1/widgetTypeFqns',
      ['system.x', 'tenant.y'],
    );
  });

  it('pins the membership info reads', async () => {
    await getBundleWidgetTypes('b-1');
    expect(get).toHaveBeenCalledWith('/api/widgetsBundle/b-1/widgetTypes');

    await getBundleWidgetTypeFqns('b-1');
    expect(get).toHaveBeenCalledWith('/api/widgetTypeFqns', {
      widgetsBundleId: 'b-1',
    });

    await getBundleWidgetTypesDetails('b-1', true);
    expect(get).toHaveBeenCalledWith('/api/widgetTypesDetails', {
      widgetsBundleId: 'b-1',
      includeResources: true,
    });
    await getBundleWidgetTypesDetails('b-1');
    expect(get).toHaveBeenLastCalledWith('/api/widgetTypesDetails', {
      widgetsBundleId: 'b-1',
    });

    await getBundleWidgetTypeInfos(
      { pageSize: 50, page: 0, textSearch: 'temp' },
      'b-1',
      { deprecatedFilter: 'ACTUAL', widgetTypeList: ['latest'] },
    );
    expect(get).toHaveBeenCalledWith('/api/widgetTypesInfos', {
      pageSize: 50,
      page: 0,
      textSearch: 'temp',
      widgetsBundleId: 'b-1',
      deprecatedFilter: 'ACTUAL',
      widgetTypeList: 'latest',
    });
  });

  it('unwinds the full membership list from the paged infos read', async () => {
    get.mockResolvedValueOnce({
      data: [{ name: 'a' }, { name: 'b' }],
    } as never);
    const rows = await getBundleWidgetTypeInfoList('b-1');
    expect(get).toHaveBeenCalledWith('/api/widgetTypesInfos', {
      pageSize: 1024,
      page: 0,
      sortOrder: 'DESC',
      sortProperty: 'createdTime',
      widgetsBundleId: 'b-1',
    });
    expect(rows).toHaveLength(2);
  });

  it('adds one fqn via the read-modify-write round trip and skips duplicates', async () => {
    get.mockResolvedValueOnce(['system.a', 'tenant.b'] as never);
    await addWidgetFqnToWidgetsBundle('b-1', 'tenant.c');
    expect(post).toHaveBeenCalledWith('/api/widgetsBundle/b-1/widgetTypeFqns', [
      'system.a',
      'tenant.b',
      'tenant.c',
    ]);

    get.mockResolvedValueOnce(['system.a'] as never);
    await addWidgetFqnToWidgetsBundle('b-1', 'system.a');
    expect(post).toHaveBeenCalledTimes(1);
  });
});
