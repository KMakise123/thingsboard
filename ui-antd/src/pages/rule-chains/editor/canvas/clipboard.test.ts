import { beforeEach, describe, expect, it } from 'vitest';

import { EditorSession } from '@/core/editor/session';
import { INPUT_NODE_UID } from '@/core/rulechain/types';
import type { CanvasNode } from '@/core/rulechain/types';

import {
  clearRuleChainClipboard,
  copySelectionToClipboard,
  getRuleChainClipboard,
  hasRuleChainClipboard,
  pasteRuleChainClipboard,
} from './clipboard';
import { inputEdgeId } from './interactions';
import { emptyDraft, rowDraft } from './test-helpers';

beforeEach(() => {
  clearRuleChainClipboard();
});

describe('rule-chain clipboard singleton (copy tier only)', () => {
  it('copies the selection with wire ids stripped and intra edges kept', () => {
    const draft = rowDraft(3, true); // a→b→c
    draft.nodes['local-0'].ruleNodeId = {
      entityType: 'RULE_NODE',
      id: 'wire-0',
    } as CanvasNode['ruleNodeId'];
    const count = copySelectionToClipboard({
      draft,
      selection: { nodeIds: ['local-0', 'local-1'], edgeIds: [] },
    });
    expect(count).toBe(2);
    expect(hasRuleChainClipboard()).toBe(true);
    const clip = getRuleChainClipboard();
    expect(clip?.nodes.map((n) => n.uid)).toEqual(['local-0', 'local-1']);
    expect(clip?.nodes[0].ruleNodeId).toBeUndefined(); // wire id stripped
    expect(clip?.edges).toEqual([
      { sourceUid: 'local-0', targetUid: 'local-1', labels: ['Success'] },
    ]);
  });

  it('copies notes listed in the selection', () => {
    const draft = rowDraft(1);
    draft.notes.push({
      uid: 'note0',
      id: 'wire-note',
      x: 1,
      y: 2,
      width: 10,
      height: 10,
      content: 'hello',
    });
    copySelectionToClipboard({
      draft,
      selection: { nodeIds: ['note0'], edgeIds: [] },
    });
    expect(getRuleChainClipboard()?.notes).toHaveLength(1);
    expect(getRuleChainClipboard()?.notes[0].content).toBe('hello');
    expect(getRuleChainClipboard()?.notes[0]).not.toHaveProperty('id');
  });

  it('pastes ONE group with regenerated ids and a relative offset', () => {
    const draft = rowDraft(3, true);
    draft.nodes['local-0'].ruleNodeId = {
      entityType: 'RULE_NODE',
      id: 'wire-0',
    } as CanvasNode['ruleNodeId'];
    const session = new EditorSession({ baseline: draft });
    copySelectionToClipboard({
      draft,
      selection: { nodeIds: ['local-0', 'local-1'], edgeIds: [] },
    });
    const count = pasteRuleChainClipboard({
      session,
      at: { x: 50, y: 60 },
    });
    expect(count).toBe(2);
    expect(session.history).toHaveLength(1); // ONE transaction group
    const pasted = Object.values(session.current.nodes).filter((n) =>
      ['local-3', 'local-4'].includes(n.uid),
    );
    expect(pasted).toHaveLength(2);
    for (const pastedNode of pasted) {
      expect(pastedNode.ruleNodeId).toBeUndefined();
    }
    expect(session.current.nodes['local-3'].x).toBe(50); // bbox min + offset
    expect(session.current.nodes['local-4'].x).toBe(300); // verbatim delta
    // the pasted edge was regenerated for the new uids
    expect(
      session.current.edges.some(
        (edge) => edge.sourceUid === 'local-3' && edge.targetUid === 'local-4',
      ),
    ).toBe(true);
    // originals untouched
    expect(session.current.nodes['local-0'].ruleNodeId).toBeDefined();
  });

  it('pastes notes and offsets them like the node bounding box', () => {
    const draft = emptyDraft();
    draft.notes.push({
      uid: 'note0',
      x: 100,
      y: 100,
      width: 200,
      height: 120,
    });
    copySelectionToClipboard({
      draft,
      selection: { nodeIds: ['note0'], edgeIds: [] },
    });
    const session = new EditorSession({ baseline: emptyDraft() });
    const count = pasteRuleChainClipboard({ session });
    expect(count).toBe(1);
    expect(session.current.notes[0].uid).not.toBe('note0');
    expect(session.current.notes[0].id).toBeUndefined();
    expect(session.current.notes[0].x).toBe(100); // no nodes → verbatim
  });

  it('never emits the INPUT sentinel as a node uid', () => {
    const draft = rowDraft(1);
    draft.inputTargetUid = 'local-0';
    copySelectionToClipboard({
      draft,
      selection: {
        nodeIds: ['local-0', `${INPUT_NODE_UID}`],
        edgeIds: [inputEdgeId('local-0') ?? ''],
      },
    });
    // INPUT is not a draft node — selection filtering drops it
    expect(getRuleChainClipboard()?.nodes).toHaveLength(1);
  });
});
