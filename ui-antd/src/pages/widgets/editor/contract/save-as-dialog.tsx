/**
 * SaveAsWidgetDialog — "save as" dialog of the widget editor (M9 brief §3
 * wave S item 9). FROZEN CONTRACT for wave-3 D: registered in the shell
 * DialogHost under the id `save-as`; D may replace the body (ui-ngx
 * save-widget-type-as-dialog parity — new fqn/alias handling) WITHOUT
 * changing the payload signature.
 *
 * The placeholder already delivers the working semantic: confirm mints a
 * COPY of the draft with id/version/fqn reset (the server derives a fresh
 * fqn from the new name on the next save); the shell re-enters the session
 * with it and saves immediately.
 */

import { Input, Modal } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { WidgetEditorDialogProps } from '../dialog-host';
import type { WidgetEditorDoc } from '../draft-convert';

export interface SaveAsWidgetDialogPayload {
  /** the current draft snapshot to copy from. */
  draft: WidgetEditorDoc;
  /** delivers the renamed copy (id/version/fqn reset — server re-mints). */
  onConfirm: (draft: WidgetEditorDoc) => void;
}

export function SaveAsWidgetDialog({
  open,
  payload,
  onClose,
}: WidgetEditorDialogProps) {
  const { formatMessage } = useIntl();
  // the host mounts a dialog only while it is active — the payload is
  // present at mount (M8 house pattern: one assertion at the boundary).
  const typed = payload as SaveAsWidgetDialogPayload | undefined;
  const [name, setName] = useState(typed?.draft.name ?? '');

  const confirm = () => {
    const source = typed?.draft;
    if (!source || !name.trim()) {
      return;
    }
    typed?.onConfirm({
      ...source,
      name: name.trim(),
      // fresh identity: create path (server derives the new fqn)
      widgetTypeId: null,
      fqn: '',
      version: null,
      descriptorPassthrough: { ...source.descriptorPassthrough },
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.widget.editor.dialog.saveAs.title',
        defaultMessage: 'Save as',
      })}
      okText={formatMessage({
        id: 'editor.widget.editor.dialog.saveAs.ok',
        defaultMessage: 'Create draft copy',
      })}
      okButtonProps={{ disabled: !name.trim() }}
      onCancel={onClose}
      onOk={confirm}
      destroyOnHidden
      data-testid="widget-save-as-dialog"
    >
      <Input
        value={name}
        autoFocus
        data-testid="widget-save-as-name"
        onChange={(event) => setName(event.target.value)}
        placeholder={formatMessage({
          id: 'editor.widget.editor.dialog.saveAs.name',
          defaultMessage: 'New name',
        })}
      />
    </Modal>
  );
}
