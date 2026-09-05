/**
 * TB-OTA-package transport (M13 wave-1).
 *
 * Endpoints pinned against OtaPackageController (verified 2026-09-06); full
 * table in docs/agents/m13-backend-contract.md. Reads use the V2 Infos
 * shape (`/otaPackage/info/{id}`) — the bare `/{id}` path echoes the full
 * entity including base64 `data`.
 *
 * Wire gotchas pinned here:
 *   - `deviceProfileId` must be the object form `{entityType, id}` — the
 *     bare-string form fails server-side.
 *   - Creation is create-and-freeze: type/title/version/tag/deviceProfileId
 *     (plus the upload-computed file fields) are compared on update and must
 *     be echoed back verbatim; only additionalInfo.description may change.
 *   - The multipart upload REQUIRES `checksumAlgorithm` (query param) — send
 *     it even when letting the server compute the checksum; `checksum` is
 *     optional and skipped server-side when empty.
 *   - URL packages (non-empty `url`) get a 400 from the download endpoint —
 *     branch on `url` in the caller, never call download for them.
 *   - The profile-scoped picker (GET /api/otaPackages/{deviceProfileId}/
 *     {type}) lives in device-profile.ts as getOtaPackagesByDeviceProfile —
 *     consumer-side function, intentionally not duplicated here.
 */

import {
  type ChecksumAlgorithm,
  type OtaPackageInfo,
  type SaveOtaPackageInfoRequest,
} from '@/types/tb/ota';
import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';

import { tbHttp } from './http';

/**
 * GET /api/otaPackages — paged tenant list (OtaPackageInfo rows; textSearch
 * matches title). For the device-profile-scoped picker see
 * getOtaPackagesByDeviceProfile in ./device-profile.
 */
export async function getOtaPackages(
  pageLink: PageLink,
): Promise<PageData<OtaPackageInfo>> {
  return tbHttp.get<PageData<OtaPackageInfo>>(
    '/api/otaPackages',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/otaPackage/info/{otaPackageId} — V2 Infos shape (no binary data). */
export async function getOtaPackageInfo(
  otaPackageId: string,
): Promise<OtaPackageInfo> {
  return tbHttp.get<OtaPackageInfo>(`/api/otaPackage/info/${otaPackageId}`);
}

/**
 * POST /api/otaPackage — create/update the info shell. The body is sent
 * verbatim: on update the immutable fields MUST be echoed back (server
 * compares each one), so no stripping happens at this level — the create+
 * file combo (saveOtaPackageWithFile) owns the pre-upload strip.
 */
export async function saveOtaPackageInfo(
  request: SaveOtaPackageInfoRequest,
): Promise<OtaPackageInfo> {
  return tbHttp.post<OtaPackageInfo>('/api/otaPackage', request);
}

/**
 * Step 2 of the file package flow — multipart POST /api/otaPackage/{id}
 * with the `file` part; `checksumAlgorithm` rides as a required query param,
 * `checksum` as an optional one. The info shell must already exist (created
 * by the caller, usually via saveOtaPackageWithFile). The Content-Type
 * header is deliberately NOT set — the browser supplies the multipart
 * boundary.
 */
export async function uploadOtaPackageFile(
  otaPackageId: string,
  file: File,
  checksumAlgorithm: ChecksumAlgorithm,
  checksum?: string,
): Promise<OtaPackageInfo> {
  const form = new FormData();
  form.append('file', file);
  return tbHttp.post<OtaPackageInfo>(`/api/otaPackage/${otaPackageId}`, form, {
    checksumAlgorithm,
    checksum,
  });
}

/**
 * Create-then-upload with rollback — the full two-step file package chain:
 *
 *   1. POST /api/otaPackage  — info shell, `checksum` stripped (the server
 *      computes it during the upload step; sending one would only fight the
 *      immutability check later);
 *   2. multipart POST /api/otaPackage/{id} — file + checksumAlgorithm query;
 *   3. on step-2 failure: DELETE /api/otaPackage/{id} rolls the shell back
 *      so no orphan empty package is left, then the original error rethrows.
 *
 * Create-only: step 1 has no id — updates ride saveOtaPackageInfo alone.
 */
export async function saveOtaPackageWithFile(
  request: SaveOtaPackageInfoRequest,
  file: File,
  checksumAlgorithm: ChecksumAlgorithm,
  checksum?: string,
): Promise<OtaPackageInfo> {
  const { checksum: _preSetChecksum, ...info } = request;
  const saved = await saveOtaPackageInfo(info);
  try {
    return await uploadOtaPackageFile(
      saved.id.id,
      file,
      checksumAlgorithm,
      checksum,
    );
  } catch (error) {
    await deleteOtaPackage(saved.id.id);
    throw error;
  }
}

/**
 * DELETE /api/otaPackage/{id} — 400 (not 409) when devices / device
 * profiles still reference the package; the message is the raw English
 * DataValidationException text.
 */
export async function deleteOtaPackage(otaPackageId: string): Promise<void> {
  await tbHttp.delete(`/api/otaPackage/${otaPackageId}`);
}

/**
 * GET /api/otaPackage/{id}/download — raw bytes as a Blob. URL-type
 * packages (non-empty `url`) make this endpoint answer 400: callers must
 * branch on the `url` field (see otaPackageHasUrl) and open the link
 * directly instead of calling this.
 */
export async function downloadOtaPackage(
  otaPackageId: string,
): Promise<Blob> {
  return tbHttp.request<Blob>(`/api/otaPackage/${otaPackageId}/download`, {
    method: 'GET',
    responseType: 'blob',
  });
}
