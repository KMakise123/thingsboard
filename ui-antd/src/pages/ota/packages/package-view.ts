/**
 * OTA package display helpers shared by the list and detail pages (M13
 * wave-2, spec §5.5). Pure functions, no React — mirrors the pieces of
 * ui-ngx ota-update-table-config.resolve.ts that render cells and gate the
 * download action.
 */
import type { OtaPackageInfo } from '@/types/tb/ota';
import { ChecksumAlgorithm, otaPackageHasUrl } from '@/types/tb/ota';

/** Cell text is truncated at 20 chars with an ellipsis (ui-ngx parity). */
export function truncateCell(text: string, max = 20): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** "ALGORITHM: value" cell text for the checksum column. */
export function checksumText(pkg: OtaPackageInfo): string {
  return `${pkg.checksumAlgorithm ?? ''}: ${pkg.checksum ?? ''}`;
}

type SizeUnit = 'bytes' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';

const SIZE_UNITS: Array<SizeUnit> = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

const SIZE_PRECISION: Record<SizeUnit, number> = {
  bytes: 0,
  KB: 1,
  MB: 1,
  GB: 1,
  TB: 2,
  PB: 2,
};

/** Human-readable file size, ui-ngx FileSizePipe parity (1024-based). */
export function formatDataSize(bytes: number): string {
  if (!Number.isFinite(bytes)) {
    return '?';
  }
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const unit = SIZE_UNITS[unitIndex];
  return `${value.toFixed(SIZE_PRECISION[unit])} ${unit}`;
}

/**
 * ui-ngx download gate (`isEnabled: (pkg) => pkg.hasData && !pkg.url`):
 * enabled only for file packages that actually carry data. The wire has no
 * hasUrl — URL-type is derived from a non-empty `url`.
 */
export function downloadDisabledFor(pkg: OtaPackageInfo): boolean {
  return !(pkg.hasData && !otaPackageHasUrl(pkg));
}

/**
 * ui-ngx exportPackage branch: URL packages open the external link in a new
 * window, file packages stream the blob from the download endpoint. (The
 * button is disabled for URL packages by downloadDisabledFor; the branch is
 * kept for parity and safety.)
 */
export function openPackageExternalUrl(pkg: OtaPackageInfo): void {
  window.open(pkg.url, '_blank', 'noopener');
}

/** The 7 algorithms the multipart upload accepts; SHA256 is the default. */
export const CHECKSUM_ALGORITHMS: Array<ChecksumAlgorithm> = [
  ChecksumAlgorithm.MD5,
  ChecksumAlgorithm.SHA256,
  ChecksumAlgorithm.SHA384,
  ChecksumAlgorithm.SHA512,
  ChecksumAlgorithm.CRC32,
  ChecksumAlgorithm.MURMUR3_32,
  ChecksumAlgorithm.MURMUR3_128,
];

/** ui-ngx auto-tag: `(title + ' ' + version).trim()` while tag is pristine. */
export function autoTag(title?: string, version?: string): string {
  return `${title ?? ''} ${version ?? ''}`.trim();
}
