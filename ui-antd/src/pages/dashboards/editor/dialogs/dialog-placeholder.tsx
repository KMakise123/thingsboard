/**
 * Shared body of the C-wave placeholder dialogs. Honest copy only: the
 * dialog states that it currently has no actions — it never promises a
 * future capability (spec §1 principle 3 spirit).
 */
import { Modal, Typography } from 'antd';
import { useIntl } from 'react-intl';

import type { EditorDialogProps } from './host';

export function EditorDialogPlaceholder({
  open,
  title,
  onClose,
}: EditorDialogProps & { title: string }) {
  const { formatMessage } = useIntl();
  return (
    <Modal
      open={open}
      title={title}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="editor-dialog-placeholder"
    >
      <Typography.Text type="secondary">
        {formatMessage({
          id: 'editor.dashboard.dialog.empty',
          defaultMessage: 'This panel currently has no actions.',
        })}
      </Typography.Text>
    </Modal>
  );
}
