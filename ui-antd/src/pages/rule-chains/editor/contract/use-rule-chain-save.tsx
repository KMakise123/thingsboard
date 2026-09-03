/**
 * useRuleChainSave — the rule-chain save flow with the §3.8 409 three-option
 * resolution (M8 wave-3 D; flow shape mirrors the M7 dashboards editor
 * shell's conflict handlers).
 *
 * Owns: the saving flag, the save/overwrite transports (both re-baseline
 * through `session.enter` — the rule-chain checkpoint semantic), the
 * conflict dialog state and its three option handlers, and the
 * `editor.ruleChain.checkpointCleared` notice (brief §2 行为契约: the UI
 * always SAYS that saving cleared the undo history).
 *
 * Options (ADR 0004 §2):
 *  - A 加载服务器版: adopt the server metadata as the new baseline.
 *  - B 用我的版本覆盖: fresh-version force save, capped at 3 attempts; a
 *    cap exhaustion refreshes the dialog snapshot and forces an explicit
 *    decision (the dialog stays open, M7 parity).
 *  - C 导出本地 JSON 后放弃: download the unsaved draft; if the server
 *    state is known the server baseline replaces the draft, otherwise the
 *    caller's `onAbandon` runs (rollback + exit, M7 parity).
 */
import { App } from 'antd';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import type { EditorSession } from '@/core/editor/session';
import type { CanvasRuleChain } from '@/core/rulechain/types';
import type { RuleChainMetaData } from '@/types/tb/rule-chain';
import { RuleChainConflictDialog } from './ConflictDialog';
import { exportDraftRuleChain } from './export-draft';
import {
  loadServerRuleChainDraft,
  overwriteRuleChainDraft,
  saveRuleChainDraft,
} from './save-rule-chain';

export interface UseRuleChainSaveArgs {
  session: EditorSession<CanvasRuleChain>;
  /** Option C with an unknown server state — abandon the draft (exit). */
  onAbandon?: () => void;
}

export interface RuleChainSaveFlow {
  saving: boolean;
  /** Toolbar/hotkey save entry. Resolves true when the draft persisted. */
  save(): Promise<boolean>;
  /** The rendered three-option dialog (mount next to the canvas). */
  conflictDialog: React.ReactNode;
}

export function useRuleChainSave({
  session,
  onAbandon,
}: UseRuleChainSaveArgs): RuleChainSaveFlow {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{
    serverMeta: RuleChainMetaData | null;
  } | null>(null);

  const checkpointNotice = useCallback(() => {
    message.success(
      formatMessage({
        id: 'editor.ruleChain.checkpointCleared',
        defaultMessage: 'Saved — undo history has been reset',
      }),
    );
  }, [message, formatMessage]);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      const outcome = await saveRuleChainDraft({
        session,
        chain: session.current.chain,
      });
      if (outcome.status === 'saved') {
        checkpointNotice();
        return true;
      }
      if (outcome.status === 'conflict') {
        setConflict({ serverMeta: outcome.serverEntity });
        return false;
      }
      message.error(
        `${formatMessage({
          id: 'editor.ruleChain.canvas.toolbar.saveFailed',
          defaultMessage: 'Save failed',
        })}: ${serverErrorText(outcome.error)}`,
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [session, message, formatMessage, checkpointNotice]);

  const closeConflict = useCallback(() => setConflict(null), []);

  /** Option A — 加载服务器版. */
  const handleLoadServer = useCallback(() => {
    const server = conflict?.serverMeta;
    closeConflict();
    if (!server) {
      // conflict-time GET failed — the adoption target is unknown
      message.error(
        formatMessage({
          id: 'editor.ruleChain.contract.conflict.loadFailed',
          defaultMessage: 'Failed to load the server version',
        }),
      );
      return;
    }
    loadServerRuleChainDraft(session, server);
  }, [conflict, closeConflict, message, formatMessage, session]);

  /** Option B — 用我的版本覆盖. */
  const handleOverwrite = useCallback(async () => {
    const outcome = await overwriteRuleChainDraft({
      session,
      chain: session.current.chain,
    });
    if (outcome.status === 'saved') {
      closeConflict();
      checkpointNotice();
      return;
    }
    if (outcome.status === 'conflict') {
      // retry cap exhausted — refresh the dialog snapshot and force an
      // explicit decision (dialog stays open, M7 parity)
      setConflict({ serverMeta: outcome.serverEntity });
      message.warning(
        formatMessage(
          {
            id: 'editor.ruleChain.contract.conflict.overwriteFailed',
            defaultMessage:
              'Overwrite failed: the server version kept changing (3 retries used). Pick another option.',
          },
          // placeholder present for locale-tooling; the copy carries "3"
          { count: 3 },
        ),
      );
      return;
    }
    message.error(
      `${formatMessage({
        id: 'editor.ruleChain.canvas.toolbar.saveFailed',
        defaultMessage: 'Save failed',
      })}: ${serverErrorText(outcome.error)}`,
    );
  }, [session, closeConflict, checkpointNotice, message, formatMessage]);

  /** Option C — 导出本地 JSON 后放弃. */
  const handleExportLocal = useCallback(() => {
    exportDraftRuleChain({
      chain: session.current.chain,
      draft: session.current,
    });
    const server = conflict?.serverMeta;
    closeConflict();
    if (server) {
      // the server truth replaces the abandoned draft in the editor
      loadServerRuleChainDraft(session, server);
    } else {
      // server state unknown — give up cleanly and leave the editor
      onAbandon?.();
    }
    message.success(
      formatMessage({
        id: 'editor.ruleChain.contract.export.done',
        defaultMessage: 'Draft JSON exported',
      }),
    );
  }, [session, conflict, closeConflict, onAbandon, message, formatMessage]);

  const conflictDialog = (
    <RuleChainConflictDialog
      open={conflict !== null}
      // null descriptor = unknown server state (the dialog's Option-C-only
      // warning branch); only a fetched snapshot renders the server side.
      serverEntity={
        conflict?.serverMeta
          ? {
              title: session.current.chain.name,
              version: conflict.serverMeta.version,
            }
          : null
      }
      onLoadServer={handleLoadServer}
      onOverwrite={() => void handleOverwrite()}
      onExportLocal={handleExportLocal}
      onClose={closeConflict}
    />
  );

  return { saving, save, conflictDialog };
}
