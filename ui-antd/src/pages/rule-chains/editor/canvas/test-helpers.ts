import type { CanvasNode, CanvasRuleChain } from '@/core/rulechain/types';

/** Minimal valid chain snapshot for canvas tests. */
export function chainSnapshot() {
  return {
    id: { entityType: 'RULE_CHAIN' as const, id: 'rc1' },
    name: 'Test chain',
    version: 3,
  };
}

export function emptyDraft(): CanvasRuleChain {
  return {
    chain: chainSnapshot() as CanvasRuleChain['chain'],
    nodes: {},
    edges: [],
    notes: [],
    inputTargetUid: null,
  };
}

export function node(
  uid: string,
  x: number,
  y: number,
  overrides: Partial<CanvasNode> = {},
): CanvasNode {
  return {
    uid,
    clazz: overrides.clazz ?? 'org.example.TestNode',
    name: overrides.name ?? uid,
    x,
    y,
    configuration: overrides.configuration ?? {},
    singletonMode: false,
    configurationVersion: 0,
    ...overrides,
  };
}

/** n-node row draft with an optional a→b chain of edges. */
export function rowDraft(count: number, withEdges = false): CanvasRuleChain {
  const draft = emptyDraft();
  for (let i = 0; i < count; i += 1) {
    const uid = `local-${i}`;
    draft.nodes[uid] = node(uid, i * 250, 0);
  }
  if (withEdges) {
    for (let i = 1; i < count; i += 1) {
      draft.edges.push({
        id: `local-e${i - 1}`,
        sourceUid: `local-${i - 1}`,
        targetUid: `local-${i}`,
        labels: ['Success'],
      });
    }
  }
  return draft;
}
