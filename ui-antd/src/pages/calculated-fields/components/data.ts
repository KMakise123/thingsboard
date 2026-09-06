/**
 * Calculated-fields domain pure functions + constants (M14 wave-4, R13/R14/R19).
 *
 * Anchored on ui-ngx `shared/models/calculated-field.models.ts` +
 * `core/services/calculated-field-form.service.ts` (type-switch rule /
 * prepareConfig / default script) and the backend TbelCfArg wire shapes
 * (common/script/api/tbel/TbelCfArg.java) for the testScript payloads.
 */

import type {
  CalculatedFieldArgument,
  CalculatedFieldConfiguration,
  CalculatedFieldDebugSettings,
  CalculatedFieldType,
  Output,
  TimeSeriesOutput,
} from '@/types/tb/calculated-fields';
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

/**
 * Wave-5 types: the configurators are delivered in M14 wave-5 (brief §3);
 * wave-4 renders a disabled placeholder for these (R13 tree, TODO anchor).
 */
export const CF_WAVE5_TYPES: Array<CalculatedFieldType> = [
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

/** Fresh configuration for a type switch (SIMPLE family only in wave-4). */
export function defaultConfiguration(
  type: CalculatedFieldType,
): CalculatedFieldConfiguration {
  if (type === 'SCRIPT') {
    return {
      type: 'SCRIPT',
      expression: CALCULATED_FIELD_DEFAULT_SCRIPT,
      arguments: {},
      output: defaultTimeSeriesOutput(),
    };
  }
  return {
    type: 'SIMPLE',
    expression: '',
    arguments: {},
    useLatestTs: false,
    output: defaultTimeSeriesOutput(),
  };
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
  return config;
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

export type ArgumentTableError = 'rolling-in-simple' | 'entity-not-found';

const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

/**
 * ngx updateErrorText: SIMPLE forbids Rolling arguments outright; an
 * argument whose referenced entity failed to resolve keeps a NULL_UUID id
 * and must block the save.
 */
export function argumentTableError(
  args: Record<string, CalculatedFieldArgument>,
  isScript: boolean,
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
  | 'expressionRequired'
  | 'expressionMaxLength'
  | 'expressionPattern'
  | 'outputKeyRequired'
  | 'outputKeyPattern';

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
  const args: Record<string, CalculatedFieldArgument> =
    configuration && 'arguments' in configuration
      ? (configuration.arguments ?? {})
      : {};
  if (Object.keys(args).length === 0) {
    problems.push('argumentsRequired');
  }
  const groupError = argumentTableError(args, isScript);
  if (groupError === 'rolling-in-simple') {
    problems.push('argumentsRollingInSimple');
  } else if (groupError === 'entity-not-found') {
    problems.push('argumentsEntityNotFound');
  }
  const expression = configurationExpression(configuration);
  if (!expression.trim()) {
    problems.push('expressionRequired');
  } else if (!isScript && expression.length > 255) {
    problems.push('expressionMaxLength');
  } else if (!isScript && !CF_KEY_PATTERN.test(expression)) {
    problems.push('expressionPattern');
  }
  const output =
    configuration && 'output' in configuration
      ? configuration.output
      : undefined;
  if (output && !isScript) {
    if (!(output.name ?? '').trim()) {
      problems.push('outputKeyRequired');
    } else if (!CF_KEY_PATTERN.test(output.name)) {
      problems.push('outputKeyPattern');
    }
  }
  return problems;
}

/**
 * ngx debugCfActionEnabled: the Test entry exists for SCRIPT (the
 * RELATED_ENTITIES_AGGREGATION / PROPAGATION-with-expression entries are
 * wave-5 configurators).
 */
export function debugActionEnabled(type: CalculatedFieldType): boolean {
  return type === 'SCRIPT';
}

/**
 * The save precheck applies to every configuration carrying an
 * `expression` — in wave-4 that is SIMPLE + SCRIPT (PROPAGATION-with-
 * expression joins in wave-5). Spec 6.0 phrases the family as
 * "SCRIPT / expression-carrying types".
 */
export function precheckRequired(type: CalculatedFieldType): boolean {
  return type === 'SIMPLE' || type === 'SCRIPT';
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
