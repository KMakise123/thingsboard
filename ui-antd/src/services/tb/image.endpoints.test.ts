/**
 * TB-image transport endpoints. Paths pinned against ImageController.java
 * (this fork) + the openapi snapshot (verified 2026-09-05); the 400-with-
 * references delete answer surfaces as ImageReferencedError; blob flights
 * dedupe concurrent loads of the same link.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResourceSubType } from '@/types/tb/resource';
import type { ImageResourceInfo } from '@/types/tb/image';

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
  ImageReferencedError,
  deleteImage,
  downloadImage,
  exportImage,
  getImageInfo,
  getImages,
  imageResourceType,
  importImage,
  loadImageBlob,
  updateImage,
  updateImageInfo,
  updateImagePublicStatus,
  uploadImage,
} from './image';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const put = vi.mocked(tbHttp.put);
const del = vi.mocked(tbHttp.delete);
const request = vi.mocked(tbHttp.request);

const PAGE_LINK = {
  pageSize: 24,
  page: 2,
  textSearch: 'pump',
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

const TENANT_ID = { entityType: 'TENANT', id: 'tenant-1' };
const NULL_TENANT_ID = {
  entityType: 'TENANT',
  id: '13814000-1dd2-11b2-8080-808080808080',
};

function image(
  resourceKey: string,
  tenantId: { entityType: string; id: string } = TENANT_ID,
): ImageResourceInfo {
  return {
    id: { entityType: 'TB_RESOURCE', id: `img-${resourceKey}` },
    tenantId,
    title: resourceKey,
    resourceType: 'IMAGE',
    resourceSubType: ResourceSubType.IMAGE,
    resourceKey,
    link: `/api/images/${tenantId.id === NULL_TENANT_ID.id ? 'system' : 'tenant'}/${resourceKey}`,
  };
}

describe('image transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    put.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
    request.mockResolvedValue({} as never);
  });

  afterEach(() => {
    // The flight map is module state — drain it between tests.
    vi.restoreAllMocks();
  });

  it('lists images with subType + includeSystemImages on /api/images', async () => {
    await getImages(PAGE_LINK, true, ResourceSubType.SCADA_SYMBOL);
    expect(get).toHaveBeenCalledWith('/api/images', {
      pageSize: 24,
      page: 2,
      textSearch: 'pump',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      imageSubType: 'SCADA_SYMBOL',
      includeSystemImages: true,
    });
  });

  it('defaults the list to IMAGE + no system images and drops empty search', async () => {
    await getImages({ ...PAGE_LINK, page: 0, textSearch: undefined });
    expect(get).toHaveBeenCalledWith('/api/images', {
      pageSize: 24,
      page: 0,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      imageSubType: 'IMAGE',
      includeSystemImages: false,
    });
  });

  it('reads one image over the info endpoint with the scope in the path', async () => {
    await getImageInfo('system', 'my symbol/key');
    expect(get).toHaveBeenCalledWith(
      '/api/images/system/my%20symbol%2Fkey/info',
    );
  });

  it('uploads multipart with file/title/imageSubType parts', async () => {
    const file = new File(['<svg/>'], 'pump.svg', { type: 'image/svg+xml' });
    await uploadImage(file, 'Pump', ResourceSubType.SCADA_SYMBOL);
    expect(post).toHaveBeenCalledTimes(1);
    const [path, form] = post.mock.calls[0];
    expect(path).toBe('/api/image');
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('file')).toBe(file);
    expect((form as FormData).get('title')).toBe('Pump');
    expect((form as FormData).get('imageSubType')).toBe('SCADA_SYMBOL');
  });

  it('updates the binary over multipart and the info over JSON', async () => {
    const file = new File(['abc'], 'replacement.png');
    await updateImage('tenant', 'pump', file);
    const [binaryPath, binaryForm] = put.mock.calls[0];
    expect(binaryPath).toBe('/api/images/tenant/pump');
    expect((binaryForm as FormData).get('file')).toBe(file);

    const info = image('pump');
    await updateImageInfo(info);
    const [infoPath, infoBody] = put.mock.calls[1];
    expect(infoPath).toBe('/api/images/tenant/pump/info');
    expect(infoBody).toBe(info);
  });

  it('flips the public flag over the public/{isPublic} endpoint', async () => {
    const info = image('pump');
    await updateImagePublicStatus(info, true);
    expect(put).toHaveBeenCalledWith('/api/images/tenant/pump/public/true', info);
    await updateImagePublicStatus(info, false);
    expect(put).toHaveBeenCalledWith(
      '/api/images/tenant/pump/public/false',
      info,
    );
  });

  it('derives the scope from the NULL-tenant marker', () => {
    expect(imageResourceType(image('a'))).toBe('tenant');
    expect(imageResourceType(image('b', NULL_TENANT_ID))).toBe('system');
  });

  it('downloads and exports over the type/key paths', async () => {
    const blob = new Blob(['x']);
    request.mockResolvedValue(blob as never);
    await expect(downloadImage('system', 'pump')).resolves.toBe(blob);
    expect(request).toHaveBeenCalledWith('/api/images/system/pump', {
      method: 'GET',
      responseType: 'blob',
    });

    await exportImage('tenant', 'pump');
    expect(get).toHaveBeenCalledWith('/api/images/tenant/pump/export');
  });

  it('imports through PUT /api/image/import', async () => {
    const exportData = {
      mediaType: 'image/svg+xml',
      fileName: 'pump.svg',
      title: 'Pump',
      subType: 'IMAGE',
      resourceKey: 'pump',
      public: false,
      publicResourceKey: '',
      data: 'PHN2Zy8+',
    };
    await importImage(exportData);
    expect(put).toHaveBeenCalledWith('/api/image/import', exportData);
  });

  it('deletes with the force flag as a query param', async () => {
    await deleteImage('tenant', 'pump');
    expect(del).toHaveBeenCalledWith('/api/images/tenant/pump', { force: false });

    await deleteImage('system', 'pump', true);
    expect(del).toHaveBeenCalledWith('/api/images/system/pump', { force: true });
  });

  it('turns the 400 references answer into a structured error', async () => {
    const references = {
      WIDGET_TYPE: [
        { id: { entityType: 'WIDGET_TYPE', id: 'wt-1' }, name: 'Thermometer' },
      ],
    };
    const referencedError = () =>
      Object.assign(new Error('[400] badRequest: referenced'), {
        name: 'ServerErrorError',
        status: 400,
        rawBody: JSON.stringify({ success: false, references }),
      });

    del.mockRejectedValue(referencedError());
    await expect(deleteImage('tenant', 'pump')).rejects.toBeInstanceOf(
      ImageReferencedError,
    );
    // force=true never maps the 400 into the referenced error.
    del.mockRejectedValue(referencedError());
    await expect(deleteImage('tenant', 'pump', true)).rejects.not.toBeInstanceOf(
      ImageReferencedError,
    );
  });

  it('rethrows non-referenced 400s untouched', async () => {
    del.mockRejectedValue(
      Object.assign(new Error('[400] badRequest: nope'), {
        name: 'ServerErrorError',
        status: 400,
        rawBody: JSON.stringify({ success: false, message: 'nope' }),
      }),
    );
    await expect(deleteImage('tenant', 'pump')).rejects.not.toBeInstanceOf(
      ImageReferencedError,
    );
  });

  it('dedupes concurrent blob loads of the same link into one flight', async () => {
    // Per-call resolvers, settled in call order.
    const resolvers: Array<(blob: Blob) => void> = [];
    request.mockImplementation(
      () =>
        new Promise<Blob>((resolve) => {
          resolvers.push(resolve);
        }) as never,
    );

    const first = loadImageBlob('/api/images/tenant/pump');
    const second = loadImageBlob('/api/images/tenant/pump');
    expect(request).toHaveBeenCalledTimes(1);
    expect(resolvers).toHaveLength(1);

    // A different link (preview twin) flies on its own.
    void loadImageBlob('/api/images/tenant/pump', true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(resolvers).toHaveLength(2);

    resolvers[0](new Blob(['bytes']));
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);

    // Settled flights are dropped: the next call re-fetches.
    request.mockResolvedValue(new Blob(['fresh']) as never);
    const third = await loadImageBlob('/api/images/tenant/pump');
    expect(request).toHaveBeenCalledTimes(3);
    expect(third).not.toBe(a);
  });
});
