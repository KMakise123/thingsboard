/**
 * Handwritten authoritative TB-resource wire types (M11 wave-1A).
 *
 * Source of truth (cross-checked, in priority order):
 *   - backend `TbResourceController.java` + `common/data/TbResource.java` /
 *     `TbResourceInfo.java` / `TbResourceDeleteResult.java`.
 *   - openapi snapshot: `TbResourceInfo` schema and the `/api/resource/**`
 *     operations (17 paths).
 *   - ui-ngx `shared/models/resource.models.ts:27-153` for the frontend
 *     semantics (type/subType enums, delete-result discrimination, scope
 *     helper).
 *
 * Wire realities pinned here:
 *   - The data payload of a `TbResource` is base64 text over REST
 *     (`TbResource.getData()` returns base64; the upload endpoints take the
 *     raw file and answer with base64 in the JSON body).
 *   - `DELETE /api/resource/{id}?force=` answers 200 + TbResourceDeleteResult
 *     on success, and 400 + the SAME body when the resource is still
 *     referenced (`success=false`, `references` filled) — the transport
 *     layer (services/tb/resource.ts) turns the 400 into a structured error.
 *   - The openapi `ResourceType` union additionally carries legacy
 *     `IMAGE`/`DASHBOARD` values; the frontend enum (ui-ngx:33-39) only ever
 *     produces the five below, which is what this fork's list filters offer.
 */

import type { EntityIdOf, EntityType, EpochMillis } from './entity';

/** Resource kind (`resourceType`; ui-ngx ResourceType). */
export enum ResourceType {
  LWM2M_MODEL = 'LWM2M_MODEL',
  PKCS_12 = 'PKCS_12',
  JKS = 'JKS',
  JS_MODULE = 'JS_MODULE',
  GENERAL = 'GENERAL',
}

/** Resource sub kind (`resourceSubType`; ui-ngx ResourceSubType). */
export enum ResourceSubType {
  IMAGE = 'IMAGE',
  SCADA_SYMBOL = 'SCADA_SYMBOL',
  EXTENSION = 'EXTENSION',
  MODULE = 'MODULE',
}

/**
 * Ownership scope of a resource: `system` resources carry the NULL tenant
 * (TENANT users see them read-only), `tenant` resources are the caller's
 * own rows. Mirrors ui-ngx TBResourceScope.
 */
export type ResourceScope = 'tenant' | 'system';

/**
 * `GET /api/resource/**` row (list + info endpoints). Every read returns
 * the id, so it is REQUIRED here. The generic `D` is the per-type
 * descriptor JSON (image descriptors etc. — wave 2C narrows it); the
 * JS/file library leaves it unset.
 */
export interface TbResourceInfo<D = Record<string, unknown>> {
  id: EntityIdOf<EntityType.TB_RESOURCE>;
  /** ms since epoch (server-assigned). */
  readonly createdTime?: EpochMillis;
  /** Server-forced on save; NULL-tenant id = system resource. */
  readonly tenantId?: EntityIdOf<EntityType.TENANT>;
  title?: string;
  resourceType?: ResourceType;
  resourceSubType?: ResourceSubType;
  resourceKey?: string;
  fileName?: string;
  publicResourceKey?: string;
  /** Descriptor JSON (free-form upstream; typed per resource kind). */
  descriptor?: D;
  [key: string]: unknown;
}

/**
 * Full resource entity — `GET /api/resource/{id}` response and the JSON
 * save request body. Only the SAVE payload may omit `id` (create); read
 * rows are TbResourceInfo. `data` is the base64 text of the payload.
 */
export interface TbResource<D = Record<string, unknown>>
  extends Omit<TbResourceInfo<D>, 'id'> {
  /** Omit on POST /api/resource to create a new resource. */
  id?: EntityIdOf<EntityType.TB_RESOURCE>;
  /** base64-encoded payload as returned by / required by the JSON API. */
  data?: string;
  /** Legacy alias upstream keeps in Resource; not used by the REST layer. */
  name?: string;
}

/** One referencing entity inside a delete-result references map. */
export interface ResourceReferenceEntity {
  id: EntityIdOf<EntityType>;
  /** Server-side entity name when available. */
  name?: string;
  /** Owning tenant (present on tenant-owned referencing entities). */
  tenantId?: EntityIdOf<EntityType.TENANT>;
  [key: string]: unknown;
}

/**
 * `references` payload of TbResourceDeleteResult: entityType → the entities
 * still referencing the resource (ui-ngx ResourceReferences).
 */
export interface ResourceReferences {
  [entityType: string]: Array<ResourceReferenceEntity>;
}

/** `DELETE /api/resource/{id}` body (backend TbResourceDeleteResult). */
export interface TbResourceDeleteResult {
  success: boolean;
  references?: ResourceReferences;
}

/** Extra filters of `GET /api/resource` beyond the PageLink. */
export interface ResourceListFilter {
  resourceType?: ResourceType;
  resourceSubType?: ResourceSubType;
}

/**
 * Upload request for `POST /api/resource/upload` — the transport layer
 * converts `file` + metadata into the multipart form.
 */
export interface ResourceUploadRequest {
  file: File | Blob;
  title: string;
  resourceType: ResourceType;
  resourceSubType?: ResourceSubType;
  /** Multipart `descriptor` part (JSON string upstream). */
  descriptor?: string;
}
