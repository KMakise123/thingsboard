/**
 * Frozen identity constants for the rule-node custom registry (M8 wave-2 K).
 * Leaf module — both the registry and the family components consume it, so
 * it must not import anything from this folder (avoids init cycles).
 *
 * Clazz full names verified against the backend @RuleNode annotations
 * (rule-engine/rule-engine-components, read 2026-09).
 */

/** The P0 node implementation classes (wire `RuleNodeComponentDescriptor.clazz`). */
export const RULE_NODE_CLAZZES = {
  jsFilter: 'org.thingsboard.rule.engine.filter.TbJsFilterNode',
  jsSwitch: 'org.thingsboard.rule.engine.filter.TbJsSwitchNode',
  transformMsg: 'org.thingsboard.rule.engine.transform.TbTransformMsgNode',
  log: 'org.thingsboard.rule.engine.action.TbLogNode',
  msgGenerator: 'org.thingsboard.rule.engine.debug.TbMsgGeneratorNode',
  copyKeys: 'org.thingsboard.rule.engine.transform.TbCopyKeysNode',
  deleteKeys: 'org.thingsboard.rule.engine.transform.TbDeleteKeysNode',
  renameKeys: 'org.thingsboard.rule.engine.transform.TbRenameKeysNode',
  msgTimeseries: 'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode',
  msgAttributes: 'org.thingsboard.rule.engine.telemetry.TbMsgAttributesNode',
  createAlarm: 'org.thingsboard.rule.engine.action.TbCreateAlarmNode',
  clearAlarm: 'org.thingsboard.rule.engine.action.TbClearAlarmNode',
} as const;

/**
 * Registry ids of the P0 five families (frozen — wave-3 K2/R depend on
 * these; the switch node is a script-family alias handled at resolver level).
 */
export const RULE_NODE_COMPONENT_IDS = {
  script: 'rule-node.script',
  switch: 'rule-node.switch',
  copyKeys: 'rule-node.copy-keys',
  deleteKeys: 'rule-node.delete-keys',
  renameKeys: 'rule-node.rename-keys',
  saveTimeseries: 'rule-node.save-timeseries',
  saveAttributes: 'rule-node.save-attributes',
  createAlarm: 'rule-node.create-alarm',
  clearAlarm: 'rule-node.clear-alarm',
} as const;

export type RuleNodeComponentId =
  (typeof RULE_NODE_COMPONENT_IDS)[keyof typeof RULE_NODE_COMPONENT_IDS];
