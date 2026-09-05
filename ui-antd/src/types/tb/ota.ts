/**
 * Handwritten authoritative OTA package types (M13 wave-1).
 *
 * Source of truth: common/data/src/main/java/org/thingsboard/server/common/data/OtaPackageInfo.java
 * + SaveOtaPackageInfoRequest.java + ota/ChecksumAlgorithm.java,
 * cross-checked against ui-ngx shared/models/ota-package.models.ts.
 *
 * Wire notes:
 *   - `hasData` is a server-computed column (data or url present).
 *   - The Java `hasUrl()` helper is @JsonIgnore — it never serializes;
 *     "URL-type package" is derived client-side from a non-empty `url`
 *     (downloadOtaPackage must branch on it: the download endpoint 400s for
 *     URL packages).
 */

import type { BaseData, EntityIdOf, EntityType } from './entity';

/** OtaPackageType is the canonical OTA wire enum (also re-exported by device-profile types for the profile pickers). */
export enum OtaPackageType {
  FIRMWARE = 'FIRMWARE',
  SOFTWARE = 'SOFTWARE',
}

/** Checksum algorithms the multipart upload accepts (`checksumAlgorithm` is required there). */
export enum ChecksumAlgorithm {
  MD5 = 'MD5',
  SHA256 = 'SHA256',
  SHA384 = 'SHA384',
  SHA512 = 'SHA512',
  CRC32 = 'CRC32',
  MURMUR3_32 = 'MURMUR3_32',
  MURMUR3_128 = 'MURMUR3_128',
}

/** `additionalInfo` — `{description}` is the only field the UI uses. */
export interface OtaPackageAdditionalInfo {
  description?: string;
  [key: string]: unknown;
}

/**
 * OtaPackageInfo row (GET /api/otaPackage/info/{id} + both list endpoints).
 * `fileName`/`contentType`/`checksum`/`checksumAlgorithm`/`dataSize`/`hasData`
 * are filled by the multipart upload (or are absent for URL packages) and are
 * immutable afterwards.
 */
export interface OtaPackageInfo
  extends BaseData<EntityIdOf<EntityType.OTA_PACKAGE>> {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  /** Object-form EntityId — the backend rejects the bare-string form. */
  deviceProfileId?: EntityIdOf<EntityType.DEVICE_PROFILE>;
  type: OtaPackageType;
  title: string;
  /** Human package version (NOT the VCS counter — OtaPackageInfo carries no `Long version`); title+version is unique per tenant (DB constraint). */
  version: string;
  tag?: string;
  /** Non-empty → URL-type package (branch download/assignment UX on this). */
  url?: string;
  /** Server-computed: data or url present. */
  hasData?: boolean;
  /** Server-computed on upload, read-only afterwards. */
  fileName?: string;
  /** Server-computed on upload, read-only afterwards. */
  contentType?: string;
  checksumAlgorithm?: ChecksumAlgorithm;
  checksum?: string;
  /** Byte size of the uploaded file (null for URL packages). */
  dataSize?: number;
  externalId?: EntityIdOf<EntityType.OTA_PACKAGE>;
  additionalInfo?: OtaPackageAdditionalInfo;
}

/**
 * POST /api/otaPackage body (SaveOtaPackageInfoRequest.java): OtaPackageInfo
 * plus the client-declared `usesUrl` split (true → URL package, url required;
 * false → empty shell awaiting the multipart upload).
 */
export interface SaveOtaPackageInfoRequest extends OtaPackageInfo {
  usesUrl: boolean;
}

/**
 * URL-type probe — the backend's `hasUrl()` is @JsonIgnore so the wire never
 * carries it. `downloadOtaPackage` 400s for URL packages; callers must route
 * those to `url` directly instead of the endpoint.
 */
export function otaPackageHasUrl(info: Pick<OtaPackageInfo, 'url'>): boolean {
  return Boolean(info.url);
}
