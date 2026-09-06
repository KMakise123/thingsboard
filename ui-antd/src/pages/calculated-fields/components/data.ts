/**
 * Calculated-fields domain pure functions + constants (M14 wave-4, R13/R14/R19).
 *
 * Anchored on ui-ngx `shared/models/calculated-field.models.ts` +
 * `core/services/calculated-field-form.service.ts` (type-switch rule /
 * prepareConfig / default script) and the backend TbelCfArg wire shapes
 * (common/script/api/tbel/TbelCfArg.java) for the testScript payloads.
 */

import type {
  AggInterval,
  AggIntervalType,
  CalculatedFieldAggMetric,
  CalculatedFieldArgument,
  CalculatedFieldConfiguration,
  CalculatedFieldDebugSettings,
  CalculatedFieldGeofencingZoneGroup,
  CalculatedFieldType,
  EntityCoordinates,
  Output,
  RelationPathLevel,
  TimeSeriesOutput,
} from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import { AttributeScope } from '@/types/tb/telemetry';

/** Entity types that can host a calculated field (ngx calculatedFieldsEntityTypeList). */
export const CF_SUPPORTED_ENTITY_TYPES = [
  'DEVICE',
  'ASSET',
  'DEVICE_PROFILE',
  'ASSET_PROFILE',
] as const;

export type CfHostEntityType = (typeof CF_SUPPORTED_ENTITY_TYPES)[number];

/**
 * The six types offered on the standalone page — every CalculatedFieldType
 * EXCEPT ALARM (ngx calculatedFieldTypes filter, R18; the backend list
 * endpoint also defaults to all-minus-ALARM).
 */
export const CF_PAGE_TYPES: Array<CalculatedFieldType> = [
  'SIMPLE',
  'SCRIPT',
  'PROPAGATION',
  'RELATED_ENTITIES_AGGREGATION',
  'ENTITY_AGGREGATION',
  'GEOFENCING',
];

/** Types whose configuration survives a switch INTO this type (ngx setupTypeChange). */
const SIMPLE_FAMILY: Array<CalculatedFieldType> = ['SIMPLE', 'SCRIPT'];

/** ngx FORBIDDEN_NAMES — reserved identifiers inside expressions. */
export const CF_ARGUMENT_FORBIDDEN_NAMES: ReadonlyArray<string> = [
  'ctx',
  'e',
  'pi',
];

/**
 * Propagation without an expression passes keys straight through, so the
 * argument name IS the output key — `propagationCtx` joins the reserved
 * names (ngx propagate-arguments-table forbiddenNames).
 */
export const CF_PROPAGATION_FORBIDDEN_NAMES: ReadonlyArray<string> = [
  ...CF_ARGUMENT_FORBIDDEN_NAMES,
  'propagationCtx',
];

/**
 * ngx propagation/related-agg/zone-panel relationType options are FRONTEND
 * hardcoded `['Contains', 'Manages']` (scout-cf §14-9) — collected here as
 * the sanctioned constant instead of three inline copies.
 */
export const CF_RELATION_TYPES: ReadonlyArray<string> = ['Contains', 'Manages'];

/** Aggregation metric functions (ngx AggFunction). */
export const CF_AGG_FUNCTIONS = [
  'AVG',
  'MIN',
  'MAX',
  'SUM',
  'COUNT',
  'COUNT_UNIQUE',
] as const;

/** Geofencing zone report strategies (ngx GeofencingReportStrategy). */
export const CF_REPORT_STRATEGIES = [
  'REPORT_TRANSITION_EVENTS_AND_PRESENCE_STATUS',
  'REPORT_TRANSITION_EVENTS_ONLY',
  'REPORT_PRESENCE_STATUS_ONLY',
] as const;

/**
 * Calendar interval lengths in SECONDS (ngx time.models: DAY 86400,
 * WEEK 7d, AVG_MONTH floor(30.44d), AVG_QUARTER floor(365.2425d/4),
 * YEAR 365d) — drives the produceIntermediateResult threshold and the
 * CUSTOM/offset bounds.
 */
export const CF_AGG_INTERVAL_SECONDS: Record<AggIntervalType, number> = {
  HOUR: 3600,
  DAY: 86400,
  WEEK: 7 * 86400,
  WEEK_SUN_SAT: 7 * 86400,
  MONTH: Math.floor(30.44 * 86400),
  QUARTER: Math.floor((86400 * 365.2425) / 4),
  YEAR: 365 * 86400,
  CUSTOM: 0,
};

/** ngx calculatedFieldMetricFilterDefaultScript. */
export const CF_METRIC_FILTER_DEFAULT_SCRIPT = [
  '// Sample filter script to include only active and unoccupied parking spaces',
  '// Goal: Count only parking spaces that are active and currently free',
  '',
  'return active == true && occupied == false;',
].join('\n');

/** ngx calculatedFieldMetricMapDefaultScript. */
export const CF_METRIC_MAP_DEFAULT_SCRIPT = [
  '// Sample map script to convert temperature from Fahrenheit to Celsius',
  '// Goal: Apply conversion per entity before aggregation (e.g., for average temperature)',
  '',
  'var temperatureC = (temperature - 32) / 1.8;',
  'return toFixed(temperatureC, 2);',
].join('\n');

/** Max levels of a RELATION_QUERY path (CF_LIMITS.maxRelationLevelPerCfArgument). */
export const CF_MAX_RELATION_LEVELS = CF_LIMITS.maxRelationLevelPerCfArgument;

/** ngx charsWithNumRegex — argument names. */
export const CF_ARGUMENT_NAME_PATTERN = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

/** ngx oneSpaceInsideRegex — keys / attribute names (single spaces inside allowed). */
export const CF_KEY_PATTERN = /^\s*\S+(?:\s\S+)*\s*$/;

/** ngx calculatedFieldDefaultScript (Fahrenheit → Celsius sample). */
export const CALCULATED_FIELD_DEFAULT_SCRIPT = [
  '// Sample script to convert temperature readings from Fahrenheit to Celsius',
  'return {',
  '    "temperatureC": (temperatureF - 32) / 1.8',
  '};',
].join('\n');

// ---------------------------------------------------------------------------
// Defaults + load normalization (ngx form.service prepareConfig / models).
// ---------------------------------------------------------------------------

/** ngx defaultCalculatedFieldOutput — IMMEDIATE with every channel on. */
export function defaultTimeSeriesOutput(name = ''): TimeSeriesOutput {
  return {
    type: 'TIME_SERIES',
    name,
    strategy: {
      type: 'IMMEDIATE',
      ttl: 0,
      saveTimeSeries: true,
      saveLatest: true,
      sendWsUpdate: true,
      processCfs: true,
    },
  };
}

/** Default relation path (ngx: propagation TO/'Contains', related-agg FROM/'Contains'). */
export function defaultRelation(direction: 'FROM' | 'TO'): RelationPathLevel {
  return { direction, relationType: 'Contains' };
}

/**
 * ngx propagation writeValue: a stored expression-less propagation-with-
 * expression configuration falls back to the default script.
 */
export function defaultPropagationConfiguration(): CalculatedFieldConfiguration {
  return {
    type: 'PROPAGATION',
    relation: defaultRelation('TO'),
    arguments: {},
    applyExpressionToResolvedArguments: false,
    expression: CALCULATED_FIELD_DEFAULT_SCRIPT,
    output: defaultTimeSeriesOutput(),
  } as CalculatedFieldConfiguration;
}

export function defaultRelatedAggregationConfiguration(): CalculatedFieldConfiguration {
  return {
    type: 'RELATED_ENTITIES_AGGREGATION',
    relation: defaultRelation('FROM'),
    arguments: {},
    metrics: {},
    deduplicationIntervalInSec:
      CF_LIMITS.minAllowedDeduplicationIntervalInSecForCF,
    scheduledUpdateInterval:
      CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF,
    useLatestTs: false,
    output: defaultTimeSeriesOutput(),
  };
}

export function defaultEntityAggregationConfiguration(): CalculatedFieldConfiguration {
  return {
    type: 'ENTITY_AGGREGATION',
    arguments: {},
    metrics: {},
    interval: {
      type: 'HOUR',
      tz: defaultTzId(),
    },
    produceIntermediateResult: false,
    output: defaultTimeSeriesOutput(),
  };
}

export function defaultGeofencingConfiguration(): CalculatedFieldConfiguration {
  return {
    type: 'GEOFENCING',
    entityCoordinates: { latitudeKeyName: '', longitudeKeyName: '' },
    zoneGroups: {},
    scheduledUpdateEnabled: true,
    scheduledUpdateInterval:
      CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF,
    output: defaultTimeSeriesOutput(),
  };
}

/** Fresh configuration for a type switch (all six types). */
export function defaultConfiguration(
  type: CalculatedFieldType,
): CalculatedFieldConfiguration {
  switch (type) {
    case 'SCRIPT':
      return {
        type: 'SCRIPT',
        expression: CALCULATED_FIELD_DEFAULT_SCRIPT,
        arguments: {},
        output: defaultTimeSeriesOutput(),
      };
    case 'PROPAGATION':
      return defaultPropagationConfiguration();
    case 'RELATED_ENTITIES_AGGREGATION':
      return defaultRelatedAggregationConfiguration();
    case 'ENTITY_AGGREGATION':
      return defaultEntityAggregationConfiguration();
    case 'GEOFENCING':
      return defaultGeofencingConfiguration();
    default:
      return {
        type: 'SIMPLE',
        expression: '',
        arguments: {},
        useLatestTs: false,
        output: defaultTimeSeriesOutput(),
      };
  }
}

/** ngx getDefaultTimezone — the runtime IANA zone, UTC as the fallback. */
export function defaultTzId(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** IANA zone list (Intl when available; a pragmatic fallback otherwise). */
const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
];

export function listTimezones(): Array<string> {
  try {
    const supported = (
      Intl as unknown as {
        supportedValuesOf?: (key: string) => Array<string>;
      }
    ).supportedValuesOf;
    if (typeof supported === 'function') {
      const zones = supported('timeZone');
      return zones.includes('UTC') ? [...zones] : ['UTC', ...zones];
    }
  } catch {
    // Fall through to the static list.
  }
  return FALLBACK_TIMEZONES;
}

/**
 * ngx prepareConfig: a stored configuration without an output strategy gets
 * the RULE_CHAIN default (only legacy rows lack it; the backend persisted
 * CFs before strategies existed).
 */
export function prepareConfiguration<T extends CalculatedFieldConfiguration>(
  configuration: T,
): T {
  const config = configuration;
  if (
    config &&
    config.type !== 'ALARM' &&
    config.output &&
    !config.output.strategy
  ) {
    return {
      ...config,
      output: {
        ...config.output,
        strategy: { type: 'RULE_CHAIN' },
      },
    } as T;
  }
  if (config && config.type === 'PROPAGATION') {
    // ngx propagation writeValue: expression-less propagation-with-expression
    // falls back to the default script.
    if (
      config.applyExpressionToResolvedArguments === true &&
      !(config as { expression?: string }).expression
    ) {
      return {
        ...config,
        expression: CALCULATED_FIELD_DEFAULT_SCRIPT,
      } as T;
    }
  }
  return config;
}

/**
 * SIMPLE↔SCRIPT transition: keep the user's arguments/output (ngx
 * setupTypeChange) while re-stamping the wire discriminator `type` to the
 * new value. Moving to SCRIPT seeds the ngx default script when the kept
 * configuration carries no expression; moving back to SIMPLE resets
 * useLatestTs (a SIMPLE-only field).
 */
export function migrateSimpleFamilyConfiguration(
  previous: CalculatedFieldConfiguration | undefined,
  next: CalculatedFieldType,
): CalculatedFieldConfiguration {
  const args = previous && 'arguments' in previous ? previous.arguments : {};
  const output = previous && 'output' in previous ? previous.output : undefined;
  const expression = configurationExpression(previous);
  const fallbackOutput = defaultTimeSeriesOutput();
  if (next === 'SCRIPT') {
    return {
      type: 'SCRIPT',
      expression: expression || CALCULATED_FIELD_DEFAULT_SCRIPT,
      arguments: args,
      output: output ?? fallbackOutput,
    };
  }
  return {
    type: 'SIMPLE',
    expression,
    arguments: args,
    useLatestTs: false,
    output: output ?? fallbackOutput,
  };
}

/**
 * ngx setupTypeChange: SIMPLE↔SCRIPT keep the configuration; any other
 * transition wipes it back to the target type's defaults.
 */
export function typeChangeClearsConfiguration(
  previous: CalculatedFieldType,
  next: CalculatedFieldType,
): boolean {
  return !(SIMPLE_FAMILY.includes(previous) && SIMPLE_FAMILY.includes(next));
}

/** ngx debug settings fallback — failures debugging on by default (dialog updateForm). */
export function defaultDebugSettings(): CalculatedFieldDebugSettings {
  return { failuresEnabled: true, allEnabled: true };
}

/** ngx deepTrim — trims every string leaf before POST (dialog add()). */
export function deepTrim<T>(value: T): T {
  if (
    typeof value === 'number' ||
    value === undefined ||
    typeof value === 'string' ||
    value === null ||
    value instanceof File
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    // ngx trims array items at depth >= 1 (Object.keys reduce over the
    // array) — the top-level string guard does not apply to members.
    return value.map((item) =>
      typeof item === 'string'
        ? item.trim()
        : typeof item === 'object' && item !== null
          ? deepTrim(item)
          : item,
    ) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] =
      typeof item === 'object' && item !== null
        ? deepTrim(item)
        : typeof item === 'string'
          ? item.trim()
          : item;
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Arguments-table group validation (ngx table validate()/updateErrorText).
// ---------------------------------------------------------------------------

export type ArgumentTableError =
  | 'rolling-in-simple'
  | 'entity-not-found'
  | 'propagate-current-only'
  | 'propagateNeedCurrentArgument'
  | 'argumentsNeedDefaultValue';

const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

function isCurrentEntitySource(arg: CalculatedFieldArgument): boolean {
  return !arg.refEntityId && !arg.refDynamicSourceConfiguration;
}

/**
 * ngx updateErrorText + the wave-5 table variants: SIMPLE forbids Rolling
 * arguments outright; an argument whose referenced entity failed to resolve
 * keeps a NULL_UUID id and must block the save; propagation WITHOUT an
 * expression only passes CURRENT-entity keys through (ngx propagate table
 * flags any refEntityId / dynamic source), propagation WITH an expression
 * needs at least one CURRENT-entity argument (backend validation mirror);
 * the related-entities-aggregation variant requires a defaultValue on every
 * argument.
 */
export function argumentTableError(
  args: Record<string, CalculatedFieldArgument>,
  isScript: boolean,
  options?: {
    currentOnly?: boolean;
    requireCurrentArgument?: boolean;
    requireDefaultValue?: boolean;
  },
): ArgumentTableError | null {
  const values = Object.values(args ?? {});
  if (
    !isScript &&
    values.some((arg) => arg.refEntityKey?.type === 'TS_ROLLING')
  ) {
    return 'rolling-in-simple';
  }
  if (values.some((arg) => arg.refEntityId?.id === NULL_UUID)) {
    return 'entity-not-found';
  }
  if (
    options?.currentOnly &&
    values.some((arg) => arg.refEntityId || arg.refDynamicSourceConfiguration)
  ) {
    return 'propagate-current-only';
  }
  if (
    options?.requireCurrentArgument &&
    !values.some((arg) => isCurrentEntitySource(arg))
  ) {
    return 'propagateNeedCurrentArgument';
  }
  if (
    options?.requireDefaultValue &&
    values.some((arg) => !arg.defaultValue?.trim())
  ) {
    return 'argumentsNeedDefaultValue';
  }
  return null;
}

// ---------------------------------------------------------------------------
// testScript payloads (backend TbelCfArg discriminator `type`).
// ---------------------------------------------------------------------------

export interface TestSingleValueArg {
  type: 'SINGLE_VALUE';
  ts: number;
  value: unknown;
}

export interface TestRollingArg {
  type: 'TS_ROLLING';
  timeWindow?: { startTs: number; endTs: number };
  values: Array<{ ts: number; value: number }>;
}

export type TestArgumentValue = TestSingleValueArg | TestRollingArg;

export type TestScriptPayload = {
  expression: string;
  arguments: Record<string, TestArgumentValue>;
};

/**
 * Seeds the per-argument JSON text inputs of the test dialog: a debug-event
 * prefill (same shapes the events carry) is pretty-printed, rolling args
 * fall back to `[]` (ngx table-config:412-418), single args to an empty
 * raw string.
 */
export function seedTestTexts(
  args: Record<string, CalculatedFieldArgument>,
  prefill?: Record<string, unknown> | null,
): Record<string, string> {
  const texts: Record<string, string> = {};
  for (const [key, arg] of Object.entries(args ?? {})) {
    const seeded = prefill?.[key] as Record<string, unknown> | undefined;
    if (arg.refEntityKey?.type === 'TS_ROLLING') {
      texts[key] = JSON.stringify(seeded?.values !== undefined ? seeded : []);
    } else {
      texts[key] =
        seeded && seeded.value !== undefined
          ? JSON.stringify(seeded.value)
          : '';
    }
  }
  return texts;
}

/**
 * Builds the testScript payload out of the dialog texts. Single-value text
 * parses as JSON when possible and falls back to the raw string (so `22.5`
 * is a number while `TEN` stays a string); rolling text must parse into an
 * array or `{values, timeWindow}`. Parse failures come back per argument
 * and block the run (inline errors, never toasts — R15).
 */
export function buildRunPayload(
  expression: string,
  args: Record<string, CalculatedFieldArgument>,
  texts: Record<string, string>,
): { payload: TestScriptPayload; parseErrors: Record<string, boolean> } {
  const argumentsShape: Record<string, TestArgumentValue> = {};
  const parseErrors: Record<string, boolean> = {};
  const now = Date.now();
  for (const [key, arg] of Object.entries(args ?? {})) {
    const text = (texts[key] ?? '').trim();
    const rolling = arg.refEntityKey?.type === 'TS_ROLLING';
    if (rolling) {
      if (!text) {
        argumentsShape[key] = { type: 'TS_ROLLING', values: [] };
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parseErrors[key] = true;
        argumentsShape[key] = { type: 'TS_ROLLING', values: [] };
        continue;
      }
      if (Array.isArray(parsed)) {
        argumentsShape[key] = { type: 'TS_ROLLING', values: parsed };
      } else if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { values?: unknown }).values)
      ) {
        const shape = parsed as {
          values: Array<{ ts: number; value: number }>;
          timeWindow?: { startTs: number; endTs: number };
        };
        argumentsShape[key] = {
          type: 'TS_ROLLING',
          timeWindow: shape.timeWindow,
          values: shape.values,
        };
      } else {
        parseErrors[key] = true;
        argumentsShape[key] = { type: 'TS_ROLLING', values: [] };
      }
    } else {
      let value: unknown = text;
      if (text) {
        try {
          value = JSON.parse(text);
        } catch {
          value = text;
        }
      }
      argumentsShape[key] = { type: 'SINGLE_VALUE', ts: now, value };
    }
  }
  return { payload: { expression, arguments: argumentsShape }, parseErrors };
}

/**
 * Argument seed for the SAVE PRECHECK (not the user-facing test dialog —
 * see seedTestTexts there): neutral numeric values so a syntactically
 * valid expression evaluates while a broken one still fails (spec 6.1-10
 * enhancement). Debug-event prefills would win, but the precheck runs
 * before any debug data exists for unsaved fields.
 */
export function buildTestScriptPayload(
  expression: string,
  args: Record<string, CalculatedFieldArgument>,
): TestScriptPayload {
  const now = Date.now();
  const argumentsShape: Record<string, TestArgumentValue> = {};
  for (const [key, arg] of Object.entries(args ?? {})) {
    if (arg.refEntityKey?.type === 'TS_ROLLING') {
      argumentsShape[key] = {
        type: 'TS_ROLLING',
        timeWindow: { startTs: now - 15 * 60 * 1000, endTs: now },
        values: [{ ts: now, value: 0 }],
      };
    } else {
      argumentsShape[key] = { type: 'SINGLE_VALUE', ts: now, value: 0 };
    }
  }
  return { expression, arguments: argumentsShape };
}

// ---------------------------------------------------------------------------
// Save precheck (spec 6.1-10 / 6.6 enhancement — backend does NOT validate
// expression syntax on save, so the UI dry-runs testScript first).
// ---------------------------------------------------------------------------

export interface TestScriptEnvelope {
  output?: unknown;
  error?: string;
}

export type PrecheckOutcome =
  | { allowed: true; warning?: string }
  | { allowed: false; error: string };

/**
 * Maps the precheck result to an allow/block decision. The 200 envelope
 * carries evaluation failures in `error` (block); an HTTP-level failure is
 * only acceptable when it is the "TBEL script engine is disabled!" 400 —
 * degrade with a warning instead of blocking (spec 6.6).
 */
export function interpretPrecheckOutcome(
  envelope: TestScriptEnvelope | null,
  httpError: unknown,
): PrecheckOutcome {
  if (envelope) {
    const error = typeof envelope.error === 'string' ? envelope.error : '';
    return error ? { allowed: false, error } : { allowed: true };
  }
  const message = httpErrorText(httpError);
  if (message.toLowerCase().includes('tbel')) {
    return { allowed: true, warning: message };
  }
  return { allowed: false, error: message };
}

function httpErrorText(httpError: unknown): string {
  if (httpError instanceof Error && httpError.message) {
    return httpError.message;
  }
  if (typeof httpError === 'object' && httpError !== null) {
    const response = (
      httpError as { response?: { data?: { message?: string } } }
    ).response?.data?.message;
    if (response) {
      return response;
    }
  }
  return String(httpError ?? 'testScript failed');
}

// ---------------------------------------------------------------------------
// Save gating helpers.
// ---------------------------------------------------------------------------

export type ConfigurationProblem =
  | 'argumentsRequired'
  | 'argumentsRollingInSimple'
  | 'argumentsEntityNotFound'
  | 'propagationArgumentsCurrentOnly'
  | 'propagationNeedCurrentArgument'
  | 'argumentsNeedDefaultValue'
  | 'expressionRequired'
  | 'expressionMaxLength'
  | 'expressionPattern'
  | 'metricsRequired'
  | 'metricsInvalid'
  | 'deduplicationIntervalMin'
  | 'intervalTzRequired'
  | 'intervalDurationMin'
  | 'latitudeKeyRequired'
  | 'latitudeKeyPattern'
  | 'longitudeKeyRequired'
  | 'longitudeKeyPattern'
  | 'zoneGroupsRequired'
  | 'zoneGroupInvalid'
  | 'outputKeyRequired'
  | 'outputKeyPattern';

/** Aggregation-metric group gate (ngx metrics-table notEmptyObject + panel matrix). */
export function metricsProblems(
  metrics: Record<string, CalculatedFieldAggMetric>,
): Array<ConfigurationProblem> {
  if (Object.keys(metrics ?? {}).length === 0) {
    return ['metricsRequired'];
  }
  const invalid = Object.values(metrics).some((metric) => {
    if (!(metric?.function ?? '').trim()) {
      return true;
    }
    if (metric.input?.type === 'key') {
      return !(metric.input.key ?? '').trim();
    }
    if (metric.input?.type === 'function') {
      return !(metric.input.function ?? '').trim();
    }
    return !metric.input;
  });
  return invalid ? ['metricsInvalid'] : [];
}

/** Geofencing zone group gate — the essentials the panel edits enforce. */
export function zoneGroupProblems(
  zoneGroups: Record<string, CalculatedFieldGeofencingZoneGroup>,
): Array<ConfigurationProblem> {
  if (Object.keys(zoneGroups ?? {}).length === 0) {
    return ['zoneGroupsRequired'];
  }
  const invalid = Object.entries(zoneGroups).some(([name, zone]) => {
    return (
      !name.trim() ||
      !zone ||
      !CF_KEY_PATTERN.test(zone.perimeterKeyName ?? '') ||
      (zone.createRelationsWithMatchedZones === true &&
        (!(zone.relationType ?? '').trim() || !zone.direction))
    );
  });
  return invalid ? ['zoneGroupInvalid'] : [];
}

/**
 * Interval length in seconds for the produceIntermediateResult gate
 * (ngx checkProduceIntermediate: CUSTOM reads durationSec, calendar types
 * read the ngx time.models length map).
 */
export function intervalDurationSec(interval: AggInterval): number {
  if (interval.type === 'CUSTOM') {
    return interval.durationSec ?? 0;
  }
  return CF_AGG_INTERVAL_SECONDS[interval.type];
}

/**
 * ngx maxOffsetTime: the offset is capped below one period — every type
 * uses (period - 1) EXCEPT CUSTOM (durationSec - 1) and MONTH, where ngx
 * keeps the raw average month (periods in seconds, ngx time.models).
 */
export function maxOffsetSec(interval: AggInterval): number {
  if (interval.type === 'CUSTOM') {
    return Math.max(0, (interval.durationSec ?? 0) - 1);
  }
  const seconds = CF_AGG_INTERVAL_SECONDS[interval.type];
  return interval.type === 'MONTH' ? seconds : seconds - 1;
}

/**
 * Inline-validation mirror: the same problems the configurators render
 * inline, computed for the dialog's save gate (the backend validates only
 * structure, so the form is the gate — spec 6.0 CF behavior contracts).
 */
export function configurationProblems(
  configuration: CalculatedFieldConfiguration | undefined,
  isScript: boolean,
): Array<ConfigurationProblem> {
  const problems: Array<ConfigurationProblem> = [];
  const config = configuration;
  const type = config?.type;
  const args: Record<string, CalculatedFieldArgument> =
    config && 'arguments' in config ? (config.arguments ?? {}) : {};
  // GEOFENCING has no arguments table (ngx form: coordinates + zoneGroups
  // + refresh + output) — only types carrying an arguments map require one.
  if (type !== 'GEOFENCING' && type !== 'ALARM') {
    if (Object.keys(args).length === 0) {
      problems.push('argumentsRequired');
    }
  }
  const propagationNoExpression =
    config?.type === 'PROPAGATION' &&
    config.applyExpressionToResolvedArguments !== true;
  const groupError = argumentTableError(args, isScript, {
    currentOnly: propagationNoExpression,
    requireCurrentArgument:
      config?.type === 'PROPAGATION' && !propagationNoExpression,
    requireDefaultValue: config?.type === 'RELATED_ENTITIES_AGGREGATION',
  });
  if (groupError === 'rolling-in-simple') {
    problems.push('argumentsRollingInSimple');
  } else if (groupError === 'entity-not-found') {
    problems.push('argumentsEntityNotFound');
  } else if (groupError === 'propagate-current-only') {
    problems.push('propagationArgumentsCurrentOnly');
  } else if (groupError === 'propagateNeedCurrentArgument') {
    problems.push('propagationNeedCurrentArgument');
  } else if (groupError === 'argumentsNeedDefaultValue') {
    problems.push('argumentsNeedDefaultValue');
  }

  if (config?.type === 'PROPAGATION') {
    // The expression is only validated when the expression result is
    // propagated (arguments-only propagation passes keys through).
    if (config.applyExpressionToResolvedArguments === true) {
      problems.push(
        ...expressionProblems(configurationExpression(config), false),
      );
    }
  } else if (config && (config.type === 'SIMPLE' || config.type === 'SCRIPT')) {
    problems.push(
      ...expressionProblems(configurationExpression(config), isScript),
    );
  }

  if (config?.type === 'RELATED_ENTITIES_AGGREGATION') {
    problems.push(...metricsProblems(config.metrics));
    if (
      (config.deduplicationIntervalInSec ?? 0) <
      CF_LIMITS.minAllowedDeduplicationIntervalInSecForCF
    ) {
      problems.push('deduplicationIntervalMin');
    }
  }
  if (config?.type === 'ENTITY_AGGREGATION') {
    problems.push(...metricsProblems(config.metrics));
    const interval = config.interval;
    if (!interval?.tz?.trim()) {
      problems.push('intervalTzRequired');
    }
    if (
      interval?.type === 'CUSTOM' &&
      intervalDurationSec(interval) <
        CF_LIMITS.minAllowedAggregationIntervalInSecForCF
    ) {
      problems.push('intervalDurationMin');
    }
  }
  if (config?.type === 'GEOFENCING') {
    const coordinates: EntityCoordinates = config.entityCoordinates ?? {
      latitudeKeyName: '',
      longitudeKeyName: '',
    };
    if (!coordinates.latitudeKeyName?.trim()) {
      problems.push('latitudeKeyRequired');
    } else if (!CF_KEY_PATTERN.test(coordinates.latitudeKeyName)) {
      problems.push('latitudeKeyPattern');
    }
    if (!coordinates.longitudeKeyName?.trim()) {
      problems.push('longitudeKeyRequired');
    } else if (!CF_KEY_PATTERN.test(coordinates.longitudeKeyName)) {
      problems.push('longitudeKeyPattern');
    }
    problems.push(...zoneGroupProblems(config.zoneGroups));
  }

  const output = config && 'output' in config ? config.output : undefined;
  // The output KEY input only exists on SIMPLE (simpleMode); the wave-5
  // configurators render no key input and the backend derives the keys.
  if (output && type === 'SIMPLE') {
    if (!(output.name ?? '').trim()) {
      problems.push('outputKeyRequired');
    } else if (!CF_KEY_PATTERN.test(output.name)) {
      problems.push('outputKeyPattern');
    }
  }
  return problems;
}

function expressionProblems(
  expression: string,
  isScript: boolean,
): Array<ConfigurationProblem> {
  if (!expression.trim()) {
    return ['expressionRequired'];
  }
  if (!isScript && expression.length > 255) {
    return ['expressionMaxLength'];
  }
  if (!isScript && !CF_KEY_PATTERN.test(expression)) {
    return ['expressionPattern'];
  }
  return [];
}

/**
 * ngx debugCfActionEnabled (models.ts:550-554): the Test-script entry
 * exists for SCRIPT, RELATED_ENTITIES_AGGREGATION and PROPAGATION-with-
 * expression — the three types whose expressions can be dry-run.
 */
export function testActionEnabled(
  configuration: CalculatedFieldConfiguration | undefined,
): boolean {
  if (!configuration) {
    return false;
  }
  if (configuration.type === 'SCRIPT') {
    return true;
  }
  if (configuration.type === 'RELATED_ENTITIES_AGGREGATION') {
    return true;
  }
  return (
    configuration.type === 'PROPAGATION' &&
    configuration.applyExpressionToResolvedArguments === true
  );
}

/**
 * Whether the configuration carries a wire `expression` the test dialog
 * can write back — RELATED_ENTITIES_AGGREGATION has none (ngx keeps the
 * dialog as a scratch runner there; saving back would corrupt the config).
 */
export function configurationCarriesExpression(
  configuration: CalculatedFieldConfiguration | undefined,
): boolean {
  if (!configuration) {
    return false;
  }
  return (
    configuration.type === 'SCRIPT' ||
    (configuration.type === 'PROPAGATION' &&
      configuration.applyExpressionToResolvedArguments === true)
  );
}

/**
 * The save precheck applies to every configuration carrying an
 * `expression` — SIMPLE / SCRIPT / PROPAGATION-with-expression (spec 6.0
 * phrases the family as "SCRIPT / expression-carrying types").
 */
export function precheckRequired(
  configuration: CalculatedFieldConfiguration | undefined,
): boolean {
  if (!configuration) {
    return false;
  }
  return (
    configuration.type === 'SIMPLE' ||
    configuration.type === 'SCRIPT' ||
    (configuration.type === 'PROPAGATION' &&
      configuration.applyExpressionToResolvedArguments === true)
  );
}

/** Host types whose ATTRIBUTES output may pick a scope (ngx: Device family). */
export function attributeScopeEnabled(
  hostEntityType: CfHostEntityType | undefined,
): boolean {
  return hostEntityType === 'DEVICE' || hostEntityType === 'DEVICE_PROFILE';
}

export const ATTRIBUTE_SCOPE_OPTIONS: Array<AttributeScope> = [
  AttributeScope.SERVER_SCOPE,
  AttributeScope.SHARED_SCOPE,
];

/**
 * Type-safe expression accessor — only the SIMPLE family (and, in wave-5,
 * PROPAGATION-with-expression) carry an `expression` on the configuration
 * union.
 */
export function configurationExpression(
  config: CalculatedFieldConfiguration | undefined,
): string {
  if (
    config &&
    'expression' in config &&
    typeof config.expression === 'string'
  ) {
    return config.expression;
  }
  return '';
}

/** Output-type guard for the output suite. */
export function isAttributesOutput(output: Output): boolean {
  return output?.type === 'ATTRIBUTES';
}
