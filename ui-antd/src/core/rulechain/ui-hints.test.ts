/**
 * ui-hints static-map tests (M8 brief §3 wave-2 K). The P0 start-up set
 * covers the script family (their SIMPLE fields: generator) + the nodes with
 * FormPropertyForm-rendered simple fields next to a family component.
 * 宁缺勿错: unmapped nodes fall back to generator inference + JSON source
 * mode, so uiHintsFor must return {} (never a wrong hint) for them.
 */
import { describe, expect, it } from 'vitest';

import { localizeUiHintLabels, uiHintsFor } from './ui-hints';

const GENERATOR = 'org.thingsboard.rule.engine.debug.TbMsgGeneratorNode';
const TIMESERIES = 'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode';
const ATTRIBUTES = 'org.thingsboard.rule.engine.telemetry.TbMsgAttributesNode';
const CREATE_ALARM = 'org.thingsboard.rule.engine.action.TbCreateAlarmNode';
const SCRIPT = 'org.thingsboard.rule.engine.filter.TbJsFilterNode';

describe('uiHintsFor', () => {
  it('returns the generator simple-field slice', () => {
    const hints = uiHintsFor(GENERATOR);
    expect(Object.keys(hints).sort()).toEqual([
      'msgCount',
      'originatorId',
      'originatorType',
      'periodInSeconds',
    ]);
    expect(hints.originatorType.enumOptions?.map((o) => o.value)).toContain(
      'DEVICE',
    );
  });

  it('returns the telemetry slices', () => {
    expect(Object.keys(uiHintsFor(TIMESERIES)).sort()).toEqual([
      'defaultTTL',
      'useServerTs',
    ]);
    expect(Object.keys(uiHintsFor(ATTRIBUTES)).sort()).toEqual([
      'notifyDevice',
      'scope',
      'sendAttributesUpdatedNotification',
      'updateAttributesOnlyOnValueChange',
    ]);
    expect(
      uiHintsFor(ATTRIBUTES).scope.enumOptions?.map((o) => o.value),
    ).toEqual(['SERVER_SCOPE', 'SHARED_SCOPE', 'CLIENT_SCOPE']);
  });

  it('keeps only the simple alarm-type field for create alarm (the family takes the rest)', () => {
    expect(Object.keys(uiHintsFor(CREATE_ALARM))).toEqual(['alarmType']);
  });

  it('returns {} for unknown clazzes and for family-only nodes (宁缺勿错)', () => {
    expect(
      uiHintsFor('org.thingsboard.rule.engine.flow.TbRuleChainInputNode'),
    ).toEqual({});
    expect(uiHintsFor(SCRIPT)).toEqual({});
  });

  it('labels are i18n keys under editor.ruleNode.* (locale-driven contract)', () => {
    for (const hint of Object.values(uiHintsFor(GENERATOR))) {
      expect(hint.label?.startsWith('editor.ruleNode.')).toBe(true);
    }
  });
});

describe('localizeUiHintLabels', () => {
  it('translates editor.* labels and enum option labels', () => {
    const hints = uiHintsFor(ATTRIBUTES);
    const localized = localizeUiHintLabels(hints, (id: string) =>
      id === 'editor.ruleNode.field.scope' ? '属性范围' : `[${id}]`,
    );
    expect(localized.scope.label).toBe('属性范围');
    expect(localized.scope.enumOptions?.[0].label).toBe(
      '[editor.ruleNode.option.scope.server]',
    );
  });

  it('leaves non-i18n labels verbatim (wave-3 plain-text tables stay usable)', () => {
    const localized = localizeUiHintLabels(
      {
        plain: {
          label: 'Plain Label',
          enumOptions: [{ value: 1, label: 'One' }],
        },
      },
      () => 'SHOULD-NOT-BE-CALLED',
    );
    expect(localized.plain.label).toBe('Plain Label');
    expect(localized.plain.enumOptions?.[0].label).toBe('One');
  });

  it('does not mutate the source table', () => {
    const hints = uiHintsFor(TIMESERIES);
    localizeUiHintLabels(hints, () => 'x');
    expect(hints.defaultTTL.label?.startsWith('editor.')).toBe(true);
  });
});
