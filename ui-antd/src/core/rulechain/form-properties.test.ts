/**
 * form-properties generator tests (M8 brief §3 wave-2 K). Fixtures mirror the
 * REAL backend default configurations (rule-engine-components
 * *NodeConfiguration.defaultConfiguration(), read 2026-09) — the generator is
 * judged on the round-trip fidelity contract: every key of the value tree
 * gets a property and hydrating values back reproduces the tree verbatim
 * (the 100%-editable-rate foundation, spec §4.5 判据).
 */
import { describe, expect, it } from 'vitest';

import {
  type FormProperty,
  FormPropertyType,
} from '@/components/form-property/types';

import { getFormProperties, hydrateConfiguration } from './form-properties';

// --- fixtures: real backend default configurations (trimmed script bodies) --

const SCRIPT_DEFAULTS = {
  scriptLang: 'TBEL',
  jsScript: 'return msg.temperature > 20;',
  tbelScript: 'return msg.temperature > 20;',
};

const DEFAULTS: Record<string, Record<string, unknown>> = {
  'org.thingsboard.rule.engine.action.TbLogNode': { ...SCRIPT_DEFAULTS },
  'org.thingsboard.rule.engine.filter.TbJsFilterNode': { ...SCRIPT_DEFAULTS },
  'org.thingsboard.rule.engine.debug.TbMsgGeneratorNode': {
    msgCount: 0,
    periodInSeconds: 1,
    originatorId: null,
    originatorType: 'RULE_NODE',
    ...SCRIPT_DEFAULTS,
  },
  'org.thingsboard.rule.engine.transform.TbCopyKeysNode': {
    copyFrom: 'DATA',
    keys: [],
  },
  'org.thingsboard.rule.engine.transform.TbDeleteKeysNode': {
    deleteFrom: 'DATA',
    keys: [],
  },
  'org.thingsboard.rule.engine.transform.TbRenameKeysNode': {
    renameIn: 'DATA',
    renameKeysMapping: { temperatureCelsius: 'temperature' },
  },
  'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode': {
    defaultTTL: 0,
    useServerTs: false,
    processingSettings: { type: 'ON_EVERY_MESSAGE' },
  },
  'org.thingsboard.rule.engine.telemetry.TbMsgAttributesNode': {
    processingSettings: { type: 'ON_EVERY_MESSAGE' },
    scope: 'SERVER_SCOPE',
    notifyDevice: false,
    sendAttributesUpdatedNotification: false,
    updateAttributesOnlyOnValueChange: true,
  },
  'org.thingsboard.rule.engine.action.TbCreateAlarmNode': {
    scriptLang: 'TBEL',
    alarmDetailsBuildJs: 'var details = {};\nreturn details;',
    alarmDetailsBuildTbel:
      'var details = {};\nif (metadata.prevAlarmDetails != null) {\n}\nreturn details;',
    alarmType: 'General Alarm',
    severity: 'CRITICAL',
    propagate: false,
    propagateToOwner: false,
    propagateToTenant: false,
    useMessageAlarmData: false,
    overwriteAlarmDetails: false,
    relationTypes: [],
    dynamicSeverity: false,
  },
  'org.thingsboard.rule.engine.action.TbClearAlarmNode': {
    scriptLang: 'TBEL',
    alarmDetailsBuildJs: 'var details = {};\nreturn details;',
    alarmDetailsBuildTbel: 'var details = {};\nreturn details;',
    alarmType: 'General Alarm',
  },
};

// --- round-trip harness ------------------------------------------------------

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

describe('getFormProperties — value-shape inference', () => {
  it('maps the primitive shapes to their controls', () => {
    const properties = getFormProperties('test.Clazz', {
      count: 5,
      enabled: false,
      name: 'n',
      empty: null,
    });
    expect(properties.map((p) => p.type)).toEqual([
      FormPropertyType.number,
      FormPropertyType.switch,
      FormPropertyType.text,
      FormPropertyType.json,
    ]);
  });

  it('emits a fieldset with recursive children for nested objects', () => {
    const properties = getFormProperties('test.Clazz', {
      settings: { retries: 3, label: 'x' },
    });
    const fieldset = properties[0];
    expect(fieldset.type).toBe(FormPropertyType.fieldset);
    expect(fieldset.id).toBe('settings');
    expect(fieldset.properties?.map((child) => child.id)).toEqual([
      'retries',
      'label',
    ]);
    expect(fieldset.properties?.[0].type).toBe(FormPropertyType.number);
  });

  it('emits primitive arrays as tag lists and object arrays as JSON', () => {
    const properties = getFormProperties('test.Clazz', {
      keys: ['a', 'b'],
      nums: [1, 2],
      objects: [{ k: 'v' }],
      mixed: ['a', 1],
    });
    expect(properties.map((p) => p.arrayItemType)).toEqual([
      FormPropertyType.text,
      FormPropertyType.number,
      FormPropertyType.json,
      FormPropertyType.json,
    ]);
    expect(properties.every((p) => p.type === FormPropertyType.array)).toBe(
      true,
    );
  });

  it('returns an empty list for empty / missing default configurations (12 Empty nodes are a legal empty form)', () => {
    expect(getFormProperties('test.Empty', {})).toEqual([]);
    expect(getFormProperties('test.Empty', undefined)).toEqual([]);
  });

  it('generates one property per top-level key — no field is ever dropped', () => {
    for (const [clazz, configuration] of Object.entries(DEFAULTS)) {
      const properties = getFormProperties(clazz, configuration);
      expect(new Set(properties.map((p) => p.id))).toEqual(
        new Set(Object.keys(configuration)),
      );
    }
  });

  it('carries the original value in property.default (seeding source)', () => {
    const properties = getFormProperties(
      'org.thingsboard.rule.engine.transform.TbRenameKeysNode',
      DEFAULTS['org.thingsboard.rule.engine.transform.TbRenameKeysNode'],
    );
    const mapping = properties.find((p) => p.id === 'renameKeysMapping');
    expect(mapping?.default).toEqual({
      temperatureCelsius: 'temperature',
    });
  });

  it('resolves bare-path hints and clazz-prefixed hints (both keyings work)', () => {
    const configuration = { scope: 'SERVER_SCOPE', deep: { size: 2 } };
    const bare = getFormProperties('test.Clazz', configuration, {
      scope: {
        label: 'Scope',
        enumOptions: [{ value: 'SERVER_SCOPE', label: 'Server' }],
      },
      'deep.size': { label: 'Size' },
    });
    expect(bare.find((p) => p.id === 'scope')?.name).toBe('Scope');
    expect(bare.find((p) => p.id === 'scope')?.type).toBe(
      FormPropertyType.select,
    );
    expect(bare.find((p) => p.id === 'scope')?.items).toEqual([
      { value: 'SERVER_SCOPE', label: 'Server' },
    ]);
    expect(bare.find((p) => p.id === 'deep')?.properties?.[0].name).toBe(
      'Size',
    );

    const prefixed = getFormProperties('test.Clazz', configuration, {
      'test.Clazz.scope': { label: 'Scoped' },
    });
    expect(prefixed.find((p) => p.id === 'scope')?.name).toBe('Scoped');
  });

  it('hint widget overrides the inferred control', () => {
    const properties = getFormProperties(
      'test.Clazz',
      { body: 'x' },
      {
        body: { widget: 'textarea', rows: 6 },
      },
    );
    const body = properties[0];
    expect(body.type).toBe(FormPropertyType.textarea);
    expect(body.rows).toBe(6);
    expect(body.name).toBe('body'); // widget override keeps the name fallback
  });

  it('hint group flows into the property group', () => {
    const properties = getFormProperties(
      'test.Clazz',
      { a: 1 },
      {
        a: { group: 'Advanced' },
      },
    );
    expect(properties[0].group).toBe('Advanced');
  });
});

describe('round-trip (生成属性 × 值回填)', () => {
  it('hydrating real default configurations reproduces them verbatim', () => {
    for (const [clazz, configuration] of Object.entries(DEFAULTS)) {
      const properties = getFormProperties(clazz, configuration);
      expect(hydrateConfiguration(properties, configuration)).toEqual(
        configuration,
      );
    }
  });

  it('fills keys missing from the value with property defaults', () => {
    const properties = getFormProperties('test.Clazz', { a: 1, b: 'x' });
    expect(hydrateConfiguration(properties, { a: 7 })).toEqual({
      a: 7,
      b: 'x',
    });
  });

  it('preserves unknown keys at every nesting level (hard fidelity gate)', () => {
    const source: Record<string, unknown> = {
      known: 1,
      unknownTop: { keep: 'me' },
      nested: { knownChild: true, unknownChild: [1, 2, { x: null }] },
    };
    const properties = getFormProperties('test.Clazz', {
      known: 1,
      nested: { knownChild: true },
    });
    expect(hydrateConfiguration(properties, source)).toEqual(source);
  });

  it('does not mutate the inputs', () => {
    const configuration = structuredClone(
      DEFAULTS['org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode'],
    );
    const snapshot = structuredClone(configuration);
    const properties = getFormProperties(
      'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode',
      configuration,
    );
    hydrateConfiguration(properties, configuration);
    expect(configuration).toEqual(snapshot);
  });

  it('keeps references of untouched values (renderer spread semantics)', () => {
    const configuration =
      DEFAULTS['org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode'];
    const processingSettings = configuration.processingSettings;
    const properties: FormProperty[] = getFormProperties(
      'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode',
      configuration,
    );
    const hydrated = hydrateConfiguration(properties, configuration);
    expect(
      isRecord(hydrated.processingSettings) &&
        hydrated.processingSettings === processingSettings,
    ).toBe(true);
  });
});
