/**
 * Attribute / telemetry value display + edit-value helpers shared by the
 * attributes and latest-telemetry panels.
 */
import type { AttributeData } from '@/types/tb';

/** Value kinds the add/edit dialog can produce. */
export type AttributeValueKind = 'string' | 'number' | 'boolean' | 'json';

export function detectValueKind(value: unknown): AttributeValueKind {
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  ) {
    return 'json';
  }
  return 'string';
}

/** Parse a raw editor string into the wire value for the chosen kind. */
export function parseAttributeValue(
  raw: string,
  kind: AttributeValueKind,
): unknown {
  switch (kind) {
    case 'number': {
      return Number(raw);
    }
    case 'boolean': {
      return raw === 'true';
    }
    case 'json': {
      return JSON.parse(raw);
    }
    default:
      return raw;
  }
}

/** Human cell text: JSON pretty for structures, primitives verbatim. */
export function formatAttributeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Render hint: numeric telemetry wants tabular figures (spec 3.11).
 * Values arrive as JSON strings over both the REST snapshot and the WS
 * channel, so numeric *strings* must count as numeric too — otherwise the
 * tabular-nums hint never applies in practice.
 */
export function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number') {
    return true;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value));
  }
  return false;
}

/** Sort + client-side key filter (WS-backed table has no server pageLink). */
export function filterAttributeRows(
  rows: Array<AttributeData>,
  search: string,
): Array<AttributeData> {
  const needle = search.trim().toLowerCase();
  const sorted = [...rows].sort((a, b) => a.key.localeCompare(b.key));
  if (!needle) {
    return sorted;
  }
  return sorted.filter((row) => row.key.toLowerCase().includes(needle));
}
