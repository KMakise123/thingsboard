/**
 * Entities version-control transport (handwritten) — device detail VC tab.
 *
 * Base paths (openapi entities-version-control-controller + AdminController):
 *   GET  /api/admin/repositorySettings/info                    configured? (gate)
 *   GET  /api/admin/autoCommitSettings[...]                    auto-commit settings
 *   GET  /api/entities/vc/branches                             branch list
 *   GET  /api/entities/vc/version/{entityType}/{entityUuid}    entity versions page
 *   POST /api/entities/vc/version                              create version → requestId
 *   GET  /api/entities/vc/version/{requestId}/status           create result (poll)
 *   GET  /api/entities/vc/diff/{entityType}/{entityUuid}       current vs version diff
 *   GET  /api/entities/vc/info/{versionId}/{entityType}/{entityUuid}  versioned data flags
 *   POST /api/entities/vc/entity                               load (restore) → requestId
 *   GET  /api/entities/vc/entity/{requestId}/status            load result (poll)
 *
 * Create/load are async on this backend: the POST returns a request id and
 * the *Status endpoints return `{..., done}` envelopes. The await* helpers
 * wrap the 2s poll loop (same cadence as ui-ngx's timer()).
 */

import type { QueryParams } from '@/core/http/client';
import type {
  EntityId,
  EntityType,
  PageData,
  PageLink,
} from '@/types/tb';

import { tbHttp } from './http';

/** GET /api/admin/repositorySettings/info — is VC usable at all. */
export interface RepositorySettingsInfo {
  configured: boolean;
  readOnly?: boolean;
}

/** GET /api/entities/vc/branches row. */
export interface BranchInfo {
  name: string;
  default?: boolean;
}

/** GET /api/entities/vc/version/... row. */
export interface EntityVersion {
  timestamp: number;
  id: string;
  name?: string;
  author?: string;
}

/** Per-family export flags of a version-create request (DEVICE shows all). */
export interface VersionCreateConfig {
  saveRelations?: boolean;
  saveAttributes?: boolean;
  saveCredentials?: boolean;
  saveCalculatedFields?: boolean;
}

/** Per-family load flags of a version-load request. */
export interface VersionLoadConfig {
  loadRelations?: boolean;
  loadAttributes?: boolean;
  loadCredentials?: boolean;
  loadCalculatedFields?: boolean;
}

export interface VersionCreationResult {
  version?: EntityVersion;
  added?: number;
  modified?: number;
  removed?: number;
  error?: string;
  done: boolean;
}

export interface EntityTypeLoadResult {
  entityType: EntityType;
  created?: number;
  updated?: number;
  deleted?: number;
}

export interface VersionLoadResult {
  result?: Array<EntityTypeLoadResult>;
  error?: { type?: string; message?: string };
  done: boolean;
}

/** GET /api/entities/vc/info/... — which families exist in that version. */
export interface EntityDataInfo {
  hasRelations?: boolean;
  hasAttributes?: boolean;
  hasCredentials?: boolean;
  hasCalculatedFields?: boolean;
}

/**
 * GET /api/entities/vc/diff/... — current vs versioned export blobs. The
 * export payload is type-discriminated upstream; the tab renders it as
 * normalized JSON, so it round-trips as an opaque record here.
 */
export interface EntityDataDiff {
  currentVersion?: Record<string, unknown>;
  otherVersion?: Record<string, unknown>;
}

/**
 * GET/POST /api/admin/autoCommitSettings — map of entityType → auto-commit
 * config; POST saves the tenant-wide map (entries of other entity types are
 * the caller's responsibility to preserve).
 */
export type AutoCommitSettings = Record<string, AutoVersionCreateConfig>;

export interface AutoVersionCreateConfig extends VersionCreateConfig {
  branch?: string;
}

/** Single-entity create request (openapi SingleEntityVersionCreateRequest). */
export interface SingleEntityVersionCreateRequest {
  type: 'SINGLE_ENTITY';
  branch: string;
  versionName: string;
  entityId: EntityId;
  config: VersionCreateConfig;
}

/** Single-entity load request (openapi SingleEntityVersionLoadRequest). */
export interface SingleEntityVersionLoadRequest {
  type: 'SINGLE_ENTITY';
  versionId: string;
  externalEntityId: EntityId;
  config: VersionLoadConfig;
}

/** GET /api/admin/repositorySettings/info */
export async function getRepositorySettingsInfo(): Promise<RepositorySettingsInfo> {
  return tbHttp.get<RepositorySettingsInfo>(
    '/api/admin/repositorySettings/info',
  );
}

/** GET /api/admin/autoCommitSettings — 404 (not configured) degrades to null. */
export async function getAutoCommitSettings(): Promise<AutoCommitSettings | null> {
  try {
    return await tbHttp.get<AutoCommitSettings>(
      '/api/admin/autoCommitSettings',
    );
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      (error as { status?: number }).status === 404
    ) {
      return null;
    }
    throw error;
  }
}

/** POST /api/admin/autoCommitSettings */
export async function saveAutoCommitSettings(
  settings: AutoCommitSettings,
): Promise<AutoCommitSettings> {
  return tbHttp.post<AutoCommitSettings>(
    '/api/admin/autoCommitSettings',
    settings,
  );
}

/** DELETE /api/admin/autoCommitSettings */
export async function deleteAutoCommitSettings(): Promise<void> {
  return tbHttp.delete<void>('/api/admin/autoCommitSettings');
}

/** GET /api/entities/vc/branches */
export async function listBranches(): Promise<Array<BranchInfo>> {
  return tbHttp.get<Array<BranchInfo>>('/api/entities/vc/branches');
}

/** GET /api/entities/vc/version/{entityType}/{externalEntityUuid} */
export async function listEntityVersions(
  entityType: EntityType,
  externalEntityUuid: string,
  branch: string,
  pageLink: PageLink,
): Promise<PageData<EntityVersion>> {
  const params: QueryParams = {
    branch,
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    sortProperty: pageLink.sortOrder?.property,
    sortOrder: pageLink.sortOrder?.direction,
  };
  return tbHttp.get<PageData<EntityVersion>>(
    `/api/entities/vc/version/${entityType}/${externalEntityUuid}`,
    params,
  );
}

/** POST /api/entities/vc/version → version-create request id. */
export async function saveEntitiesVersion(
  request: SingleEntityVersionCreateRequest,
): Promise<string> {
  return tbHttp.post<string>('/api/entities/vc/version', request);
}

/** GET /api/entities/vc/version/{requestId}/status */
export async function getVersionCreateRequestStatus(
  requestId: string,
): Promise<VersionCreationResult> {
  return tbHttp.get<VersionCreationResult>(
    `/api/entities/vc/version/${requestId}/status`,
  );
}

/** GET /api/entities/vc/diff/{entityType}/{internalEntityUuid} */
export async function compareEntityDataToVersion(
  entityType: EntityType,
  internalEntityUuid: string,
  versionId: string,
): Promise<EntityDataDiff> {
  return tbHttp.get<EntityDataDiff>(
    `/api/entities/vc/diff/${entityType}/${internalEntityUuid}`,
    { versionId },
  );
}

/** GET /api/entities/vc/info/{versionId}/{entityType}/{externalEntityUuid} */
export async function getEntityDataInfo(
  versionId: string,
  externalEntityId: EntityId,
): Promise<EntityDataInfo> {
  return tbHttp.get<EntityDataInfo>(
    `/api/entities/vc/info/${versionId}/${externalEntityId.entityType}/${externalEntityId.id}`,
  );
}

/** POST /api/entities/vc/entity → version-load request id. */
export async function loadEntitiesVersion(
  request: SingleEntityVersionLoadRequest,
): Promise<string> {
  return tbHttp.post<string>('/api/entities/vc/entity', request);
}

/** GET /api/entities/vc/entity/{requestId}/status */
export async function getVersionLoadRequestStatus(
  requestId: string,
): Promise<VersionLoadResult> {
  return tbHttp.get<VersionLoadResult>(
    `/api/entities/vc/entity/${requestId}/status`,
  );
}

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

async function pollUntilDone<T extends { done: boolean }>(
  fetchStatus: () => Promise<T>,
  intervalMs: number,
  timeoutMs: number,
): Promise<T> {
  const startedAt = Date.now();
  for (;;) {
    const result = await fetchStatus();
    if (result.done) {
      return result;
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Version control request timed out');
    }
    await delay(intervalMs);
  }
}

/** Poll a create request to `done` (2s cadence, 2min cap — ui-ngx parity). */
export async function awaitVersionCreateResult(
  requestId: string,
  intervalMs = POLL_INTERVAL_MS,
): Promise<VersionCreationResult> {
  return pollUntilDone(
    () => getVersionCreateRequestStatus(requestId),
    intervalMs,
    POLL_TIMEOUT_MS,
  );
}

/** Poll a load request to `done` (2s cadence, 2min cap — ui-ngx parity). */
export async function awaitVersionLoadResult(
  requestId: string,
  intervalMs = POLL_INTERVAL_MS,
): Promise<VersionLoadResult> {
  return pollUntilDone(
    () => getVersionLoadRequestStatus(requestId),
    intervalMs,
    POLL_TIMEOUT_MS,
  );
}
