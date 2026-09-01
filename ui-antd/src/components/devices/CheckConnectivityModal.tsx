/**
 * Standalone connectivity-check dialog (row action entry). Renders the
 * shared ConnectivityPanel; the wizard embeds the panel directly for its
 * last step.
 */
import { Modal } from 'antd';
import { useIntl } from 'react-intl';

import { ConnectivityPanel } from './connectivity';

export interface CheckConnectivityModalProps {
  open: boolean;
  deviceId: string | undefined;
  onClose: () => void;
}

export function CheckConnectivityModal({
  open,
  deviceId,
  onClose,
}: CheckConnectivityModalProps) {
  const { formatMessage } = useIntl();
  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.devices.list.connectivityTitle',
        defaultMessage: 'Check connectivity',
      })}
      width={760}
      destroyOnHidden
      onCancel={onClose}
      onOk={onClose}
      okText={formatMessage({
        id: 'pages.devices.list.close',
        defaultMessage: 'Close',
      })}
      cancelButtonProps={{ style: { display: 'none' } }}
    >
      <ConnectivityPanel deviceId={deviceId} />
    </Modal>
  );
}
