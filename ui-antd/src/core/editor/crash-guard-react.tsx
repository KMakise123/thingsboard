/**
 * React binding for crash-guard (M10 brief §2) — the useWidgetSave seam
 * shape: a hook returning one `crashGuardDialog` ReactNode the editor page
 * renders as-is. Minimal per-editor wiring is therefore two lines:
 * the hook call + one render slot.
 *
 * Activation contract: pass `enabled = entered` (the pages already gate on
 * their enter-once flag). When enabled flips true the session baseline is
 * the freshly entered server state — the archive is read against it, the
 * guard attaches for subsequent writes, and a drifted archive opens the
 * recovery dialog (恢复 / 丢弃 — honest copy, no "about to" implication:
 * the choice only affects the archive, never the session on its own).
 *
 * Restore = ONE undoable transaction group (restoreCrashArchive, the import
 * paradigm); discard = clear the key. Both paths close the dialog; the
 * dialog itself offers no third way out — it is modal by design so the
 * session cannot be edited against an undecided archive.
 */
import { Button, Modal, Space, Typography } from 'antd';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import {
  attachCrashGuard,
  type CrashArchive,
  clearCrashArchive,
  crashGuardKey,
  isRecoverable,
  readCrashArchive,
  restoreCrashArchive,
} from './crash-guard';
import type { EditorSession } from './session';

export interface UseCrashGuardOptions<T extends object> {
  /** Key domain segment — `dashboard` / `ruleChain` / `widget`. */
  domain: string;
  /** Entity id; empty/undefined lands on the `new` key space. */
  entityId?: string;
  session: EditorSession<T>;
  /** Active only while the editor face is entered (the pages' entered flag). */
  enabled: boolean;
  /** Storage-write debounce (widget editor code-text path passes ~500). */
  debounceMs?: number;
}

export interface UseCrashGuardResult {
  /** Recovery dialog slot — render as-is. */
  crashGuardDialog: ReactNode;
}

export function useCrashGuard<T extends object>({
  domain,
  entityId,
  session,
  enabled,
  debounceMs,
}: UseCrashGuardOptions<T>): UseCrashGuardResult {
  const [candidate, setCandidate] = useState<CrashArchive<T> | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const key = crashGuardKey(domain, entityId);
    // Read FIRST: the archive belongs to the crashed visit and the guard's
    // clean-attach path must never clear it before the dialog can offer it.
    const archive = readCrashArchive<T>(key);
    if (archive && isRecoverable(archive, session.current)) {
      setCandidate(archive);
    }
    const detach = attachCrashGuard({ key, session, debounceMs });
    return () => {
      detach();
      setCandidate(null);
    };
  }, [domain, entityId, session, enabled, debounceMs]);

  const restore = useCallback(() => {
    if (!candidate) {
      return;
    }
    restoreCrashArchive(session, candidate);
    setCandidate(null);
  }, [candidate, session]);

  const discard = useCallback(() => {
    clearCrashArchive(crashGuardKey(domain, entityId));
    setCandidate(null);
  }, [domain, entityId]);

  return {
    crashGuardDialog: candidate ? (
      <CrashGuardDialog
        savedAt={candidate.savedAt}
        onRestore={restore}
        onDiscard={discard}
      />
    ) : null,
  };
}

export interface CrashGuardDialogProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

/** Two-option recovery prompt (spec §7 崩溃保护; copy is honest, no 「即将」). */
export function CrashGuardDialog({
  savedAt,
  onRestore,
  onDiscard,
}: CrashGuardDialogProps) {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) => ({ id, defaultMessage });

  return (
    <Modal
      open
      title={formatMessage(
        t('editor.crashGuard.dialogTitle', 'Unsaved draft archive found'),
      )}
      footer={null}
      closable={false}
      maskClosable={false}
      keyboard={false}
      data-testid="crash-guard-dialog"
    >
      <Typography.Paragraph type="secondary">
        {formatMessage(
          t(
            'editor.crashGuard.dialogIntro',
            'The previous session ended with unsaved edits; a draft archive was kept locally (saved at {time}).',
          ),
          { time: new Date(savedAt).toLocaleString() },
        )}
      </Typography.Paragraph>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Button
            type="primary"
            onClick={onRestore}
            data-testid="crash-guard-restore"
            block
          >
            {formatMessage(t('editor.crashGuard.restore', 'Restore draft'))}
          </Button>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatMessage(
              t(
                'editor.crashGuard.restoreText',
                'Write the archived content back into the editor as one undoable group.',
              ),
            )}
          </Typography.Text>
        </div>
        <div>
          <Button onClick={onDiscard} data-testid="crash-guard-discard" block>
            {formatMessage(t('editor.crashGuard.discard', 'Discard archive'))}
          </Button>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatMessage(
              t(
                'editor.crashGuard.discardText',
                'Clear this archive and continue with the current content.',
              ),
            )}
          </Typography.Text>
        </div>
      </Space>
    </Modal>
  );
}
