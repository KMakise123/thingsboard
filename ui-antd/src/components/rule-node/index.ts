/**
 * Public API of the rule-node config components (M8 wave-2 K). The frozen
 * surface: NodeConfigForm + props, the registry id constants + clazz→family
 * resolver, and the tree-level component contract.
 */
export { NodeConfigForm, type NodeConfigFormProps } from './NodeConfigForm';
export {
  componentById,
  RULE_NODE_CLAZZES,
  RULE_NODE_COMPONENT_IDS,
  type RuleNodeComponentId,
  type RuleNodeConfigComponentProps,
  RuleNodeConfigContext,
  type RuleNodeConfigContextValue,
  type RuleNodeCustomComponentDef,
  registerRuleNodeComponents,
  resetRuleNodeComponents,
  ruleNodeComponentFor,
  ruleNodeComponentIdFor,
} from './registry';
