/**
 * Reusable send-notification entry (M12 wave 3-B, spec §4.3 "三入口复用同一
 * 向导") — hosts the SendNotificationWizard behind a primary button. Drop it
 * into any SYS/TENANT page toolbar:
 *
 *   import { SendNotificationButton } from '@/pages/notifications/sent/send-button';
 *   <SendNotificationButton />
 *   <SendNotificationButton prefilledRequest={requestInfo} />  // notify-again
 *
 * The wizard invalidates the sent list itself; hosts only supply an optional
 * prefill request.
 */

import { Button } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';

import type {
  NotificationRequest,
  NotificationRequestInfo,
} from '@/types/tb/notification';
import { SendNotificationWizard } from './wizard';

export interface SendNotificationButtonProps {
  /** Pre-fills the wizard (ui-ngx "notify again" entry). */
  prefilledRequest?: NotificationRequest | NotificationRequestInfo | null;
  disabled?: boolean;
  /** Rendered button label (defaults to the localized "Send notification"). */
  label?: string;
}

export function SendNotificationButton({
  prefilledRequest,
  disabled = false,
  label,
}: SendNotificationButtonProps) {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="primary"
        disabled={disabled}
        onClick={() => setOpen(true)}
        data-testid="send-notification-button"
      >
        {label ??
          formatMessage({
            id: 'pages.notifications.sent.send',
            defaultMessage: 'Send notification',
          })}
      </Button>
      {/* Mount the wizard only while open so a closed button triggers no
          delivery-method probing (host pages' tests mock a narrow service
          surface) and no useless requests sit idle in the toolbar. */}
      {open && (
        <SendNotificationWizard
          open
          prefilledRequest={prefilledRequest}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
