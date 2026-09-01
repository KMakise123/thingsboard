/**
 * Entity-view form primitives (spec 3.4 「实体选择器表单 parity」): the pure
 * mapping layer between the wire shape and the antd form — field values,
 * keys normalization (ui-ngx buildForm's nullable arrays), the
 * startTimeMs/endTimeMs payload and the max/min interlock of the two
 * datetime pickers (ui-ngx maxStartTimeMs = endTimeMs valueChanges and
 * minEndTimeMs = startTimeMs valueChanges).
 *
 * Everything here is dayjs-in/dayjs-out or number-in/number-out and free of
 * React so both the dialog and the detail header form share one source of
 * truth and the logic is directly unit-testable.
 */
import dayjs, { type Dayjs } from 'dayjs';
import type {
  EntityView,
  EntityViewKeys,
  EntityViewWrite,
  EpochMillis,
} from '@/types/tb';
import { EntityType } from '@/types/tb';

/** ui-ngx entity-view.component allowedEntityTypes. */
export const TARGET_ENTITY_TYPES: ReadonlyArray<EntityType> = [
  EntityType.DEVICE,
  EntityType.ASSET,
] as const;

/** Wire-shaped keys with the ui-ngx optional arrays normalized to lists. */
export interface NormalizedEntityViewKeys {
  timeseries: Array<string>;
  attributes: {
    cs: Array<string>;
    sh: Array<string>;
    ss: Array<string>;
  };
}

/** Flat form numbers (ms timestamps); the antd layer swaps in Dayjs. */
export interface EntityViewFormNumbers {
  name: string;
  type?: string;
  /** Target entity type (DEVICE | ASSET). */
  targetEntityType: EntityType;
  /** Target entity id (empty while unset). */
  targetEntityId: string;
  /** keys.attributes.cs */
  clientAttributes: Array<string>;
  /** keys.attributes.sh */
  sharedAttributes: Array<string>;
  /** keys.attributes.ss */
  serverAttributes: Array<string>;
  /** keys.timeseries */
  timeseriesKeys: Array<string>;
  startTimeMs?: EpochMillis;
  endTimeMs?: EpochMillis;
  /** additionalInfo.description */
  description: string;
}

/** Antd form values: the two timestamps as Dayjs for DatePicker. */
export interface EntityViewFormValues
  extends Omit<EntityViewFormNumbers, 'startTimeMs' | 'endTimeMs'> {
  startTimeMs?: Dayjs | null;
  endTimeMs?: Dayjs | null;
}

/** Null/missing wire arrays become empty lists (ui-ngx sends null). */
export function normalizeEntityViewKeys(
  keys?: EntityViewKeys,
): NormalizedEntityViewKeys {
  return {
    timeseries: keys?.timeseries ?? [],
    attributes: {
      cs: keys?.attributes?.cs ?? [],
      sh: keys?.attributes?.sh ?? [],
      ss: keys?.attributes?.ss ?? [],
    },
  };
}

export function entityViewToFormNumbers(
  entityView: EntityView,
): EntityViewFormNumbers {
  const keys = normalizeEntityViewKeys(entityView.keys);
  const info = (entityView.additionalInfo ?? {}) as { description?: string };
  return {
    name: entityView.name,
    type: entityView.type,
    targetEntityType: entityView.entityId?.entityType ?? EntityType.DEVICE,
    targetEntityId: entityView.entityId?.id ?? '',
    clientAttributes: keys.attributes.cs,
    sharedAttributes: keys.attributes.sh,
    serverAttributes: keys.attributes.ss,
    timeseriesKeys: keys.timeseries,
    startTimeMs: entityView.startTimeMs,
    endTimeMs: entityView.endTimeMs,
    description: info.description ?? '',
  };
}

export function formNumbersToFormValues(
  numbers: EntityViewFormNumbers,
): EntityViewFormValues {
  const { startTimeMs, endTimeMs, ...rest } = numbers;
  return {
    ...rest,
    startTimeMs: startTimeMs === undefined ? null : dayjs(startTimeMs),
    endTimeMs: endTimeMs === undefined ? null : dayjs(endTimeMs),
  };
}

export function formValuesToNumbers(
  values: EntityViewFormValues,
): EntityViewFormNumbers {
  const { startTimeMs, endTimeMs, ...rest } = values;
  return {
    ...rest,
    startTimeMs: startTimeMs ? startTimeMs.valueOf() : undefined,
    endTimeMs: endTimeMs ? endTimeMs.valueOf() : undefined,
  };
}

/** Form baseline for an empty create dialog (ui-ngx buildForm defaults). */
export function emptyFormNumbers(): EntityViewFormNumbers {
  return {
    name: '',
    type: undefined,
    targetEntityType: EntityType.DEVICE,
    targetEntityId: '',
    clientAttributes: [],
    sharedAttributes: [],
    serverAttributes: [],
    timeseriesKeys: [],
    startTimeMs: undefined,
    endTimeMs: undefined,
    description: '',
  };
}

/**
 * POST /api/entityView payload: create (`base` omitted) posts the form
 * fields only; update spreads the loaded entity back so server-assigned
 * fields (id/version/customer) survive. Keys always go out fully normalized
 * — clearing a key list must clear the propagation too.
 */
export function buildEntityViewPayload(
  numbers: EntityViewFormNumbers,
  base?: EntityView,
): EntityViewWrite {
  return {
    ...(base
      ? {
          id: base.id,
          createdTime: base.createdTime,
          version: base.version,
          tenantId: base.tenantId,
          customerId: base.customerId,
        }
      : {}),
    name: numbers.name.trim(),
    type: numbers.type?.trim() || undefined,
    entityId: {
      entityType: numbers.targetEntityType,
      id: numbers.targetEntityId,
    },
    keys: {
      timeseries: [...numbers.timeseriesKeys],
      attributes: {
        cs: [...numbers.clientAttributes],
        sh: [...numbers.sharedAttributes],
        ss: [...numbers.serverAttributes],
      },
    },
    startTimeMs: numbers.startTimeMs,
    endTimeMs: numbers.endTimeMs,
    additionalInfo: {
      ...(base?.additionalInfo ?? {}),
      description: numbers.description,
    },
  };
}

/** Field-by-field compare (arrays positional, like the wire round-trip). */
export function isEntityViewFormDirty(
  values: EntityViewFormNumbers,
  baseline: EntityViewFormNumbers,
): boolean {
  const sameList = (a: Array<string>, b: Array<string>) =>
    a.length === b.length && a.every((entry, index) => entry === b[index]);
  return (
    values.name !== baseline.name ||
    values.type !== baseline.type ||
    values.targetEntityType !== baseline.targetEntityType ||
    values.targetEntityId !== baseline.targetEntityId ||
    !sameList(values.clientAttributes, baseline.clientAttributes) ||
    !sameList(values.sharedAttributes, baseline.sharedAttributes) ||
    !sameList(values.serverAttributes, baseline.serverAttributes) ||
    !sameList(values.timeseriesKeys, baseline.timeseriesKeys) ||
    values.startTimeMs !== baseline.startTimeMs ||
    values.endTimeMs !== baseline.endTimeMs ||
    values.description !== baseline.description
  );
}

/** Exact-ms interlock rule: start must not be later than end. */
export function hasTimeRangeConflict(
  startMs?: EpochMillis,
  endMs?: EpochMillis,
): boolean {
  return startMs !== undefined && endMs !== undefined && startMs > endMs;
}

/** Day-granularity clamp for the start picker: nothing after end's day. */
export function isStartDateDisabled(day: Dayjs, endMs?: EpochMillis): boolean {
  return endMs !== undefined ? day.isAfter(dayjs(endMs), 'day') : false;
}

/** Day-granularity clamp for the end picker: nothing before start's day. */
export function isEndDateDisabled(day: Dayjs, startMs?: EpochMillis): boolean {
  return startMs !== undefined ? day.isBefore(dayjs(startMs), 'day') : false;
}

/** antd `disabledTime` shape (closures over the bound timestamp). */
export interface DisabledTimeConfig {
  disabledHours: () => Array<number>;
  disabledMinutes: (hour: number) => Array<number>;
  disabledSeconds: (hour: number, minute: number) => Array<number>;
}

const IDLE_DISABLED_TIME: DisabledTimeConfig = {
  disabledHours: () => [],
  disabledMinutes: () => [],
  disabledSeconds: () => [],
};

/** Inclusive integer range within the clock's unit bounds. */
function rangeInclusive(min: number, max: number): Array<number> {
  const result: Array<number> = [];
  for (let value = min; value <= max; value++) {
    result.push(value);
  }
  return result;
}

/**
 * Start picker time clamp: on end's day, disable everything after end's
 * h:m:s (same-day boundary h:m:s itself stays selectable — start === end is
 * a legal zero-length window).
 */
export function startDisabledTime(
  endMs?: EpochMillis,
): (current: Dayjs | null) => DisabledTimeConfig {
  return (current) => {
    if (
      endMs === undefined ||
      !current ||
      !current.isSame(dayjs(endMs), 'day')
    ) {
      return IDLE_DISABLED_TIME;
    }
    const end = dayjs(endMs);
    return {
      disabledHours: () => rangeInclusive(end.hour() + 1, 23),
      disabledMinutes: (hour) =>
        hour === end.hour() ? rangeInclusive(end.minute() + 1, 59) : [],
      disabledSeconds: (hour, minute) =>
        hour === end.hour() && minute === end.minute()
          ? rangeInclusive(end.second() + 1, 59)
          : [],
    };
  };
}

/** End picker time clamp: on start's day, disable everything before it. */
export function endDisabledTime(
  startMs?: EpochMillis,
): (current: Dayjs | null) => DisabledTimeConfig {
  return (current) => {
    if (
      startMs === undefined ||
      !current ||
      !current.isSame(dayjs(startMs), 'day')
    ) {
      return IDLE_DISABLED_TIME;
    }
    const start = dayjs(startMs);
    return {
      disabledHours: () => rangeInclusive(0, start.hour() - 1),
      disabledMinutes: (hour) =>
        hour === start.hour() ? rangeInclusive(0, start.minute() - 1) : [],
      disabledSeconds: (hour, minute) =>
        hour === start.hour() && minute === start.minute()
          ? rangeInclusive(0, start.second() - 1)
          : [],
    };
  };
}
