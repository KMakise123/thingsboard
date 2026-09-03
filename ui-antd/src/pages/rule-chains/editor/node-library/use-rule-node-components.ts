/**
 * Rule-node component descriptors query (M8 brief §3 wave C): one
 * `getRuleNodeComponents(ALL, 'CORE')` fetch shared by the node library,
 * the canvas handle gating and the dialogs. Descriptors are static server
 * catalog data for the lifetime of the app — `staleTime: Infinity`.
 */
import { useQuery } from '@tanstack/react-query';
import { getRuleNodeComponents } from '@/services/tb/rule-chain';
import type {
  RuleNodeComponentDescriptor,
  RuleNodeComponentType,
} from '@/types/tb/rule-chain';

/** spec §4.8 grouping order (FILTER → … → FLOW). */
export const RULE_NODE_COMPONENT_TYPES: Array<RuleNodeComponentType> = [
  'FILTER',
  'ENRICHMENT',
  'TRANSFORMATION',
  'ACTION',
  'EXTERNAL',
  'FLOW',
];

export function useRuleNodeComponents() {
  return useQuery({
    queryKey: ['ruleNodeComponents', 'CORE'],
    queryFn: () => getRuleNodeComponents(RULE_NODE_COMPONENT_TYPES, 'CORE'),
    staleTime: Infinity,
  });
}

/** clazz → descriptor index built from the query data. */
export function indexDescriptors(
  descriptors: Array<RuleNodeComponentDescriptor>,
): Record<string, RuleNodeComponentDescriptor> {
  const byClazz: Record<string, RuleNodeComponentDescriptor> = {};
  for (const descriptor of descriptors) {
    byClazz[descriptor.clazz] = descriptor;
  }
  return byClazz;
}
