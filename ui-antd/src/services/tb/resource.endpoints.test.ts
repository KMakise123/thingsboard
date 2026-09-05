/**
 * TB-resource transport endpoints. Paths pinned against the openapi
 * snapshot (verified 2026-09-05) + TbResourceController.java; batched
 * upload chunks at 100; the 400-with-references delete answer surfaces as
 * ResourceReferencedError.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResourceType, ResourceSubType } from '@/types/tb/resource';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  RESOURCE_UPLOAD_BATCH_SIZE,
  ResourceReferencedError,
  deleteResource,
  downloadResource,
  getResourceById,
  getResourceInfo,
  getResourceInfoById,
  getResources,
  getTenantResources,
  jsModuleFileName,
  jsModuleUploadRequest,
  referencesFromBody,
  saveResource,
  updateResourceData,
  updateResourceInfo,
  uploadResource,
  uploadResources,
} from './resource';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const put = vi.mocked(tbHttp.put);
const del = vi.mocked(tbHttp.delete);
const request = vi.mocked(tbHttp.request);

const PAGE_LINK = {
  pageSize: 20,
  page: 0,
  textSearch: 'mod',
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

describe('resource transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    put.mockResolvedValue({} as never);
    del.mockResolvedValue({ success: true } as never);
    request.mockResolvedValue({} as never);
  });

  it('lists resources with the type/subType filters on /api/resource', async () => {
    await getResources(PAGE_LINK, {
      resourceType: ResourceType.JS_MODULE,
      resourceSubType: ResourceSubType.MODULE,
    });
    expect(get).toHaveBeenCalledWith('/api/resource', {
      pageSize: 20,
      page: 0,
      textSearch: 'mod',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      resourceType: 'JS_MODULE',
      resourceSubType: 'MODULE',
    });
  });

  it('omits filter params when unset and pins the tenant-only path', async () => {
    await getResources({ ...PAGE_LINK, textSearch: undefined });
    expect(get).toHaveBeenCalledWith('/api/resource', {
      pageSize: 20,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      resourceType: undefined,
      resourceSubType: undefined,
    });

    await getTenantResources(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/resource/tenant', {
      pageSize: 20,
      page: 0,
      textSearch: 'mod',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
  });

  it('reads infos over the V2 path and the full entity over the base path', async () => {
    await getResourceInfoById('res-1');
    expect(get).toHaveBeenCalledWith('/api/resource/info/res-1');

    await getResourceById('res-1');
    expect(get).toHaveBeenCalledWith('/api/resource/res-1');

    await getResourceInfo('JS_MODULE', 'system', 'my_lib');
    expect(get).toHaveBeenCalledWith(
      '/api/resource/JS_MODULE/system/my_lib/info',
    );
  });

  it('downloads over the blob response type', async () => {
    const blob = new Blob(['x']);
    request.mockResolvedValue(blob as never);
    await expect(downloadResource('res-1')).resolves.toBe(blob);
    expect(request).toHaveBeenCalledWith('/api/resource/res-1/download', {
      method: 'GET',
      responseType: 'blob',
    });
  });

  it('saves JSON on POST /api/resource', async () => {
    const entity = {
      title: 'model',
      resourceType: ResourceType.LWM2M_MODEL,
      data: 'PD94bWw+',
    };
    await saveResource(entity);
    expect(post).toHaveBeenCalledWith('/api/resource', entity);
  });

  it('uploads multipart with file/title/type/subType parts', async () => {
    const file = new File(['export {};'], 'lib.js', {
      type: 'text/javascript',
    });
    await uploadResource({
      file,
      title: 'lib',
      resourceType: ResourceType.JS_MODULE,
      resourceSubType: ResourceSubType.EXTENSION,
    });
    expect(post).toHaveBeenCalledTimes(1);
    const [path, form] = post.mock.calls[0];
    expect(path).toBe('/api/resource/upload');
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('file')).toBe(file);
    expect((form as FormData).get('title')).toBe('lib');
    expect((form as FormData).get('resourceType')).toBe('JS_MODULE');
    expect((form as FormData).get('resourceSubType')).toBe('EXTENSION');
  });

  it('updates info as JSON and data as a multipart file', async () => {
    await updateResourceInfo('res-1', { title: 'renamed' });
    expect(put).toHaveBeenCalledWith('/api/resource/res-1/info', {
      title: 'renamed',
    });

    const file = new File(['abc'], 'replacement.bin');
    await updateResourceData('res-1', file);
    const [path, form] = put.mock.calls[1];
    expect(path).toBe('/api/resource/res-1/data');
    expect((form as FormData).get('file')).toBe(file);
  });

  it('deletes with the force flag as a query param', async () => {
    await deleteResource('res-1');
    expect(del).toHaveBeenCalledWith('/api/resource/res-1', { force: false });

    await deleteResource('res-1', true);
    expect(del).toHaveBeenCalledWith('/api/resource/res-1', { force: true });
  });

  it('turns the 400 references answer into a structured error', async () => {
    const references = {
      WIDGET_TYPE: [
        {
          id: { entityType: 'WIDGET_TYPE', id: 'wt-1' },
          name: 'Thermometer',
        },
      ],
    };
    del.mockRejectedValue(
      Object.assign(new Error('[400] badRequest: referenced'), {
        name: 'ServerErrorError',
        status: 400,
        rawBody: JSON.stringify({ success: false, references }),
      }),
    );

    await expect(deleteResource('res-1')).rejects.toBeInstanceOf(
      ResourceReferencedError,
    );
    // force=true never maps the 400 into the referenced error.
    del.mockRejectedValue(
      Object.assign(new Error('[400] badRequest: referenced'), {
        name: 'ServerErrorError',
        status: 400,
        rawBody: JSON.stringify({ success: false, references }),
      }),
    );
    await expect(deleteResource('res-1', true)).rejects.not.toBeInstanceOf(
      ResourceReferencedError,
    );
  });

  it('rethrows non-referenced 400s and honors a force=false no-body success', async () => {
    del.mockResolvedValue(undefined as never);
    await expect(deleteResource('res-1')).resolves.toEqual({ success: true });

    del.mockRejectedValue(
      Object.assign(new Error('[400] badRequest: nope'), {
        name: 'ServerErrorError',
        status: 400,
        rawBody: JSON.stringify({ success: false, message: 'nope' }),
      }),
    );
    await expect(deleteResource('res-1')).rejects.not.toBeInstanceOf(
      ResourceReferencedError,
    );
  });

  it('parses the references body from raw text or object form', () => {
    const references = { DEVICE: [{ id: { entityType: 'DEVICE', id: 'd' } }] };
    expect(
      referencesFromBody(JSON.stringify({ success: false, references })),
    ).toEqual(references);
    expect(referencesFromBody({ success: false, references })).toEqual(
      references,
    );
    expect(
      referencesFromBody(JSON.stringify({ success: true })),
    ).toBeUndefined();
    expect(referencesFromBody('not-json')).toBeUndefined();
    expect(referencesFromBody(undefined)).toBeUndefined();
  });

  it('fans multi-file uploads out in 100-item chunks', async () => {
    expect(RESOURCE_UPLOAD_BATCH_SIZE).toBe(100);
    const requests = Array.from({ length: 250 }, (_, index) => ({
      file: new Blob([String(index)]),
      title: `r${index}`,
      resourceType: ResourceType.GENERAL,
    }));
    post.mockImplementation((path) =>
      Promise.resolve({ title: path } as never),
    );
    const results = await uploadResources(requests);
    expect(post).toHaveBeenCalledTimes(250);
    expect(results).toHaveLength(250);
    expect(results.every((entry) => entry.status === 'fulfilled')).toBe(true);
  });

  it('settles failed chunk items without aborting the rest', async () => {
    const requests = [
      { file: new Blob(['1']), title: 'a', resourceType: ResourceType.GENERAL },
      { file: new Blob(['2']), title: 'b', resourceType: ResourceType.GENERAL },
    ];
    post
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error('disk full'));
    const results = await uploadResources(requests);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
  });

  it('derives the MODULE .js file name from the title', () => {
    expect(jsModuleFileName('my lib')).toBe('my lib.js');
    const request2 = jsModuleUploadRequest('my lib', 'export const x = 1;');
    expect(request2.title).toBe('my lib');
    expect(request2.resourceType).toBe(ResourceType.JS_MODULE);
    expect(request2.resourceSubType).toBe(ResourceSubType.MODULE);
    const file = request2.file as File;
    expect(file.name).toBe('my lib.js');
    expect(file.type).toBe('text/javascript');
    expect(post).not.toHaveBeenCalled();
  });
});
