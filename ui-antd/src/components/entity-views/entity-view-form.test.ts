/**
 * Entity-view form primitive tests: keys normalization (ui-ngx nullable
 * arrays), the payload round-trip (create vs update shape), the dirty
 * compare and the startTimeMs/endTimeMs interlock (day clamp + same-day
 * h:m:s clamp + exact-ms validator rule).
 */

import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import type { EntityView } from '@/types/tb';
import { EntityType } from '@/types/tb';
import {
  buildEntityViewPayload,
  emptyFormNumbers,
  endDisabledTime,
  entityViewToFormNumbers,
  formNumbersToFormValues,
  formValuesToNumbers,
  hasTimeRangeConflict,
  isEndDateDisabled,
  isEntityViewFormDirty,
  isStartDateDisabled,
  normalizeEntityViewKeys,
  startDisabledTime,
} from './entity-view-form';

const BASE_ENTITY_VIEW: EntityView = {
  id: { entityType: EntityType.ENTITY_VIEW, id: 'ev-1' },
  createdTime: 1_700_000_000_000,
  version: 3,
  entityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
  name: 'Room view',
  type: 'Thermometer',
  keys: {
    timeseries: ['temperature'],
    attributes: { cs: ['alive'], ss: ['firmware'] },
  },
  startTimeMs: 1_700_000_000_000,
  endTimeMs: 1_700_086_400_000,
  additionalInfo: { description: 'desc', gateway: false },
};

describe('normalizeEntityViewKeys', () => {
  it('fills missing wire arrays with empty lists', () => {
    expect(normalizeEntityViewKeys(undefined)).toEqual({
      timeseries: [],
      attributes: { cs: [], sh: [], ss: [] },
    });
    expect(normalizeEntityViewKeys({ timeseries: ['t1'] })).toEqual({
      timeseries: ['t1'],
      attributes: { cs: [], sh: [], ss: [] },
    });
  });
});

describe('entityViewToFormNumbers / buildEntityViewPayload', () => {
  it('maps the wire shape to flat form numbers and back (update keeps identity)', () => {
    const numbers = entityViewToFormNumbers(BASE_ENTITY_VIEW);
    expect(numbers).toMatchObject({
      name: 'Room view',
      type: 'Thermometer',
      targetEntityType: EntityType.DEVICE,
      targetEntityId: 'dev-1',
      clientAttributes: ['alive'],
      sharedAttributes: [],
      serverAttributes: ['firmware'],
      timeseriesKeys: ['temperature'],
      description: 'desc',
    });

    const payload = buildEntityViewPayload(numbers, BASE_ENTITY_VIEW);
    expect(payload.id).toEqual(BASE_ENTITY_VIEW.id);
    expect(payload.version).toBe(3);
    expect(payload.customerId).toBeUndefined();
    expect(payload.keys).toEqual({
      timeseries: ['temperature'],
      attributes: { cs: ['alive'], sh: [], ss: ['firmware'] },
    });
    // Unrelated additionalInfo entries survive the description write.
    expect(payload.additionalInfo).toEqual({
      description: 'desc',
      gateway: false,
    });
  });

  it('create payload omits server-assigned fields and normalizes keys', () => {
    const numbers = {
      ...emptyFormNumbers(),
      name: '  New view  ',
      type: 'Wall',
      targetEntityType: EntityType.ASSET,
      targetEntityId: 'asset-1',
    };
    const payload = buildEntityViewPayload(numbers);
    expect(payload.id).toBeUndefined();
    expect(payload.createdTime).toBeUndefined();
    expect(payload.name).toBe('New view');
    expect(payload.type).toBe('Wall');
    expect(payload.entityId).toEqual({
      entityType: EntityType.ASSET,
      id: 'asset-1',
    });
    expect(payload.keys).toEqual({
      timeseries: [],
      attributes: { cs: [], sh: [], ss: [] },
    });
  });
});

describe('form value conversions', () => {
  it('swaps ms timestamps for Dayjs and back losslessly', () => {
    const numbers = {
      ...emptyFormNumbers(),
      startTimeMs: 1_700_000_000_000,
      endTimeMs: 1_700_086_400_000,
    };
    const values = formNumbersToFormValues(numbers);
    expect(values.startTimeMs?.valueOf()).toBe(1_700_000_000_000);
    expect(values.endTimeMs?.valueOf()).toBe(1_700_086_400_000);
    expect(formValuesToNumbers(values)).toEqual(numbers);
  });

  it('keeps cleared timestamps unset', () => {
    const values = { ...formNumbersToFormValues(emptyFormNumbers()) };
    values.startTimeMs = null;
    values.endTimeMs = null;
    const numbers = formValuesToNumbers(values);
    expect(numbers.startTimeMs).toBeUndefined();
    expect(numbers.endTimeMs).toBeUndefined();
  });
});

describe('isEntityViewFormDirty', () => {
  it('detects every editable field and ignores equal states', () => {
    const baseline = entityViewToFormNumbers(BASE_ENTITY_VIEW);
    expect(isEntityViewFormDirty(baseline, baseline)).toBe(false);
    expect(
      isEntityViewFormDirty(
        { ...baseline, timeseriesKeys: ['humidity'] },
        baseline,
      ),
    ).toBe(true);
    expect(
      isEntityViewFormDirty(
        { ...baseline, endTimeMs: (baseline.endTimeMs ?? 0) + 1 },
        baseline,
      ),
    ).toBe(true);
    expect(
      isEntityViewFormDirty({ ...baseline, targetEntityId: 'dev-2' }, baseline),
    ).toBe(true);
  });
});

describe('time-range interlock', () => {
  it('flags start > end only', () => {
    expect(hasTimeRangeConflict(200, 100)).toBe(true);
    expect(hasTimeRangeConflict(100, 100)).toBe(false);
    expect(hasTimeRangeConflict(100, 200)).toBe(false);
    expect(hasTimeRangeConflict(100, undefined)).toBe(false);
    expect(hasTimeRangeConflict(undefined, 100)).toBe(false);
  });

  it('day clamp blocks out-of-window days only', () => {
    const end = dayjs('2026-05-10T08:30:00');
    expect(
      isStartDateDisabled(dayjs('2026-05-11T00:00:00'), end.valueOf()),
    ).toBe(true);
    expect(
      isStartDateDisabled(dayjs('2026-05-10T23:59:00'), end.valueOf()),
    ).toBe(false);
    const start = dayjs('2026-05-10T08:30:00');
    expect(
      isEndDateDisabled(dayjs('2026-05-09T12:00:00'), start.valueOf()),
    ).toBe(true);
    expect(
      isEndDateDisabled(dayjs('2026-05-10T00:00:00'), start.valueOf()),
    ).toBe(false);
    expect(isStartDateDisabled(dayjs('2026-01-01T00:00:00'), undefined)).toBe(
      false,
    );
  });

  it('same-day time clamp disables after-end / before-start h:m:s', () => {
    const fromTo = (min: number, max: number) => {
      const out: Array<number> = [];
      for (let v = min; v <= max; v++) {
        out.push(v);
      }
      return out;
    };

    const end = dayjs('2026-05-10T08:30:15');
    const startClamp = startDisabledTime(end.valueOf())(
      dayjs('2026-05-10T00:00:00'),
    );
    expect(startClamp.disabledHours()).toEqual(fromTo(9, 23));
    expect(startClamp.disabledMinutes(8)).toEqual(fromTo(31, 59));
    expect(startClamp.disabledMinutes(7)).toEqual([]);
    expect(startClamp.disabledSeconds(8, 30)).toEqual(fromTo(16, 59));
    expect(startClamp.disabledSeconds(8, 31)).toEqual([]);

    // Same clamp idle on any other day.
    const idle = startDisabledTime(end.valueOf())(dayjs('2026-05-11T08:30:00'));
    expect(idle.disabledHours()).toEqual([]);

    const start = dayjs('2026-05-10T08:30:15');
    const endClamp = endDisabledTime(start.valueOf())(
      dayjs('2026-05-10T08:30:00'),
    );
    expect(endClamp.disabledHours()).toEqual(fromTo(0, 7));
    expect(endClamp.disabledMinutes(8)).toEqual(fromTo(0, 29));
    expect(endClamp.disabledMinutes(9)).toEqual([]);
    expect(endClamp.disabledSeconds(8, 30)).toEqual(fromTo(0, 14));
    expect(endClamp.disabledSeconds(8, 31)).toEqual([]);
  });
});
