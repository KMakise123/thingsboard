/**
 * rule-node-dry-run — the 76-node component-level dry run (M8 brief §3 wave-3
 * R; spec v2-editors-acceptance §4.5 定稿口径).
 *
 * For EVERY CORE-visible rule node descriptor (fixture captured from
 * GET /api/components, offline-replayable) this suite:
 *   ① form is non-empty — ≥1 rendered field control, or the node is a LEGAL
 *      EMPTY form (defaultConfiguration empty or version-placeholder only —
 *      the 12 EmptyNodeConfiguration nodes);
 *   ② does not crash — a React error boundary around the real render tree
 *      stays clean (a crash is a VALID finding: recorded, asserted red, and
 *      reported with its stack in the summary);
 *   ③ classifies the render three-way — controls (≥1 real control and the
 *      body is not an all-JSON fallback) / json-fallback (fields exist but
 *      every field is a JSON source editor) / non-editable (the ui-ngx
 *      `directive-is-not-loaded` failure-state analog — asserted RED, never
 *      acceptable);
 *   ④ round-trips a sample: every P0 family node (script family + key ops +
 *      save timeseries/attributes + create/clear alarm) is edited (default
 *      value → hydrateConfiguration → re-render, value must hold) plus a
 *      live-control interaction, with NO configuration key ever lost (the
 *      shallow-patch hard gate).
 *
 * The run is summarized into __fixtures__/dry-run-summary.json (criteria
 * matrix + three-state counts + degradation lists); the report
 * docs/spec/v2-m8-dry-run-report.md is generated from that summary by
 * scripts/rule-node-dry-run-report.mjs.
 *
 * Module boundaries mocked per house pattern (NodeConfigForm.test.tsx):
 * CodeEditor (CodeMirror needs real metrics happy-dom lacks) and the services
 * transport (react-query needs a provider). Everything between — generator,
 * uiHints, registry, families, FormPropertyForm — is the REAL pipeline.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Component } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  type ResolvedFieldControl,
  resolveFieldControl,
} from '@/components/form-property/FormPropertyForm';
import type { CustomComponentRegistry } from '@/components/form-property/registry';
import type { FormProperty } from '@/components/form-property/types';
import {
  resolveUiHint,
  type UiHints,
} from '@/components/form-property/ui-hints';
import {
  getFormProperties,
  hydrateConfiguration,
} from '@/core/rulechain/form-properties';
import { localizeUiHintLabels, uiHintsFor } from '@/core/rulechain/ui-hints';
import zhScript from '@/locales/zh-CN/editor-script';
import zhRuleNode from '@/locales/zh-CN/rule-node';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';
import descriptorsFixtureJson from './__fixtures__/rule-node-descriptors.json';
import { NodeConfigForm } from './NodeConfigForm';
import {
  RULE_NODE_CLAZZES,
  ruleNodeComponentFor,
  ruleNodeCustomFieldComponents,
} from './registry';

vi.mock('@/components/code-editor', () => ({
  CodeEditor: (props: {
    value?: string;
    onChange?: (next: string) => void;
    language?: string;
    readOnly?: boolean;
    'data-testid'?: string;
  }) => (
    <textarea
      data-testid={props['data-testid'] ?? 'code-editor'}
      data-language={props.language ?? ''}
      data-readonly={String(props.readOnly === true)}
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  ),
}));

vi.mock('@/services/tb/rule-chain', () => ({
  getTbelEnabled: vi.fn(async () => true),
  testRuleNodeScript: vi.fn(async () => ({ output: '', error: '' })),
}));

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhScript, ...zhRuleNode },
});

// --- fixture (API-captured descriptors, offline replay) ----------------------

interface DescriptorsFixture {
  source: string;
  capturedAt: string;
  total: number;
  descriptors: RuleNodeComponentDescriptor[];
}

const fixture = descriptorsFixtureJson as unknown as DescriptorsFixture;

const DESCRIPTORS = fixture.descriptors;

// --- render host: crash boundary + onChange capture --------------------------

interface CrashRecord {
  message: string;
  stack: string;
}

let lastCrash: CrashRecord | null = null;

class CrashBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    lastCrash = {
      message: error.message,
      stack: error.stack ?? '',
    };
  }

  render() {
    if (this.state.error) {
      return (
        <div data-testid="node-config-crash">{String(this.state.error)}</div>
      );
    }
    return this.props.children;
  }
}

interface Mounted {
  container: HTMLElement;
  output: Record<string, unknown> | null;
}

function mountForm(
  descriptor: RuleNodeComponentDescriptor,
  configuration: Record<string, unknown>,
): Mounted {
  const mounted: Mounted = {
    container: null as unknown as HTMLElement,
    output: null,
  };
  const { container } = render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <CrashBoundary>
          <NodeConfigForm
            descriptor={descriptor}
            configuration={configuration}
            onChange={(next) => {
              mounted.output = next;
            }}
          />
        </CrashBoundary>
      </QueryClientProvider>
    </RawIntlProvider>,
  );
  mounted.container = container;
  return mounted;
}

// --- static classifier (mirrors NodeConfigForm + FormPropertyForm exactly) ---

const TYPE_ORDER = [
  'FILTER',
  'ENRICHMENT',
  'TRANSFORMATION',
  'ACTION',
  'EXTERNAL',
  'FLOW',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaultConfigurationOf(
  descriptor: RuleNodeComponentDescriptor,
): Record<string, unknown> {
  return (
    (descriptor.configurationDescriptor?.nodeDefinition
      ?.defaultConfiguration as Record<string, unknown>) ?? {}
  );
}

interface FieldTally {
  /** Real editable controls (input/number/switch/select/textarea/custom). */
  controls: number;
  /** Fields rendered through the JSON source fallback. */
  json: number;
  /** Resolved control kind per TOP-LEVEL non-family key (render order). */
  keyKinds: Array<{ key: string; kind: string }>;
  /** Whether the clazz binds a P0 family component (which owns fields). */
  hasFamily: boolean;
}

/**
 * Walks the generated property tree the way FormPropertyForm.renderField does
 * (same hint lookup, same value resolution, same customComponents map) and
 * tallies the resolved control kinds — the static half of the three-state
 * classification.
 */
function tallyFields(
  clazz: string,
  defaultConfiguration: Record<string, unknown>,
): FieldTally {
  const hints = localizeUiHintLabels(uiHintsFor(clazz), (id) => id) as UiHints;
  const family = ruleNodeComponentFor(clazz);
  const customComponents: CustomComponentRegistry =
    ruleNodeCustomFieldComponents();
  const familyOwned = new Set(family?.fields ?? []);

  const restProperties = getFormProperties(
    clazz,
    defaultConfiguration,
    hints,
  ).filter((property) => !familyOwned.has(property.id));

  const tally: FieldTally = {
    controls: 0,
    json: 0,
    keyKinds: [],
    hasFamily: (family?.fields ?? []).length > 0,
  };

  const walk = (
    properties: FormProperty[],
    value: Record<string, unknown>,
    topLevel: boolean,
  ) => {
    for (const property of properties) {
      const hint = resolveUiHint(hints, property);
      const fieldValue =
        value[property.id] !== undefined
          ? value[property.id]
          : property.default;
      const control: ResolvedFieldControl = resolveFieldControl(
        property,
        hint,
        fieldValue,
        customComponents,
      );
      if (control.kind === 'fieldset') {
        walk(
          property.properties ?? [],
          isRecord(fieldValue) ? fieldValue : {},
          false,
        );
        continue;
      }
      if (control.kind === 'skip') {
        continue;
      }
      if (control.kind === 'json') {
        tally.json += 1;
      } else {
        tally.controls += 1;
      }
      if (topLevel) {
        tally.keyKinds.push({ key: property.id, kind: control.kind });
      }
    }
  };

  walk(restProperties, defaultConfiguration, true);
  return tally;
}

/**
 * Legal empty form: the default configuration carries NO business field —
 * either no keys at all or only the `version` placeholder (the 12
 * EmptyNodeConfiguration nodes; brief §1, spec §4.5 criterion ① escape).
 */
function isLegalEmptyConfiguration(
  configuration: Record<string, unknown>,
): boolean {
  const keys = Object.keys(configuration ?? {});
  return keys.length === 0 || keys.every((key) => /^version$/i.test(key));
}

/** The spec's 4 known-deprecated nodes (scanned, never sampled for ④). */
function isDeprecatedNode(name: string): boolean {
  return (
    /deprecated/i.test(name) || /^synchronization (start|end)$/i.test(name)
  );
}

// --- three-state + criteria evaluation ---------------------------------------

type RenderState =
  | 'controls'
  | 'json-fallback'
  | 'legal-empty'
  | 'non-editable';

interface NodeRecord {
  type: string;
  name: string;
  clazz: string;
  deprecated: boolean;
  legalEmpty: boolean;
  hasFamily: boolean;
  controlFields: number;
  jsonFields: number;
  state: RenderState;
  nonEmpty: boolean;
  noCrash: boolean;
  crash: CrashRecord | null;
}

const RECORDS: NodeRecord[] = [];

function evaluateNode(descriptor: RuleNodeComponentDescriptor): NodeRecord {
  const defaultConfiguration = defaultConfigurationOf(descriptor);
  const tally = tallyFields(descriptor.clazz, defaultConfiguration);
  const legalEmpty = isLegalEmptyConfiguration(defaultConfiguration);

  lastCrash = null;
  const mounted = mountForm(descriptor, defaultConfiguration);

  const crash = lastCrash;
  const boundaryClean = crash === null;
  const renderedFieldContainers = mounted.container.querySelectorAll(
    '[data-testid^="form-property-"]:not([data-testid="form-property-form"])',
  ).length;
  const crashProbe = mounted.container.querySelector(
    '[data-testid="node-config-crash"]',
  );

  // ③ three-state classification.
  let state: RenderState;
  if (!boundaryClean || crashProbe !== null) {
    state = 'non-editable';
  } else if (tally.controls > 0 || tally.hasFamily) {
    state = 'controls';
  } else if (legalEmpty) {
    state = 'legal-empty';
  } else if (tally.json > 0) {
    state = 'json-fallback';
  } else {
    // 0 fields and NOT a legal empty form — the ui-ngx
    // `rulenode.directive-is-not-loaded` failure-state analog.
    state = 'non-editable';
  }

  // ① non-empty: ≥1 field control, a P0 family section, or a legal empty form.
  const nonEmpty =
    legalEmpty || tally.controls + tally.json >= 1 || tally.hasFamily;

  const record: NodeRecord = {
    type: descriptor.type,
    name: descriptor.name,
    clazz: descriptor.clazz,
    deprecated: isDeprecatedNode(descriptor.name),
    legalEmpty,
    hasFamily: tally.hasFamily,
    controlFields: tally.controls,
    jsonFields: tally.json,
    state,
    nonEmpty,
    noCrash: boundaryClean && crashProbe === null,
    crash,
  };

  // DOM cross-evidence for the static tally (a generator ↔ renderer
  // divergence would silently hollow out the statistics): every non-family
  // field must actually appear as a form-property container.
  if (
    state !== 'non-editable' &&
    tally.controls + tally.json > 0 &&
    !tally.hasFamily
  ) {
    expect(renderedFieldContainers).toBeGreaterThan(0);
  }
  if (!record.noCrash) {
    expect(crashProbe).not.toBeNull();
  }
  return record;
}

// --- criterion ④: P0 round-trip sample ---------------------------------------

const P0_CLAZZES: Set<string> = new Set(Object.values(RULE_NODE_CLAZZES));

interface Modification {
  key: string;
  value: unknown;
  /** Where the re-rendered value shows up for this pick. */
  target: 'field' | 'script-editor' | 'keys-list' | 'kv-map';
}

/**
 * Deterministic business-field pick driven by the RESOLVED CONTROL KIND (so
 * the edit always lands on a control whose value the DOM actually shows).
 * Simple non-family fields first; family-owned slices as the fallback.
 */
function pickModification(
  defaultConfiguration: Record<string, unknown>,
  keyKinds: Array<{ key: string; kind: string }>,
): Modification | null {
  for (const { key, kind } of keyKinds) {
    const value = defaultConfiguration[key];
    if (kind === 'input' || kind === 'textarea' || kind === 'password') {
      return { key, value: 'dry-run-roundtrip', target: 'field' };
    }
    if (kind === 'number') {
      return {
        key,
        value: (typeof value === 'number' ? value : 0) + 1,
        target: 'field',
      };
    }
    if (kind === 'switch') {
      return { key, value: !(value === true), target: 'field' };
    }
  }
  // Family-owned fallbacks (the P0 families own their whole configuration).
  // The script triple renders the ACTIVE language's script — edit that one,
  // otherwise the change never shows in the editor (scriptLang defaults to
  // TBEL on several nodes).
  const tbelActive = defaultConfiguration.scriptLang === 'TBEL';
  const scriptKeys =
    tbelActive === true
      ? [
          'tbelScript',
          'alarmDetailsBuildTbel',
          'jsScript',
          'alarmDetailsBuildJs',
        ]
      : [
          'jsScript',
          'alarmDetailsBuildJs',
          'tbelScript',
          'alarmDetailsBuildTbel',
        ];
  for (const key of scriptKeys) {
    if (key in defaultConfiguration) {
      return {
        key,
        value: 'return {dryRun: true};',
        target: 'script-editor',
      };
    }
  }
  if ('keys' in defaultConfiguration) {
    return { key: 'keys', value: ['dry-run-roundtrip'], target: 'keys-list' };
  }
  if ('renameKeysMapping' in defaultConfiguration) {
    return {
      key: 'renameKeysMapping',
      value: { 'dry-run-key': 'dry-run-value' },
      target: 'kv-map',
    };
  }
  return null;
}

/**
 * Does the re-rendered tree show the edited value where the control would
 * show it? `field` keys resolve through their form-property container;
 * family-owned keys resolve through the family's own value holders.
 */
function editedValueHolds(
  container: HTMLElement,
  modification: Modification,
  expected: unknown,
): boolean {
  if (modification.target === 'field') {
    const field = container.querySelector(
      `[data-testid="form-property-${modification.key}"]`,
    );
    if (!field) {
      return false;
    }
    const switchButton = field.querySelector<HTMLElement>('[role="switch"]');
    if (switchButton) {
      return switchButton.getAttribute('aria-checked') === String(expected);
    }
    const input = field.querySelector<HTMLInputElement>('input');
    if (input && input.getAttribute('role') !== 'switch') {
      return input.value === String(expected);
    }
    return field.textContent?.includes(String(expected)) ?? false;
  }
  if (modification.target === 'script-editor') {
    // The script family editor AND the alarm-details script editors.
    const editor = container.querySelector<HTMLTextAreaElement>(
      [
        '[data-testid="node-config-script-editor-editor"]',
        '[data-testid$="-details-script-editor-editor"]',
      ].join(', '),
    );
    return editor !== null && editor.value === String(expected);
  }
  if (modification.target === 'keys-list') {
    const list = container.querySelector('[data-testid$="-key-ops-keys"]');
    if (!list) {
      return false;
    }
    const items = Array.isArray(expected) ? (expected as string[]) : [];
    return items.every((item) => list.textContent?.includes(item) ?? false);
  }
  // kv-map: every edited entry must show in the rendered row inputs.
  const kvRoot = container.querySelector(
    '[data-testid$="-rename-keys-mapping"]',
  );
  if (!kvRoot) {
    return false;
  }
  const rowValues = Array.from(kvRoot.querySelectorAll('input')).map(
    (input) => input.value,
  );
  const entries = Object.entries((expected ?? {}) as Record<string, unknown>);
  return (
    entries.length > 0 &&
    entries.every(
      ([entryKey, entryValue]) =>
        rowValues.includes(String(entryKey)) &&
        rowValues.includes(String(entryValue)),
    )
  );
}

const ROUND_TRIP_RESULTS: Array<{
  clazz: string;
  name: string;
  key: string;
  target: string;
  hydrate: boolean;
  rerender: boolean;
  interact: boolean | 'skipped';
}> = [];

/** This test file's directory (import.meta.url is a bare path under vitest). */
function currentTestDir(): string {
  const raw = String(import.meta.url);
  const local = raw.startsWith('file://') ? fileURLToPath(raw) : raw;
  return path.dirname(local);
}

// --- suite -------------------------------------------------------------------

beforeAll(() => {
  RECORDS.length = 0;
  ROUND_TRIP_RESULTS.length = 0;
});

afterEach(() => {
  cleanup();
  lastCrash = null;
});

describe('rule-node dry-run fixture integrity (API provenance)', () => {
  it('captures exactly 76 CORE-visible descriptors, all unique by clazz', () => {
    expect(fixture.source).toBe('api');
    expect(DESCRIPTORS.length).toBe(76);
    expect(fixture.total).toBe(76);
    const clazzes = DESCRIPTORS.map((descriptor) => descriptor.clazz);
    expect(new Set(clazzes).size).toBe(76);
  });

  it('excludes the EDGE-only node (push to cloud) and covers the six UI types', () => {
    const clazzes = DESCRIPTORS.map((descriptor) => descriptor.clazz);
    expect(clazzes).not.toContain(
      'org.thingsboard.rule.engine.edge.TbMsgPushToCloudNode',
    );
    const counts = new Map<string, number>();
    for (const descriptor of DESCRIPTORS) {
      counts.set(descriptor.type, (counts.get(descriptor.type) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...TYPE_ORDER].sort());
    // CORE-visible counts (77-class full set minus the EDGE-only ACTION one).
    expect(counts.get('ACTION')).toBe(26);
    expect(counts.get('EXTERNAL')).toBe(14);
    expect(counts.get('FILTER')).toBe(12);
    expect(counts.get('ENRICHMENT')).toBe(11);
    expect(counts.get('TRANSFORMATION')).toBe(9);
    expect(counts.get('FLOW')).toBe(4);
  });

  it('every descriptor carries a node definition with a default configuration object', () => {
    for (const descriptor of DESCRIPTORS) {
      const definition = descriptor.configurationDescriptor?.nodeDefinition;
      expect(
        definition,
        `${descriptor.clazz} missing nodeDefinition`,
      ).toBeTruthy();
      expect(
        isRecord(definition?.defaultConfiguration),
        `${descriptor.clazz} missing defaultConfiguration`,
      ).toBe(true);
    }
  });

  it('the 12 EmptyNodeConfiguration nodes resolve to legal empty forms', () => {
    const legalEmpty = DESCRIPTORS.filter((descriptor) =>
      isLegalEmptyConfiguration(defaultConfigurationOf(descriptor)),
    );
    expect(legalEmpty.length).toBe(12);
    expect(legalEmpty.map((descriptor) => descriptor.name).sort()).toEqual(
      [
        'acknowledge',
        'asset profile switch',
        'calculated fields and alarm rules',
        'checkpoint',
        'copy to view',
        'device profile switch',
        'entity type switch',
        'message type switch',
        'output',
        'split array msg',
        'synchronization end',
        'synchronization start',
      ].sort(),
    );
  });
});

describe('rule-node dry-run per-node criteria (① non-empty ② no-crash ③ three-state)', () => {
  it.each([
    ...DESCRIPTORS,
  ])('$type / $name renders editable through NodeConfigForm', (descriptor) => {
    const record = evaluateNode(descriptor);
    RECORDS.push(record);

    // ② no crash — a crash is a valid finding but an immediate RED.
    expect(
      record.noCrash,
      record.crash ? `crash: ${record.crash.message}` : '',
    ).toBe(true);
    // ① non-empty form.
    expect(
      record.nonEmpty,
      `${record.clazz} renders an empty, non-legal-empty form`,
    ).toBe(true);
    // ③ never the directive-is-not-loaded failure state.
    expect(record.state).not.toBe('non-editable');
  });
});

describe('rule-node dry-run criterion ④ round-trip sample (P0 families)', () => {
  it.each(
    [...DESCRIPTORS].filter((descriptor) => P0_CLAZZES.has(descriptor.clazz)),
  )('$type / $name round-trips an edited value without losing keys', (descriptor) => {
    const defaultConfiguration = defaultConfigurationOf(descriptor);
    const hints = localizeUiHintLabels(
      uiHintsFor(descriptor.clazz),
      (id) => id,
    ) as UiHints;
    const tally = tallyFields(descriptor.clazz, defaultConfiguration);
    const modification = pickModification(defaultConfiguration, tally.keyKinds);
    expect(
      modification,
      `${descriptor.clazz} offers no modifiable field`,
    ).not.toBeNull();
    const picked = modification as Modification;
    const value = picked.value;

    // Level 1 — default → edited → canonical hydrate keeps the edit AND
    // every key the generator does not know about. For nested-object picks
    // (kv-map) hydrate SEEDS missing fieldset children from their defaults
    // by design, so the assertion is "the edited entry survives", not deep
    // equality.
    const edited = { ...defaultConfiguration, [picked.key]: value };
    const hydrated = hydrateConfiguration(
      getFormProperties(descriptor.clazz, defaultConfiguration, hints),
      edited,
    );
    if (picked.target === 'kv-map') {
      const [markerKey, markerValue] = Object.entries(
        value as Record<string, unknown>,
      )[0];
      expect((hydrated[picked.key] as Record<string, unknown>)[markerKey]).toBe(
        markerValue,
      );
    } else {
      expect(hydrated[picked.key]).toEqual(value);
    }
    for (const defaultKey of Object.keys(defaultConfiguration)) {
      expect(
        hydrated,
        `${descriptor.clazz} lost key ${defaultKey}`,
      ).toHaveProperty(defaultKey);
    }

    // Level 2 — re-render with the hydrated configuration: no crash, and
    // the edited value holds in the rendered control.
    const remounted = mountForm(descriptor, hydrated);
    expect(
      remounted.container.querySelector('[data-testid="node-config-crash"]'),
    ).toBeNull();
    const rerenderHolds = editedValueHolds(remounted.container, picked, value);
    expect(
      rerenderHolds,
      `${descriptor.clazz} re-render does not show the edited ${picked.key}`,
    ).toBe(true);
    cleanup();

    // Level 3 — live interaction: type/toggle a real control, capture the
    // emitted configuration, assert the shallow-patch gate (no key lost),
    // then re-render with the captured output (the value sticks).
    const first = mountForm(descriptor, defaultConfiguration);
    const target = first.container.querySelector<HTMLElement>(
      [
        'input.ant-input:not([readonly])',
        'textarea:not([data-testid$="-json-editor"])',
        'input.ant-input-number-input',
        '[role="switch"]',
      ].join(', '),
    );
    let interact: boolean | 'skipped' = 'skipped';
    let interactedOutput: Record<string, unknown> | null = null;
    const isTextInput =
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLInputElement &&
        target.getAttribute('role') !== 'switch');
    if (target && isTextInput) {
      const input = target as HTMLInputElement | HTMLTextAreaElement;
      const numeric = input.classList.contains('ant-input-number-input');
      fireEvent.change(input, {
        target: { value: numeric ? '42' : 'dry-run-live-edit' },
      });
      interactedOutput = first.output;
      interact = interactedOutput !== null;
    } else if (target) {
      fireEvent.click(target);
      interactedOutput = first.output;
      interact = interactedOutput !== null;
    }
    if (interactedOutput !== null) {
      for (const defaultKey of Object.keys(defaultConfiguration)) {
        expect(
          interactedOutput,
          `${descriptor.clazz} live edit dropped key ${defaultKey}`,
        ).toHaveProperty(defaultKey);
      }
      expect(JSON.stringify(interactedOutput)).not.toBe(
        JSON.stringify(defaultConfiguration),
      );
      cleanup();
      const replay = mountForm(descriptor, interactedOutput);
      expect(
        replay.container.querySelector('[data-testid="node-config-crash"]'),
      ).toBeNull();
    }

    ROUND_TRIP_RESULTS.push({
      clazz: descriptor.clazz,
      name: descriptor.name,
      key: picked.key,
      target: picked.target,
      hydrate: true,
      rerender: rerenderHolds,
      interact,
    });
  });
});

describe('rule-node dry-run summary', () => {
  it('ran the full 76-node matrix and recorded the round-trip sample', () => {
    expect(RECORDS.length).toBe(76);
    expect(new Set(RECORDS.map((record) => record.clazz)).size).toBe(76);
    expect(ROUND_TRIP_RESULTS.length).toBe(P0_CLAZZES.size);
  });

  it('meets the dual gates: 100% editable rate and ≥85% control-level renders', () => {
    const nonEditable = RECORDS.filter(
      (record) => record.state === 'non-editable',
    );
    expect(
      nonEditable.map((record) => `${record.name} (${record.clazz})`),
    ).toEqual([]);
    const controls = RECORDS.filter(
      (record) => record.state === 'controls',
    ).length;
    const legalEmpty = RECORDS.filter(
      (record) => record.state === 'legal-empty',
    ).length;
    // Registration item: control-level renders (legal empty forms count as
    // fully expressible — spec §4.5 criterion ① escape) at ≥85% of 76.
    expect(controls + legalEmpty).toBeGreaterThanOrEqual(Math.ceil(76 * 0.85));
  });
});

afterAll(() => {
  if (RECORDS.length === 0) {
    return;
  }
  const byType = new Map<string, number>();
  for (const descriptor of DESCRIPTORS) {
    byType.set(descriptor.type, (byType.get(descriptor.type) ?? 0) + 1);
  }
  const states = {
    controls: RECORDS.filter((record) => record.state === 'controls').length,
    'json-fallback': RECORDS.filter(
      (record) => record.state === 'json-fallback',
    ).length,
    'legal-empty': RECORDS.filter((record) => record.state === 'legal-empty')
      .length,
    'non-editable': RECORDS.filter((record) => record.state === 'non-editable')
      .length,
  };
  const summary = {
    _comment:
      'Generated by rule-node-dry-run.test.tsx (vitest run). Regenerate with: npx vitest run src/components/rule-node/rule-node-dry-run.test.tsx. Report: docs/spec/v2-m8-dry-run-report.md via scripts/rule-node-dry-run-report.mjs.',
    fixture: 'src/components/rule-node/__fixtures__/rule-node-descriptors.json',
    fixtureSource: fixture.source,
    fixtureCapturedAt: fixture.capturedAt,
    totalNodes: RECORDS.length,
    typeCounts: Object.fromEntries(
      TYPE_ORDER.map((type) => [type, byType.get(type) ?? 0]),
    ),
    criteria: {
      nonEmptyPassed: RECORDS.filter((record) => record.nonEmpty).length,
      noCrashPassed: RECORDS.filter((record) => record.noCrash).length,
      crashed: RECORDS.filter((record) => !record.noCrash).map((record) => ({
        name: record.name,
        clazz: record.clazz,
        message: record.crash?.message ?? '',
        stack: record.crash?.stack ?? '',
      })),
    },
    states,
    metrics: {
      // Hard gate: non-empty ∧ no-crash ∧ state ≠ non-editable, target 100%.
      editableRate:
        RECORDS.filter(
          (record) =>
            record.nonEmpty &&
            record.noCrash &&
            record.state !== 'non-editable',
        ).length / RECORDS.length,
      // Registration item: control-level renders (incl. legal empty forms,
      // which are fully expressible), target ≥85%.
      controlLevelRate:
        (states.controls + states['legal-empty']) / RECORDS.length,
      pureControlLevelRate: states.controls / RECORDS.length,
    },
    deprecatedNodes: RECORDS.filter((record) => record.deprecated).map(
      (record) => record.name,
    ),
    roundTripSample: ROUND_TRIP_RESULTS,
    degradation: {
      nonEditable: RECORDS.filter(
        (record) => record.state === 'non-editable',
      ).map((record) => ({
        name: record.name,
        clazz: record.clazz,
        reason: record.crash ? 'crash' : 'no-fields-non-legal-empty',
        crash: record.crash?.message ?? null,
      })),
      jsonFallback: RECORDS.filter(
        (record) => record.state === 'json-fallback',
      ).map((record) => ({
        name: record.name,
        clazz: record.clazz,
        jsonFields: record.jsonFields,
        reason:
          'all fields render through the JSON source fallback (uiHints not covering, shape not inferable)',
      })),
      legalEmpty: RECORDS.filter((record) => record.legalEmpty).map(
        (record) => record.name,
      ),
      partialJsonFallback: RECORDS.filter(
        (record) => record.state === 'controls' && record.jsonFields > 0,
      ).map((record) => ({
        name: record.name,
        clazz: record.clazz,
        jsonFields: record.jsonFields,
        controlFields: record.controlFields,
      })),
    },
    records: [...RECORDS].sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.type as (typeof TYPE_ORDER)[number]) -
          TYPE_ORDER.indexOf(b.type as (typeof TYPE_ORDER)[number]) ||
        a.name.localeCompare(b.name),
    ),
  };
  writeFileSync(
    path.join(currentTestDir(), '__fixtures__', 'dry-run-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.info(
    `[dry-run] ${summary.totalNodes} nodes — states ${JSON.stringify(states)} — editable ${(summary.metrics.editableRate * 100).toFixed(1)}% — control-level ${(summary.metrics.controlLevelRate * 100).toFixed(1)}%`,
  );
});
