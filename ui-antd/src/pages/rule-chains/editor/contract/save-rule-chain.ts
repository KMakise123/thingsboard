/**
 * saveRuleChainDraft — the rule-chain save slot (M8 brief §3 wave C).
 *
 * FROZEN SIGNATURE (wave 3 D finalizes the body: chain+metadata dual-segment
 * save, the 409 three-option dialog wiring, import/export adapters — do not
 * rename):
 *
 *   saveRuleChainDraft({ session, chain }): Promise<SaveOutcome>
 *   type SaveOutcome = SaveDraftOutcome<RuleChainMetaData>   (generic core)
 *
 * Wave-C body (functional single segment, ui-ngx saveRuleChain :1651-1742
 * parity): serialize the draft to metadata (canvasToMetadata strips client
 * uids), POST /api/ruleChain/metadata with the chain's optimistic-lock
 * version, then RE-ENTER the session over the normalized server response —
 * rule-chain saves CHECKPOINT (clear the undo history), unlike dashboards
 * (documented asymmetry in core/editor/session.ts; the shell surfaces the
 * `editor.ruleChain.checkpointCleared` notice).
 *
 * 409 (errorCode 35 VERSION_CONFLICT): the server metadata is fetched and
 * reported through `{status:'conflict', serverEntity}` for the (wave-3 D)
 * three-option dialog; a failed GET degrades to `serverEntity: null`.
 */

import type { SaveDraftOutcome } from '@/core/editor/contract/save-with-conflict';
import { isVersionConflict } from '@/core/editor/contract/save-with-conflict';
import type { EditorSession } from '@/core/editor/session';
import { canvasToMetadata, metadataToCanvas } from '@/core/rulechain/model';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import {
  getRuleChainMetaData,
  saveRuleChainMetaData,
} from '@/services/tb/rule-chain';
import type { RuleChain, RuleChainMetaData } from '@/types/tb/rule-chain';

export type SaveOutcome = SaveDraftOutcome<RuleChainMetaData>;

export interface SaveRuleChainDraftArgs {
  session: EditorSession<CanvasRuleChain>;
  /** Current chain entity meta (id + optimistic-lock version). */
  chain: RuleChain;
}

export async function saveRuleChainDraft({
  session,
  chain,
}: SaveRuleChainDraftArgs): Promise<SaveOutcome> {
  const metadata = canvasToMetadata(session.current);
  try {
    const saved = await saveRuleChainMetaData(metadata);
    // Re-anchor over the SAVED server truth (version backfilled). The
    // re-baseline doubles as the save checkpoint: undo history clears.
    session.enter(
      metadataToCanvas(saved, { ...chain, version: saved.version }),
    );
    return { status: 'saved', entity: saved };
  } catch (error) {
    if (!isVersionConflict(error)) {
      return { status: 'error', error };
    }
    let serverEntity: RuleChainMetaData | null = null;
    try {
      serverEntity = await getRuleChainMetaData(chain.id?.id ?? '');
    } catch {
      // server state unknown — the wave-3 dialog degrades accordingly
    }
    return { status: 'conflict', serverEntity };
  }
}
