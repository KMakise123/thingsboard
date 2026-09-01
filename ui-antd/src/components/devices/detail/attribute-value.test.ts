/**
 * Unit tests for the shared attribute/telemetry value helpers. The numeric
 * hint matters for spec 3.11 (tabular-nums on numeric columns): values
 * arrive as JSON strings over both the REST snapshot and the WS channel,
 * so numeric *strings* must be recognized too.
 */
import { describe, expect, it } from 'vitest';

import { isNumericValue } from './attribute-value';

describe('isNumericValue', () => {
  it('matches real numbers', () => {
    expect(isNumericValue(42)).toBe(true);
    expect(isNumericValue(-1.5)).toBe(true);
    expect(isNumericValue(0)).toBe(true);
  });

  it('matches numeric strings (the wire format of attribute/telemetry values)', () => {
    expect(isNumericValue('42')).toBe(true);
    expect(isNumericValue('84.0')).toBe(true);
    expect(isNumericValue('-1.5')).toBe(true);
    expect(isNumericValue(' 12 ')).toBe(true);
    expect(isNumericValue('1e3')).toBe(true);
  });

  it('rejects non-numeric payloads', () => {
    expect(isNumericValue('')).toBe(false);
    expect(isNumericValue('   ')).toBe(false);
    expect(isNumericValue('abc')).toBe(false);
    expect(isNumericValue('12abc')).toBe(false);
    expect(isNumericValue('true')).toBe(false);
    expect(isNumericValue(null)).toBe(false);
    expect(isNumericValue(undefined)).toBe(false);
    expect(isNumericValue({ a: 1 })).toBe(false);
    expect(isNumericValue([1, 2])).toBe(false);
  });
});
