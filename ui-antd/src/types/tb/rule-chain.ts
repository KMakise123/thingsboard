/**
 * Handwritten authoritative rule-chain wire types (M8).
 *
 * Source of truth: the generated openapi snapshot (RuleChain /
 * RuleChainMetaData / RuleNode / RuleChainNote / RuleChainData /
 * RuleChainImportResult / ScriptLanguage / DebugSettings / NodeConnectionInfo
 * schemas), ui-ngx shared/models/rule-node.models.ts (RuleNodeDefinition,
 * RuleNodeComponentDescriptor) and backend RuleChainController.
 *
 * The generated layer is heavily `readonly`; this handwritten layer follows
 * the dashboard.ts convention (BaseData/HasVersion/EntityIdOf composition,
 * mutable fields) because the editor pipeline (normalize → canvas → serialize
 * → POST) rewrites these objects everywhere.
 */

import type {
  BaseData,
  EntityIdOf,
  EntityType,
  EpochMillis,
  HasVersion,
} from './entity';

/** Rule chain processing scope (v2 list surface is always `CORE`; brief §0). */
export type RuleChainType = 'CORE' | 'EDGE';

/** Script language selector shared by the script-family rule nodes. */
export type ScriptLanguage = 'JS' | 'TBEL';

/** Rule chain entity (`/api/ruleChain` row shape, import/export payload). */
export interface RuleChain
  extends BaseData<EntityIdOf<EntityType.RULE_CHAIN>>,
    HasVersion {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  type?: RuleChainType;
  /** Pointer to the entry rule node (mirrors metadata.firstNodeIndex). */
  firstRuleNodeId?: EntityIdOf<EntityType.RULE_NODE>;
  /** Root chain processes all entity messages by default. */
  root?: boolean;
  /** Deprecated upstream; superseded by per-node `debugSettings`. */
  debugMode?: boolean;
  configuration?: Record<string, unknown>;
  additionalInfo?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Per-node debug switches (`RuleNode.debugSettings`). */
export interface RuleNodeDebugSettings {
  /** Capture failed messages. */
  failuresEnabled?: boolean;
  /** Capture every message (server turns this into `allEnabledUntil`). */
  allEnabled?: boolean;
  /** ms since epoch — server-managed "debug all" deadline. */
  allEnabledUntil?: number;
  [key: string]: unknown;
}

/** Canvas geometry + description tucked into `RuleNode.additionalInfo`. */
export interface RuleNodeAdditionalInfo {
  layoutX?: number;
  layoutY?: number;
  description?: string;
  [key: string]: unknown;
}

/** One rule node inside `RuleChainMetaData.nodes`. */
export interface RuleNode {
  /** Absent for freshly created nodes — the backend mints it (never the
   * client: nodes carrying an id that is not in the DB are silently
   * dropped server-side; brief §1 save semantics). */
  id?: EntityIdOf<EntityType.RULE_NODE>;
  createdTime?: EpochMillis;
  ruleChainId?: EntityIdOf<EntityType.RULE_CHAIN>;
  /** Full Java class name of the node implementation. */
  type: string;
  /** User-defined name shown on the canvas. */
  name: string;
  /** Deprecated upstream; superseded by `debugSettings`. */
  debugMode?: boolean;
  debugSettings?: RuleNodeDebugSettings;
  singletonMode?: boolean;
  queueName?: string;
  /** Descriptor/baseline configuration version of the node class. */
  configurationVersion?: number;
  /** Node-specific configuration tree (shape per component descriptor). */
  configuration: Record<string, unknown>;
  externalId?: EntityIdOf<EntityType.RULE_NODE>;
  additionalInfo?: RuleNodeAdditionalInfo;
  [key: string]: unknown;
}

/** One label-typed connection between two nodes of the SAME chain. */
export interface NodeConnectionInfo {
  /** Index into `nodes[]` of the source node. */
  fromIndex: number;
  /** Index into `nodes[]` of the target node. */
  toIndex: number;
  /** Relation label, e.g. 'Success' / 'Failure' / 'True'. */
  type: string;
  [key: string]: unknown;
}

/** Legacy connection to ANOTHER rule chain (pre-notes wire format; the
 * import migrator rewrites these into TbRuleChainInputNode instances). */
export interface RuleChainConnectionInfo {
  fromIndex: number;
  targetRuleChainId: EntityIdOf<EntityType.RULE_CHAIN>;
  additionalInfo?: Record<string, unknown>;
  type: string;
  [key: string]: unknown;
}

/** Sticky note persisted on the rule chain canvas (fork extension). */
export interface RuleChainNote {
  /** Note id — server-minted for saved notes; client uid is stripped on save. */
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Markdown or HTML content. */
  content?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  applyDefaultMarkdownStyle?: boolean;
  markdownCss?: string;
  [key: string]: unknown;
}

/** Graph body of a rule chain (`GET /api/ruleChain/{id}/metadata`). */
export interface RuleChainMetaData {
  ruleChainId: EntityIdOf<EntityType.RULE_CHAIN>;
  /** Optimistic-lock version — carried by metadata, NOT by the nodes. */
  version?: number;
  /** Index into `nodes[]` of the entry node; undefined when the INPUT
   * virtual node has no outgoing edge (brief §2 round-trip semantics). */
  firstNodeIndex?: number;
  nodes: RuleNode[];
  connections: NodeConnectionInfo[];
  ruleChainConnections?: RuleChainConnectionInfo[];
  notes?: RuleChainNote[];
  [key: string]: unknown;
}

/** Multi-chain export bundle (`RuleChainData` — bulk import/export). */
export interface RuleChainData {
  ruleChains: RuleChain[];
  metadata: RuleChainMetaData[];
  [key: string]: unknown;
}

/** Single-chain import/export file bundle (ui-ngx `RuleChainImport`). */
export interface RuleChainImport {
  ruleChain: RuleChain;
  metadata: RuleChainMetaData;
  [key: string]: unknown;
}

/** Result row of a bulk rule chain import (`RuleChainImportResult`). */
export interface RuleChainImportResult {
  ruleChainId?: EntityIdOf<EntityType.RULE_CHAIN>;
  ruleChainName?: string;
  updated?: boolean;
  error?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Component descriptors (GET /api/components — node library + form generator)
// ---------------------------------------------------------------------------

/** UI grouping of rule node components (wire enum, openapi ComponentType). */
export type RuleNodeComponentType =
  | 'FILTER'
  | 'ENRICHMENT'
  | 'TRANSFORMATION'
  | 'ACTION'
  | 'EXTERNAL'
  | 'FLOW';

/** `configurationDescriptor.nodeDefinition` — the form-generator input. */
export interface RuleNodeDefinition {
  /** Short markdown-rich details body (help tab; render sanitized). */
  details?: string;
  description?: string;
  /** Whether the node exposes an input handle on the canvas. */
  inEnabled: boolean;
  /** Whether the node exposes an output handle on the canvas. */
  outEnabled: boolean;
  /** Predefined relation labels offered by the node (empty = custom only). */
  relationTypes: string[];
  /** Whether the user may type arbitrary relation labels. */
  customRelations?: boolean;
  /** Node aggregates a whole subchain (input/output nodes). */
  ruleChainNode?: boolean;
  /** Default configuration VALUE tree — seed of the generated form. */
  defaultConfiguration: Record<string, unknown>;
  icon?: string;
  iconUrl?: string;
  /** External documentation URL (help tab out-link). */
  docUrl?: string;
  uiResources?: string[];
  uiResourceLoadError?: string;
  /** Legacy Angular directive name (v2 ignores it; uiHints map instead). */
  configDirective?: string;
  [key: string]: unknown;
}

/** `configurationDescriptor` wrapper (JsonNode on the wire). */
export interface RuleNodeConfigurationDescriptor {
  nodeDefinition: RuleNodeDefinition;
  [key: string]: unknown;
}

/** Row of `GET /api/components` (ui-ngx RuleNodeComponentDescriptor shape). */
export interface RuleNodeComponentDescriptor {
  id?: { id: string };
  createdTime?: EpochMillis;
  type: RuleNodeComponentType;
  scope?: 'SYSTEM' | 'TENANT';
  clusteringMode?: 'ENABLED' | 'SINGLETON' | 'USER_PREFERENCE';
  /** Display name from the @RuleNode annotation. */
  name: string;
  /** Implementing class full name — the stable identity key. */
  clazz: string;
  configurationVersion?: number;
  /** Deprecated upstream, always null. */
  actions?: string | null;
  /** Whether the node supports a queue-name field. */
  hasQueueName?: boolean;
  configurationDescriptor?: RuleNodeConfigurationDescriptor;
  [key: string]: unknown;
}
