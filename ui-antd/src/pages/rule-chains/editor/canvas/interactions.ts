/**
 * Canvas interaction commit boundaries (M8 brief §2 半受控契约): the ONLY
 * places where React Flow interaction state reaches the session writer.
 * Drag/resize intermediate states stay in React Flow / local component
 * state and NEVER touch the draft; each boundary commits ONE transaction
 * group per element category (F-wave recipes).
 */
import type { EditorSession } from '@/core/editor/session';
import {
  moveNodes,
  moveNote,
  removeEdges,
  removeNodes,
  removeNote,
  setInputTarget,
  writeRuleChainDraft,
} from '@/core/rulechain/rule-chain-draft';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import { INPUT_NODE_UID } from '@/core/rulechain/types';

/** Selection snapshot shared by shell + canvas (RF element ids). */
export interface CanvasSelection {
  /** Rule-node uids AND note uids (RF node ids; INPUT never appears). */
  nodeIds: Array<string>;
  /** Canvas edge ids, including the synthetic INPUT edge. */
  edgeIds: Array<string>;
}

export const EMPTY_SELECTION: CanvasSelection = { nodeIds: [], edgeIds: [] };

export function isSelectionEmpty(selection: CanvasSelection): boolean {
  return selection.nodeIds.length === 0 && selection.edgeIds.length === 0;
}

/** The synthetic RF edge id of the INPUT virtual node's outgoing edge. */
export function inputEdgeId(targetUid: string | null): string | null {
  return targetUid ? `${INPUT_NODE_UID}->${targetUid}` : null;
}

/** Drag-stop landing: one `moveNodes` group + one group per dragged note. */
export function commitNodeDragStop(
  session: EditorSession<CanvasRuleChain>,
  draggedNodes: Array<{ id: string; position: { x: number; y: number } }>,
): number {
  const moves = draggedNodes
    .filter((node) => node.id !== INPUT_NODE_UID)
    .filter((node) => Boolean(session.current.nodes[node.id]))
    .map((node) => ({ uid: node.id, x: node.position.x, y: node.position.y }));
  const noteMoves = draggedNodes.filter((node) =>
    session.current.notes.some((note) => note.uid === node.id),
  );
  if (moves.length > 0) {
    writeRuleChainDraft(session, moveNodes(moves));
  }
  for (const note of noteMoves) {
    writeRuleChainDraft(
      session,
      moveNote(note.id, note.position.x, note.position.y),
    );
  }
  return (moves.length > 0 ? 1 : 0) + noteMoves.length;
}

/**
 * Delete selection without confirmation (ui-ngx parity — 直接删): nodes /
 * edges / notes each commit as their own transaction group. The synthetic
 * INPUT edge deletes through `setInputTarget(null)`.
 */
export function commitDeleteSelection(
  session: EditorSession<CanvasRuleChain>,
  selection: CanvasSelection,
): void {
  const draft = session.current;
  const nodeUids = selection.nodeIds.filter(
    (id) => !draft.notes.some((note) => note.uid === id),
  );
  const noteUids = selection.nodeIds.filter((id) =>
    draft.notes.some((note) => note.uid === id),
  );
  const inputEdge = inputEdgeId(draft.inputTargetUid);
  const edgeIds = selection.edgeIds.filter((id) => id !== inputEdge);
  if (nodeUids.length > 0) {
    writeRuleChainDraft(session, removeNodes(nodeUids));
  }
  if (edgeIds.length > 0) {
    writeRuleChainDraft(session, removeEdges(edgeIds));
  }
  if (inputEdge && selection.edgeIds.includes(inputEdge)) {
    writeRuleChainDraft(session, setInputTarget(null));
  }
  for (const uid of noteUids) {
    writeRuleChainDraft(session, removeNote(uid));
  }
}
