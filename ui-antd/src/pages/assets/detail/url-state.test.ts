/**
 * Asset-detail tab URL state tests: 8-tab set (no details tab), the asset
 * TA-only set, default = attributes and hostile-value fallback.
 */
import { describe, expect, it } from 'vitest';

import {
  isTaOnlyDetailTab,
  parseDetailTab,
  serializeDetailTab,
} from './url-state';

describe('asset detail tab url state', () => {
  it('defaults to attributes when the query string carries no tab', () => {
    expect(parseDetailTab('')).toBe('attributes');
  });

  it('parses known tabs and falls back to the default on unknown values', () => {
    expect(parseDetailTab('?tab=alarms')).toBe('alarms');
    expect(parseDetailTab('?tab=details')).toBe('attributes');
    expect(parseDetailTab('?tab=../admin')).toBe('attributes');
  });

  it('serializes nothing for the default tab', () => {
    expect(serializeDetailTab('attributes')).toBe('');
    expect(serializeDetailTab('relations')).toBe('tab=relations');
  });

  it('marks exactly the four TA-only asset tabs', () => {
    expect(isTaOnlyDetailTab('calculated-fields')).toBe(true);
    expect(isTaOnlyDetailTab('alarm-rules')).toBe(true);
    expect(isTaOnlyDetailTab('audit-logs')).toBe(true);
    expect(isTaOnlyDetailTab('version-control')).toBe(true);
    expect(isTaOnlyDetailTab('attributes')).toBe(false);
    expect(isTaOnlyDetailTab('alarms')).toBe(false);
    expect(isTaOnlyDetailTab('relations')).toBe(false);
    expect(isTaOnlyDetailTab('latest-telemetry')).toBe(false);
  });
});
