/**
 * Rule-chain canvas draft shape (M8 brief §2 — FROZEN after wave F).
 *
 * `CanvasRuleChain` is the EditorSession draft for the rule-chain editor:
 * nodes keyed by a client uid (NOT the wire id — new nodes are minted
 * `local-{n}` and stripped on serialize, because the backend silently drops
 * nodes whose id is not in the DB), edges aggregating the wire's per-label
 * connections, notes, and `inputTargetUid` expressing metadata.firstNodeIndex
 * (the INPUT virtual node itself is rendered by the canvas layer, never
 * stored here).
 */

import type { EntityIdOf, EntityType } from '@/types/tb/entity';
import type { RuleChain, RuleNodeDebugSettings } from '@/types/tb/rule-chain';

/** Full class name of the node that forwards messages into another chain. */
export const RULE_CHAIN_INPUT_NODE_CLAZZ =
  'org.thingsboard.rule.engine.flow.TbRuleChainInputNode';

/** Full class name of the node exposing this chain as a callable subchain. */
export const RULE_CHAIN_OUTPUT_NODE_CLAZZ =
  'org.thingsboard.rule.engine.flow.TbRuleChainOutputNode';

/**
 * Fallback display name for migrated TbRuleChainInputNode instances — the
 * importer is synchronous and does not resolve the remote chain name
 * (the backend names them with the real chain name on its own legacy pass).
 */
export const RULE_CHAIN_INPUT_DEFAULT_NAME = 'Rule Chain Input';

/** Standard relation labels offered when editing an edge (brief §1). */
export const RULE_CHAIN_CONNECTION_TYPES = [
  'Success',
  'Failure',
  'ACK',
  'True',
  'False',
  'Other',
  'To Root Rule Chain',
] as const;

export type RuleChainConnectionType =
  (typeof RULE_CHAIN_CONNECTION_TYPES)[number];

/**
 * Stable uid of the INPUT virtual node (canvas-render only; never present in
 * `nodes` and never serialized).
 */
export const INPUT_NODE_UID = '__input__';

/** One rule node on the canvas (wire `RuleNode` with geometry lifted out). */
export interface CanvasNode {
  /** Client-side identity (`local-{n}` for fresh nodes). Stripped on save. */
  uid: string;
  /** Wire node id — absent until the backend mints it (first save). */
  ruleNodeId?: EntityIdOf<EntityType.RULE_NODE>;
  /** Node implementation class full name (wire `RuleNode.type`). */
  clazz: string;
  name: string;
  /** Canvas position px — mirrors additionalInfo.layoutX/layoutY. */
  x: number;
  y: number;
  configuration: Record<string, unknown>;
  debugSettings?: RuleNodeDebugSettings;
  singletonMode?: boolean;
  queueName?: string;
  description?: string;
  configurationVersion?: number;
  /**
   * additionalInfo fields beyond layoutX/layoutY/description, passed through
   * verbatim so unknown producer extensions survive a round-trip.
   */
  additionalInfo?: Record<string, unknown>;
}

/** One canvas edge — an aggregation of same-(from,to) wire connections. */
export interface CanvasEdge {
  /** Client-side edge id (`local-e{n}`). Stripped on save. */
  id: string;
  sourceUid: string;
  targetUid: string;
  /** Relation labels; expanded back to one wire connection per label. */
  labels: string[];
  additionalInfo?: Record<string, unknown>;
}

/** One sticky note (wire `RuleChainNote` + client uid). */
export interface CanvasNote {
  /** Client-side identity. Stripped on save. */
  uid: string;
  /** Wire note id (opaque; round-tripped verbatim when present). */
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  applyDefaultMarkdownStyle?: boolean;
  markdownCss?: string;
}

/** The rule-chain editor draft. */
export interface CanvasRuleChain {
  /** Chain entity metadata snapshot (id/name/type/root/version/...). */
  chain: RuleChain;
  /** Nodes keyed by uid (insertion order = wire nodes order on load). */
  nodes: Record<string, CanvasNode>;
  edges: CanvasEdge[];
  notes: CanvasNote[];
  /**
   * The node receiving the INPUT virtual node's single outgoing edge
   * (wire `firstNodeIndex`). null = no entry edge.
   */
  inputTargetUid: string | null;
}
