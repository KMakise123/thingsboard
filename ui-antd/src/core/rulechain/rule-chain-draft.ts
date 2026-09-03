/**
 * Typed transaction recipes over the CanvasRuleChain draft (M8 brief §2 —
 * F-wave contract, FROZEN after delivery; paradigm parity with
 * core/editor/dashboard-draft.ts).
 *
 * Each factory returns a `RuleChainDraftWrite` bundle (label + pure
 * `(draft) => void` recipe + optional coalesceKey) so the canvas commits
 * through the one and only writer:
 *
 *   writeRuleChainDraft(session, addNode({ clazz, name, x, y }));
 *   // = session.write(write.label, write.recipe, { coalesceKey })
 *
 * Conventions (core/rulechain/model.ts conversion contract):
 *  - Node identity is the client uid; `addNode`/`paste` mint fresh
 *    `local-{n}` uids and pasted elements DROP their wire ids (ruleNodeId /
 *    note id) — reusing a wire id would make the backend overwrite the
 *    original element on save.
 *  - The INPUT virtual node is `inputTargetUid`, never a node entry and
 *    never an edge (brief §2 shape); `setInputTarget` owns its 唯一出边
 *    semantics (a new INPUT link replaces the previous one).
 *  - Every inserted value is deep-cloned, so the draft never aliases caller
 *    or clipboard objects (immer auto-freeze would leak into them).
 */

import type { EditorSession } from '@/core/editor/session';
import type { RuleNodeDebugSettings } from '@/types/tb/rule-chain';

import {
  type CanvasNode,
  type CanvasNote,
  type CanvasRuleChain,
  INPUT_NODE_UID,
} from './types';

/** A committed-through-`writeRuleChainDraft` transaction bundle. */
export interface RuleChainDraftWrite {
  label: string;
  recipe: (draft: CanvasRuleChain) => void;
  coalesceKey?: string;
}

/** Commits a recipe bundle through the session's single writer. */
export function writeRuleChainDraft(
  session: EditorSession<CanvasRuleChain>,
  write: RuleChainDraftWrite,
): void {
  session.write(write.label, write.recipe, {
    coalesceKey: write.coalesceKey,
  });
}

// ---------------------------------------------------------------------------
// uid minting
// ---------------------------------------------------------------------------

/** All client-side identity strings present in the draft. */
function collectIds(draft: CanvasRuleChain): Set<string> {
  const ids = new Set<string>(Object.keys(draft.nodes));
  for (const note of draft.notes) {
    ids.add(note.uid);
  }
  for (const edge of draft.edges) {
    ids.add(edge.id);
  }
  return ids;
}

/** Largest `local-{n}` style suffix at/below `prefix`, plus one. */
function nextFreeId(taken: Set<string>, prefix: string): string {
  let max = -1;
  for (const id of taken) {
    if (id.startsWith(prefix)) {
      const suffix = Number(id.slice(prefix.length));
      if (Number.isInteger(suffix) && suffix > max) {
        max = suffix;
      }
    }
  }
  return `${prefix}${max + 1}`;
}

/** Next free node uid (`local-{n}`), safe against any existing id. */
export function newUid(draft: CanvasRuleChain): string {
  return nextFreeId(collectIds(draft), 'local-');
}

/** Next free edge id (`local-e{n}`). */
function newEdgeId(draft: CanvasRuleChain): string {
  return nextFreeId(collectIds(draft), 'local-e');
}

/** Next free note uid (`local-note{n}`). */
function newNoteUid(draft: CanvasRuleChain): string {
  return nextFreeId(collectIds(draft), 'local-note');
}

// ---------------------------------------------------------------------------
// Node lifecycle
// ---------------------------------------------------------------------------

export interface AddNodeInput {
  clazz: string;
  name: string;
  x: number;
  y: number;
  configuration?: Record<string, unknown>;
  configurationVersion?: number;
  debugSettings?: RuleNodeDebugSettings;
  singletonMode?: boolean;
  queueName?: string;
  description?: string;
}

/** One transaction group: fresh `local-{n}` uid + geometry rounding. */
export function addNode(input: AddNodeInput): RuleChainDraftWrite {
  return {
    label: 'add node',
    recipe: (draft): void => {
      const uid = newUid(draft);
      const node: CanvasNode = {
        uid,
        clazz: input.clazz,
        name: input.name,
        x: Math.round(input.x),
        y: Math.round(input.y),
        configuration: clone(input.configuration ?? {}),
        singletonMode: input.singletonMode ?? false,
        configurationVersion: input.configurationVersion ?? 0,
        ...(input.debugSettings !== undefined
          ? { debugSettings: clone(input.debugSettings) }
          : {}),
        ...(input.queueName !== undefined
          ? { queueName: input.queueName }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
      };
      draft.nodes[uid] = node;
    },
  };
}

/**
 * Removes the nodes plus every edge touching them and clears
 * `inputTargetUid` when it pointed at a removed node — no orphans survive.
 * Unknown uids are ignored (idempotent).
 */
export function removeNodes(uids: Array<string>): RuleChainDraftWrite {
  return {
    label: 'remove nodes',
    recipe: (draft): void => {
      const removed = new Set(uids.filter((uid) => draft.nodes[uid]));
      if (removed.size === 0) {
        return;
      }
      for (const uid of removed) {
        delete draft.nodes[uid];
      }
      draft.edges = draft.edges.filter(
        (edge) => !removed.has(edge.sourceUid) && !removed.has(edge.targetUid),
      );
      if (draft.inputTargetUid && removed.has(draft.inputTargetUid)) {
        draft.inputTargetUid = null;
      }
    },
  };
}

export interface MoveNodeInput {
  uid: string;
  x: number;
  y: number;
}

/** dragStop landing: one group per batch (brief §2 半受控边界). */
export function moveNodes(moves: Array<MoveNodeInput>): RuleChainDraftWrite {
  return {
    label: 'move nodes',
    recipe: (draft): void => {
      for (const move of moves) {
        const node = draft.nodes[move.uid];
        if (!node) {
          throw new Error(`node "${move.uid}" not found`);
        }
        node.x = Math.round(move.x);
        node.y = Math.round(move.y);
      }
    },
  };
}

export type NodeFieldPatch = Partial<
  Pick<
    CanvasNode,
    'name' | 'debugSettings' | 'singletonMode' | 'queueName' | 'description'
  >
>;

/**
 * Details-drawer header fields. Consecutive edits of the same node coalesce
 * (`${uid}:fields` — 表单连续输入合并一步).
 */
export function updateNodeFields(
  uid: string,
  patch: NodeFieldPatch,
): RuleChainDraftWrite {
  return {
    label: 'update node fields',
    coalesceKey: `${uid}:fields`,
    recipe: (draft): void => {
      const node = draft.nodes[uid];
      if (!node) {
        throw new Error(`node "${uid}" not found`);
      }
      Object.assign(node, clone(patch));
    },
  };
}

/** Whole-configuration replacement (NodeConfigForm save). Coalesces per node. */
export function updateNodeConfiguration(
  uid: string,
  configuration: Record<string, unknown>,
): RuleChainDraftWrite {
  return {
    label: 'update node configuration',
    coalesceKey: `${uid}:configuration`,
    recipe: (draft): void => {
      const node = draft.nodes[uid];
      if (!node) {
        throw new Error(`node "${uid}" not found`);
      }
      node.configuration = clone(configuration);
    },
  };
}

// ---------------------------------------------------------------------------
// Edges & INPUT
// ---------------------------------------------------------------------------

export interface AddEdgeInput {
  sourceUid: string;
  targetUid: string;
  labels: Array<string>;
}

/**
 * Magnet wiring landing. An edge from the INPUT sentinel sets
 * `inputTargetUid` (唯一出边 — replaces the previous target); otherwise a
 * canvas edge is created, merging labels into an existing same-pair edge.
 */
export function addEdge(input: AddEdgeInput): RuleChainDraftWrite {
  const { sourceUid, targetUid, labels } = input;
  if (labels.length === 0) {
    throw new Error('an edge needs at least one label');
  }
  return {
    label: 'add edge',
    recipe: (draft): void => {
      if (sourceUid === INPUT_NODE_UID) {
        if (!draft.nodes[targetUid]) {
          throw new Error(`node "${targetUid}" not found`);
        }
        draft.inputTargetUid = targetUid;
        return;
      }
      if (sourceUid === targetUid) {
        throw new Error('self edges are not allowed');
      }
      if (!draft.nodes[sourceUid] || !draft.nodes[targetUid]) {
        throw new Error(
          `edge endpoints not found: "${sourceUid}" -> "${targetUid}"`,
        );
      }
      const existing = draft.edges.find(
        (edge) => edge.sourceUid === sourceUid && edge.targetUid === targetUid,
      );
      if (existing) {
        for (const label of labels) {
          if (!existing.labels.includes(label)) {
            existing.labels.push(label);
          }
        }
        return;
      }
      draft.edges.push({
        id: newEdgeId(draft),
        sourceUid,
        targetUid,
        labels: [...labels],
      });
    },
  };
}

/** Sets (or clears with null) the INPUT virtual node's single outgoing edge. */
export function setInputTarget(uid: string | null): RuleChainDraftWrite {
  return {
    label: 'set input node target',
    recipe: (draft): void => {
      if (uid !== null && !draft.nodes[uid]) {
        throw new Error(`node "${uid}" not found`);
      }
      draft.inputTargetUid = uid;
    },
  };
}

/** Replaces the label set of an edge (label dialog apply). */
export function updateEdgeLabels(
  edgeId: string,
  labels: Array<string>,
): RuleChainDraftWrite {
  if (labels.length === 0) {
    throw new Error(
      'an edge needs at least one label — remove the edge instead',
    );
  }
  return {
    label: 'update edge labels',
    recipe: (draft): void => {
      const edge = draft.edges.find((entry) => entry.id === edgeId);
      if (!edge) {
        throw new Error(`edge "${edgeId}" not found`);
      }
      edge.labels = [...labels];
    },
  };
}

/** Removes several edges in one group; unknown ids are ignored. */
export function removeEdges(edgeIds: Array<string>): RuleChainDraftWrite {
  return {
    label: 'remove edges',
    recipe: (draft): void => {
      const removed = new Set(edgeIds);
      draft.edges = draft.edges.filter((edge) => !removed.has(edge.id));
    },
  };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export interface AddNoteInput {
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  applyDefaultMarkdownStyle?: boolean;
  markdownCss?: string;
}

/** ui-ngx default sticky note size (brief §1: 默认 200×120). */
export const DEFAULT_NOTE_WIDTH = 200;
export const DEFAULT_NOTE_HEIGHT = 120;

/** One transaction group: fresh `local-note{n}` uid + default geometry. */
export function addNote(input: AddNoteInput): RuleChainDraftWrite {
  return {
    label: 'add note',
    recipe: (draft): void => {
      const uid = newNoteUid(draft);
      const note: CanvasNote = {
        uid,
        x: Math.round(input.x),
        y: Math.round(input.y),
        width: Math.round(input.width ?? DEFAULT_NOTE_WIDTH),
        height: Math.round(input.height ?? DEFAULT_NOTE_HEIGHT),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.backgroundColor !== undefined
          ? { backgroundColor: input.backgroundColor }
          : {}),
        ...(input.borderColor !== undefined
          ? { borderColor: input.borderColor }
          : {}),
        ...(input.borderWidth !== undefined
          ? { borderWidth: input.borderWidth }
          : {}),
        ...(input.applyDefaultMarkdownStyle !== undefined
          ? { applyDefaultMarkdownStyle: input.applyDefaultMarkdownStyle }
          : {}),
        ...(input.markdownCss !== undefined
          ? { markdownCss: input.markdownCss }
          : {}),
      };
      draft.notes.push(note);
    },
  };
}

export type NoteFieldPatch = Partial<Omit<CanvasNote, 'uid' | 'id'>>;

/** Merges note fields; consecutive edits of the same note coalesce. */
export function updateNote(
  uid: string,
  patch: NoteFieldPatch,
): RuleChainDraftWrite {
  return {
    label: 'update note',
    coalesceKey: `note:${uid}`,
    recipe: (draft): void => {
      const note = draft.notes.find((entry) => entry.uid === uid);
      if (!note) {
        throw new Error(`note "${uid}" not found`);
      }
      Object.assign(note, clone(patch));
    },
  };
}

/** Note drag landing (one group per dragStop). */
export function moveNote(
  uid: string,
  x: number,
  y: number,
): RuleChainDraftWrite {
  return {
    label: 'move note',
    recipe: (draft): void => {
      const note = draft.notes.find((entry) => entry.uid === uid);
      if (!note) {
        throw new Error(`note "${uid}" not found`);
      }
      note.x = Math.round(x);
      note.y = Math.round(y);
    },
  };
}

/** Removes one note; unknown uids are ignored (idempotent). */
export function removeNote(uid: string): RuleChainDraftWrite {
  return {
    label: 'remove note',
    recipe: (draft): void => {
      draft.notes = draft.notes.filter((entry) => entry.uid !== uid);
    },
  };
}

// ---------------------------------------------------------------------------
// Copy / paste
// ---------------------------------------------------------------------------

/** Clipboard payload: nodes + intra-selection edges + notes. */
export interface RuleChainClipboardPayload {
  nodes: Array<CanvasNode>;
  edges: Array<{ sourceUid: string; targetUid: string; labels: Array<string> }>;
  notes: Array<Omit<CanvasNote, 'uid' | 'id'>>;
}

/**
 * Pure extractor (NOT a draft write): builds a clipboard payload for the
 * selection. Wire ids are STRIPPED here (ruleNodeId / note id belong to the
 * original elements); edges are kept only when both endpoints are selected.
 * Returned objects are deep copies — safe to hold in a module singleton.
 */
export function copySelection(
  canvas: CanvasRuleChain,
  selection: { nodeUids?: Array<string>; noteUids?: Array<string> },
): RuleChainClipboardPayload {
  const nodeUids = (selection.nodeUids ?? []).filter(
    (uid) => canvas.nodes[uid],
  );
  const selected = new Set(nodeUids);
  const nodes = nodeUids.map((uid) => {
    // uid KEPT in the payload — paste uses it as the edge-remap key
    const { ruleNodeId: _ruleNodeId, ...rest } = clone(canvas.nodes[uid]);
    return rest as CanvasNode;
  });
  const edges = canvas.edges
    .filter(
      (edge) => selected.has(edge.sourceUid) && selected.has(edge.targetUid),
    )
    .map((edge) => ({
      sourceUid: edge.sourceUid,
      targetUid: edge.targetUid,
      labels: [...edge.labels],
    }));
  const notes = (selection.noteUids ?? [])
    .map((uid) => canvas.notes.find((entry) => entry.uid === uid))
    .filter((note) => note !== undefined)
    .map((note) => {
      const { uid: _uid, id: _id, ...rest } = clone(note);
      return rest;
    });
  return { nodes, edges, notes };
}

export interface PasteInput {
  payload: RuleChainClipboardPayload;
  /**
   * Landing top-left of the copied bounding box; omitted = keep the copied
   * geometry verbatim. Notes follow the same delta as the node bounding box.
   */
  at?: { x: number; y: number };
}

/**
 * ONE recipe for the whole paste (nodes + edges + notes = one transaction
 * group / one undo step). Every uid, edge id and note uid is regenerated;
 * wire ids stay stripped; the clipboard payload is cloned, never aliased.
 */
export function paste(input: PasteInput): RuleChainDraftWrite {
  const { payload, at } = input;
  return {
    label: 'paste',
    recipe: (draft): void => {
      if (payload.nodes.length === 0 && payload.notes.length === 0) {
        return;
      }
      let deltaX = 0;
      let deltaY = 0;
      if (at && payload.nodes.length > 0) {
        const minX = Math.min(...payload.nodes.map((node) => node.x));
        const minY = Math.min(...payload.nodes.map((node) => node.y));
        deltaX = at.x - minX;
        deltaY = at.y - minY;
      }
      const uidMap = new Map<string, string>();
      for (const copied of payload.nodes) {
        const { uid: _uid, ruleNodeId: _ruleNodeId, ...rest } = clone(copied);
        const uid = newUid(draft);
        uidMap.set(copied.uid, uid);
        draft.nodes[uid] = {
          ...(rest as CanvasNode),
          uid,
          x: Math.round(copied.x + deltaX),
          y: Math.round(copied.y + deltaY),
        };
      }
      for (const copied of payload.edges) {
        const sourceUid = uidMap.get(copied.sourceUid);
        const targetUid = uidMap.get(copied.targetUid);
        if (!sourceUid || !targetUid) {
          continue; // edge leaving the pasted selection is dropped
        }
        draft.edges.push({
          id: newEdgeId(draft),
          sourceUid,
          targetUid,
          labels: [...copied.labels],
        });
      }
      for (const copied of payload.notes) {
        draft.notes.push({
          ...clone(copied),
          uid: newNoteUid(draft),
          x: Math.round(copied.x + deltaX),
          y: Math.round(copied.y + deltaY),
        });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Chain-level fields
// ---------------------------------------------------------------------------

/** Sets a top-level chain snapshot field (name / root / additionalInfo…). */
export function setChainField(
  field: string,
  value: unknown,
): RuleChainDraftWrite {
  return {
    label: `set chain ${field}`,
    recipe: (draft): void => {
      draft.chain[field] = clone(value);
    },
  };
}

/** Drafts must own their data — immer auto-freeze would leak into shared refs. */
function clone<T>(value: T): T {
  return structuredClone(value);
}
