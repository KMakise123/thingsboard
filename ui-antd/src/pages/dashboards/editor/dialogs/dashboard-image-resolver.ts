/**
 * Dashboard image link resolver (M10 D2, ui-ngx parity anchor:
 * core/http/image.service resolveImageUrl + shared/models/resource.models).
 *
 * The server stores uploaded dashboard images in the image subsystem and
 * writes back `tb-image;/api/images/<scope>/<key>` links (TB 4.x). A bare
 * `<img src>` can neither use the prefixed link (relative-URL 404) nor
 * carry the Bearer token a resource GET needs, so resource links are
 * fetched through the shared authed transport as a Blob and surfaced as an
 * object URL. Anything else (data URLs from a fresh upload, external URLs)
 * renders untouched.
 */

import { tbHttp } from '@/services/tb/http';

/** ui-ngx shared/models/resource.models TB_IMAGE_PREFIX. */
export const TB_IMAGE_PREFIX = 'tb-image;';

const IMAGES_URL_REGEXP = /\/api\/images\/(tenant|system)\/(.*)/;

/** Strip the tb-image; prefix (no-op for unprefixed values). */
export function removeTbImagePrefix(url: string): string {
  return url ? url.replace(TB_IMAGE_PREFIX, '') : url;
}

/** True for /api/images/{tenant|system}/{key} resource links. */
export function isImageResourceUrl(url: string): boolean {
  return Boolean(url) && IMAGES_URL_REGEXP.test(url);
}

/**
 * Resolve a persisted image value into a renderable `<img>` src.
 * Returns null when an authed resource fetch fails — the caller renders
 * the empty placeholder instead of a broken image.
 */
export async function resolveDashboardImageSrc(
  image: string,
): Promise<string | null> {
  const url = removeTbImagePrefix(image);
  if (!isImageResourceUrl(url)) {
    return url;
  }
  // ui-ngx encodes the key segment (keys may carry non-ASCII, e.g. names
  // derived from the dashboard title).
  const parts = url.split('/');
  parts[parts.length - 1] = encodeURIComponent(parts[parts.length - 1]);
  try {
    const blob = await tbHttp.request<Blob>(parts.join('/'), {
      method: 'GET',
      responseType: 'blob',
    });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
