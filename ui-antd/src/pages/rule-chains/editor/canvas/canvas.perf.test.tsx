/**
 * P4 evidence (ADR 0004 appendix A / brief §5): React Flow semi-controlled
 * canvas at 500 nodes with render counters pinned through the canvas
 * `nodeTypes` test seam.
 *
 * What is provable here is the RE-RENDER TOPOLOGY, not wall-clock fps
 * (happy-dom has no layout/paint pipeline — the P7 honest-evidence rule):
 *
 *  1. 500-node mount: the derived view-model reaches the DOM (all probes
 *     rendered once) with the RF transform pipeline intact;
 *  2. single-node dragStop commits exactly ONE `moveNodes` transaction
 *     group (the drag intermediate state never touches the session —
 *     unit-proven in interactions.test.ts, the commit boundary is the same
 *     handler the canvas passes to React Flow);
 *  3. undo后受控回灌: undoing the group restores the committed position in
 *     BOTH the session draft and the rendered canvas;
 *  4. re-render topology: the move write re-renders exactly the moved
 *     node's view — the reconciling derive (reconcile.ts) keeps every other
 *     element referentially identical, so React Flow's memoized node
 *     wrappers skip them.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorSession } from '@/core/editor/session';
import { EditorSession as EditorSessionClass } from '@/core/editor/session';
import {
  moveNodes,
  writeRuleChainDraft,
} from '@/core/rulechain/rule-chain-draft';

import { RuleChainCanvas } from './index';
import { EMPTY_SELECTION } from './interactions';
import type { RuleNodeFlowNode } from './reconcile';
import { rowDraft } from './test-helpers';

const NODE_COUNT = 500;
const TARGET = 'local-242';

/** module-level render counter keyed by node uid (probe into the view). */
const renderCounts = new Map<string, number>();

function CountingRuleNode({ id }: NodeProps<RuleNodeFlowNode>) {
  renderCounts.set(id, (renderCounts.get(id) ?? 0) + 1);
  return <div data-testid={`perf-node-${id}`} />;
}

const ProbeRuleNode = memo(CountingRuleNode);
const SilentStub = memo(() => <div />);

const PROBE_NODE_TYPES = {
  ruleNode: ProbeRuleNode,
  inputNode: SilentStub,
  note: SilentStub,
};

beforeEach(() => {
  renderCounts.clear();
});

function setup() {
  const session = new EditorSessionClass({
    baseline: rowDraft(NODE_COUNT, true),
  }) as EditorSession<ReturnType<typeof rowDraft>>;
  render(
    <RuleChainCanvas
      session={session as never}
      descriptors={{}}
      selection={EMPTY_SELECTION}
      onSelectionChange={() => {}}
      highlightQuery=""
      onConnectRequest={() => {}}
      onDropNode={() => {}}
      edgeActions={{ onEditLabels: () => {}, onDelete: () => {} }}
      width={1024}
      height={768}
      nodeTypes={PROBE_NODE_TYPES}
    />,
  );
  return session;
}

/** ids whose probe rendered more often than the baseline, except target. */
function movedNodes(baseline: Map<string, number>, target: string): string[] {
  const moved: string[] = [];
  for (const [id, count] of renderCounts) {
    if (id !== target && count !== baseline.get(id)) {
      moved.push(id);
    }
  }
  return moved;
}

describe('RuleChainCanvas — P4 evidence (brief §5)', () => {
  it(`mounts ${NODE_COUNT} nodes and re-renders exactly one node per move commit`, async () => {
    const session = setup();
    await waitFor(
      () => {
        // the INPUT probe is a silent stub — rule-node probes only
        expect(renderCounts.size).toBe(NODE_COUNT);
      },
      { timeout: 20000 },
    );
    const baseline = new Map(renderCounts);

    // the dragStop commit boundary: ONE moveNodes group (drag intermediates
    // never reach the session — interactions.test.ts pins the handler)
    act(() => {
      writeRuleChainDraft(
        session,
        moveNodes([{ uid: TARGET, x: 777, y: 888 }]),
      );
    });
    expect(session.history).toHaveLength(1);
    expect(session.history[0].label).toBe('move nodes');

    await waitFor(() => {
      expect(renderCounts.get(TARGET)).toBe((baseline.get(TARGET) ?? 0) + 1);
    });
    // topology: every other node kept its object identity → memo skip
    expect(movedNodes(baseline, TARGET)).toEqual([]);
    const delta = [...renderCounts.entries()].reduce(
      (sum, [id, count]) => sum + (count - (baseline.get(id) ?? 0)),
      0,
    );
    expect(delta).toBe(1);
  });

  it('undo flows the restored position back through the controlled props', async () => {
    const session = setup();
    await waitFor(
      () => {
        expect(renderCounts.size).toBe(NODE_COUNT);
      },
      { timeout: 20000 },
    );

    act(() => {
      writeRuleChainDraft(
        session,
        moveNodes([{ uid: TARGET, x: 777, y: 888 }]),
      );
    });
    await waitFor(() => {
      expect(session.current.nodes[TARGET].x).toBe(777);
    });
    const movedBaseline = new Map(renderCounts);

    act(() => {
      session.undo();
    });
    // 引用复位锚定: the drained stack restores the baseline draft
    expect(session.current.nodes[TARGET].x).toBe(242 * 250);
    expect(session.current.nodes[TARGET].y).toBe(0);
    // the canvas received the restored projection…
    await waitFor(() => {
      expect(renderCounts.get(TARGET)).toBe(
        (movedBaseline.get(TARGET) ?? 0) + 1,
      );
    });
    // …and again exactly one probe moved (the restored node view)
    expect(movedNodes(movedBaseline, TARGET)).toEqual([]);
    // second render of the SAME element: the node wrapper stays mounted
    expect(screen.getByTestId(`perf-node-${TARGET}`)).toBeInTheDocument();
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
