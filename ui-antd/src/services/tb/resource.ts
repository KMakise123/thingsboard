/**
 * TB-resource transport (M11 wave-1A).
 *
 * Endpoints verified against backend TbResourceController.java and the
 * openapi snapshot (17 /api/resource/** paths):
 *
 *   GET    /api/resource?page=&pageSize=&resourceType=&resourceSubType=…
 *          → PageData<TbResourceInfo> (SYS_ADMIN: all; TENANT_ADMIN:
 *          own tenant rows + system rows)
 *   GET    /api/resource/tenant…   → PageData<TbResourceInfo> (own rows only)
 *   GET    /api/resource/info/{id} → TbResourceInfo
 *   GET    /api/resource/{id}      → TbResource (base64 data included)
 *   GET    /api/resource/{type}/{scope}/{key}/info → TbResourceInfo
 *   GET    /api/resource/{id}/download → raw bytes (blob)
 *   POST   /api/resource           → TbResource (JSON create/update)
 *   POST   /api/resource/upload    → TbResource (multipart file upload)
 *   PUT    /api/resource/{id}/info → TbResource (metadata only)
 *   PUT    /api/resource/{id}/data → TbResource (multipart replacement)
 *   DELETE /api/resource/{id}?force= → TbResourceDeleteResult
 *
 * Double-path reads always use the V2 Infos shape (`/info/{id}` over
 * `/{id}` when only metadata is needed — project convention, see
 * device.ts / widget-type.ts).
 *
 * Delete semantics (ui-ngx toResourceDeleteResult): a 400 answer carries
 * the TbResourceDeleteResult body with `success=false` + `references` —
 * surfaced here as ResourceReferencedError so the UI can open the
 * resources-in-use flow and retry with force=true.
 *
 * JS MODULE semantics (ui-ngx js-resource.component.ts:106-120): a MODULE
 * saves with the file name auto-derived from the title (`title + '.js'`);
 * the upload endpoint derives its `fileName` from the File object's name.
 */

import {
  ResourceType,
  ResourceSubType,
  type ResourceListFilter,
  type ResourceReferences,
  type ResourceScope,
  type ResourceUploadRequest,
  type TbResource,
  type TbResourceDeleteResult,
  type TbResourceInfo,
} from '@/types/tb/resource';
import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';

import { tbHttp } from './http';

const SERVER_ERROR_NAME = 'ServerErrorError';

/** Max uploads fanned out per chunk (ui-ngx resource.service.ts:70-110). */
export const RESOURCE_UPLOAD_BATCH_SIZE = 100;

function resourceListQuery(
  pageLink: PageLink,
  filter: ResourceListFilter = {},
): Record<string, string | number | boolean | undefined> {
  return {
    ...pageLinkToQueryParams(pageLink),
    resourceType: filter.resourceType,
    resourceSubType: filter.resourceSubType,
  };
}

/**
 * GET /api/resource — the shared library page: filterable by
 * resourceType/resourceSubType, system + tenant rows interleaved.
 */
export async function getResources(
  pageLink: PageLink,
  filter: ResourceListFilter = {},
): Promise<PageData<TbResourceInfo>> {
  return tbHttp.get<PageData<TbResourceInfo>>(
    '/api/resource',
    resourceListQuery(pageLink, filter),
  );
}

/** GET /api/resource/tenant — only the caller's own tenant rows. */
export async function getTenantResources(
  pageLink: PageLink,
): Promise<PageData<TbResourceInfo>> {
  return tbHttp.get<PageData<TbResourceInfo>>(
    '/api/resource/tenant',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/resource/info/{resourceId} — metadata row (V2 Infos shape). */
export async function getResourceInfoById(
  resourceId: string,
): Promise<TbResourceInfo> {
  return tbHttp.get<TbResourceInfo>(`/api/resource/info/${resourceId}`);
}

/** GET /api/resource/{resourceId} — full entity incl. base64 data. */
export async function getResourceById(
  resourceId: string,
): Promise<TbResource> {
  return tbHttp.get<TbResource>(`/api/resource/${resourceId}`);
}

/**
 * GET /api/resource/{resourceType}/{scope}/{key}/info — read one resource
 * by its natural key (`scope` = `tenant` | `system`).
 */
export async function getResourceInfo(
  resourceType: string,
  scope: ResourceScope,
  key: string,
): Promise<TbResourceInfo> {
  return tbHttp.get<TbResourceInfo>(
    `/api/resource/${resourceType}/${scope}/${key}/info`,
  );
}

/** GET /api/resource/{resourceId}/download — raw payload as a Blob. */
export async function downloadResource(resourceId: string): Promise<Blob> {
  return tbHttp.request<Blob>(`/api/resource/${resourceId}/download`, {
    method: 'GET',
    responseType: 'blob',
  });
}

/** POST /api/resource — JSON create/update (LwM2M models, keys, …). */
export async function saveResource(resource: TbResource): Promise<TbResource> {
  return tbHttp.post<TbResource>('/api/resource', resource);
}

/** POST /api/resource/upload — multipart create (file/title/type/subType). */
export async function uploadResource(
  request: ResourceUploadRequest,
): Promise<TbResource> {
  const form = new FormData();
  form.append('file', request.file);
  form.append('title', request.title);
  form.append('resourceType', request.resourceType);
  if (request.resourceSubType) {
    form.append('resourceSubType', request.resourceSubType);
  }
  if (request.descriptor) {
    form.append('descriptor', request.descriptor);
  }
  return tbHttp.post<TbResource>('/api/resource/upload', form);
}

/**
 * Batched multi-file upload: chunks of 100 fan out in parallel within the
 * chunk, chunks run sequentially (ui-ngx uploadResources recursion), and
 * every item settles individually so the caller can report partial
 * failures instead of the upstream silent `{}` placeholders.
 */
export async function uploadResources(
  requests: Array<ResourceUploadRequest>,
): Promise<Array<PromiseSettledResult<TbResource>>> {
  const results: Array<PromiseSettledResult<TbResource>> = [];
  for (let i = 0; i < requests.length; i += RESOURCE_UPLOAD_BATCH_SIZE) {
    const chunk = requests.slice(i, i + RESOURCE_UPLOAD_BATCH_SIZE);
    results.push(...(await Promise.allSettled(chunk.map(uploadResource))));
  }
  return results;
}

/** PUT /api/resource/{id}/info — metadata-only update (title, subType…). */
export async function updateResourceInfo(
  resourceId: string,
  info: Partial<Omit<TbResource, 'data'>>,
): Promise<TbResource> {
  return tbHttp.put<TbResource>(`/api/resource/${resourceId}/info`, info);
}

/** PUT /api/resource/{id}/data — replace the payload (multipart `file`). */
export async function updateResourceData(
  resourceId: string,
  file: File | Blob,
): Promise<TbResource> {
  const form = new FormData();
  form.append('file', file);
  return tbHttp.put<TbResource>(`/api/resource/${resourceId}/data`, form);
}

/**
 * Parse the raw 400 body into a references map when it is the
 * "resource is referenced" answer (ui-ngx toResourceDeleteResult:
 * `status === 400 && body.success === false && body.references`).
 * Accepts both the raw text the client keeps and a pre-parsed object.
 */
export function referencesFromBody(
  rawBody: unknown,
): ResourceReferences | undefined {
  let body: unknown = rawBody;
  if (typeof rawBody === 'string') {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return undefined;
    }
  }
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const candidate = body as { success?: unknown; references?: unknown };
  if (candidate.success !== false || !candidate.references) {
    return undefined;
  }
  return candidate.references as ResourceReferences;
}

/** The structured 400: the resource is still referenced somewhere. */
export class ResourceReferencedError extends Error {
  readonly references: ResourceReferences;

  constructor(references: ResourceReferences) {
    super('Resource is referenced by other entities');
    this.name = 'ResourceReferencedError';
    this.references = references;
  }
}

/**
 * DELETE /api/resource/{resourceId}?force= — 200 answers the delete
 * result; 400 + `references` (only possible with force=false) surfaces as
 * ResourceReferencedError. Any other failure rethrows untouched.
 */
export async function deleteResource(
  resourceId: string,
  force = false,
): Promise<TbResourceDeleteResult> {
  try {
    const result = await tbHttp.delete<TbResourceDeleteResult>(
      `/api/resource/${resourceId}`,
      { force },
    );
    // 200 with an empty body is still a successful delete.
    return result ?? { success: true };
  } catch (error) {
    const isServerError =
      typeof error === 'object' &&
      error !== null &&
      (error as { name?: string }).name === SERVER_ERROR_NAME;
    if (
      !force &&
      isServerError &&
      (error as { status?: number }).status === 400
    ) {
      const references = referencesFromBody(
        (error as { rawBody?: unknown }).rawBody,
      );
      if (references) {
        throw new ResourceReferencedError(references);
      }
    }
    throw error;
  }
}

/**
 * JS MODULE upload request from edited content: the File object carries
 * the auto-derived `title + '.js'` name, which is what the backend stores
 * as `fileName` (ui-ngx js-resource.component.ts:110-120).
 */
export function jsModuleUploadRequest(
  title: string,
  content: string,
): ResourceUploadRequest {
  return {
    file: new File([content], jsModuleFileName(title), {
      type: 'text/javascript',
    }),
    title,
    resourceType: ResourceType.JS_MODULE,
    resourceSubType: ResourceSubType.MODULE,
  };
}

/** `title + '.js'` — the MODULE file name derivation (upstream exact). */
export function jsModuleFileName(title: string): string {
  return `${title}.js`;
}
