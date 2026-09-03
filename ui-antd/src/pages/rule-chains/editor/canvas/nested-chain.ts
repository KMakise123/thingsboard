/**
 * Create-nested-rule-chain (ctrl+r) — ui-ngx rulechain-page
 * createNestedChain flow parity, split into pure layers so the POST
 * orchestration stays in the shell:
 *
 *  1. validateNestedChainSelection — the sub-graph must be exportable: at
 *     most ONE selected node without an intra-selection incoming edge whose
 *     descriptor allows input (inEnabled) — that node becomes the new
 *     chain's firstNodeIndex (brief: 校验=多选中无入边且 inEnabled ≤1).
 *  2. buildNestedChainMetadata — the new chain's graph: selected nodes (no
 *     wire ids), intra-selection connections, cloned notes, one
 *     TbRuleChainOutputNode per link leaving the selection (named with the
 *     joined labels, placed at the external target's position), geometry
 *     kept verbatim.
 *  3. applyNestedChainReplacement — ONE transaction group in THIS chain:
 *     remove the selected nodes, add a TbRuleChainInputNode at the sub-graph
 *     centroid pointing at the new chain, and re-point every external
 *     incoming / outgoing link onto the replacement node (ngx relink).
 */
import {
  newUid,
  type RuleChainDraftWrite,
} from '@/core/rulechain/rule-chain-draft';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import {
  RULE_CHAIN_INPUT_NODE_CLAZZ,
  RULE_CHAIN_OUTPUT_NODE_CLAZZ,
} from '@/core/rulechain/types';
import type { EntityIdOf, EntityType } from '@/types/tb/entity';
import type {
  RuleChainMetaData,
  RuleNode,
  RuleNodeComponentDescriptor,
} from '@/types/tb/rule-chain';

import type { CanvasSelection } from './interactions';

export type RuleNodeDescriptors = Record<string, RuleNodeComponentDescriptor>;

export interface NestedChainValidation {
  ok: boolean;
  /** Count of entry candidates (no intra-selection incoming edge). */
  entryCount: number;
  reason?: 'noNodes' | 'multipleEntries';
}

function selectionOf(
  draft: CanvasRuleChain,
  selection: CanvasSelection,
): Array<string> {
  return selection.nodeIds.filter((uid) => Boolean(draft.nodes[uid]));
}

/** Uids of the selection that receive an intra-selection incoming edge. */
function intraIncomingTargets(
  draft: CanvasRuleChain,
  selectedSet: Set<string>,
): Set<string> {
  return new Set(
    draft.edges
      .filter(
        (edge) =>
          selectedSet.has(edge.sourceUid) && selectedSet.has(edge.targetUid),
      )
      .map((edge) => edge.targetUid),
  );
}

function allowsInput(
  draft: CanvasRuleChain,
  uid: string,
  descriptors: RuleNodeDescriptors,
): boolean {
  const inEnabled =
    descriptors[draft.nodes[uid]?.clazz]?.configurationDescriptor
      ?.nodeDefinition?.inEnabled;
  return inEnabled !== false;
}

export function validateNestedChainSelection(
  draft: CanvasRuleChain,
  selection: CanvasSelection,
  descriptors: RuleNodeDescriptors,
): NestedChainValidation {
  const selected = selectionOf(draft, selection);
  if (selected.length === 0) {
    return { ok: false, entryCount: 0, reason: 'noNodes' };
  }
  const selectedSet = new Set(selected);
  const incoming = intraIncomingTargets(draft, selectedSet);
  const entryCandidates = selected.filter(
    (uid) => !incoming.has(uid) && allowsInput(draft, uid, descriptors),
  );
  if (entryCandidates.length > 1) {
    return {
      ok: false,
      entryCount: entryCandidates.length,
      reason: 'multipleEntries',
    };
  }
  return { ok: true, entryCount: entryCandidates.length };
}

/**
 * The metadata of the NEW chain. Node order: selected nodes in draft order,
 * then the output nodes — firstNodeIndex addresses this array (ngx parity).
 * Geometry is kept verbatim: the new chain's layout is the exported
 * sub-graph's layout (output nodes sit at the external targets' positions).
 */
export function buildNestedChainMetadata(
  draft: CanvasRuleChain,
  selection: CanvasSelection,
  descriptors: RuleNodeDescriptors,
  ruleChainId: string,
): RuleChainMetaData {
  const selected = selectionOf(draft, selection);
  const selectedSet = new Set(selected);
  const indexOfUid = new Map(selected.map((uid, index) => [uid, index]));

  const nodes: Array<RuleNode> = selected.map((uid) => {
    const node = draft.nodes[uid];
    return {
      type: node.clazz,
      name: node.name,
      configuration: structuredClone(node.configuration ?? {}),
      additionalInfo: {
        ...(node.additionalInfo ?? {}),
        layoutX: Math.round(node.x),
        layoutY: Math.round(node.y),
        ...(node.description !== undefined
          ? { description: node.description }
          : {}),
      },
      ...(node.debugSettings
        ? { debugSettings: structuredClone(node.debugSettings) }
        : {}),
      singletonMode: node.singletonMode ?? false,
      ...(node.queueName !== undefined ? { queueName: node.queueName } : {}),
      configurationVersion:
        node.configurationVersion ??
        descriptors[node.clazz]?.configurationVersion ??
        0,
    };
  });

  const connections: RuleChainMetaData['connections'] = [];
  for (const edge of draft.edges) {
    if (!selectedSet.has(edge.sourceUid) || !selectedSet.has(edge.targetUid)) {
      continue;
    }
    const fromIndex = indexOfUid.get(edge.sourceUid) as number;
    const toIndex = indexOfUid.get(edge.targetUid) as number;
    for (const label of edge.labels) {
      connections.push({ fromIndex, toIndex, type: label });
    }
  }

  for (const edge of draft.edges) {
    if (!selectedSet.has(edge.sourceUid) || selectedSet.has(edge.targetUid)) {
      continue;
    }
    const target = draft.nodes[edge.targetUid];
    nodes.push({
      type: RULE_CHAIN_OUTPUT_NODE_CLAZZ,
      name: edge.labels.join(' / '),
      configuration: {},
      additionalInfo: {
        layoutX: Math.round(target.x),
        layoutY: Math.round(target.y),
      },
      singletonMode: false,
    });
    const fromIndex = indexOfUid.get(edge.sourceUid) as number;
    const toIndex = nodes.length - 1;
    for (const label of edge.labels) {
      connections.push({ fromIndex, toIndex, type: label });
    }
  }

  const meta: RuleChainMetaData = {
    // the caller POSTs the new chain first, so the id always exists here
    ruleChainId: {
      entityType: 'RULE_CHAIN',
      id: ruleChainId,
    } as EntityIdOf<EntityType.RULE_CHAIN>,
    nodes,
    connections,
    notes: structuredClone(draft.notes) as never,
  };

  const incoming = intraIncomingTargets(draft, selectedSet);
  const entry = selected.find(
    (uid) => !incoming.has(uid) && allowsInput(draft, uid, descriptors),
  );
  if (entry) {
    meta.firstNodeIndex = indexOfUid.get(entry);
  }
  return meta;
}

export interface ApplyNestedChainReplacementArgs {
  /** New chain id + display name (the TbRuleChainInputNode points at it). */
  newChainId: string;
  newChainName: string;
  draft: CanvasRuleChain;
  selection: CanvasSelection;
}

/**
 * ONE undoable group replacing the exported sub-graph with a single
 * TbRuleChainInputNode (ngx ruleChainNode). External incoming links
 * re-target the replacement; external outgoing links re-source it (labels
 * preserved). The INPUT entry edge never crosses the boundary (the entry
 * edge is the INPUT virtual node's own outgoing link), so no extra input
 * edge handling is needed.
 */
export function applyNestedChainReplacement(
  args: ApplyNestedChainReplacementArgs,
): RuleChainDraftWrite {
  const { newChainId, newChainName, draft, selection } = args;
  const selected = selectionOf(draft, selection);
  const selectedSet = new Set(selected);
  const xs = selected.map((uid) => draft.nodes[uid].x);
  const ys = selected.map((uid) => draft.nodes[uid].y);
  const centroidX = xs.length ? Math.round(Math.min(...xs) + 85) : 0;
  const centroidY = ys.length ? Math.round(Math.min(...ys) + 25) : 0;
  return {
    label: 'create nested rule chain',
    recipe: (next): void => {
      if (selected.length === 0) {
        return;
      }
      for (const uid of selected) {
        delete next.nodes[uid];
      }
      const uid = newUid(next);
      next.nodes[uid] = {
        uid,
        clazz: RULE_CHAIN_INPUT_NODE_CLAZZ,
        name: newChainName,
        x: centroidX,
        y: centroidY,
        configuration: { ruleChainId: newChainId },
        singletonMode: false,
        configurationVersion: 0,
      };
      next.edges = next.edges
        .map((edge) => {
          const sourceOut = selectedSet.has(edge.sourceUid);
          const targetIn = selectedSet.has(edge.targetUid);
          if (sourceOut && targetIn) {
            return edge; // intra-sub-graph links die with the sub-graph
          }
          if (targetIn) {
            return { ...edge, targetUid: uid };
          }
          if (sourceOut) {
            return { ...edge, sourceUid: uid };
          }
          return edge;
        })
        .filter(
          (edge) =>
            Boolean(next.nodes[edge.sourceUid]) &&
            Boolean(next.nodes[edge.targetUid]),
        );
      if (next.inputTargetUid && selectedSet.has(next.inputTargetUid)) {
        // the chain entry fed the exported sub-graph — feed the replacement
        next.inputTargetUid = uid;
      }
    },
  };
}
