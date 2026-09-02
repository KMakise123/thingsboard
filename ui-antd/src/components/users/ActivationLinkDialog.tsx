/**
 * Activation-link dialog (ui-ngx activation-link-dialog parity).
 *
 * The one dialog behind both "reset password" row action and the post-create
 * activation flow: shows the plain activation link plus its remaining TTL and
 * a copy button. The caller owns the fetch — the dialog stays dumb so it is
 * trivially testable (the backend answers GET /api/user/{id}/activationLink
 * with text/plain, and activationLinkInfo adds the TTL).
 */

import { CopyOutlined } from '@ant-design/icons';
import { Button, Modal, Typography } from 'antd';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useCopy } from '@/components/users/use-copy';

export interface ActivationLinkDialogProps {
  open: boolean;
  /** The plain activation link string. */
  link?: string;
  /** Link time-to-live in milliseconds (rendered as a human duration). */
  ttlMs?: number;
  onClose: () => void;
}

const UNIT_KEYS = [
  { key: 'pages.users.activation.ttlDays', ms: 86_400_000 },
  { key: 'pages.users.activation.ttlHours', ms: 3_600_000 },
  { key: 'pages.users.activation.ttlMinutes', ms: 60_000 },
  { key: 'pages.users.activation.ttlSeconds', ms: 1_000 },
] as const;

/**
 * Human duration for the TTL, mirroring ui-ngx's milliseconds-to-time-string
 * pipe: the largest nonzero units joined with a space ("1 天 12 小时"). An
 * unknown TTL renders as '-' so the sentence still reads.
 */
export function formatTtl(
  ttlMs: number | undefined,
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
): string {
  if (ttlMs === undefined || ttlMs === null || Number.isNaN(ttlMs)) {
    return '-';
  }
  let rest = Math.max(0, Math.floor(ttlMs));
  const parts: string[] = [];
  for (const unit of UNIT_KEYS) {
    const value = Math.floor(rest / unit.ms);
    rest -= value * unit.ms;
    if (value > 0) {
      parts.push(
        formatMessage(
          { id: unit.key, defaultMessage: String(value) },
          {
            value,
          },
        ),
      );
    }
  }
  return parts.length > 0 ? parts.join(' ') : '-';
}

export function ActivationLinkDialog({
  open,
  link,
  ttlMs,
  onClose,
}: ActivationLinkDialogProps) {
  const { formatMessage } = useIntl();
  const copy = useCopy();
  const ttl = useMemo(
    () => formatTtl(ttlMs, formatMessage),
    [ttlMs, formatMessage],
  );

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.users.activation.title',
        defaultMessage: 'User activation link',
      })}
      width={640}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          {formatMessage({
            id: 'pages.users.activation.ok',
            defaultMessage: 'OK',
          })}
        </Button>
      }
    >
      <Typography.Paragraph>
        {formatMessage(
          {
            id: 'pages.users.activation.hint',
            defaultMessage:
              'In order to activate the user, use the following activation link (expires in {ttl}):',
          },
          { ttl },
        )}
      </Typography.Paragraph>
      <div className="flex items-center gap-2">
        <Typography.Paragraph
          code
          copyable={false}
          className="mb-0 flex-1 break-all whitespace-normal"
        >
          {link}
        </Typography.Paragraph>
        <Button
          type="text"
          icon={<CopyOutlined />}
          title={formatMessage({
            id: 'pages.users.activation.copy',
            defaultMessage: 'Copy activation link',
          })}
          onClick={() => link && void copy(link)}
        />
      </div>
    </Modal>
  );
}
