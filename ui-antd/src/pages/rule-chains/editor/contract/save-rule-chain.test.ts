/**
 * Save-slot tests (wave-C skeleton + wave-3 D 409 flow): happy path re-enters
 * the session over the SAVED server metadata (checkpoint semantic — undo
 * history clears), 409 reports the fetched server metadata for the
 * three-option dialog, Option B (overwrite) re-reads the fresh version with
 * a capped retry that degrades back to `conflict`, and Option A adopts the
 * server metadata as a fresh baseline.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorSession } from '@/core/editor/session';
import { EntityType } from '@/types/tb/entity';
import type { RuleChain, RuleChainMetaData } from '@/types/tb/rule-chain';
import { emptyDraft, rowDraft } from '../canvas/test-helpers';

const serviceMock = vi.hoisted(() => ({
  saveRuleChainMetaData: vi.fn(),
  getRuleChainMetaData: vi.fn(),
}));
vi.mock('@/services/tb/rule-chain', () => serviceMock);

import {
  loadServerRuleChainDraft,
  overwriteRuleChainDraft,
  saveRuleChainDraft,
} from './save-rule-chain';

// call-count assertions in the Option-B retry tests need a clean slate
beforeEach(() => {
  vi.clearAllMocks();
});

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

function savedMeta(): RuleChainMetaData {
  return {
    ruleChainId: { entityType: EntityType.RULE_CHAIN, id: 'rc1' },
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

describe('overwriteRuleChainDraft — 409 Option B (用我的版本覆盖)', () => {
  function conflictedSession() {
    const session = sessionWithMoves();
    serviceMock.saveRuleChainMetaData.mockRejectedValue(
      Object.assign(new Error('conflict'), { errorCode: 35 }),
    );
    return session;
  }

  it('force-saves the local draft against the FRESH server version', async () => {
    const session = sessionWithMoves();
    // first save conflicts, the retry (fresh v7) succeeds
    const conflict = Object.assign(new Error('conflict'), { errorCode: 35 });
    serviceMock.saveRuleChainMetaData
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(savedMeta());
    const serverMeta = { ...savedMeta(), version: 7 };
    serviceMock.getRuleChainMetaData.mockResolvedValue(serverMeta);

    const outcome = await overwriteRuleChainDraft({ session, chain: CHAIN });

    expect(outcome.status).toBe('saved');
    // the retry POST carried the server's fresh version, not the stale 3
    expect(serviceMock.saveRuleChainMetaData.mock.calls[1]?.[0].version).toBe(
      7,
    );
    // checkpoint semantic on the force-save path too
    expect(session.canUndo).toBe(false);
    expect(session.dirty).toBe(false);
    expect(session.current.chain.version).toBe(4);
  });

  it('retries capped at 3 attempts, then degrades back to conflict', async () => {
    const session = conflictedSession();
    const serverMeta = { ...savedMeta(), version: 9 };
    serviceMock.getRuleChainMetaData.mockResolvedValue(serverMeta);

    const outcome = await overwriteRuleChainDraft({ session, chain: CHAIN });

    expect(outcome).toEqual({ status: 'conflict', serverEntity: serverMeta });
    expect(serviceMock.saveRuleChainMetaData).toHaveBeenCalledTimes(3);
    expect(serviceMock.getRuleChainMetaData).toHaveBeenCalledTimes(3);
    // a capped-out overwrite never re-baselines the session
    expect(session.dirty).toBe(true);
  });

  it('honours a smaller maxAttempts override (test seam)', async () => {
    const session = conflictedSession();
    serviceMock.getRuleChainMetaData.mockResolvedValue(savedMeta());

    const outcome = await overwriteRuleChainDraft({
      session,
      chain: CHAIN,
      maxAttempts: 2,
    });

    expect(outcome.status).toBe('conflict');
    expect(serviceMock.saveRuleChainMetaData).toHaveBeenCalledTimes(2);
  });

  it('a failed fresh-version GET refuses to blind-POST (error)', async () => {
    const session = conflictedSession();
    serviceMock.getRuleChainMetaData.mockRejectedValue(new Error('down'));

    const outcome = await overwriteRuleChainDraft({ session, chain: CHAIN });

    expect(outcome.status).toBe('error');
    expect(serviceMock.saveRuleChainMetaData).not.toHaveBeenCalled();
  });

  it('a non-conflict failure inside the loop stops the retry', async () => {
    const session = sessionWithMoves();
    serviceMock.saveRuleChainMetaData.mockRejectedValue(new Error('boom'));
    serviceMock.getRuleChainMetaData.mockResolvedValue(savedMeta());

    const outcome = await overwriteRuleChainDraft({ session, chain: CHAIN });

    expect(outcome.status).toBe('error');
    expect(serviceMock.saveRuleChainMetaData).toHaveBeenCalledTimes(1);
  });
});

describe('loadServerRuleChainDraft — 409 Option A (加载服务器版)', () => {
  it('re-enters the session over the server metadata with the fresh version', () => {
    const session = sessionWithMoves();
    const serverMeta = { ...savedMeta(), version: 11 };

    loadServerRuleChainDraft(session, serverMeta);

    // fresh enter(): history resets, dirty clears, version refreshed
    expect(session.canUndo).toBe(false);
    expect(session.dirty).toBe(false);
    expect(session.current.chain.version).toBe(11);
    // server node identities adopted (ruleNodeId backfilled)
    expect(session.current.nodes['local-0'].ruleNodeId?.id).toBe('n0');
    expect(session.current.nodes['local-0'].x).toBe(42);
  });
});
