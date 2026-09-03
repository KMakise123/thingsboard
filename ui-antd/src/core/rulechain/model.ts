/**
 * Rule-chain model: metadata ↔ canvas conversion + legacy import migrations
 * (M8 brief §2). Pure functions — inputs are never mutated, everything
 * returns structural copies (style parity with core/dashboard/model.ts).
 *
 * Wire anchors:
 *  - Edge aggregation ↔ connection expansion mirrors ui-ngx
 *    rulechain-page.component.ts createRuleChainModel (:680-706) and
 *    saveRuleChain (:1651-1742): canvas edges merge every same-(from,to)
 *    connection pair into one edge with labels[]; serialization expands one
 *    connection per label.
 *  - INPUT virtual node ↔ metadata.firstNodeIndex (the canvas layer renders
 *    the INPUT node from `inputTargetUid`; it is never stored/serialized).
 *  - New nodes carry NO wire id on save: the backend silently drops nodes
 *    whose id is not in the DB (brief §1 铁律) — client uids are stripped.
 *  - layoutX/Y ↔ x/y with Math.round on BOTH directions (ui-ngx parity).
 */

import type { EntityIdOf, EntityType } from '@/types/tb/entity';
import type {
  NodeConnectionInfo,
  RuleChain,
  RuleChainImport,
  RuleChainMetaData,
  RuleChainNote,
  RuleNode,
} from '@/types/tb/rule-chain';

import type {
  CanvasEdge,
  CanvasNode,
  CanvasNote,
  CanvasRuleChain,
} from './types';
import {
  RULE_CHAIN_INPUT_DEFAULT_NAME,
  RULE_CHAIN_INPUT_NODE_CLAZZ,
} from './types';

// ---------------------------------------------------------------------------
// metadata → canvas
// ---------------------------------------------------------------------------

/**
 * Converts server metadata into the canvas draft. `chain` is snapshotted
 * verbatim (the metadata's optimistic-lock version lives on the chain).
 */
export function metadataToCanvas(
  meta: RuleChainMetaData,
  chain: RuleChain,
): CanvasRuleChain {
  const nodes: Record<string, CanvasNode> = {};
  const indexOfUid: string[] = [];
  (meta.nodes ?? []).forEach((ruleNode, index) => {
    const uid = `local-${index}`;
    indexOfUid.push(uid);
    const additionalInfo = ruleNode.additionalInfo ?? {};
    const {
      layoutX: _layoutX,
      layoutY: _layoutY,
      description,
      ...additionalExtras
    } = additionalInfo;
    const canvasNode: CanvasNode = {
      uid,
      ...(ruleNode.id ? { ruleNodeId: ruleNode.id } : {}),
      clazz: ruleNode.type,
      name: ruleNode.name,
      x: Math.round(_layoutX ?? 0),
      y: Math.round(_layoutY ?? 0),
      configuration: clone(ruleNode.configuration ?? {}),
      ...(ruleNode.debugSettings
        ? { debugSettings: clone(ruleNode.debugSettings) }
        : {}),
      // normalized to a boolean so the canvas can rely on it (ui-ngx parity)
      singletonMode: ruleNode.singletonMode ?? false,
      ...(ruleNode.queueName !== undefined
        ? { queueName: ruleNode.queueName }
        : {}),
      ...(description !== undefined ? { description } : {}),
      configurationVersion: ruleNode.configurationVersion ?? 0,
      ...(Object.keys(additionalExtras).length > 0
        ? { additionalInfo: clone(additionalExtras) }
        : {}),
    };
    nodes[uid] = canvasNode;
  });

  const edges: CanvasEdge[] = [];
  const edgeByPair = new Map<string, CanvasEdge>();
  for (const connection of meta.connections ?? []) {
    const sourceUid = indexOfUid[connection.fromIndex];
    const targetUid = indexOfUid[connection.toIndex];
    // ui-ngx skips connections whose endpoints are missing (defensive)
    if (!sourceUid || !targetUid) {
      continue;
    }
    const pairKey = `${sourceUid}->${targetUid}`;
    const existing = edgeByPair.get(pairKey);
    if (existing) {
      existing.labels.push(connection.type);
    } else {
      const edge: CanvasEdge = {
        id: `local-e${edges.length}`,
        sourceUid,
        targetUid,
        labels: [connection.type],
      };
      edgeByPair.set(pairKey, edge);
      edges.push(edge);
    }
  }

  // geometry normalized to definite ints (ui-ngx default note = 200x120)
  const notes: CanvasNote[] = (meta.notes ?? []).map((note, index) => ({
    ...(note.id
      ? { uid: note.id, id: note.id }
      : { uid: `local-note${index}` }),
    ...clone(note),
    x: Math.round(note.x ?? 0),
    y: Math.round(note.y ?? 0),
    width: Math.round(note.width ?? 200),
    height: Math.round(note.height ?? 120),
  }));

  return {
    chain: clone(chain),
    nodes,
    edges,
    notes,
    inputTargetUid: firstNodeUid(meta, indexOfUid),
  };
}

/** firstNodeIndex → canvas uid; undefined/-1/out-of-range all yield null. */
function firstNodeUid(
  meta: RuleChainMetaData,
  indexOfUid: string[],
): string | null {
  const index = meta.firstNodeIndex;
  if (typeof index !== 'number' || index < 0 || index >= indexOfUid.length) {
    return null;
  }
  return indexOfUid[index] ?? null;
}

// ---------------------------------------------------------------------------
// canvas → metadata
// ---------------------------------------------------------------------------

/**
 * Serializes the canvas draft into the wire metadata for
 * POST /api/ruleChain/metadata. Client uids and local edge ids are stripped;
 * nodes that were never saved carry no id (backend mints one).
 */
export function canvasToMetadata(canvas: CanvasRuleChain): RuleChainMetaData {
  const uids = Object.keys(canvas.nodes);
  const meta: RuleChainMetaData = {
    // Call sites save the chain first (the import flow POSTs the chain to
    // mint the id) — chain.id is always set at metadata-save time.
    ruleChainId: canvas.chain.id as EntityIdOf<EntityType.RULE_CHAIN>,
    ...(canvas.chain.version !== undefined
      ? { version: canvas.chain.version }
      : {}),
    nodes: uids.map((uid) => canvasNodeToWire(canvas.nodes[uid])),
    connections: [],
  };

  const firstNodeIndex = canvas.inputTargetUid
    ? uids.indexOf(canvas.inputTargetUid)
    : -1;
  if (firstNodeIndex >= 0) {
    meta.firstNodeIndex = firstNodeIndex;
  }

  for (const edge of canvas.edges) {
    const fromIndex = uids.indexOf(edge.sourceUid);
    const toIndex = uids.indexOf(edge.targetUid);
    if (fromIndex < 0 || toIndex < 0) {
      // never emit connections pointing at unknown nodes
      continue;
    }
    for (const label of edge.labels) {
      meta.connections.push({ fromIndex, toIndex, type: label });
    }
  }

  if (canvas.notes.length > 0) {
    meta.notes = canvas.notes.map(canvasNoteToWire);
  }

  return meta;
}

function canvasNodeToWire(node: CanvasNode): RuleNode {
  const wire: RuleNode = {
    ...(node.ruleNodeId ? { id: node.ruleNodeId } : {}),
    type: node.clazz,
    name: node.name,
    singletonMode: node.singletonMode ?? false,
    ...(node.queueName !== undefined ? { queueName: node.queueName } : {}),
    ...(node.debugSettings !== undefined
      ? { debugSettings: clone(node.debugSettings) }
      : {}),
    configurationVersion: node.configurationVersion ?? 0,
    configuration: clone(node.configuration ?? {}),
    additionalInfo: {
      ...(node.additionalInfo ?? {}),
      layoutX: Math.round(node.x),
      layoutY: Math.round(node.y),
      ...(node.description !== undefined
        ? { description: node.description }
        : {}),
    },
  };
  return wire;
}

function canvasNoteToWire(note: CanvasNote): RuleChainNote {
  const { uid: _uid, ...wire } = note;
  return clone(wire);
}

// ---------------------------------------------------------------------------
// Legacy import migrations (brief §1, ui-ngx import-export.service.ts :685-734)
// ---------------------------------------------------------------------------

/**
 * Migrates a legacy import file in place-free purity:
 *  ① `debugMode: true` nodes → `debugSettings{failuresEnabled:true,
 *     allEnabled:true}` (deprecated flag stripped);
 *  ② `metadata.ruleChainConnections[]` → one TbRuleChainInputNode per entry
 *     (name falls back to the 'Rule Chain Input' constant — this migration is
 *     synchronous and does not resolve the remote chain name) plus a
 *     corresponding node connection. The legacy array is then REMOVED: the
 *     current backend converts any leftover array into input nodes AGAIN on
 *     metadata save (BaseRuleChainService :285), so keeping it would
 *     duplicate every migrated node.
 */
export function migrateRuleChainImport(data: RuleChainImport): RuleChainImport {
  const metadata = clone(data.metadata);
  metadata.nodes = (metadata.nodes ?? []).map((node) => {
    if (node.debugMode) {
      const { debugMode: _dropped, ...rest } = node;
      return {
        ...rest,
        debugSettings: { failuresEnabled: true, allEnabled: true },
      };
    }
    return node;
  });
  metadata.connections = metadata.connections ?? [];

  const legacyConnections = metadata.ruleChainConnections;
  if (Array.isArray(legacyConnections) && legacyConnections.length > 0) {
    for (const connection of legacyConnections) {
      const targetRuleChainId = connection.targetRuleChainId?.id;
      if (!targetRuleChainId) {
        continue;
      }
      const ruleChainNode: RuleNode = {
        name: RULE_CHAIN_INPUT_DEFAULT_NAME,
        type: RULE_CHAIN_INPUT_NODE_CLAZZ,
        singletonMode: false,
        configuration: { ruleChainId: targetRuleChainId },
        ...(connection.additionalInfo
          ? { additionalInfo: clone(connection.additionalInfo) }
          : {}),
      };
      const toIndex = metadata.nodes.length;
      metadata.nodes.push(ruleChainNode);
      const nodeConnection: NodeConnectionInfo = {
        fromIndex: connection.fromIndex,
        toIndex,
        type: connection.type,
      };
      metadata.connections.push(nodeConnection);
    }
    delete metadata.ruleChainConnections;
  }

  return { ruleChain: clone(data.ruleChain), metadata };
}

// ---------------------------------------------------------------------------

/** Drafts must own their data — immer auto-freeze must not leak into caches. */
function clone<T>(value: T): T {
  return structuredClone(value);
}
