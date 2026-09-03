import { describe, expect, it } from 'vitest';

import { EditorSession } from '@/core/editor/session';
import { INPUT_NODE_UID } from '@/core/rulechain/types';

import {
  commitDeleteSelection,
  commitNodeDragStop,
  inputEdgeId,
} from './interactions';
import { rowDraft } from './test-helpers';

describe('commitNodeDragStop — transaction boundaries (P4 unit)', () => {
  it('commits a batch of node moves as ONE group with rounded geometry', () => {
    const session = new EditorSession({ baseline: rowDraft(3) });
    const groups = commitNodeDragStop(session, [
      { id: 'local-0', position: { x: 10.4, y: 20.6 } },
      { id: 'local-2', position: { x: -3.2, y: 99 } },
    ]);
    expect(groups).toBe(1);
    expect(session.history).toHaveLength(1);
    expect(session.current.nodes['local-0'].x).toBe(10);
    expect(session.current.nodes['local-0'].y).toBe(21);
    expect(session.current.nodes['local-2'].x).toBe(-3);
    // unknown ids are ignored
    commitNodeDragStop(session, [{ id: 'nope', position: { x: 1, y: 1 } }]);
    expect(session.history).toHaveLength(1);
  });

  it('commits note drags through moveNote (own group per note)', () => {
    const draft = rowDraft(1);
    draft.notes.push({ uid: 'note0', x: 0, y: 0, width: 200, height: 120 });
    const session = new EditorSession({ baseline: draft });
    const groups = commitNodeDragStop(session, [
      { id: 'note0', position: { x: 30, y: 40 } },
    ]);
    expect(groups).toBe(1);
    expect(session.current.notes[0].x).toBe(30);
    expect(session.history[0].label).toBe('move note');
  });

  it('never moves the INPUT virtual node', () => {
    const session = new EditorSession({ baseline: rowDraft(2) });
    const groups = commitNodeDragStop(session, [
      { id: INPUT_NODE_UID, position: { x: 555, y: 555 } },
    ]);
    expect(groups).toBe(0);
    expect(session.history).toHaveLength(0);
  });
});

describe('commitDeleteSelection — one group per category, no confirm', () => {
  it('deletes nodes + edges + notes as three groups', () => {
    const draft = rowDraft(3, true);
    draft.notes.push({ uid: 'note0', x: 0, y: 0, width: 10, height: 10 });
    const session = new EditorSession({ baseline: draft });
    commitDeleteSelection(session, {
      nodeIds: ['local-0', 'local-1', 'note0'],
      edgeIds: ['local-e0', 'local-e1'],
    });
    expect(session.history).toHaveLength(3);
    expect(session.history.map((g) => g.label)).toEqual([
      'remove nodes',
      'remove edges',
      'remove note',
    ]);
    expect(Object.keys(session.current.nodes)).toEqual(['local-2']);
    expect(session.current.edges).toHaveLength(0);
    expect(session.current.notes).toHaveLength(0);
  });

  it('deletes the synthetic INPUT edge through setInputTarget(null)', () => {
    const draft = rowDraft(2);
    draft.inputTargetUid = 'local-0';
    const session = new EditorSession({ baseline: draft });
    const edgeId = inputEdgeId('local-0');
    expect(edgeId).toBe(`${INPUT_NODE_UID}->local-0`);
    commitDeleteSelection(session, {
      nodeIds: [],
      edgeIds: [edgeId as string],
    });
    expect(session.current.inputTargetUid).toBeNull();
    expect(session.history[0].label).toBe('set input node target');
  });
});

describe('input edge id', () => {
  it('is stable and null-safe', () => {
    expect(inputEdgeId(null)).toBeNull();
    expect(inputEdgeId('local-7')).toBe(`${INPUT_NODE_UID}->local-7`);
  });
});
