/**
 * RuleNodeEventsTab — FROZEN PLACEHOLDER SEAM (M8 brief §3 wave C; wave 3 D
 * FILLS this file with the DEBUG_RULE_NODE events table — the path and prop
 * signature must not change).
 *
 *   props: { ruleNodeId: string }
 *
 * .ts (no JSX) per the seam spec: a plain-object element keeps this a
 * non-JSX module while still rendering an honest placeholder.
 */
import { createElement } from 'react';

export interface RuleNodeEventsTabProps {
  ruleNodeId: string;
}

export function RuleNodeEventsTab({ ruleNodeId }: RuleNodeEventsTabProps) {
  return createElement(
    'div',
    { 'data-testid': 'rc-node-events-tab', 'data-rule-node-id': ruleNodeId },
    `events tab placeholder (wave 3 D) — ruleNodeId: ${ruleNodeId}`,
  );
}
