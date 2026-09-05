/**
 * Delivery-failures dialog (M12 wave 3-B, spec §4.3) — ui-ngx
 * sent-error-dialog parity: the request's stats.errors grouped per delivery
 * method, recipient title → error message rows. Uses the row payload when it
 * already carries stats; falls back to GET request/{id} otherwise.
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Modal, Space, Typography } from 'antd';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import { getNotificationRequestById } from '@/services/tb/notification';
import type {
  NotificationDeliveryMethod,
  NotificationRequestInfo,
} from '@/types/tb/notification';

export interface SentErrorDialogProps {
  request: NotificationRequestInfo | null;
  onClose: () => void;
}

const METHOD_NAME_KEYS: Record<NotificationDeliveryMethod, string> = {
  WEB: 'pages.notifications.sent.deliveryMethod.web',
  EMAIL: 'pages.notifications.sent.deliveryMethod.email',
  SMS: 'pages.notifications.sent.deliveryMethod.sms',
  SLACK: 'pages.notifications.sent.deliveryMethod.slack',
  MICROSOFT_TEAMS: 'pages.notifications.sent.deliveryMethod.microsoftTeams',
  MOBILE_APP: 'pages.notifications.sent.deliveryMethod.mobileApp',
};

export function SentErrorDialog({ request, onClose }: SentErrorDialogProps) {
  const { formatMessage } = useIntl();
  const open = Boolean(request);

  // Row stats first; the explicit fetch only covers a sparse row payload.
  const detailQuery = useQuery({
    queryKey: ['notifications', 'requests', request?.id.id, 'stats'],
    queryFn: () => getNotificationRequestById(request?.id.id as string),
    enabled: open && !request?.stats,
  });

  const stats = request?.stats ?? detailQuery.data?.stats;
  const methodEntries = Object.entries(stats?.errors ?? {}) as Array<
    [NotificationDeliveryMethod, Record<string, string>]
  >;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      title={formatMessage({
        id: 'pages.notifications.sent.errorDialog.title',
        defaultMessage: 'Delivery failures',
      })}
      destroyOnHidden
    >
      {detailQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.notifications.sent.errorDialog.loadFailed',
            defaultMessage: 'Failed to load the request errors',
          })}
          description={serverErrorText(detailQuery.error)}
          className="mb-3"
        />
      )}
      {!detailQuery.isPending && methodEntries.length === 0 && (
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.notifications.sent.errorDialog.empty',
            defaultMessage: 'No delivery errors recorded for this request.',
          })}
        </Typography.Text>
      )}
      <div className="flex flex-col gap-4" data-testid="sent-error-dialog">
        {methodEntries.map(([method, errors]) => (
          <section key={method}>
            <Typography.Text strong>
              {formatMessage({
                id: METHOD_NAME_KEYS[method] ?? method,
                defaultMessage: method,
              })}
            </Typography.Text>
            <ul className="mb-0 mt-1 list-disc pl-5">
              {Object.entries(errors).map(([recipient, error]) => (
                <li key={recipient}>
                  <Space size={6} wrap>
                    <Typography.Text strong>{recipient}</Typography.Text>
                    <Typography.Text type="secondary">{error}</Typography.Text>
                  </Space>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
