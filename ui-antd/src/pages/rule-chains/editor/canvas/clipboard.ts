/**
 * Rule-chain editor clipboard (M8 brief §3 wave C): a module-level
 * singleton, the dashboards editor clipboard pattern (pages/dashboards/
 * editor/clipboard.ts) applied to the F-wave `copySelection` payload.
 *
 * NOT localStorage (dirty lifecycle, no cross-UI value); the payload keeps
 * intra-selection edges only and carries NO wire ids — paste regenerates
 * every uid/edge-id as ONE transaction group (core/rulechain/rule-chain-draft
 * `paste`). ui-ngx rule chains have no "paste reference" semantics and the
 * spec does not ask for one — only the copy tier exists here.
 */
import type { EditorSession } from '@/core/editor/session';
import {
  copySelection,
  paste,
  type RuleChainClipboardPayload,
  writeRuleChainDraft,
} from '@/core/rulechain/rule-chain-draft';
import type { CanvasRuleChain } from '@/core/rulechain/types';

import type { CanvasSelection } from './interactions';

let current: RuleChainClipboardPayload | null = null;

export function getRuleChainClipboard(): RuleChainClipboardPayload | null {
  return current;
}

export function hasRuleChainClipboard(): boolean {
  return current !== null;
}

/**
 * Extract + store the selection payload (notes travel under the same
 * nodeIds list — copySelection reads them from noteUids). Returns the
 * copied node count.
 */
export function copySelectionToClipboard(args: {
  draft: CanvasRuleChain;
  selection: CanvasSelection;
}): number {
  const payload = copySelection(args.draft, {
    nodeUids: args.selection.nodeIds,
    noteUids: args.selection.nodeIds,
  });
  current = payload;
  return payload.nodes.length;
}

/**
 * Paste the clipboard as ONE transaction group at `at` (flow coords;
 * omitted = the copied geometry verbatim). Returns the pasted element count.
 */
export function pasteRuleChainClipboard(args: {
  session: EditorSession<CanvasRuleChain>;
  at?: { x: number; y: number };
}): number {
  if (!current) {
    return 0;
  }
  writePaste(args.session, current, args.at);
  return current.nodes.length + current.notes.length;
}

function writePaste(
  session: EditorSession<CanvasRuleChain>,
  payload: RuleChainClipboardPayload,
  at?: { x: number; y: number },
): void {
  writeRuleChainDraft(session, paste({ payload, at }));
}

export function clearRuleChainClipboard(): void {
  current = null;
}
