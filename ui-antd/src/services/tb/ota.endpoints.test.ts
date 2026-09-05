/**
 * TB-OTA-package transport endpoints. Paths pinned against
 * OtaPackageController (verified 2026-09-06): reads use the V2 Infos shape;
 * the multipart upload carries the file part + the required
 * checksumAlgorithm query; the two-step combo (saveOtaPackageWithFile)
 * posts the info, uploads, and DELETEs the shell as rollback when the
 * upload fails.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ChecksumAlgorithm,
  OtaPackageType,
  otaPackageHasUrl,
  type SaveOtaPackageInfoRequest,
} from '@/types/tb/ota';
import { EntityType } from '@/types/tb/entity';

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
  deleteOtaPackage,
  downloadOtaPackage,
  getOtaPackageInfo,
  getOtaPackages,
  saveOtaPackageInfo,
  saveOtaPackageWithFile,
  uploadOtaPackageFile,
} from './ota';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);
const request = vi.mocked(tbHttp.request);

const PAGE_LINK = {
  pageSize: 20,
  page: 0,
  textSearch: 'fw',
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

const INFO_REQUEST: SaveOtaPackageInfoRequest = {
  id: { entityType: EntityType.OTA_PACKAGE, id: 'ota-1' },
  createdTime: 1000,
  tenantId: { entityType: EntityType.TENANT, id: 't-1' },
  deviceProfileId: { entityType: EntityType.DEVICE_PROFILE, id: 'prof-1' },
  type: OtaPackageType.FIRMWARE,
  title: 'fw',
  version: '1.0',
  usesUrl: false,
};

describe('ota transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(undefined as never);
    request.mockResolvedValue({} as never);
  });

  it('lists packages over /api/otaPackages with the flattened page link', async () => {
    await getOtaPackages(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/otaPackages', {
      pageSize: 20,
      page: 0,
      textSearch: 'fw',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });
  });

  it('reads the info row over the V2 /info path', async () => {
    await getOtaPackageInfo('ota-1');
    expect(get).toHaveBeenCalledWith('/api/otaPackage/info/ota-1');
  });

  it('posts the info body verbatim (update must echo the frozen fields)', async () => {
    await saveOtaPackageInfo(INFO_REQUEST);
    expect(post).toHaveBeenCalledWith('/api/otaPackage', INFO_REQUEST);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('uploads the file as multipart with the checksumAlgorithm query param', async () => {
    const file = new File(['fw-bytes'], 'fw-1.0.bin', {
      type: 'application/octet-stream',
    });
    await uploadOtaPackageFile('ota-1', file, ChecksumAlgorithm.SHA256);
    expect(post).toHaveBeenCalledTimes(1);
    const [path, form, query] = post.mock.calls[0];
    expect(path).toBe('/api/otaPackage/ota-1');
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('file')).toBe(file);
    expect(query).toEqual({
      checksumAlgorithm: 'SHA256',
      checksum: undefined,
    });

    await uploadOtaPackageFile(
      'ota-1',
      file,
      ChecksumAlgorithm.SHA256,
      'abc123',
    );
    expect(post.mock.calls[1][2]).toEqual({
      checksumAlgorithm: 'SHA256',
      checksum: 'abc123',
    });
  });

  it('runs the two-step combo: info post (checksum stripped) then multipart, no rollback on success', async () => {
    const file = new File(['fw-bytes'], 'fw-1.0.bin');
    const savedInfo = {
      ...INFO_REQUEST,
      checksum: 'server-checksum',
    };
    post
      .mockResolvedValueOnce({ id: { entityType: 'OTA_PACKAGE', id: 'new-1' } } as never)
      .mockResolvedValueOnce(savedInfo as never);

    await expect(
      saveOtaPackageWithFile(
        INFO_REQUEST,
        file,
        ChecksumAlgorithm.MD5,
        'given',
      ),
    ).resolves.toBe(savedInfo);

    expect(post).toHaveBeenCalledTimes(2);
    // Step 1: JSON info shell — pre-set checksum stripped, everything else kept.
    const [infoPath, infoBody] = post.mock.calls[0];
    expect(infoPath).toBe('/api/otaPackage');
    expect(infoBody).not.toBeInstanceOf(FormData);
    expect(infoBody).toMatchObject({
      title: 'fw',
      version: '1.0',
      deviceProfileId: { entityType: 'DEVICE_PROFILE', id: 'prof-1' },
    });
    expect((infoBody as { checksum?: string }).checksum).toBeUndefined();
    // Step 2: multipart upload against the freshly minted id.
    const [uploadPath, uploadForm, uploadQuery] = post.mock.calls[1];
    expect(uploadPath).toBe('/api/otaPackage/new-1');
    expect(uploadForm).toBeInstanceOf(FormData);
    expect((uploadForm as FormData).get('file')).toBe(file);
    expect(uploadQuery).toEqual({ checksumAlgorithm: 'MD5', checksum: 'given' });
    // No rollback on success.
    expect(del).not.toHaveBeenCalled();
  });

  it('rolls the info shell back with DELETE and rethrows when the upload fails', async () => {
    const file = new File(['fw-bytes'], 'fw-1.0.bin');
    const failure = new Error('[500] upload failed');
    post
      .mockResolvedValueOnce({ id: { entityType: 'OTA_PACKAGE', id: 'new-1' } } as never)
      .mockRejectedValueOnce(failure);

    await expect(
      saveOtaPackageWithFile(INFO_REQUEST, file, ChecksumAlgorithm.SHA256),
    ).rejects.toBe(failure);

    expect(post).toHaveBeenCalledTimes(2);
    // The rollback DELETE lands after the failed upload call.
    expect(del).toHaveBeenCalledWith('/api/otaPackage/new-1');
    expect(del.mock.invocationCallOrder[0]).toBeGreaterThan(
      post.mock.invocationCallOrder[1],
    );
  });

  it('deletes by id and downloads over the blob response type', async () => {
    await deleteOtaPackage('ota-1');
    expect(del).toHaveBeenCalledWith('/api/otaPackage/ota-1');

    const blob = new Blob(['fw-bytes']);
    request.mockResolvedValue(blob as never);
    await expect(downloadOtaPackage('ota-1')).resolves.toBe(blob);
    expect(request).toHaveBeenCalledWith('/api/otaPackage/ota-1/download', {
      method: 'GET',
      responseType: 'blob',
    });
  });

  it('derives the URL-type probe from the url field', () => {
    expect(otaPackageHasUrl({ url: 'https://example.com/fw.bin' })).toBe(true);
    expect(otaPackageHasUrl({ url: undefined })).toBe(false);
    expect(otaPackageHasUrl({})).toBe(false);
  });
});
