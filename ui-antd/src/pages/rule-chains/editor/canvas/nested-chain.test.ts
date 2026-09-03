import { describe, expect, it } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import { writeRuleChainDraft } from '@/core/rulechain/rule-chain-draft';
import {
  RULE_CHAIN_INPUT_NODE_CLAZZ,
  RULE_CHAIN_OUTPUT_NODE_CLAZZ,
} from '@/core/rulechain/types';
import type { CanvasSelection } from './interactions';
import type { RuleNodeDescriptors } from './nested-chain';
import {
  applyNestedChainReplacement,
  buildNestedChainMetadata,
  validateNestedChainSelection,
} from './nested-chain';
import { node, rowDraft } from './test-helpers';

const DESCRIPTORS: RuleNodeDescriptors = {
  'org.example.InNode': {
    type: 'FILTER',
    name: 'In',
    clazz: 'org.example.InNode',
    configurationDescriptor: {
      nodeDefinition: {
        details: '',
        description: '',
        inEnabled: true,
        outEnabled: true,
        relationTypes: ['Success'],
        defaultConfiguration: {},
      },
    },
  },
  'org.example.NoInNode': {
    type: 'FLOW',
    name: 'NoIn',
    clazz: 'org.example.NoInNode',
    configurationDescriptor: {
      nodeDefinition: {
        details: '',
        description: '',
        inEnabled: false,
        outEnabled: true,
        relationTypes: [],
        defaultConfiguration: {},
      },
    },
  },
};

const chain = (draft = rowDraft(2)) => draft;
const sel = (...uids: Array<string>): CanvasSelection => ({
  nodeIds: uids,
  edgeIds: [],
});

describe('validateNestedChainSelection', () => {
  it('accepts a chain with exactly one entry node', () => {
    // a→b: only a lacks an intra incoming edge
    const draft = chain(rowDraft(2, true));
    expect(
      validateNestedChainSelection(
        draft,
        sel('local-0', 'local-1'),
        DESCRIPTORS,
      ),
    ).toEqual({ ok: true, entryCount: 1 });
  });

  it('rejects an empty selection', () => {
    expect(
      validateNestedChainSelection(rowDraft(2), sel(), DESCRIPTORS).reason,
    ).toBe('noNodes');
  });

  it('rejects two entry candidates (multipleEntries)', () => {
    const draft = rowDraft(2);
    expect(
      validateNestedChainSelection(
        draft,
        sel('local-0', 'local-1'),
        DESCRIPTORS,
      ).reason,
    ).toBe('multipleEntries');
  });

  it('ignores entry candidates whose descriptor disables input', () => {
    const draft = rowDraft(2, true);
    draft.nodes['local-0'] = node('local-0', 0, 0, {
      clazz: 'org.example.NoInNode',
    });
    // a (inEnabled:false) cannot be an entry; b has an incoming edge → 0 ok
    const result = validateNestedChainSelection(
      draft,
      sel('local-0', 'local-1'),
      DESCRIPTORS,
    );
    expect(result.ok).toBe(true);
    expect(result.entryCount).toBe(0);
  });
});

describe('buildNestedChainMetadata', () => {
  it('exports selected nodes, intra connections, firstNodeIndex and an output node', () => {
    const draft = rowDraft(3, true); // a→b→c
    draft.notes.push({ uid: 'note0', x: 10, y: 10, width: 200, height: 120 });
    const meta = buildNestedChainMetadata(
      draft,
      sel('local-0', 'local-1'),
      DESCRIPTORS,
      'new-chain-id',
    );
    expect(meta.ruleChainId).toEqual({
      entityType: 'RULE_CHAIN',
      id: 'new-chain-id',
    });
    expect(meta.nodes.map((n) => n.type)).toEqual([
      'org.example.TestNode',
      'org.example.TestNode',
      RULE_CHAIN_OUTPUT_NODE_CLAZZ, // b→c leaves the selection
    ]);
    expect(meta.nodes.every((n) => n.id === undefined)).toBe(true);
    expect(meta.connections).toEqual([
      { fromIndex: 0, toIndex: 1, type: 'Success' },
      { fromIndex: 1, toIndex: 2, type: 'Success' },
    ]);
    expect(meta.firstNodeIndex).toBe(0);
    expect(meta.nodes[2].additionalInfo?.layoutX).toBe(500); // at c
    expect(meta.notes).toEqual([
      { uid: 'note0', x: 10, y: 10, width: 200, height: 120 },
    ]);

    // now export the tail with an edge leaving the selection
    const meta2 = buildNestedChainMetadata(
      draft,
      sel('local-1', 'local-2'),
      DESCRIPTORS,
      'new-chain-id',
    );
    // a→b stays outside; b's outgoing edge to c is intra; no external out...
    expect(meta2.nodes).toHaveLength(2);
    // export only local-2: its incoming edge is EXTERNAL (input side — the
    // new chain simply has no firstNodeIndex), no output node here
    const meta3 = buildNestedChainMetadata(
      draft,
      sel('local-2'),
      DESCRIPTORS,
      'x',
    );
    expect(meta3.nodes).toHaveLength(1);
    expect(meta3.connections).toEqual([]);
    expect(meta3.firstNodeIndex).toBe(0);
    // export only local-0 (no intra edges at all): its outgoing edge leaves
    // the selection → one output node named with the joined label
    const meta4 = buildNestedChainMetadata(
      draft,
      sel('local-0'),
      DESCRIPTORS,
      'x',
    );
    expect(meta4.nodes).toHaveLength(2);
    expect(meta4.nodes[1].type).toBe(RULE_CHAIN_OUTPUT_NODE_CLAZZ);
    expect(meta4.nodes[1].name).toBe('Success');
    expect(meta4.nodes[1].additionalInfo?.layoutX).toBe(250); // at local-1
    expect(meta4.connections).toEqual([
      { fromIndex: 0, toIndex: 1, type: 'Success' },
    ]);
    expect(meta4.firstNodeIndex).toBe(0);
  });
});

describe('applyNestedChainReplacement — one group replacement', () => {
  it('replaces the sub-graph with one TbRuleChainInputNode and rewires external links', () => {
    // a→b→c→d; selection = b,c — external incoming a→b, external outgoing c→d
    const draft = rowDraft(4, true);
    const session = new EditorSession({ baseline: draft });
    const selection = sel('local-1', 'local-2');
    writeRuleChainDraft(
      session,
      applyNestedChainReplacement({
        newChainId: 'new-chain',
        newChainName: 'Nested',
        draft: session.current,
        selection,
      }),
    );
    const next = session.current;
    expect(next.nodes['local-1']).toBeUndefined();
    expect(next.nodes['local-2']).toBeUndefined();
    const replacement = Object.values(next.nodes).find(
      (n) => n.clazz === RULE_CHAIN_INPUT_NODE_CLAZZ,
    );
    expect(replacement).toBeDefined();
    expect(replacement?.name).toBe('Nested');
    expect(replacement?.configuration).toEqual({ ruleChainId: 'new-chain' });
    // external incoming edge now targets the replacement…
    const inEdge = next.edges.find((e) => e.sourceUid === 'local-0');
    expect(inEdge?.targetUid).toBe(replacement?.uid);
    // …and the external outgoing edge sources from it, labels kept
    const outEdge = next.edges.find((e) => e.targetUid === 'local-3');
    expect(outEdge?.sourceUid).toBe(replacement?.uid);
    expect(outEdge?.labels).toEqual(['Success']);
    // intra edges died with the sub-graph
    expect(next.edges).toHaveLength(2);
    // ONE undoable group for the whole replacement
    expect(session.history).toHaveLength(1);
    session.undo();
    expect(session.current.nodes['local-1']).toBeDefined();
  });

  it('re-points the INPUT entry when it fed the exported sub-graph', () => {
    const draft = rowDraft(2);
    draft.inputTargetUid = 'local-0';
    const session = new EditorSession({ baseline: draft });
    writeRuleChainDraft(
      session,
      applyNestedChainReplacement({
        newChainId: 'c',
        newChainName: 'N',
        draft: session.current,
        selection: sel('local-0'),
      }),
    );
    const replacement = Object.values(session.current.nodes).find(
      (n) => n.clazz === RULE_CHAIN_INPUT_NODE_CLAZZ,
    );
    expect(session.current.inputTargetUid).toBe(replacement?.uid);
    expect(session.current.edges).toHaveLength(0);
  });
});
