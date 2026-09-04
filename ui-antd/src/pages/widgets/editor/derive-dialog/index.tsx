/**
 * DeriveWidgetDialog — derivation entry of the widget editor (M9 brief §3
 * wave S item 9). FROZEN CONTRACT for wave-3 D: registered in the shell
 * DialogHost under the id `derive`. D fills the two-tier derivation
 * (full from existing react-1 custom types; restricted from built-ins —
 * schema/config/size available, source honestly marked unavailable) and
 * delivers the derived draft through onConfirm, WITHOUT changing the
 * payload signature.
 *
 * The placeholder is an honest skeleton: it explains both tiers and has no
 * confirm path (nothing to deliver yet).
 */

import { Modal, Typography } from 'antd';
import { useIntl } from 'react-intl';
import type { WidgetEditorDialogProps } from '../dialog-host';
import type { WidgetEditorDoc } from '../draft-convert';

export interface DeriveWidgetDialogPayload {
  /** delivers the derived draft built from the picked source type (D). */
  onConfirm: (draft: WidgetEditorDoc) => void;
}

export function DeriveWidgetDialog({ open, onClose }: WidgetEditorDialogProps) {
  const { formatMessage } = useIntl();
  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.widget.editor.dialog.derive.title',
        defaultMessage: 'Derive widget',
      })}
      onCancel={onClose}
      footer={null}
      data-testid="widget-derive-dialog"
    >
      <Typography.Paragraph type="secondary">
        {formatMessage({
          id: 'editor.widget.editor.dialog.derive.pending',
          defaultMessage: 'Derivation will be provided here.',
        })}
      </Typography.Paragraph>
    </Modal>
  );
}
