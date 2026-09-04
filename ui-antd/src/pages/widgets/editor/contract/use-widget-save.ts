/**
 * useWidgetSave — the save-chain seam of the widget editor (M9 brief §3
 * wave S item 9). FROZEN CONTRACT for wave-3 D: the shell binds the
 * toolbar save button + ctrl+s to this hook's result and renders
 * `conflictDialog` as-is; D fills the compile→execute→smoke-render gates
 * and the 409 three-option dialog WITHOUT changing these signatures (D
 * owns the file body from then on, brief §3).
 *
 * The placeholder already runs the minimal honest chain: serialize draft →
 * POST upsert → re-anchor the session to the saved entity (version/id
 * backfill via `session.save(doc)`). Wave-3 D inserts the gates BEFORE the
 * POST (a type that does not compile must never be stored) and replaces
 * the bare 409 error surface with the three-option dialog (Option C
 * abandon routes through `onAbandon`).
 */

import { App } from 'antd';
import { type ReactNode, useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import type { EditorSession } from '@/core/editor/session';
import { useEditorSession } from '@/core/editor/use-editor-session';
import { saveWidgetType } from '@/services/tb/widget-type';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';

import {
  draftToWidgetType,
  type WidgetEditorDoc,
  widgetTypeToDraft,
} from '../draft-convert';

export interface UseWidgetSaveArgs {
  session: EditorSession<WidgetEditorDoc>;
  /**
   * exit path after the conflict dialog's "load server version / abandon"
   * options — the shell wires it to rollback-to-entry + route exit.
   */
  onAbandon: () => void;
}

export interface UseWidgetSaveResult {
  saving: boolean;
  /**
   * Save button disabled source: nothing to commit until the session is
   * dirty, and no re-entry while a save is in flight.
   */
  saveDisabled: boolean;
  /**
   * Runs the save chain; resolves the saved server entity (null when the
   * chain aborted — the shell uses a non-null result to mint/replace the
   * editor URL after a first save).
   */
  save: () => Promise<WidgetTypeDetails | null>;
  /** 409 three-option dialog slot — render as-is (wave-3 D). */
  conflictDialog: ReactNode;
}

export function useWidgetSave({
  session,
}: UseWidgetSaveArgs): UseWidgetSaveResult {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { dirty } = useEditorSession(session);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (): Promise<WidgetTypeDetails | null> => {
    if (saving) {
      return null;
    }
    setSaving(true);
    try {
      // TODO(wave-3 D): compile → execute → smoke-render gates go BEFORE
      // this POST (spec §5.2 — never store non-compiling source); 409 goes
      // through the three-option dialog, Option C calls onAbandon.
      const saved = await saveWidgetType(draftToWidgetType(session.current));
      session.save(widgetTypeToDraft(saved));
      message.success(
        formatMessage({
          id: 'editor.widget.editor.toolbar.saved',
          defaultMessage: 'Saved',
        }),
      );
      return saved;
    } catch (error) {
      message.error(serverErrorText(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [session, saving, message, formatMessage]);

  return {
    saving,
    saveDisabled: !dirty || saving,
    save,
    // TODO(wave-3 D): the ConflictDialog slot (core/editor/contract parity).
    conflictDialog: null,
  };
}
