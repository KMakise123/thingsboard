/**
 * Handwritten authoritative TB-image wire types (M11 wave-2C).
 *
 * Source of truth (cross-checked, in priority order):
 *   - backend `ImageController.java` (this fork's application module) +
 *     `common/data/TbResourceInfo.java` (the image rows ARE TbResourceInfo;
 *     getLink()/getPublicLink() serialize as readonly `link`/`publicLink`).
 *   - openapi snapshot `/api/images/**` + `/api/image/**` operations.
 *   - ui-ngx `shared/models/resource.models.ts:96-122` for the frontend
 *     semantics (ImageDescriptor / ImageExportData / ImageResourceType).
 *
 * Wire realities pinned here:
 *   - SCADA symbols are image resources with `imageSubType=SCADA_SYMBOL`
 *     (same gallery, `type` = ownership scope `tenant|system`, key =
 *     resourceKey).
 *   - `link` is server-computed (`/api/images/{scope}/{key}`) and
 *     `publicLink` only appears on public images
 *     (`/api/images/public/{publicResourceKey}`) — the ONLY no-auth URL.
 *   - `public` is a server-serialized boolean (Jackson `isPublic()`).
 *   - the delete answer (TbImageDeleteResult) reuses the
 *     `{success, references}` shape handled by the resource domain.
 */

import type { ResourceScope, TbResourceInfo } from './resource';

/**
 * Ownership scope of an image row: `system` rows carry the NULL tenant
 * (TENANT users see them read-only), `tenant` rows are the caller's own.
 * ui-ngx ImageResourceType is the same union (TBResourceScope).
 */
export type ImageResourceType = ResourceScope;

/** Measured pixel/byte facts the backend stores per image payload. */
export interface ImageDescriptor {
  mediaType: string;
  width: number;
  height: number;
  /** Payload size in bytes. */
  size: number;
  etag: string;
  /** Downscaled PNG twin served by the `/preview` endpoint. */
  previewDescriptor?: ImageDescriptor;
}

/**
 * `GET /api/images` row and the info endpoints' answer. Every read returns
 * the id + link, so consumers can rely on them after any list call.
 */
export interface ImageResourceInfo extends TbResourceInfo<ImageDescriptor> {
  /** Server-computed authenticated URL (`/api/images/{scope}/{key}`). */
  readonly link?: string;
  /** Present ONLY while `public` — the no-auth embed URL. */
  readonly publicLink?: string;
  public?: boolean;
  [key: string]: unknown;
}

/** `GET /api/images/{type}/{key}/export` body — the portable image JSON. */
export interface ImageExportData {
  mediaType: string;
  fileName: string;
  title: string;
  /** ResourceSubType wire value (`IMAGE` | `SCADA_SYMBOL`). */
  subType: string;
  resourceKey: string;
  public: boolean;
  publicResourceKey: string;
  /** base64 text of the payload. */
  data: string;
}
