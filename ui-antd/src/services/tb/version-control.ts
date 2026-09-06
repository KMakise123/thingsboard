/**
 * Entities version-control transport (handwritten) — device detail VC tab
 * + the M14 standalone page / repository settings family (wave-1).
 *
 * Base paths (openapi entities-version-control-controller + AdminController):
 *   GET  /api/admin/repositorySettings                            settings (credentials stripped)
 *   POST /api/admin/repositorySettings                            save (validation clone; DeferredResult 180s)
 *   DELETE /api/admin/repositorySettings                          delete (+ local repo dir)
 *   POST /api/admin/repositorySettings/checkAccess                probe (400 carries the reason)
 *   GET  /api/admin/repositorySettings/info                       configured? (gate)
 *   GET  /api/admin/autoCommitSettings[...]                       auto-commit settings
 *   GET  /api/entities/vc/branches                                branch list
 *   GET  /api/entities/vc/version                                 all-type versions page
 *   GET  /api/entities/vc/version/{entityType}/{entityUuid}       entity versions page
 *   POST /api/entities/vc/version                                 create version → requestId
 *   GET  /api/entities/vc/version/{requestId}/status              create result (poll)
 *   GET  /api/entities/vc/diff/{entityType}/{entityUuid}          current vs version diff
 *   GET  /api/entities/vc/info/{versionId}/{entityType}/{entityUuid}  versioned data flags
 *   POST /api/entities/vc/entity                                  load (restore) → requestId
 *   GET  /api/entities/vc/entity/{requestId}/status               load result (poll)
 *
 * Create/load are async on this backend: the POST returns a request id and
 * the *Status endpoints return `{..., done}` envelopes. The await* helpers
 * wrap the 2s poll loop (same cadence as ui-ngx's timer()); they tolerate
 * the two transient status responses (400 "Invalid task" narrow window,
 * 404 "Task execution timed-out" cache expiry) for up to 3 consecutive
 * polls before giving up (contract #10).
 *
 * Repository settings wire gotchas (contract #8/#9):
 *   - GET strips password/privateKey/privateKeyPassword (always null).
 *   - On save/checkAccess a null or MISSING credential field = server
 *     backfills the stored value; an EMPTY STRING is a real credential and
 *     is validated by a real clone/fetch. Callers must strip untouched
 *     credential fields, never send "".
 *   - Save failure = 500 "Failed to init repository!" (no cause);
 *     checkAccess failure = 400 "Unable to access repository: <cause>" —
 *     UI should guide users through Check access first.
 */

import type { QueryParams } from '@/core/http/client';
import type {
  EntityId,
  EntityType,
  PageData,
  PageLink,
} from '@/types/tb';
import { pageLinkToQueryParams } from '@/types/tb/page';

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

/** openapi SyncStrategy — per-entity-type sync direction of a COMPLEX create. */
export type EntityTypeSyncStrategy = 'MERGE' | 'OVERWRITE';

/** Per-entity-type create config of a COMPLEX request (openapi EntityTypeVersionCreateConfig). */
export interface EntityTypeVersionCreateConfig extends VersionCreateConfig {
  syncStrategy?: EntityTypeSyncStrategy;
  /** Explicit entity subset; omit when allEntities is true. */
  entityIds?: string[];
  /** true = the whole tenant scope of this entity type. */
  allEntities?: boolean;
}

/**
 * COMPLEX create request (openapi ComplexVersionCreateRequest) — a version
 * over many entity types, each with its own config map entry.
 */
export interface ComplexVersionCreateRequest {
  type: 'COMPLEX';
  branch?: string;
  versionName?: string;
  syncStrategy?: EntityTypeSyncStrategy;
  entityTypes?: Partial<Record<EntityType, EntityTypeVersionCreateConfig>>;
}

/** Per-entity-type load config (openapi EntityTypeVersionLoadConfig). */
export interface EntityTypeVersionLoadConfig extends VersionLoadConfig {
  /** DANGEROUS: deletes tenant entities missing from the version. */
  removeOtherEntities?: boolean;
  /** Match entities by name when ids drifted (default true). */
  findExistingEntityByName?: boolean;
}

/** ENTITY_TYPE (complex) load request (openapi EntityTypeVersionLoadRequest). */
export interface EntityTypeVersionLoadRequest {
  type: 'ENTITY_TYPE';
  versionId?: string;
  entityTypes?: Partial<Record<EntityType, EntityTypeVersionLoadConfig>>;
  rollbackOnError?: boolean;
}

/**
 * GET/POST /api/admin/repositorySettings (openapi RepositorySettings).
 * GET strips the three credential fields to null; on the way UP a missing
 * or null credential means "keep the stored one" and an empty string is a
 * REAL (validated) credential — strip untouched fields before sending,
 * never send "" (contract #8). `localOnly` is server-forced to false and
 * never sent by the UI.
 */
export interface RepositorySettings {
  repositoryUri?: string;
  authMethod?: 'USERNAME_PASSWORD' | 'PRIVATE_KEY';
  username?: string;
  password?: string;
  privateKeyFileName?: string;
  privateKey?: string;
  privateKeyPassword?: string;
  defaultBranch?: string;
  /** true = the whole VC domain becomes read-only for the tenant. */
  readOnly?: boolean;
  showMergeCommits?: boolean;
}

/**
 * GET /api/entities/vc/version — all-entity-type versions page of one
 * branch (openapi listVersions). Unknown branch → empty page data (200).
 * Sortable column is `timestamp` only.
 */
export async function listVersions(
  branch: string,
  pageLink: PageLink,
): Promise<PageData<EntityVersion>> {
  const params: QueryParams = {
    branch,
    ...pageLinkToQueryParams(pageLink),
  };
  return tbHttp.get<PageData<EntityVersion>>('/api/entities/vc/version', params);
}

/**
 * GET /api/admin/repositorySettings — stored settings, 404 (not configured)
 * degrades to null like getAutoCommitSettings. Credentials come back
 * stripped; nothing here is usable for re-display of secrets.
 */
export async function getRepositorySettings(): Promise<RepositorySettings | null> {
  try {
    return await tbHttp.get<RepositorySettings>(
      '/api/admin/repositorySettings',
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

/**
 * POST /api/admin/repositorySettings — validation-style save: the server
 * really clones/fetches the repository before persisting. Failure surfaces
 * as 500 "Failed to init repository!" WITHOUT the underlying cause — the
 * checkAccess probe (checkRepositoryAccess) is the diagnosable variant
 * (400 with the reason). 180s DeferredResult cap: this request may hang
 * that long.
 */
export async function saveRepositorySettings(
  settings: RepositorySettings,
): Promise<RepositorySettings> {
  return tbHttp.post<RepositorySettings>(
    '/api/admin/repositorySettings',
    settings,
  );
}

/**
 * DELETE /api/admin/repositorySettings — also wipes the local git dir.
 * Callers should invalidate the ['vc-repo-info'] / ['vc-branches'] query
 * caches afterwards (the service layer owns no cache).
 */
export async function deleteRepositorySettings(): Promise<void> {
  return tbHttp.delete<void>('/api/admin/repositorySettings');
}

/**
 * POST /api/admin/repositorySettings/checkAccess — same validation clone
 * as save, without persisting. Failure = 400 "Unable to access repository:
 * <underlying cause>", which is why the UI runs it before Save.
 */
export async function checkRepositoryAccess(
  settings: RepositorySettings,
): Promise<void> {
  return tbHttp.post<void>(
    '/api/admin/repositorySettings/checkAccess',
    settings,
  );
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
/** Aligned with the backend DeferredResult cap (queue.vc.request-timeout=180s). */
const POLL_TIMEOUT_MS = 180_000;
/**
 * Consecutive transient status failures tolerated before giving up: 400
 * "Invalid task" = result not cached yet (POST accepted, narrow window),
 * 404 "Task execution timed-out" = result cache TTL (20 min) expired or a
 * backend restart. Neither is terminal — keep polling up to 3 consecutive
 * hits, fail on the one after (contract #10).
 */
const MAX_TRANSIENT_ERRORS = 3;

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function isTransientStatusError(error: unknown): boolean {
  const status =
    error && typeof error === 'object' && 'status' in error
      ? (error as { status?: number }).status
      : undefined;
  return status === 400 || status === 404;
}

async function pollUntilDone<T extends { done: boolean }>(
  fetchStatus: () => Promise<T>,
  intervalMs: number,
  timeoutMs: number,
): Promise<T> {
  const startedAt = Date.now();
  let transientErrors = 0;
  for (;;) {
    let result: T;
    try {
      result = await fetchStatus();
    } catch (error) {
      if (isTransientStatusError(error) && transientErrors < MAX_TRANSIENT_ERRORS) {
        transientErrors += 1;
        await delay(intervalMs);
        continue;
      }
      throw error;
    }
    if (result.done) {
      return result;
    }
    transientErrors = 0;
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Version control request timed out');
    }
    await delay(intervalMs);
  }
}

/**
 * Poll a create request to `done` (2s cadence, 180s cap — the backend
 * DeferredResult limit; ui-ngx cadence parity). Success AND failure both
 * arrive as `done: true` terminals — the result's `error` field carries
 * the failure. 400/404 transient statuses are tolerated up to 3
 * consecutive times.
 */
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

/**
 * Poll a load request to `done` (2s cadence, 180s cap — the backend
 * DeferredResult limit; ui-ngx cadence parity). Same terminal/transient
 * semantics as awaitVersionCreateResult.
 */
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
