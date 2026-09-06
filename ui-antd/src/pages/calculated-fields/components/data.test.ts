/**
 * Calculated-fields domain pure functions (M14 wave-4): type-switch rule,
 * load normalization, argument-table group validation, testScript payload
 * shapes (backend TbelCfArg discriminator), the save-precheck outcome
 * interpretation and the inline-problem mirror.
 */
import { describe, expect, it } from 'vitest';

import type {
  CalculatedFieldArgument,
  CalculatedFieldConfiguration,
} from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import { EntityType } from '@/types/tb/entity';
import {
  argumentTableError,
  buildRunPayload,
  buildTestScriptPayload,
  CALCULATED_FIELD_DEFAULT_SCRIPT,
  configurationExpression,
  configurationProblems,
  deepTrim,
  defaultConfiguration,
  interpretPrecheckOutcome,
  intervalDurationSec,
  maxOffsetSec,
  migrateSimpleFamilyConfiguration,
  precheckRequired,
  prepareConfiguration,
  seedTestTexts,
  typeChangeClearsConfiguration,
} from './data';

const argument = (
  overrides: Partial<CalculatedFieldArgument> = {},
): CalculatedFieldArgument => ({
  refEntityKey: { key: 'temperature', type: 'TS_LATEST' },
  ...overrides,
});

describe('cf type-switch rule (ngx setupTypeChange)', () => {
  it('keeps the configuration within the SIMPLE/SCRIPT family', () => {
    expect(typeChangeClearsConfiguration('SIMPLE', 'SCRIPT')).toBe(false);
    expect(typeChangeClearsConfiguration('SCRIPT', 'SIMPLE')).toBe(false);
  });

  it('clears the configuration for every other transition', () => {
    expect(typeChangeClearsConfiguration('SIMPLE', 'PROPAGATION')).toBe(true);
    expect(typeChangeClearsConfiguration('SCRIPT', 'GEOFENCING')).toBe(true);
    expect(typeChangeClearsConfiguration('GEOFENCING', 'SIMPLE')).toBe(true);
    expect(
      typeChangeClearsConfiguration(
        'RELATED_ENTITIES_AGGREGATION',
        'ENTITY_AGGREGATION',
      ),
    ).toBe(true);
  });

  it('migrates SIMPLE→SCRIPT: keeps arguments/output, stamps type + default expression', () => {
    const simple = {
      type: 'SIMPLE',
      expression: '',
      arguments: { a: argument() },
      useLatestTs: true,
      output: {
        type: 'TIME_SERIES',
        name: 'out',
        strategy: { type: 'RULE_CHAIN' },
      },
    } as unknown as CalculatedFieldConfiguration;
    const migrated = migrateSimpleFamilyConfiguration(simple, 'SCRIPT');
    expect(migrated.type).toBe('SCRIPT');
    expect(migrated.type === 'SCRIPT' && migrated.arguments).toEqual({
      a: argument(),
    });
    expect(migrated.type === 'SCRIPT' && migrated.expression).toBe(
      CALCULATED_FIELD_DEFAULT_SCRIPT,
    );
    expect(migrated.type === 'SCRIPT' && migrated.output).toMatchObject({
      type: 'TIME_SERIES',
    });
  });

  it('migrates SCRIPT→SIMPLE: keeps expression and resets useLatestTs', () => {
    const script = defaultConfiguration('SCRIPT');
    const migrated = migrateSimpleFamilyConfiguration(script, 'SIMPLE');
    expect(migrated.type).toBe('SIMPLE');
    expect(migrated.type === 'SIMPLE' && migrated.useLatestTs).toBe(false);
    expect(migrated.type === 'SIMPLE' && migrated.expression).toBe(
      CALCULATED_FIELD_DEFAULT_SCRIPT,
    );
  });
});

describe('cf prepareConfig load normalization', () => {
  it('adds the RULE_CHAIN strategy default when a stored row lacks one', () => {
    const config = {
      type: 'SIMPLE',
      expression: 'a',
      arguments: {},
      useLatestTs: false,
      output: { type: 'TIME_SERIES', name: 'out' },
    } as CalculatedFieldConfiguration;
    const prepared = prepareConfiguration(config);
    expect(
      prepared.type === 'SIMPLE' && prepared.output.strategy,
    ).toMatchObject({ type: 'RULE_CHAIN' });
  });

  it('leaves configurations that already carry a strategy', () => {
    const config = defaultConfiguration('SCRIPT');
    expect(prepareConfiguration(config)).toBe(config);
  });
});

describe('cf default configuration', () => {
  it('seeds SCRIPT with the ngx default script and an IMMEDIATE output', () => {
    const config = defaultConfiguration('SCRIPT');
    expect(config.type).toBe('SCRIPT');
    expect(config.type === 'SCRIPT' && config.expression).toBe(
      CALCULATED_FIELD_DEFAULT_SCRIPT,
    );
    expect(config.type === 'SCRIPT' && config.output.strategy?.type).toBe(
      'IMMEDIATE',
    );
  });
});

describe('deepTrim (ngx parity)', () => {
  it('trims nested strings and keeps other leaves', () => {
    expect(
      deepTrim({
        name: ' double ',
        nested: { key: ' temp ', n: 3, on: true, nil: null },
        list: [' x ', 2],
      }),
    ).toEqual({
      name: 'double',
      nested: { key: 'temp', n: 3, on: true, nil: null },
      list: ['x', 2],
    });
  });
});

describe('argument-table group validation', () => {
  it('flags rolling arguments in SIMPLE fields', () => {
    expect(
      argumentTableError(
        { a: argument({ refEntityKey: { key: 't', type: 'TS_ROLLING' } }) },
        false,
      ),
    ).toBe('rolling-in-simple');
    // SCRIPT allows rolling.
    expect(
      argumentTableError(
        { a: argument({ refEntityKey: { key: 't', type: 'TS_ROLLING' } }) },
        true,
      ),
    ).toBeNull();
  });

  it('flags unresolved entity references (NULL_UUID)', () => {
    expect(
      argumentTableError(
        {
          a: argument({
            refEntityId: {
              entityType: EntityType.DEVICE,
              id: '13814000-1dd2-11b2-8080-808080808080',
            },
          }),
        },
        true,
      ),
    ).toBe('entity-not-found');
  });
});

describe('testScript payloads (TbelCfArg wire shapes)', () => {
  it('seeds the precheck with neutral numeric values', () => {
    const payload = buildTestScriptPayload('return 1;', {
      a: argument(),
      r: argument({ refEntityKey: { key: 't', type: 'TS_ROLLING' } }),
    });
    expect(payload.expression).toBe('return 1;');
    expect(payload.arguments.a).toMatchObject({
      type: 'SINGLE_VALUE',
      value: 0,
    });
    const rolling = payload.arguments.r;
    expect(rolling.type === 'TS_ROLLING' && rolling.values).toHaveLength(1);
  });

  it('seeds dialog texts: rolling as [], prefills win', () => {
    const texts = seedTestTexts(
      {
        a: argument(),
        r: argument({ refEntityKey: { key: 't', type: 'TS_ROLLING' } }),
      },
      { a: { value: 22.5, ts: 1 } },
    );
    expect(texts.a).toBe('22.5');
    expect(texts.r).toBe('[]');
  });

  it('builds run payloads: JSON when parseable, raw string otherwise', () => {
    const { payload, parseErrors } = buildRunPayload(
      'return 1;',
      {
        a: argument(),
        r: argument({ refEntityKey: { key: 't', type: 'TS_ROLLING' } }),
      },
      { a: '22.5', r: '[{"ts":1,"value":2}]' },
    );
    expect(parseErrors).toEqual({});
    expect(payload.arguments.a).toEqual({
      type: 'SINGLE_VALUE',
      ts: expect.any(Number),
      value: 22.5,
    });
    expect(payload.arguments.r).toEqual({
      type: 'TS_ROLLING',
      values: [{ ts: 1, value: 2 }],
    });

    const raw = buildRunPayload('return 1;', { a: argument() }, { a: 'TEN' });
    expect(raw.payload.arguments.a).toMatchObject({ value: 'TEN' });

    const broken = buildRunPayload(
      'return 1;',
      { r: argument({ refEntityKey: { key: 't', type: 'TS_ROLLING' } }) },
      { r: '{oops' },
    );
    expect(broken.parseErrors.r).toBe(true);
  });
});

describe('save-precheck outcome interpretation (spec 6.1-10/6.6)', () => {
  it('blocks on a non-empty 200-envelope error', () => {
    const outcome = interpretPrecheckOutcome({ error: 'boom' }, null);
    expect(outcome).toEqual({ allowed: false, error: 'boom' });
  });

  it('allows a clean envelope', () => {
    expect(interpretPrecheckOutcome({ output: '{}' }, null)).toEqual({
      allowed: true,
    });
  });

  it('degrades the TBEL-disabled 400 to a warning', () => {
    const outcome = interpretPrecheckOutcome(
      null,
      new Error('TBEL script engine is disabled!'),
    );
    expect(outcome.allowed).toBe(true);
    expect(outcome.allowed === true && outcome.warning).toContain('TBEL');
  });

  it('blocks other HTTP-level failures', () => {
    expect(interpretPrecheckOutcome(null, new Error('403'))).toEqual({
      allowed: false,
      error: '403',
    });
  });
});

describe('configuration problems mirror (save gate)', () => {
  it('reports the empty baseline', () => {
    const problems = configurationProblems(
      defaultConfiguration('SIMPLE'),
      false,
    );
    expect(problems).toEqual([
      'argumentsRequired',
      'expressionRequired',
      'outputKeyRequired',
    ]);
  });

  it('accepts a fully-formed SIMPLE configuration', () => {
    const config: CalculatedFieldConfiguration = {
      type: 'SIMPLE',
      expression: '(temperature - 32) / 1.8',
      arguments: { temperature: argument() },
      useLatestTs: false,
      output: {
        type: 'TIME_SERIES',
        name: 'temperatureC',
        strategy: {
          type: 'IMMEDIATE',
          ttl: 0,
          saveTimeSeries: true,
          saveLatest: true,
          sendWsUpdate: true,
          processCfs: true,
        },
      },
    };
    expect(configurationProblems(config, false)).toEqual([]);
  });

  it('ignores the output key for SCRIPT (no simpleMode key input)', () => {
    const config = defaultConfiguration('SCRIPT');
    const problems = configurationProblems(config, true);
    expect(problems).toEqual(['argumentsRequired']);
  });
});

describe('precheck gate families', () => {
  it('applies to expression-carrying configurations only', () => {
    expect(precheckRequired(defaultConfiguration('SIMPLE'))).toBe(true);
    expect(precheckRequired(defaultConfiguration('SCRIPT'))).toBe(true);
    // PROPAGATION: precheck only when the expression result is propagated.
    expect(precheckRequired(defaultConfiguration('PROPAGATION'))).toBe(false);
    const withExpression = {
      ...defaultConfiguration('PROPAGATION'),
      applyExpressionToResolvedArguments: true,
    } as CalculatedFieldConfiguration;
    expect(precheckRequired(withExpression)).toBe(true);
    expect(precheckRequired(defaultConfiguration('GEOFENCING'))).toBe(false);
  });
});

describe('wave-5 default configurations', () => {
  it('seeds PROPAGATION with a TO relation, Contains type and the default script', () => {
    const config = defaultConfiguration('PROPAGATION');
    expect(config.type).toBe('PROPAGATION');
    const propagation = config as Extract<
      CalculatedFieldConfiguration,
      { type: 'PROPAGATION' }
    > & { applyExpressionToResolvedArguments: boolean; expression?: string };
    expect(propagation.relation).toEqual({
      direction: 'TO',
      relationType: 'Contains',
    });
    expect(propagation.applyExpressionToResolvedArguments).toBe(false);
    expect(propagation.expression).toBe(CALCULATED_FIELD_DEFAULT_SCRIPT);
  });

  it('seeds RELATED_ENTITIES_AGGREGATION with a FROM relation and the server-minimum intervals', () => {
    const config = defaultConfiguration('RELATED_ENTITIES_AGGREGATION');
    expect(config.type).toBe('RELATED_ENTITIES_AGGREGATION');
    const related = config as Extract<
      CalculatedFieldConfiguration,
      { type: 'RELATED_ENTITIES_AGGREGATION' }
    >;
    expect(related.relation).toEqual({
      direction: 'FROM',
      relationType: 'Contains',
    });
    expect(related.deduplicationIntervalInSec).toBe(
      CF_LIMITS.minAllowedDeduplicationIntervalInSecForCF,
    );
    expect(related.scheduledUpdateInterval).toBe(
      CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF,
    );
  });

  it('seeds ENTITY_AGGREGATION with an HOUR interval in the local timezone', () => {
    const config = defaultConfiguration('ENTITY_AGGREGATION');
    expect(config.type).toBe('ENTITY_AGGREGATION');
    const entityAgg = config as Extract<
      CalculatedFieldConfiguration,
      { type: 'ENTITY_AGGREGATION' }
    >;
    expect(entityAgg.interval.type).toBe('HOUR');
    expect(entityAgg.interval.tz).toBeTruthy();
  });

  it('seeds GEOFENCING with both coordinate keys, an empty zoneGroups map and refresh ON', () => {
    const config = defaultConfiguration('GEOFENCING');
    expect(config.type).toBe('GEOFENCING');
    const geofencing = config as Extract<
      CalculatedFieldConfiguration,
      { type: 'GEOFENCING' }
    >;
    expect(geofencing.entityCoordinates).toEqual({
      latitudeKeyName: '',
      longitudeKeyName: '',
    });
    expect(geofencing.zoneGroups).toEqual({});
    expect(geofencing.scheduledUpdateEnabled).toBe(true);
    expect(geofencing.scheduledUpdateInterval).toBe(
      CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF,
    );
  });

  it('backfills the default script into a stored expression-less propagation', () => {
    const stored = {
      type: 'PROPAGATION',
      relation: { direction: 'TO', relationType: 'Contains' },
      arguments: {},
      applyExpressionToResolvedArguments: true,
      output: {
        type: 'TIME_SERIES',
        name: '',
        strategy: { type: 'RULE_CHAIN' },
      },
    } as unknown as CalculatedFieldConfiguration;
    const prepared = prepareConfiguration(stored);
    expect(
      prepared.type === 'PROPAGATION' &&
        configurationExpression(prepared) === CALCULATED_FIELD_DEFAULT_SCRIPT,
    ).toBe(true);
  });
});

describe('wave-5 configuration problems mirror (save gate)', () => {
  it('propagation: accepts arguments-only with current-entity arguments, blocks entity refs', () => {
    const config = defaultConfiguration('PROPAGATION');
    if (config.type === 'PROPAGATION') {
      config.arguments = { key1: argument() };
    }
    expect(configurationProblems(config, false)).toEqual([]);

    const withEntityRef = defaultConfiguration('PROPAGATION');
    if (withEntityRef.type === 'PROPAGATION') {
      withEntityRef.arguments = {
        key1: argument({
          refEntityId: {
            entityType: EntityType.DEVICE,
            id: 'device-1',
          },
        }),
      };
    }
    expect(configurationProblems(withEntityRef, false)).toContain(
      'propagationArgumentsCurrentOnly',
    );
  });

  it('propagation with expression: requires the expression and a current-entity argument', () => {
    const config = defaultConfiguration('PROPAGATION');
    if (config.type === 'PROPAGATION') {
      config.applyExpressionToResolvedArguments = true;
      config.arguments = { key1: argument() };
      (config as { expression?: string }).expression = '';
    }
    expect(configurationProblems(config, false)).toContain(
      'expressionRequired',
    );
    if (config.type === 'PROPAGATION') {
      config.arguments = {
        key1: argument({
          refEntityId: { entityType: EntityType.DEVICE, id: 'device-1' },
        }),
      };
      (config as { expression?: string }).expression =
        CALCULATED_FIELD_DEFAULT_SCRIPT;
    }
    expect(configurationProblems(config, false)).toContain(
      'propagationNeedCurrentArgument',
    );
  });

  it('related aggregation: defaultValue per argument, metrics and the deduplication floor', () => {
    const config = defaultConfiguration('RELATED_ENTITIES_AGGREGATION');
    if (config.type === 'RELATED_ENTITIES_AGGREGATION') {
      config.arguments = { key1: argument({ defaultValue: '0' }) };
      config.metrics = {
        free: {
          function: 'COUNT',
          input: { type: 'key', key: 'key1' },
        },
      };
    }
    expect(configurationProblems(config, false)).toEqual([]);

    if (config.type === 'RELATED_ENTITIES_AGGREGATION') {
      config.arguments = { key1: argument() };
      expect(configurationProblems(config, false)).toContain(
        'argumentsNeedDefaultValue',
      );
      config.arguments = { key1: argument({ defaultValue: '0' }) };
      config.metrics = {};
      expect(configurationProblems(config, false)).toContain('metricsRequired');
      config.metrics = {
        free: { function: 'COUNT', input: { type: 'key', key: 'key1' } },
      };
      config.deduplicationIntervalInSec = 5;
      expect(configurationProblems(config, false)).toContain(
        'deduplicationIntervalMin',
      );
    }
  });

  it('entity aggregation: tz required and the CUSTOM duration floor', () => {
    const config = defaultConfiguration('ENTITY_AGGREGATION');
    if (config.type === 'ENTITY_AGGREGATION') {
      config.arguments = { key1: argument() };
      config.metrics = {
        avg: { function: 'AVG', input: { type: 'key', key: 'key1' } },
      };
      config.interval = { type: 'HOUR', tz: 'Asia/Shanghai' };
    }
    expect(configurationProblems(config, false)).toEqual([]);

    if (config.type === 'ENTITY_AGGREGATION') {
      config.interval = {
        type: 'CUSTOM',
        tz: 'Asia/Shanghai',
        durationSec: 30,
      };
      expect(configurationProblems(config, false)).toContain(
        'intervalDurationMin',
      );
      config.interval = { type: 'CUSTOM', tz: '', durationSec: 120 };
      expect(configurationProblems(config, false)).toContain(
        'intervalTzRequired',
      );
    }
  });

  it('geofencing: the required chain is coordinates then zone groups', () => {
    const config = defaultConfiguration('GEOFENCING');
    const problems = configurationProblems(config, false);
    expect(problems).toContain('latitudeKeyRequired');
    expect(problems).toContain('longitudeKeyRequired');
    expect(problems).toContain('zoneGroupsRequired');

    if (config.type === 'GEOFENCING') {
      config.entityCoordinates = {
        latitudeKeyName: 'latitude',
        longitudeKeyName: 'longitude',
      };
      config.zoneGroups = {
        depot: {
          perimeterKeyName: 'perimeter',
          reportStrategy: 'REPORT_TRANSITION_EVENTS_AND_PRESENCE_STATUS',
          createRelationsWithMatchedZones: true,
          // createRelations requires direction + relationType on the wire.
        },
      };
      expect(configurationProblems(config, false)).toContain(
        'zoneGroupInvalid',
      );
      config.zoneGroups.depot.direction = 'FROM';
      config.zoneGroups.depot.relationType = 'Contains';
      expect(configurationProblems(config, false)).toEqual([]);
    }
  });
});

describe('interval helpers', () => {
  it('maps calendar types to ngx interval lengths and CUSTOM to durationSec', () => {
    expect(intervalDurationSec({ type: 'HOUR', tz: 'UTC' })).toBe(3600);
    expect(intervalDurationSec({ type: 'WEEK_SUN_SAT', tz: 'UTC' })).toBe(
      7 * 86400,
    );
    expect(
      intervalDurationSec({ type: 'CUSTOM', tz: 'UTC', durationSec: 600 }),
    ).toBe(600);
  });

  it('gates produceIntermediateResult at the server threshold', () => {
    expect(
      intervalDurationSec({ type: 'HOUR', tz: 'UTC' }) >
        CF_LIMITS.intermediateAggregationIntervalInSecForCF,
    ).toBe(true);
    expect(
      intervalDurationSec({ type: 'CUSTOM', tz: 'UTC', durationSec: 300 }) >
        CF_LIMITS.intermediateAggregationIntervalInSecForCF,
    ).toBe(false);
  });

  it('caps the offset below one period', () => {
    expect(maxOffsetSec({ type: 'HOUR', tz: 'UTC' })).toBe(3599);
    expect(maxOffsetSec({ type: 'CUSTOM', tz: 'UTC', durationSec: 600 })).toBe(
      599,
    );
  });
});
