/**
 * Escalation-chain pure logic tests — wire table ↔ editor rows, validity
 * gates, and the delay unit picker math.
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STAGE_DELAY_SEC,
  MAX_STAGE_DELAY_SEC,
  MIN_STAGE_DELAY_SEC,
  clearRuleEnabled,
  delaySecToPicker,
  escalationTableIsValid,
  escalationTableToRows,
  pickerToDelaySec,
  rowsToEscalationTable,
} from './escalations-logic';

describe('escalationTableToRows', () => {
  it('returns a single immediate row for an empty table', () => {
    expect(escalationTableToRows(undefined)).toEqual([
      { delayInSec: 0, targets: [] },
    ]);
    expect(escalationTableToRows({})).toEqual([
      { delayInSec: 0, targets: [] },
    ]);
  });

  it('maps wire keys (seconds strings) to rows in ascending delay order', () => {
    expect(
      escalationTableToRows({
        3600: ['t-2'],
        0: ['t-1'],
        86400: ['t-3', 't-4'],
      }),
    ).toEqual([
      { delayInSec: 0, targets: ['t-1'] },
      { delayInSec: 3600, targets: ['t-2'] },
      { delayInSec: 86400, targets: ['t-3', 't-4'] },
    ]);
  });
});

describe('rowsToEscalationTable', () => {
  it('round-trips through the wire shape', () => {
    const table = { 0: ['t-1'], 600: ['t-2', 't-3'] };
    expect(rowsToEscalationTable(escalationTableToRows(table))).toEqual(table);
  });

  it('serializes delays as string keys (JSON object shape)', () => {
    expect(
      Object.keys(rowsToEscalationTable([{ delayInSec: 60, targets: ['x'] }])),
    ).toEqual(['60']);
  });
});

describe('escalationTableIsValid', () => {
  it('rejects empty tables and stages without targets', () => {
    expect(escalationTableIsValid(undefined)).toBe(false);
    expect(escalationTableIsValid({ 0: [] })).toBe(false);
  });

  it('accepts an immediate stage with targets', () => {
    expect(escalationTableIsValid({ 0: ['t-1'] })).toBe(true);
  });

  it('rejects later stages outside 1 minute … 7 days', () => {
    expect(escalationTableIsValid({ 0: ['t-1'], 59: ['t-2'] })).toBe(false);
    expect(
      escalationTableIsValid({ 0: ['t-1'], [MAX_STAGE_DELAY_SEC + 1]: ['t-2'] }),
    ).toBe(false);
    expect(
      escalationTableIsValid({ 0: ['t-1'], [MIN_STAGE_DELAY_SEC]: ['t-2'] }),
    ).toBe(true);
    expect(
      escalationTableIsValid({ 0: ['t-1'], [MAX_STAGE_DELAY_SEC]: ['t-2'] }),
    ).toBe(true);
  });
});

describe('clearRuleEnabled', () => {
  it('is only true for chains with more than one stage', () => {
    expect(clearRuleEnabled(undefined)).toBe(false);
    expect(clearRuleEnabled({ 0: ['t-1'] })).toBe(false);
    expect(clearRuleEnabled({ 0: ['t-1'], 60: ['t-2'] })).toBe(true);
  });
});

describe('delay unit picker', () => {
  it('prefers the largest unit that divides evenly', () => {
    expect(delaySecToPicker(86400)).toEqual({ value: 1, unit: 'days' });
    expect(delaySecToPicker(DEFAULT_STAGE_DELAY_SEC)).toEqual({
      value: 1,
      unit: 'hours',
    });
    expect(delaySecToPicker(MIN_STAGE_DELAY_SEC)).toEqual({
      value: 1,
      unit: 'minutes',
    });
    // Legacy non-round seconds fall back to (possibly fractional) minutes.
    expect(delaySecToPicker(90)).toEqual({ value: 1.5, unit: 'minutes' });
  });

  it('converts back and clamps to the stage bounds', () => {
    expect(pickerToDelaySec(2, 'hours')).toBe(7200);
    expect(pickerToDelaySec(0, 'minutes')).toBe(MIN_STAGE_DELAY_SEC);
    expect(pickerToDelaySec(99, 'days')).toBe(MAX_STAGE_DELAY_SEC);
  });
});
