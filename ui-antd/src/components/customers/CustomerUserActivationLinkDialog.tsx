/**
 * "Show activation link" dialog (ui-ngx ActivationLinkDialog parity — this
 * IS the backend-less "reset password" flow: the admin copies the
 * activation link and hands it to the user; spec §3.5 / RECON §6).
 */

import { useQuery } from '@tanstack/react-query';
import { Modal, Spin, Typography } from 'antd';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import { getUserActivationLink } from '@/services/tb/user';

export interface CustomerUserActivationLinkDialogProps {
  open: boolean;
  userId?: string;
  onClose: () => void;
}

export function CustomerUserActivationLinkDialog({
  open,
  userId,
  onClose,
}: CustomerUserActivationLinkDialogProps) {
  const { formatMessage } = useIntl();
  const linkQuery = useQuery({
    queryKey: ['user', 'activation-link', userId],
    queryFn: () => getUserActivationLink(userId as string),
    enabled: open && !!userId,
  });
  const link = linkQuery.data ?? '';

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={formatMessage({
        id: 'pages.customers.users.activationLinkTitle',
        defaultMessage: 'Activation link',
      })}
      footer={null}
      onCancel={onClose}
    >
      {linkQuery.isPending && <Spin />}
      {linkQuery.isError && (
        <Typography.Text type="danger">
          {serverErrorText(linkQuery.error)}
        </Typography.Text>
      )}
      {linkQuery.isSuccess && (
        <Typography.Paragraph copyable={{ text: link }}>
          {link || '-'}
        </Typography.Paragraph>
      )}
    </Modal>
  );
}
