/**
 * Entity-view detail tab URL state tests: six-tab parse/serialize with
 * `attributes` as the default (no details tab here) and the TA-only set.
 */
import { describe, expect, it } from 'vitest';
import {
  isTaOnlyDetailTab,
  parseDetailTab,
  serializeDetailTab,
} from './url-state';

describe('entity-view detail tab url state', () => {
  it('defaults to attributes for an empty or unknown ?tab=', () => {
    expect(parseDetailTab('')).toBe('attributes');
    expect(parseDetailTab('?tab=nonexistent')).toBe('attributes');
    // Device-only / asset-only tabs are not part of the entity-view set.
    expect(parseDetailTab('?tab=details')).toBe('attributes');
    expect(parseDetailTab('?tab=calculated-fields')).toBe('attributes');
    expect(parseDetailTab('?tab=events')).toBe('attributes');
  });

  it('parses every entity-view tab', () => {
    expect(parseDetailTab('?tab=attributes')).toBe('attributes');
    expect(parseDetailTab('?tab=latest-telemetry')).toBe('latest-telemetry');
    expect(parseDetailTab('?tab=alarms')).toBe('alarms');
    expect(parseDetailTab('?tab=relations')).toBe('relations');
    expect(parseDetailTab('?tab=audit-logs')).toBe('audit-logs');
    expect(parseDetailTab('?tab=version-control')).toBe('version-control');
  });

  it('serializes the default tab as empty and others as ?tab=', () => {
    expect(serializeDetailTab('attributes')).toBe('');
    expect(serializeDetailTab('relations')).toBe('tab=relations');
  });

  it('marks audit-logs and version-control TA-only', () => {
    expect(isTaOnlyDetailTab('audit-logs')).toBe(true);
    expect(isTaOnlyDetailTab('version-control')).toBe(true);
    expect(isTaOnlyDetailTab('attributes')).toBe(false);
    expect(isTaOnlyDetailTab('alarms')).toBe(false);
  });
});
