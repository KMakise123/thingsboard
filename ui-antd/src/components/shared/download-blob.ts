/**
 * Blob → browser "Save as" download, the single shared implementation
 * (M11 X-wave review: previously four page-local copies with the same
 * semantics — images, widget types, JS library, SCADA symbol editor).
 */

/** Downloads `blob` as `fileName` (anchor-click, revoke right after). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
