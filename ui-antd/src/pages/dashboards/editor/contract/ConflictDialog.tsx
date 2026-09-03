/**
 * 409 three-option conflict dialog — C wave placeholder. Props frozen; the
 * D wave fills the §3.8 flow (load server version / overwrite with mine —
 * GET fresh version then POST, max 3 retries — / export local JSON and
 * give up).
 */
import { Modal } from 'antd';
import { useIntl } from 'react-intl';

import type { Dashboard } from '@/types/tb/dashboard';

export interface ConflictDialogProps {
  open: boolean;
  /** Server entity observed at conflict time (D wave populates). */
  serverDashboard?: Dashboard | null;
  onLoadServer: () => void;
  onOverwrite: () => void;
  onExportLocal: () => void;
  onClose: () => void;
}

export function ConflictDialog({ open, onClose }: ConflictDialogProps) {
  const { formatMessage } = useIntl();
  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.conflict.title',
        defaultMessage: 'Save conflict',
      })}
      okText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      cancelButtonProps={{ style: { display: 'none' } }}
      onOk={onClose}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
    >
      {formatMessage({
        id: 'editor.dashboard.conflict.empty',
        defaultMessage:
          'A save conflict was detected, but no conflict actions are wired up.',
      })}
    </Modal>
  );
}
