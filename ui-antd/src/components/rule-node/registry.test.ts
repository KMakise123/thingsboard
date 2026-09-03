/**
 * rule-node registry tests (M8 brief §3 wave-2 K). The id constants, the
 * clazz→component resolver and the tree-level contract are FROZEN — wave-3
 * K2 (ui-hints completion, details drawer) and R (dry-run) consume them.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getCustomComponent,
  resolveCustomComponent,
} from '@/components/form-property/registry';
import { FormPropertyType } from '@/components/form-property/types';

import { RULE_NODE_CLAZZES, RULE_NODE_COMPONENT_IDS } from './clazzes';
import {
  componentById,
  registerRuleNodeComponents,
  resetRuleNodeComponents,
  ruleNodeComponentFor,
  ruleNodeComponentIdFor,
} from './registry';

beforeEach(() => {
  resetRuleNodeComponents();
  registerRuleNodeComponents();
});

describe('frozen id constants', () => {
  it('exposes the stable registry ids', () => {
    expect(RULE_NODE_COMPONENT_IDS).toEqual({
      script: 'rule-node.script',
      switch: 'rule-node.switch',
      copyKeys: 'rule-node.copy-keys',
      deleteKeys: 'rule-node.delete-keys',
      renameKeys: 'rule-node.rename-keys',
      saveTimeseries: 'rule-node.save-timeseries',
      saveAttributes: 'rule-node.save-attributes',
      createAlarm: 'rule-node.create-alarm',
      clearAlarm: 'rule-node.clear-alarm',
    });
  });

  it('exposes the P0 clazz full names', () => {
    expect(RULE_NODE_CLAZZES.jsSwitch).toBe(
      'org.thingsboard.rule.engine.filter.TbJsSwitchNode',
    );
    expect(RULE_NODE_CLAZZES.msgGenerator).toBe(
      'org.thingsboard.rule.engine.debug.TbMsgGeneratorNode',
    );
  });
});

describe('clazz resolution', () => {
  it('resolves every P0 clazz to its family id', () => {
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.jsFilter)).toBe(
      RULE_NODE_COMPONENT_IDS.script,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.jsSwitch)).toBe(
      RULE_NODE_COMPONENT_IDS.switch,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.transformMsg)).toBe(
      RULE_NODE_COMPONENT_IDS.script,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.log)).toBe(
      RULE_NODE_COMPONENT_IDS.script,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.msgGenerator)).toBe(
      RULE_NODE_COMPONENT_IDS.script,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.copyKeys)).toBe(
      RULE_NODE_COMPONENT_IDS.copyKeys,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.deleteKeys)).toBe(
      RULE_NODE_COMPONENT_IDS.deleteKeys,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.renameKeys)).toBe(
      RULE_NODE_COMPONENT_IDS.renameKeys,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.msgTimeseries)).toBe(
      RULE_NODE_COMPONENT_IDS.saveTimeseries,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.msgAttributes)).toBe(
      RULE_NODE_COMPONENT_IDS.saveAttributes,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.createAlarm)).toBe(
      RULE_NODE_COMPONENT_IDS.createAlarm,
    );
    expect(ruleNodeComponentIdFor(RULE_NODE_CLAZZES.clearAlarm)).toBe(
      RULE_NODE_COMPONENT_IDS.clearAlarm,
    );
  });

  it('returns undefined for unknown clazzes', () => {
    expect(ruleNodeComponentIdFor('org.example.UnknownNode')).toBeUndefined();
    expect(ruleNodeComponentFor('org.example.UnknownNode')).toBeUndefined();
  });

  it('declares the exclusive field slices and placement', () => {
    const script = ruleNodeComponentFor(RULE_NODE_CLAZZES.jsFilter);
    expect(script?.fields).toEqual(['scriptLang', 'jsScript', 'tbelScript']);
    expect(script?.placement).toBe('first');

    const switchDef = ruleNodeComponentFor(RULE_NODE_CLAZZES.jsSwitch);
    expect(switchDef?.id).toBe(RULE_NODE_COMPONENT_IDS.switch);

    const generator = ruleNodeComponentFor(RULE_NODE_CLAZZES.msgGenerator);
    expect(generator?.placement).toBe('last');

    const timeseries = ruleNodeComponentFor(RULE_NODE_CLAZZES.msgTimeseries);
    expect(timeseries?.fields).toEqual(['processingSettings']);

    const createAlarm = ruleNodeComponentFor(RULE_NODE_CLAZZES.createAlarm);
    expect(createAlarm?.fields).toContain('relationTypes');
    expect(createAlarm?.fields).toContain('alarmDetailsBuildJs');
    expect(createAlarm?.fields).not.toContain('alarmType');

    const clearAlarm = ruleNodeComponentFor(RULE_NODE_CLAZZES.clearAlarm);
    expect(clearAlarm?.fields).toContain('alarmType');
  });

  it('keeps the switch alias pointing at the script family component', () => {
    const script = ruleNodeComponentFor(RULE_NODE_CLAZZES.jsFilter);
    const switchDef = ruleNodeComponentFor(RULE_NODE_CLAZZES.jsSwitch);
    expect(script?.component).toBe(switchDef?.component);
  });
});

describe('registerRuleNodeComponents', () => {
  it('is idempotent', () => {
    registerRuleNodeComponents();
    registerRuleNodeComponents();
    expect(componentById(RULE_NODE_COMPONENT_IDS.script)).toBeDefined();
  });

  it('registers tree adapters into the M7 global registry under the frozen ids', () => {
    for (const id of Object.values(RULE_NODE_COMPONENT_IDS)) {
      expect(getCustomComponent(id)).toBeDefined();
    }
  });

  it('resolves adapters through the M7 hint.customComponent channel', () => {
    const component = resolveCustomComponent(
      {
        id: 'scriptLang',
        name: 'scriptLang',
        type: FormPropertyType.text,
        default: 'JS',
      },
      { customComponent: RULE_NODE_COMPONENT_IDS.script },
    );
    expect(component).toBeDefined();
  });
});
