/**
 * Image export / import pipelines (M11 wave-2C, spec §3.2).
 * ui-ngx shared/import-export/import-export.service.ts parity:
 *
 * - export: the /export read already returns the portable ImageExportData
 *   DTO — downloaded verbatim as `<fileName-without-extension>.json`
 *   (upstream exportToPc on the imageData itself, no field stripping);
 * - import: validate (mediaType/fileName/title/resourceKey/data all
 *   non-empty — validateImportedImage) → PUT /api/image/import.
 */

import {
  exportImage as exportImageApi,
  imageResourceType,
  importImage as importImageApi,
} from '@/services/tb/image';
import type { ImageExportData, ImageResourceInfo } from '@/types/tb/image';

/** blob → "Save as" (object URL released right after the click). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Upstream exportImage: `<fileName minus extension>.json`. */
export async function exportImageToFile(
  image: ImageResourceInfo,
): Promise<void> {
  const data = await exportImageApi(
    imageResourceType(image),
    image.resourceKey ?? '',
  );
  const baseName = (data.fileName || data.title || 'image').split('.')[0];
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `${baseName}.json`,
  );
}

/** Error carrying the locale key the import dialog should render. */
export class ImageImportError extends Error {
  localeKey: string;

  constructor(localeKey: string) {
    super(localeKey);
    this.name = 'ImageImportError';
    this.localeKey = localeKey;
  }
}

/** validateImportedImage parity: the five load-bearing strings. */
export function parseImageImport(text: string): ImageExportData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImageImportError('pages.resources.images.importParseError');
  }
  const data = parsed as ImageExportData | null;
  const nonEmpty = (value: unknown): boolean =>
    typeof value === 'string' && value.trim().length > 0;
  if (
    !data ||
    typeof data !== 'object' ||
    !nonEmpty(data.data) ||
    !nonEmpty(data.title) ||
    !nonEmpty(data.fileName) ||
    !nonEmpty(data.mediaType) ||
    !nonEmpty(data.resourceKey)
  ) {
    throw new ImageImportError('pages.resources.images.importInvalidError');
  }
  return data;
}

/** Full import pipeline: read file → validate → PUT /api/image/import. */
export async function importImageFromFile(
  file: File,
): Promise<ImageResourceInfo> {
  const data = parseImageImport(await file.text());
  return importImageApi(data);
}
