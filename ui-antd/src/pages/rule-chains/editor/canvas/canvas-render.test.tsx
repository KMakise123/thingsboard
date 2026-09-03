/**
 * Canvas render smoke: React Flow mounts under happy-dom with a real draft,
 * the INPUT virtual node renders, and undo flows back through the
 * controlled props (回灌端到端 precheck for the P4 evidence suite).
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import {
  moveNodes,
  writeRuleChainDraft,
} from '@/core/rulechain/rule-chain-draft';

import { RuleChainCanvas } from './index';
import { EMPTY_SELECTION } from './interactions';
import { rowDraft } from './test-helpers';

function setup(nodeCount: number) {
  const session = new EditorSession({ baseline: rowDraft(nodeCount, true) });
  render(
    <RuleChainCanvas
      session={session}
      descriptors={{}}
      selection={EMPTY_SELECTION}
      onSelectionChange={() => {}}
      highlightQuery=""
      onConnectRequest={() => {}}
      onDropNode={() => {}}
      edgeActions={{ onEditLabels: () => {}, onDelete: () => {} }}
      width={960}
      height={720}
    />,
  );
  return session;
}

describe('RuleChainCanvas render smoke', () => {
  it('renders regular nodes and the INPUT virtual node', async () => {
    setup(2);
    await waitFor(() => {
      expect(screen.getAllByTestId('rc-node')).toHaveLength(2);
    });
    expect(screen.getByTestId('rc-input-node')).toBeInTheDocument();
  });

  it('flows a moveNodes commit into the DOM and undoes it back (回灌)', async () => {
    const session = setup(2);
    const wrapperFor = (uid: string) =>
      document.querySelector(`[data-id="${uid}"]`);
    await waitFor(() => {
      expect(wrapperFor('local-1')).not.toBeNull();
    });
    act(() => {
      writeRuleChainDraft(
        session,
        moveNodes([{ uid: 'local-1', x: 321, y: 123 }]),
      );
    });
    await waitFor(() => {
      expect(session.current.nodes['local-1'].x).toBe(321);
    });
    act(() => {
      session.undo();
    });
    await waitFor(() => {
      expect(session.current.nodes['local-1'].x).toBe(250);
    });
    // the RF wrapper element still exists after the round trip
    expect(wrapperFor('local-1')).not.toBeNull();
  });
});
