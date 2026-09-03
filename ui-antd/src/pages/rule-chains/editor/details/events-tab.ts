/**
 * RuleNodeEventsTab — FROZEN SEAM (M8 brief §3 wave C; the path, the export
 * names and the minimal prop `{ruleNodeId}` must not change — wave 3 K2
 * renders this tab with only that prop).
 *
 * Wave 3 D FILLED the implementation: it lives in
 * `../events/rule-node-events-tab` (a JSX module) and this non-JSX seam
 * module re-exports it. The props widened ADDITIVELY — every new prop is
 * optional and degrades gracefully:
 *   { ruleNodeId,            // frozen (required)
 *     node?,                 // CanvasNode → enables 用这条消息测试 row action
 *     descriptor?,           // reserved for the K2 drawer surface
 *     tenantId?,             // events API scope; defaults to session user
 *     testIdPrefix? }        // test seam
 */
export type { RuleNodeEventsTabProps } from '../events/rule-node-events-tab';
export { RuleNodeEventsTab } from '../events/rule-node-events-tab';
