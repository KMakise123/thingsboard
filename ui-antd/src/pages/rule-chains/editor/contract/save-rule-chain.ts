/**
 * saveRuleChainDraft — the rule-chain save slot (M8 brief §3 wave C).
 *
 * FROZEN SIGNATURE (wave 3 D finalized the 409 flow around it — do not
 * rename):
 *
 *   saveRuleChainDraft({ session, chain }): Promise<SaveOutcome>
 *   type SaveOutcome = SaveDraftOutcome<RuleChainMetaData>   (generic core)
 *
 * Body (functional single segment, ui-ngx saveRuleChain :1651-1742 parity):
 * serialize the draft to metadata (canvasToMetadata strips client uids),
 * POST /api/ruleChain/metadata with the chain's optimistic-lock version,
 * then RE-ENTER the session over the normalized server response — rule-chain
 * saves CHECKPOINT (clear the undo history), unlike dashboards (documented
 * asymmetry in core/editor/session.ts; the shell surfaces the
 * `editor.ruleChain.checkpointCleared` notice).
 *
 * 409 (errorCode 35 VERSION_CONFLICT): the server metadata is fetched and
 * reported through `{status:'conflict', serverEntity}` for the wave-3 D
 * three-option dialog; a failed GET degrades to `serverEntity: null`.
 *
 * Wave-3 D additions complete the §3.8 loop beside the frozen save:
 *  - `overwriteRuleChainDraft` — Option B (用我的版本覆盖): re-GET the fresh
 *    server version before each POST, retry capped at MAX_OVERWRITE_ATTEMPTS
 *    (core contract), exhaustion degrades BACK to `conflict` (not error).
 *    Deliberately NOT the generic core loop: the core re-baselines through
 *    `session.save` (undo stack survives), while rule-chain saves
 *    CHECKPOINT via `session.enter` — the re-baseline path must match the
 *    plain save path or the two save buttons would diverge in history
 *    semantics.
 *  - `loadServerRuleChainDraft` — Option A (加载服务器版): fresh `enter()`
 *    over the server metadata (history resets), chain snapshot version
 *    refreshed from the server.
 */

import type { SaveDraftOutcome } from '@/core/editor/contract/save-with-conflict';
import {
  isVersionConflict,
  MAX_OVERWRITE_ATTEMPTS,
} from '@/core/editor/contract/save-with-conflict';
import type { EditorSession } from '@/core/editor/session';
import { canvasToMetadata, metadataToCanvas } from '@/core/rulechain/model';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import {
  getRuleChainMetaData,
  saveRuleChainMetaData,
} from '@/services/tb/rule-chain';
import type { RuleChain, RuleChainMetaData } from '@/types/tb/rule-chain';

export type SaveOutcome = SaveDraftOutcome<RuleChainMetaData>;

export { MAX_OVERWRITE_ATTEMPTS };

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
      // server state unknown — the dialog degrades to Option C only
    }
    return { status: 'conflict', serverEntity };
  }
}

export interface OverwriteRuleChainDraftArgs extends SaveRuleChainDraftArgs {
  /** Test seam: override the attempt cap (defaults to MAX_OVERWRITE_ATTEMPTS). */
  maxAttempts?: number;
}

/**
 * 409 Option B — 用我的版本覆盖: force-save the local draft by re-reading
 * the server's latest `version` before each POST. Retry on further 409s up
 * to `maxAttempts` (3); exhaustion degrades back to `conflict` with the
 * latest observed server snapshot (ADR 0004 §2, core core parity).
 */
export async function overwriteRuleChainDraft({
  session,
  chain,
  maxAttempts = MAX_OVERWRITE_ATTEMPTS,
}: OverwriteRuleChainDraftArgs): Promise<SaveOutcome> {
  let lastServer: RuleChainMetaData | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let freshVersion: number | undefined;
    try {
      lastServer = await getRuleChainMetaData(chain.id?.id ?? '');
      freshVersion = lastServer.version ?? chain.version;
    } catch (error) {
      // Cannot learn the fresh version — refusing to blind-POST.
      return { status: 'error', error };
    }
    try {
      const metadata = canvasToMetadata(session.current);
      const saved = await saveRuleChainMetaData({
        ...metadata,
        version: freshVersion,
      });
      // Same checkpoint re-baseline as the plain save path (see header).
      session.enter(
        metadataToCanvas(saved, { ...chain, version: saved.version }),
      );
      return { status: 'saved', entity: saved };
    } catch (error) {
      if (!isVersionConflict(error)) {
        return { status: 'error', error };
      }
      // version raced again — fall through to the next attempt
    }
  }
  return { status: 'conflict', serverEntity: lastServer };
}

/**
 * 409 Option A — 加载服务器版: adopt the server metadata as the new editing
 * baseline (fresh `enter()` — history resets). The chain entity snapshot is
 * kept (name/type/root are unaffected by a metadata race); only the
 * optimistic-lock version is refreshed from the server truth.
 */
export function loadServerRuleChainDraft(
  session: EditorSession<CanvasRuleChain>,
  serverMeta: RuleChainMetaData,
): void {
  session.enter(
    metadataToCanvas(serverMeta, {
      ...session.current.chain,
      version: serverMeta.version,
    }),
  );
}
