/**
 * Metadata validity gate (M11 wave-2D) — the same rules the ui-ngx
 * metadata form enforces (title required, widget sizes 1-24,
 * scada-symbol-metadata.component.ts:138-148), expressed as a pure
 * predicate so the page can gate the save chain without Form internals.
 */
import type { ScadaSymbolMetadata } from '@/core/scada/symbol-metadata';

export const MIN_WIDGET_SIZE = 1;
export const MAX_WIDGET_SIZE = 24;

export const isPositiveIntInRange = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_WIDGET_SIZE &&
  value <= MAX_WIDGET_SIZE;

export const isMetadataValid = (
  metadata: ScadaSymbolMetadata | null,
): boolean => {
  if (!metadata) {
    return false;
  }
  if (!metadata.title?.trim()) {
    return false;
  }
  if (!isPositiveIntInRange(metadata.widgetSizeX)) {
    return false;
  }
  if (!isPositiveIntInRange(metadata.widgetSizeY)) {
    return false;
  }
  return true;
};
