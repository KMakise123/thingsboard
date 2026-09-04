/**
 * SaveAsWidgetDialog — "save as" dialog of the widget editor (spec §5.2;
 * ui-ngx anchor save-widget-type-as-dialog.component.ts). Registered in the
 * shell DialogHost under the id `save-as`; the payload signature is the
 * frozen wave-S seam.
 *
 * Wave-3 D body: the dialog asks for the NEW NAME (required) and the NEW
 * fqn short name (optional — empty lets the server derive a unique one
 * from the name; once saved the fqn is immutable, so this is the only
 * chance to pick it). Confirm mints a COPY of the draft with the identity
 * triple reset — widgetTypeId / fqn / version — so the shell's immediate
 * save lands as a CREATE; the descriptor payload itself is untouched.
 *
 * entityPassthrough (description / tags / image / …) RIDES ALONG on the
 * copy — ui-ngx parity: saveWidgetAs renames the WHOLE entity and re-posts
 * it (widget-editor.component.ts saveWidgetAs → saveWidgetTypeDetails),
 * so the duplicate is a full clone with a new name, not a stripped one.
 */

import { Form, Input, Modal } from 'antd';
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

/** The backend fqn slug shape (WidgetTypeDataValidator); empty = derive. */
const FQN_PATTERN = /^[a-z0-9_]*$/;

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
  const [fqn, setFqn] = useState('');

  const fqnTouched = fqn.trim() !== '';
  const nameOk = name.trim().length > 0;
  const fqnOk = FQN_PATTERN.test(fqn.trim());
  const canConfirm = nameOk && fqnOk;

  const confirm = () => {
    const source = typed?.draft;
    if (!source || !canConfirm) {
      return;
    }
    typed?.onConfirm({
      ...source,
      name: name.trim(),
      // fresh identity: create path (empty fqn = server derives from name)
      fqn: fqn.trim(),
      widgetTypeId: null,
      version: null,
      descriptorPassthrough: { ...source.descriptorPassthrough },
      entityPassthrough: { ...source.entityPassthrough },
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
      okButtonProps={{ disabled: !canConfirm }}
      onCancel={onClose}
      onOk={confirm}
      destroyOnHidden
      data-testid="widget-save-as-dialog"
    >
      <Form layout="vertical">
        <Form.Item
          label={formatMessage({
            id: 'editor.widget.editor.metadata.name',
            defaultMessage: 'Name',
          })}
          required
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
        </Form.Item>
        <Form.Item
          label={formatMessage({
            id: 'editor.widget.editor.dialog.saveAs.fqn',
            defaultMessage: 'New fqn (short name, optional)',
          })}
          validateStatus={fqnOk ? undefined : 'error'}
          help={
            fqnOk
              ? formatMessage({
                  id: 'editor.widget.editor.dialog.saveAs.fqnHint',
                  defaultMessage:
                    'Leave empty and the server derives one from the name.',
                })
              : formatMessage({
                  id: 'editor.widget.editor.dialog.saveAs.fqnInvalid',
                  defaultMessage: 'Lowercase letters, digits, underscores only',
                })
          }
        >
          <Input
            value={fqn}
            data-testid="widget-save-as-fqn"
            onChange={(event) => setFqn(event.target.value)}
            placeholder="my_widget_copy"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
