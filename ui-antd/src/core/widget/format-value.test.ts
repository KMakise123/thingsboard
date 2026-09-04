/**
 * formatValue behavior contract — ui-ngx core/utils.ts port (format-value.ts).
 * These tests lock the TB semantics compiled widgets get from widget-kit.
 */
import { describe, expect, it } from 'vitest';

import { formatValue } from './format-value';

describe('formatValue', () => {
  it('formats numbers with explicit decimals and strips trailing zeros', () => {
    expect(formatValue(5, 2)).toBe('5');
    expect(formatValue(2.678, 2)).toBe('2.68');
    expect(formatValue(2.5, 2, undefined, true)).toBe('2.50');
    expect(formatValue(2.5, 0)).toBe('3');
    // showZeroDecimals keeps the toFixed output verbatim (already rounded)
    expect(formatValue(2.5, 0, undefined, true)).toBe('3');
  });

  it('appends units with a single space', () => {
    expect(formatValue(41.2, 1, '°C')).toBe('41.2 °C');
    expect(formatValue(3, 0, 'm', true)).toBe('3 m');
  });

  it('formats numeric strings even without dec/units (gate clause 3)', () => {
    expect(formatValue('5')).toBe('5');
    expect(formatValue('5', 2)).toBe('5');
    // '12.30' !== Number('12.30').toString() ('12.3') → clause 3 misses and
    // the raw string passes through untouched (upstream behavior)
    expect(formatValue('12.30')).toBe('12.30');
  });

  it('formats plain numbers without dec/units as text', () => {
    // ui-ngx gate clause 3 uses strict ===, so the NUMBER 5 skips the
    // formatting branch and passes through; rendering stays '5'.
    expect(formatValue(5)).toBe('5');
  });

  it('passes non-numeric values through as text', () => {
    expect(formatValue(true)).toBe('true');
    expect(formatValue(false, 2)).toBe('false');
    expect(formatValue('offline')).toBe('offline');
    expect(formatValue({ a: 1 })).toBe('[object Object]');
  });

  it('maps null to empty string and undefined to undefined (upstream exact)', () => {
    expect(formatValue(null)).toBe('');
    expect(formatValue(null, 2, 'm')).toBe('');
    expect(formatValue(undefined)).toBeUndefined();
    expect(formatValue(undefined, 2)).toBeUndefined();
  });

  it('treats NaN strings as non-numeric', () => {
    expect(formatValue('abc')).toBe('abc');
    expect(formatValue('')).toBe('');
  });
});
