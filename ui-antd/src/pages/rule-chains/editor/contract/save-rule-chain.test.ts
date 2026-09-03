/**
 * Save-slot tests (wave-C skeleton): happy path re-enters the session over
 * the SAVED server metadata (checkpoint semantic — undo history clears),
 * 409 reports the fetched server metadata for the wave-3 three-option
 * dialog, and transport failures degrade to `error` without touching the
 * session baseline.
 */
import { describe, expect, it, vi } from 'vitest';

import { EditorSession } from '@/core/editor/session';
import { EntityType } from '@/types/tb/entity';
import type { RuleChain } from '@/types/tb/rule-chain';
import { emptyDraft, rowDraft } from '../canvas/test-helpers';

const serviceMock = vi.hoisted(() => ({
  saveRuleChainMetaData: vi.fn(),
  getRuleChainMetaData: vi.fn(),
}));
vi.mock('@/services/tb/rule-chain', () => serviceMock);

import { saveRuleChainDraft } from './save-rule-chain';

function sessionWithMoves() {
  const session = new EditorSession({ baseline: rowDraft(2, true) });
  session.write('move', (draft) => {
    draft.nodes['local-0'].x = 42;
  });
  return session;
}

const CHAIN: RuleChain = {
  id: { entityType: EntityType.RULE_CHAIN, id: 'rc1' },
  createdTime: 0,
  name: 'Test chain',
  version: 3,
};

function savedMeta() {
  return {
    ruleChainId: { entityType: 'RULE_CHAIN' as const, id: 'rc1' },
    version: 4,
    firstNodeIndex: 0,
    nodes: [
      {
        type: 'org.example.TestNode',
        name: 'local-0',
        singletonMode: false,
        configurationVersion: 0,
        configuration: {},
        additionalInfo: { layoutX: 42, layoutY: 0 },
        id: { entityType: EntityType.RULE_NODE, id: 'n0' },
      },
      {
        type: 'org.example.TestNode',
        name: 'local-1',
        singletonMode: false,
        configurationVersion: 0,
        configuration: {},
        additionalInfo: { layoutX: 250, layoutY: 0 },
        id: { entityType: EntityType.RULE_NODE, id: 'n1' },
      },
    ],
    connections: [{ fromIndex: 0, toIndex: 1, type: 'Success' }],
  };
}

describe('saveRuleChainDraft — wave-C slot', () => {
  it('happy path: POSTs the serialized draft and checkpoints the session', async () => {
    const session = sessionWithMoves();
    serviceMock.saveRuleChainMetaData.mockResolvedValue(savedMeta());

    const outcome = await saveRuleChainDraft({ session, chain: CHAIN });
    const payload = serviceMock.saveRuleChainMetaData.mock.calls.at(-1);

    expect(outcome.status).toBe('saved');
    // outgoing payload carries the draft geometry and the chain version
    expect(payload?.[0].nodes[0].additionalInfo.layoutX).toBe(42);
    expect(payload?.[0].version).toBe(3);
    expect(payload?.[0].nodes[0].id).toBeUndefined(); // fresh nodes stripped
    // checkpoint semantic: the undo stack is CLEARED and dirty is false
    expect(session.canUndo).toBe(false);
    expect(session.dirty).toBe(false);
    expect(session.current.chain.version).toBe(4);
    expect(session.current.nodes['local-0'].ruleNodeId?.id).toBe('n0');
  });

  it('409: fetches the server metadata for the conflict outcome', async () => {
    const session = sessionWithMoves();
    const conflict = Object.assign(new Error('conflict'), { errorCode: 35 });
    serviceMock.saveRuleChainMetaData.mockRejectedValue(conflict);
    serviceMock.getRuleChainMetaData.mockResolvedValue(savedMeta());

    const outcome = await saveRuleChainDraft({ session, chain: CHAIN });

    expect(outcome).toEqual({ status: 'conflict', serverEntity: savedMeta() });
    // a failed save never re-baselines the session
    expect(session.dirty).toBe(true);
  });

  it('409 with a failed server GET degrades to serverEntity null', async () => {
    const session = sessionWithMoves();
    serviceMock.saveRuleChainMetaData.mockRejectedValue(
      Object.assign(new Error('conflict'), { errorCode: 35 }),
    );
    serviceMock.getRuleChainMetaData.mockRejectedValue(new Error('down'));

    const outcome = await saveRuleChainDraft({ session, chain: CHAIN });
    expect(outcome.status).toBe('conflict');
    expect(outcome).toMatchObject({ status: 'conflict', serverEntity: null });
  });

  it('transport error: reported untouched', async () => {
    const session = new EditorSession({ baseline: emptyDraft() });
    serviceMock.saveRuleChainMetaData.mockRejectedValue(new Error('boom'));
    const outcome = await saveRuleChainDraft({ session, chain: CHAIN });
    expect(outcome.status).toBe('error');
  });
});
