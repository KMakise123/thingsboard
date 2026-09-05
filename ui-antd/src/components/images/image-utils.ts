/**
 * Small image-domain presentational helpers shared by the gallery and the
 * dialogs (no antd imports — pure formatting).
 */

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
