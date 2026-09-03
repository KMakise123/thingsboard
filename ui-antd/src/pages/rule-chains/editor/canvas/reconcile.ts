/**
 * Draft → React Flow view-model derivation (M8 brief §2 半受控契约).
 *
 * Pure + reconciling: every element whose projected state is unchanged is
 * REUSED by object identity, so a session write (or a hover/selection flip)
 * only re-renders the touched elements through React Flow's memoized
 * node/edge wrappers — the P4 re-render-topology guarantee. Callbacks travel
 * in edge data; they are stable refs and are excluded from the change key.
 */
import type { Edge, Node } from '@xyflow/react';

import type { CanvasNote, CanvasRuleChain } from '@/core/rulechain/types';
import { INPUT_NODE_UID } from '@/core/rulechain/types';

import { RULE_NODE_HEIGHT, RULE_NODE_WIDTH } from './geometry';
import type { CanvasSelection } from './interactions';
import type { RuleNodeDescriptors } from './nested-chain';

/** Offset of the INPUT virtual node left of its target. */
export const INPUT_NODE_OFFSET_X = 240;

export type RuleNodeViewData = {
  name: string;
  clazz: string;
  description?: string;
  highlighted: boolean;
  inEnabled: boolean;
  outEnabled: boolean;
};

export type NoteViewData = {
  note: CanvasNote;
  highlighted: boolean;
};

export type RuleChainEdgeData = {
  labels: Array<string>;
  isInputEdge: boolean;
  hovered: boolean;
  onEditLabels?: (edgeId: string) => void;
  onDelete?: (edgeId: string) => void;
};

export type RuleNodeFlowNode = Node<RuleNodeViewData, 'ruleNode'>;
export type InputFlowNode = Node<Record<string, never>, 'inputNode'>;
export type NoteFlowNode = Node<NoteViewData, 'note'>;
export type CanvasFlowNode = RuleNodeFlowNode | InputFlowNode | NoteFlowNode;
export type CanvasFlowEdge = Edge<RuleChainEdgeData, 'ruleChainEdge'>;

export interface DerivedCanvas {
  nodes: Array<CanvasFlowNode>;
  edges: Array<CanvasFlowEdge>;
}

export interface DeriveCanvasArgs {
  draft: CanvasRuleChain;
  selection: CanvasSelection;
  descriptors: RuleNodeDescriptors;
  highlightQuery: string;
  hoveredEdgeId: string | null;
  /** Edge actions (stable refs — identity never changes a comparison). */
  edgeActions: {
    onEditLabels: (edgeId: string) => void;
    onDelete: (edgeId: string) => void;
  };
}

function matchesHighlight(query: string, ...fields: Array<string | undefined>) {
  if (!query) {
    return false;
  }
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return false;
  }
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/** Node change-key: identity is reused iff this string is unchanged. */
function nodeKey(node: CanvasFlowNode): string {
  const base = `${node.type}|${node.position.x}|${node.position.y}|${node.selected ? 1 : 0}|${node.width ?? 0}|${node.height ?? 0}`;
  if (node.type === 'ruleNode') {
    const data = node.data;
    return `${base}|${data.name}|${data.clazz}|${data.description ?? ''}|${data.highlighted ? 1 : 0}|${data.inEnabled ? 1 : 0}|${data.outEnabled ? 1 : 0}`;
  }
  if (node.type === 'note') {
    const note = node.data.note;
    return `${base}|${note.content ?? ''}|${note.backgroundColor ?? ''}|${note.borderColor ?? ''}|${note.borderWidth ?? 0}|${note.applyDefaultMarkdownStyle ? 1 : 0}|${note.markdownCss ?? ''}|${node.data.highlighted ? 1 : 0}`;
  }
  return base;
}

function edgeKey(edge: CanvasFlowEdge): string {
  const data = edge.data;
  return `${edge.id}|${edge.source}|${edge.target}|${edge.selected ? 1 : 0}|${data?.labels.join(',') ?? ''}|${data?.isInputEdge ? 1 : 0}|${data?.hovered ? 1 : 0}`;
}

/**
 * Derives the RF view-model from the draft + UI channels, reusing previous
 * element objects wherever their projection is unchanged.
 */
export function deriveCanvas(
  args: DeriveCanvasArgs,
  prev: DerivedCanvas | null,
): DerivedCanvas {
  const { draft, selection, descriptors, highlightQuery, hoveredEdgeId } = args;
  const prevNodes = new Map(
    (prev?.nodes ?? []).map((node) => [node.id, node] as const),
  );
  const prevEdges = new Map(
    (prev?.edges ?? []).map((edge) => [edge.id, edge] as const),
  );
  const selectedNodes = new Set(selection.nodeIds);
  const selectedEdges = new Set(selection.edgeIds);

  const nodes: Array<CanvasFlowNode> = [];
  for (const node of Object.values(draft.nodes)) {
    const definition =
      descriptors[node.clazz]?.configurationDescriptor?.nodeDefinition;
    nodes.push({
      id: node.uid,
      type: 'ruleNode',
      position: { x: node.x, y: node.y },
      width: RULE_NODE_WIDTH,
      height: RULE_NODE_HEIGHT,
      selected: selectedNodes.has(node.uid),
      data: {
        name: node.name,
        clazz: node.clazz,
        ...(node.description ? { description: node.description } : {}),
        highlighted: matchesHighlight(highlightQuery, node.name, node.clazz),
        inEnabled: definition?.inEnabled !== false,
        outEnabled: definition?.outEnabled !== false,
      },
    } satisfies RuleNodeFlowNode);
  }

  // INPUT virtual node: canvas-render only (never stored; brief §2). It
  // anchors left of its target, or of the first node while unlinked.
  if (Object.keys(draft.nodes).length > 0) {
    const anchor =
      (draft.inputTargetUid ? draft.nodes[draft.inputTargetUid] : undefined) ??
      draft.nodes[Object.keys(draft.nodes)[0]];
    nodes.push({
      id: INPUT_NODE_UID,
      type: 'inputNode',
      position: { x: anchor.x - INPUT_NODE_OFFSET_X, y: anchor.y },
      width: RULE_NODE_WIDTH,
      height: RULE_NODE_HEIGHT,
      draggable: false,
      selectable: false,
      deletable: false,
      data: {},
    } satisfies InputFlowNode);
  }

  for (const note of draft.notes) {
    nodes.push({
      id: note.uid,
      type: 'note',
      position: { x: note.x, y: note.y },
      width: note.width,
      height: note.height,
      selected: selectedNodes.has(note.uid),
      data: {
        note,
        highlighted: matchesHighlight(highlightQuery, note.content),
      },
    } satisfies NoteFlowNode);
  }

  const edges: Array<CanvasFlowEdge> = draft.edges.map((edge) =>
    buildEdge({
      id: edge.id,
      source: edge.sourceUid,
      target: edge.targetUid,
      labels: edge.labels,
      isInputEdge: false,
      selected: selectedEdges.has(edge.id),
      hovered: hoveredEdgeId === edge.id,
      edgeActions: args.edgeActions,
    }),
  );
  const inputTarget = draft.inputTargetUid;
  if (inputTarget) {
    edges.push(
      buildEdge({
        id: `${INPUT_NODE_UID}->${inputTarget}`,
        source: INPUT_NODE_UID,
        target: inputTarget,
        labels: [],
        isInputEdge: true,
        selected: selectedEdges.has(`${INPUT_NODE_UID}->${inputTarget}`),
        hovered: hoveredEdgeId === `${INPUT_NODE_UID}->${inputTarget}`,
        edgeActions: args.edgeActions,
      }),
    );
  }

  return {
    nodes: nodes.map((candidate) =>
      reuse(prevNodes.get(candidate.id), candidate, nodeKey),
    ),
    edges: edges.map((candidate) =>
      reuse(prevEdges.get(candidate.id), candidate, edgeKey),
    ),
  };
}

function buildEdge(args: {
  id: string;
  source: string;
  target: string;
  labels: Array<string>;
  isInputEdge: boolean;
  selected: boolean;
  hovered: boolean;
  edgeActions: DeriveCanvasArgs['edgeActions'];
}): CanvasFlowEdge {
  const edge: CanvasFlowEdge = {
    id: args.id,
    source: args.source,
    target: args.target,
    type: 'ruleChainEdge',
    selected: args.selected,
    reconnectable: false,
    data: {
      labels: args.labels,
      isInputEdge: args.isInputEdge,
      hovered: args.hovered,
      onEditLabels: args.edgeActions.onEditLabels,
      onDelete: args.edgeActions.onDelete,
    },
  };
  return edge;
}

/** Identity-preserving reconcile: reuse prev when the change-key matches. */
function reuse<T extends { id: string }>(
  prev: T | undefined,
  candidate: T,
  keyOf: (element: T) => string,
): T {
  if (prev && keyOf(prev) === keyOf(candidate)) {
    return prev;
  }
  return candidate;
}
