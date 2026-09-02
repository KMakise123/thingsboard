/**
 * Global alarms page URL-state roundtrip: defaults stay out of the query
 * string, the custom timewindow range roundtrips, and a 'custom' selection
 * without a valid range falls back to all-time.
 */
import { describe, expect, it } from 'vitest';

import {
  parseAlarmsPageUrlState,
  serializeAlarmsPageUrlState,
} from './url-state';

describe('alarms page url state', () => {
  it('omits defaults when serializing', () => {
    const state = parseAlarmsPageUrlState('');
    expect(serializeAlarmsPageUrlState(state)).toBe('');
  });

  it('roundtrips a preset timewindow with the rest of the filters', () => {
    const query =
      'tab=alarm-rules&pageSize=30&status=ACTIVE,UNACK&severity=MAJOR&tw=7d&textSearch=%E9%AB%98%E6%B8%A9&propagated=1';
    const state = parseAlarmsPageUrlState(query);
    expect(state.tw).toBe('7d');
    expect(state.statusList).toEqual(['ACTIVE', 'UNACK']);
    expect(state.searchPropagatedAlarms).toBe(true);
    const again = parseAlarmsPageUrlState(
      `?${serializeAlarmsPageUrlState(state)}`,
    );
    expect(again).toEqual(state);
  });

  it('roundtrips the custom timewindow range', () => {
    const query = 'tw=custom&twStart=1700000000000&twEnd=1700086400000';
    const state = parseAlarmsPageUrlState(query);
    expect(state.tw).toBe('custom');
    expect(state.twStart).toBe(1_700_000_000_000);
    expect(state.twEnd).toBe(1_700_086_400_000);
    const again = parseAlarmsPageUrlState(
      `?${serializeAlarmsPageUrlState(state)}`,
    );
    expect(again).toEqual(state);
  });

  it('falls back to all-time when the custom range is missing or invalid', () => {
    expect(parseAlarmsPageUrlState('?tw=custom').tw).toBe('all');
    expect(parseAlarmsPageUrlState('?tw=custom&twStart=100&twEnd=50').tw).toBe(
      'all',
    );
    expect(parseAlarmsPageUrlState('?tw=bogus').tw).toBe('all');
  });
});
