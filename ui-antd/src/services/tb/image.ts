/**
 * TB-image transport (M11 wave-2C).
 *
 * Endpoints verified against backend ImageController.java (this fork) and
 * the openapi snapshot; ui-ngx parity anchor: core/http/image.service.ts:
 *
 *   GET    /api/images?page=&pageSize=&imageSubType=&includeSystemImages=…
 *          → PageData<ImageResourceInfo> (SA: own-scope rows; TA:
 *          own tenant rows + system rows when includeSystemImages)
 *   GET    /api/images/{type}/{key}/info → ImageResourceInfo
 *   GET    /api/images/{type}/{key} → raw bytes (blob download)
 *   GET    /api/images/{type}/{key}/preview → downscaled PNG (blob)
 *   POST   /api/image → ImageResourceInfo (multipart file/title/imageSubType)
 *   PUT    /api/image/import → ImageResourceInfo (ImageExportData JSON)
 *   PUT    /api/images/{type}/{key} → ImageResourceInfo (multipart binary swap)
 *   PUT    /api/images/{type}/{key}/info → ImageResourceInfo (metadata only)
 *   PUT    /api/images/{type}/{key}/public/{isPublic} → ImageResourceInfo
 *   GET    /api/images/{type}/{key}/export → ImageExportData
 *   DELETE /api/images/{type}/{key}?force= → 200 on success;
 *          400 + TbImageDeleteResult (`success=false` + `references`) when
 *          still referenced — surfaced as ImageReferencedError so the UI can
 *          open the shared resources-in-use flow and retry with force=true
 *          (same contract as the resource domain's delete).
 *
 * `type` is the ownership scope: `tenant` | `system` (system = NULL tenant
 * id — imageResourceType() derives it from the row's tenantId).
 *
 * Blob reads (image bytes) run through loadImageBlob: a module-level
 * in-flight map dedupes concurrent fetches of the same link (ui-ngx
 * imagesLoading parity — a shared flight, NOT a long-lived cache); each
 * consumer turns the blob into its own objectURL and revokes it on unmount
 * (components/images/use-image-object-url.ts). <img src> must never point
 * at the protected endpoints directly.
 */

import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';
import type {
  ImageExportData,
  ImageResourceInfo,
  ImageResourceType,
} from '@/types/tb/image';
import { ResourceSubType, type ResourceReferences } from '@/types/tb/resource';

import { tbHttp } from './http';
import { referencesFromBody } from './resource';

const SERVER_ERROR_NAME = 'ServerErrorError';

/** TB's null-tenant UUID (EntityId.NULL_UUID) — the system marker. */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

/**
 * `tenant` | `system` from a row's tenantId (ui-ngx imageResourceType
 * parity; the backend derives the same scope server-side for `link`).
 */
export function imageResourceType(
  imageInfo: ImageResourceInfo,
): ImageResourceType {
  return imageInfo.tenantId?.id === NULL_UUID ? 'system' : 'tenant';
}

/** Encode a path segment the way the controllers expect (resourceKey). */
function encodedKey(resourceKey: string): string {
  return encodeURIComponent(resourceKey);
}

/**
 * GET /api/images — the gallery list. `includeSystemImages` only affects
 * TENANT sessions (SA always reads the own-scope channel server-side).
 */
export async function getImages(
  pageLink: PageLink,
  includeSystemImages = false,
  imageSubType: ResourceSubType = ResourceSubType.IMAGE,
): Promise<PageData<ImageResourceInfo>> {
  return tbHttp.get<PageData<ImageResourceInfo>>('/api/images', {
    ...pageLinkToQueryParams(pageLink),
    imageSubType,
    includeSystemImages,
  });
}

/** GET /api/images/{type}/{key}/info — single image metadata row. */
export async function getImageInfo(
  type: ImageResourceType,
  resourceKey: string,
): Promise<ImageResourceInfo> {
  return tbHttp.get<ImageResourceInfo>(
    `/api/images/${type}/${encodedKey(resourceKey)}/info`,
  );
}

/** POST /api/image — multipart create (file + title + imageSubType). */
export async function uploadImage(
  file: File | Blob,
  title: string,
  imageSubType: ResourceSubType = ResourceSubType.IMAGE,
): Promise<ImageResourceInfo> {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  form.append('imageSubType', imageSubType);
  return tbHttp.post<ImageResourceInfo>('/api/image', form);
}

/**
 * PUT /api/images/{type}/{key} — replace the image binary (multipart
 * `file`); the server re-derives the descriptor.
 */
export async function updateImage(
  type: ImageResourceType,
  resourceKey: string,
  file: File | Blob,
): Promise<ImageResourceInfo> {
  const form = new FormData();
  form.append('file', file);
  return tbHttp.put<ImageResourceInfo>(
    `/api/images/${type}/${encodedKey(resourceKey)}`,
    form,
  );
}

/** PUT /api/images/{type}/{key}/info — metadata-only update (title). */
export async function updateImageInfo(
  imageInfo: ImageResourceInfo,
): Promise<ImageResourceInfo> {
  const type = imageResourceType(imageInfo);
  return tbHttp.put<ImageResourceInfo>(
    `/api/images/${type}/${encodedKey(imageInfo.resourceKey ?? '')}/info`,
    imageInfo,
  );
}

/**
 * PUT /api/images/{type}/{key}/public/{isPublic} — flip the public embed
 * flag; the answer carries the (new) publicLink when public.
 */
export async function updateImagePublicStatus(
  imageInfo: ImageResourceInfo,
  isPublic: boolean,
): Promise<ImageResourceInfo> {
  const type = imageResourceType(imageInfo);
  return tbHttp.put<ImageResourceInfo>(
    `/api/images/${type}/${encodedKey(imageInfo.resourceKey ?? '')}/public/${isPublic}`,
    imageInfo,
  );
}

/** GET /api/images/{type}/{key} — the raw payload as a Blob. */
export async function downloadImage(
  type: ImageResourceType,
  resourceKey: string,
): Promise<Blob> {
  return tbHttp.request<Blob>(
    `/api/images/${type}/${encodedKey(resourceKey)}`,
    { method: 'GET', responseType: 'blob' },
  );
}

/** GET /api/images/{type}/{key}/export — the portable image JSON. */
export async function exportImage(
  type: ImageResourceType,
  resourceKey: string,
): Promise<ImageExportData> {
  return tbHttp.get<ImageExportData>(
    `/api/images/${type}/${encodedKey(resourceKey)}/export`,
  );
}

/** PUT /api/image/import — create an image from an ImageExportData. */
export async function importImage(
  imageData: ImageExportData,
): Promise<ImageResourceInfo> {
  return tbHttp.put<ImageResourceInfo>('/api/image/import', imageData);
}

/** The structured 400: the image is still referenced somewhere. */
export class ImageReferencedError extends Error {
  readonly references: ResourceReferences;

  constructor(references: ResourceReferences) {
    super('Image is referenced by other entities');
    this.name = 'ImageReferencedError';
    this.references = references;
  }
}

/**
 * DELETE /api/images/{type}/{key}?force= — 200 answers empty; 400 + the
 * TbImageDeleteResult body (`success=false` + `references`, only possible
 * with force=false) surfaces as ImageReferencedError. Any other failure
 * rethrows untouched.
 */
export async function deleteImage(
  type: ImageResourceType,
  resourceKey: string,
  force = false,
): Promise<void> {
  try {
    await tbHttp.delete(`/api/images/${type}/${encodedKey(resourceKey)}`, {
      force,
    });
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
        throw new ImageReferencedError(references);
      }
    }
    throw error;
  }
}

/**
 * In-flight blob fetches keyed by the exact request link — concurrent
 * callers of the SAME link share one flight (ui-ngx imagesLoading parity);
 * the entry is dropped once settled, so retries hit the network again.
 */
const blobFlights = new Map<string, Promise<Blob>>();

/**
 * Fetch the image bytes for an authenticated link (`image.link` or
 * `publicLink`). `preview=true` targets the downscaled `/preview` twin.
 * Never attach these links to <img src> directly — go through this loader
 * so the Authorization header is applied.
 */
export function loadImageBlob(link: string, preview = false): Promise<Blob> {
  const imageLink = preview ? `${link}/preview` : link;
  let flight = blobFlights.get(imageLink);
  if (!flight) {
    flight = tbHttp
      .request<Blob>(imageLink, { method: 'GET', responseType: 'blob' })
      .finally(() => {
        blobFlights.delete(imageLink);
      });
    blobFlights.set(imageLink, flight);
  }
  return flight;
}
