/**
 * Rule-chain draft transaction recipes (M8 brief §2, dashboard-draft.ts
 * paradigm): every canvas mutation goes through one RuleChainDraftWrite
 * bundle; inserted values are structured-cloned; multi-element paste is ONE
 * recipe (one transaction group).
 */
import { describe, expect, it } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import { type EntityIdOf, EntityType } from '@/types/tb/entity';
import { metadataToCanvas } from './model';
import {
  addEdge,
  addNode,
  addNote,
  copySelection,
  moveNodes,
  moveNote,
  newUid,
  paste,
  removeEdges,
  removeNodes,
  removeNote,
  setChainField,
  setInputTarget,
  updateEdgeLabels,
  updateNodeConfiguration,
  updateNodeFields,
  updateNote,
  writeRuleChainDraft,
} from './rule-chain-draft';
import { type CanvasNode, type CanvasRuleChain, INPUT_NODE_UID } from './types';

const chainId = (id: string): EntityIdOf<EntityType.RULE_CHAIN> => ({
  entityType: EntityType.RULE_CHAIN,
  id,
});

function makeCanvas(): CanvasRuleChain {
  return metadataToCanvas(
    {
      ruleChainId: chainId('chain-1'),
      version: 3,
      firstNodeIndex: 0,
      nodes: [
        {
          id: { entityType: EntityType.RULE_NODE, id: 'node-a' },
          type: 'org.thingsboard.rule.engine.filter.TbMsgTypeFilterNode',
          name: 'Filter',
          configuration: {},
          additionalInfo: { layoutX: 100, layoutY: 100 },
        },
        {
          id: { entityType: EntityType.RULE_NODE, id: 'node-b' },
          type: 'org.thingsboard.rule.engine.action.TbLogNode',
          name: 'Log',
          configuration: {},
          additionalInfo: { layoutX: 300, layoutY: 100 },
        },
      ],
      connections: [
        { fromIndex: 0, toIndex: 1, type: 'True' },
        { fromIndex: 0, toIndex: 1, type: 'False' },
      ],
      notes: [
        { id: 'note-1', x: 0, y: 0, width: 200, height: 120, content: 'n' },
      ],
    },
    {
      id: chainId('chain-1'),
      createdTime: 1,
      name: 'Chain',
      type: 'CORE',
      root: false,
      version: 3,
    },
  );
}

function newSession(): EditorSession<CanvasRuleChain> {
  const session = new EditorSession<CanvasRuleChain>();
  session.enter(makeCanvas());
  return session;
}

function nodeAt(
  session: EditorSession<CanvasRuleChain>,
  uid: string,
): CanvasNode {
  const node = session.current.nodes[uid];
  if (!node) {
    throw new Error(`node "${uid}" missing`);
  }
  return node;
}

describe('node lifecycle', () => {
  it('addNode mints a fresh local uid and rounds the landing position', () => {
    const session = newSession();
    writeRuleChainDraft(
      session,
      addNode({
        clazz: 'org.thingsboard.rule.engine.action.TbCreateAlarmNode',
        name: 'Create alarm',
        x: 250.6,
        y: 300.4,
        configuration: { alarmType: 'X' },
      }),
    );

    const uid = Object.keys(session.current.nodes).at(-1);
    expect(uid).toBe('local-2');
    const node = nodeAt(session, 'local-2');
    expect(node.x).toBe(251);
    expect(node.y).toBe(300);
    expect(node.singletonMode).toBe(false);
    expect(node.configuration).toEqual({ alarmType: 'X' });
    expect(node.ruleNodeId).toBeUndefined(); // unsaved — no wire id
  });

  it('removeNodes drops the nodes, their touching edges and the INPUT target', () => {
    const session = newSession();
    writeRuleChainDraft(session, setInputTarget('local-0'));
    expect(session.current.inputTargetUid).toBe('local-0');

    writeRuleChainDraft(session, removeNodes(['local-0', 'ghost']));

    expect(session.current.nodes['local-0']).toBeUndefined();
    expect(session.current.nodes['local-1']).toBeDefined();
    expect(session.current.edges).toEqual([]); // both edges touched local-0
    expect(session.current.inputTargetUid).toBeNull();
    expect(session.history[session.history.length - 1]?.label).toBe(
      'remove nodes',
    );
  });

  it('moveNodes commits one group per dragStop batch', () => {
    const session = newSession();
    writeRuleChainDraft(
      session,
      moveNodes([
        { uid: 'local-0', x: 10.4, y: 20.5 },
        { uid: 'local-1', x: 30, y: 40 },
      ]),
    );

    expect(nodeAt(session, 'local-0').x).toBe(10);
    expect(nodeAt(session, 'local-0').y).toBe(21);
    expect(nodeAt(session, 'local-1').x).toBe(30);
    expect(
      session.history.filter((group) => group.label === 'move nodes'),
    ).toHaveLength(1);
  });

  it('updateNodeConfiguration replaces the tree and coalesces per node', () => {
    const session = newSession();
    writeRuleChainDraft(session, updateNodeConfiguration('local-0', { a: 1 }));
    writeRuleChainDraft(session, updateNodeConfiguration('local-0', { a: 2 }));
    writeRuleChainDraft(session, updateNodeConfiguration('local-1', { b: 1 }));

    expect(nodeAt(session, 'local-0').configuration).toEqual({ a: 2 });
    const configGroups = session.history.filter(
      (group) => group.coalesceKey === 'local-0:configuration',
    );
    expect(configGroups).toHaveLength(1); // two writes merged into one group
    expect(session.history[0]?.label).toBe('update node configuration');
  });

  it('updateNodeFields merges node-level fields and throws on unknown uid', () => {
    const session = newSession();
    writeRuleChainDraft(
      session,
      updateNodeFields('local-1', {
        name: 'Renamed',
        debugSettings: { allEnabled: true },
        queueName: 'Main',
      }),
    );

    const node = nodeAt(session, 'local-1');
    expect(node.name).toBe('Renamed');
    expect(node.debugSettings).toEqual({ allEnabled: true });
    expect(node.queueName).toBe('Main');

    expect(() =>
      writeRuleChainDraft(session, updateNodeFields('ghost', { name: 'x' })),
    ).toThrow();
  });
});

describe('edges', () => {
  it('addEdge creates an edge with labels and rejects degenerate calls', () => {
    const session = newSession();
    writeRuleChainDraft(
      session,
      addNode({
        clazz: 'org.thingsboard.rule.engine.action.TbLogNode',
        name: 'Log2',
        x: 500,
        y: 100,
      }),
    );
    writeRuleChainDraft(
      session,
      addEdge({
        sourceUid: 'local-1',
        targetUid: 'local-2',
        labels: ['Other'],
      }),
    );

    expect(
      session.current.edges.find(
        (edge) => edge.sourceUid === 'local-1' && edge.targetUid === 'local-2',
      )?.labels,
    ).toEqual(['Other']);

    expect(() =>
      writeRuleChainDraft(
        session,
        addEdge({ sourceUid: 'local-1', targetUid: 'local-1', labels: ['X'] }),
      ),
    ).toThrow();
    expect(() =>
      writeRuleChainDraft(
        session,
        addEdge({ sourceUid: 'ghost', targetUid: 'local-1', labels: ['X'] }),
      ),
    ).toThrow();
    expect(() =>
      writeRuleChainDraft(
        session,
        addEdge({ sourceUid: 'local-1', targetUid: 'local-2', labels: [] }),
      ),
    ).toThrow();
  });

  it('addEdge merges labels into an existing edge between the same pair', () => {
    const session = newSession();
    writeRuleChainDraft(
      session,
      addEdge({
        sourceUid: 'local-0',
        targetUid: 'local-1',
        labels: ['Success'],
      }),
    );

    expect(session.current.edges).toHaveLength(1);
    expect(session.current.edges[0]?.labels).toEqual([
      'True',
      'False',
      'Success',
    ]);
  });

  it('setInputTarget replaces the INPUT target (唯一出边) and null clears it', () => {
    const session = newSession();
    writeRuleChainDraft(session, setInputTarget('local-0'));
    expect(session.current.inputTargetUid).toBe('local-0');

    writeRuleChainDraft(session, setInputTarget('local-1'));
    expect(session.current.inputTargetUid).toBe('local-1');

    expect(() =>
      writeRuleChainDraft(session, setInputTarget('ghost')),
    ).toThrow();

    writeRuleChainDraft(session, setInputTarget(null));
    expect(session.current.inputTargetUid).toBeNull();
  });

  it('updateEdgeLabels replaces labels; empty labels are rejected', () => {
    const session = newSession();
    const edgeId = session.current.edges[0]?.id as string;

    writeRuleChainDraft(session, updateEdgeLabels(edgeId, ['Success']));
    expect(session.current.edges[0]?.labels).toEqual(['Success']);

    expect(() =>
      writeRuleChainDraft(session, updateEdgeLabels(edgeId, [])),
    ).toThrow();
    expect(() =>
      writeRuleChainDraft(session, updateEdgeLabels('ghost', ['Success'])),
    ).toThrow();
  });

  it('removeEdges removes several edges in one group', () => {
    const session = newSession();
    session.write('seed', (draft) => {
      draft.edges.push({
        id: 'local-e9',
        sourceUid: 'local-1',
        targetUid: 'local-0',
        labels: ['ACK'],
      });
    });

    writeRuleChainDraft(
      session,
      removeEdges(['local-e0', 'local-e9', 'ghost']),
    );
    expect(session.current.edges).toEqual([]);
  });
});

describe('notes', () => {
  it('addNote mints a local uid with default 200x120 geometry', () => {
    const session = newSession();
    writeRuleChainDraft(session, addNote({ content: 'hello', x: 15, y: 25 }));

    const note = session.current.notes.find((entry) =>
      entry.uid.startsWith('local-note'),
    );
    expect(note).toBeDefined();
    expect(note?.width).toBe(200);
    expect(note?.height).toBe(120);
    expect(note?.content).toBe('hello');
    expect(note?.id).toBeUndefined();
  });

  it('updateNote / moveNote / removeNote work per uid', () => {
    const session = newSession();
    writeRuleChainDraft(
      session,
      updateNote('note-1', { content: 'edited', backgroundColor: '#FFF' }),
    );
    expect(session.current.notes[0]?.content).toBe('edited');

    writeRuleChainDraft(session, moveNote('note-1', 42, 43));
    expect(session.current.notes[0]?.x).toBe(42);
    expect(session.current.notes[0]?.y).toBe(43);

    writeRuleChainDraft(session, removeNote('note-1'));
    expect(session.current.notes).toHaveLength(0);

    expect(() =>
      writeRuleChainDraft(session, updateNote('ghost', { content: 'x' })),
    ).toThrow();
  });
});

describe('paste — one recipe, one transaction group', () => {
  it('regenerates every uid, remaps edges, drops wire ids and offsets positions', () => {
    const session = newSession();
    const payload = copySelection(session.current, {
      nodeUids: ['local-0', 'local-1'],
      noteUids: ['note-1'],
    });

    writeRuleChainDraft(session, paste({ payload, at: { x: 1000, y: 1000 } }));

    const uids = Object.keys(session.current.nodes);
    expect(uids).toHaveLength(4);
    const pasted = uids.slice(2);
    expect(pasted).toEqual(['local-2', 'local-3']);
    expect(nodeAt(session, 'local-2').ruleNodeId).toBeUndefined(); // wire id dropped
    expect(nodeAt(session, 'local-2').x).toBe(1000);
    expect(nodeAt(session, 'local-3').x).toBe(1200); // relative arrangement kept

    const pastedEdge = session.current.edges.find((edge) =>
      pasted.includes(edge.sourceUid),
    );
    expect(pastedEdge?.sourceUid).toBe('local-2');
    expect(pastedEdge?.targetUid).toBe('local-3');
    expect(pastedEdge?.labels).toEqual(['True', 'False']); // aggregation kept

    const pastedNote = session.current.notes[1];
    expect(pastedNote.uid).toBe('local-note0'); // fresh uid minted (fixture note used its wire id)
    expect(pastedNote.id).toBeUndefined(); // wire id NOT copied
    expect(pastedNote.x).toBe(900); // same delta as the node bounding box
    expect(pastedNote.content).toBe('n');

    // one undo reverts the whole paste group
    expect(session.history.at(-1)?.label).toBe('paste');
    session.undo();
    expect(Object.keys(session.current.nodes)).toHaveLength(2);
    expect(session.current.notes).toHaveLength(1);
  });

  it('paste without at keeps the copied geometry verbatim', () => {
    const session = newSession();
    const payload = copySelection(session.current, { nodeUids: ['local-1'] });

    writeRuleChainDraft(session, paste({ payload }));

    const uid = Object.keys(session.current.nodes)[2];
    expect(nodeAt(session, uid).x).toBe(300);
  });

  it('newUid never collides with existing ids', () => {
    const draft = makeCanvas();
    expect(newUid(draft)).toBe('local-2');
    draft.nodes['local-2'] = {
      ...draft.nodes['local-0'],
      uid: 'local-2',
    } as CanvasNode;
    draft.nodes['local-5'] = {
      ...draft.nodes['local-0'],
      uid: 'local-5',
    } as CanvasNode;
    expect(newUid(draft)).toBe('local-6');
  });
});

describe('setChainField', () => {
  it('patches the chain snapshot (name etc.)', () => {
    const session = newSession();
    writeRuleChainDraft(session, setChainField('name', 'Renamed chain'));

    expect(session.current.chain.name).toBe('Renamed chain');
    expect(session.dirty).toBe(true);
  });
});

describe('INPUT virtual node connectivity contract', () => {
  it('the INPUT sentinel never enters the node record or edges', () => {
    const session = newSession();
    writeRuleChainDraft(session, setInputTarget('local-1'));

    expect(session.current.nodes[INPUT_NODE_UID]).toBeUndefined();
    expect(
      session.current.edges.filter((edge) => edge.sourceUid === INPUT_NODE_UID),
    ).toEqual([]);
    expect(session.current.inputTargetUid).toBe('local-1');
  });
});
