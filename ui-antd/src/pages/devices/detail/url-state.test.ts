/**
 * Detail tab URL state: parse/serialize round-trip + unknown-value fallback
 * (bookmark restore contract, spec 3.3).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { DETAIL_TABS, parseDetailTab, serializeDetailTab } from './url-state';

describe('device detail tab url state', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/devices/abc');
  });

  it('parses every known tab key', () => {
    for (const tab of DETAIL_TABS) {
      expect(parseDetailTab(`?tab=${tab}`)).toBe(tab);
    }
  });

  it('falls back to details for missing or unknown values', () => {
    expect(parseDetailTab('')).toBe('details');
    expect(parseDetailTab('?tab=nonsense')).toBe('details');
    expect(parseDetailTab('?other=1')).toBe('details');
  });

  it('serializes non-default tabs and omits the default', () => {
    expect(serializeDetailTab('attributes')).toBe('tab=attributes');
    expect(serializeDetailTab('details')).toBe('');
  });

  it('round-trips through the query string', () => {
    for (const tab of DETAIL_TABS) {
      const query = serializeDetailTab(tab);
      expect(parseDetailTab(query ? `?${query}` : '')).toBe(tab);
    }
  });
});
