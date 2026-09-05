/**
 * Small image-domain presentational helpers shared by the gallery, the
 * dialogs and the image inputs (no antd imports — pure formatting and
 * link-type classification).
 */

/** Wire prefix marking a value as a TB image resource link. */
export const TB_IMAGE_PREFIX = 'tb-image;';

/** `tb-image;/api/images/tenant/key` → `/api/images/tenant/key`. */
export function removeTbImagePrefix(url: string | undefined): string {
  return url ? url.replace(TB_IMAGE_PREFIX, '') : '';
}

/** Prefix non-empty links; empty/already-prefixed pass through. */
export function prependTbImagePrefix(url: string): string {
  if (url && !url.startsWith(TB_IMAGE_PREFIX)) {
    return TB_IMAGE_PREFIX + url;
  }
  return url;
}

/** Authenticated image-resource URLs (`/api/images/{scope}/{key}[…]`). */
export function isImageResourceUrl(url: string): boolean {
  return /^\/api\/images\/(tenant|system|public)\/.+/i.test(url);
}

/** Inline base64 data URLs (`data:image/…`). */
export function isBase64DataImageUrl(url: string): boolean {
  return url.startsWith('data:image/');
}

/** Human-readable byte size (B/KB/MB/GB), TB-gallery size-column parity. */
export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || Number.isNaN(bytes)) {
    return '-';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit += 1;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** `W×H` resolution label from the descriptor. */
export function formatResolution(
  descriptor: { width?: number; height?: number } | undefined,
): string {
  if (!descriptor?.width || !descriptor.height) {
    return '-';
  }
  return `${descriptor.width}×${descriptor.height}`;
}
