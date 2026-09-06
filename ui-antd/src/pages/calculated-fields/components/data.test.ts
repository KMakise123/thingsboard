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
import { EntityType } from '@/types/tb/entity';
import {
  argumentTableError,
  buildRunPayload,
  buildTestScriptPayload,
  CALCULATED_FIELD_DEFAULT_SCRIPT,
  configurationProblems,
  deepTrim,
  defaultConfiguration,
  interpretPrecheckOutcome,
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
  it('applies to SIMPLE and SCRIPT only in wave-4', () => {
    expect(precheckRequired('SIMPLE')).toBe(true);
    expect(precheckRequired('SCRIPT')).toBe(true);
    expect(precheckRequired('PROPAGATION')).toBe(false);
    expect(precheckRequired('GEOFENCING')).toBe(false);
  });
});
