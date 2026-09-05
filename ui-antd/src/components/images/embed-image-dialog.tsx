/**
 * EmbedImageDialog — the public-link / embed-code face (M11 wave-2C, spec
 * §3.2 embed 公链开关; ui-ngx embed-image-dialog.component.ts parity):
 * flipping the switch PUTs public/{isPublic} and, once public, reveals the
 * no-auth link plus an HTML embed snippet (both copyable). The Angular
 * template snippet upstream also offers is Angular-specific and has no
 * equivalent in this fork — the HTML embed code is the spec's 嵌入代码.
 */
import { Alert, Card, Modal, Switch, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { updateImagePublicStatus } from '@/services/tb/image';
import type { ImageResourceInfo } from '@/types/tb/image';

export interface EmbedImageDialogProps {
  open: boolean;
  image?: ImageResourceInfo;
  readonly: boolean;
  onClose: () => void;
  /** Fired on close when the public status changed (the gallery refreshes). */
  onUpdated: (image: ImageResourceInfo) => void;
}

export function EmbedImageDialog({
  open,
  image,
  readonly,
  onClose,
  onUpdated,
}: EmbedImageDialogProps) {
  const { formatMessage } = useIntl();
  const [current, setCurrent] = useState<ImageResourceInfo | undefined>(image);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent(image);
      setBusy(false);
      setError(undefined);
      setChanged(false);
    }
  }, [open, image]);

  const flipPublic = async (isPublic: boolean) => {
    if (!current) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const updated = await updateImagePublicStatus(current, isPublic);
      setCurrent(updated);
      setChanged(true);
    } catch (cause) {
      setError(serverErrorText(cause));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (changed && current) {
      onUpdated(current);
    }
    onClose();
  };

  const publicLink = current?.public ? current.publicLink : undefined;
  const embedCode = publicLink
    ? `<img src="${publicLink}" alt="${(current?.title ?? '').replace(/"/g, '&quot;')}" />`
    : undefined;

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.resources.images.embed',
        defaultMessage: 'Embed image',
      })}
      cancelText={formatMessage({
        id: 'pages.resources.images.close',
        defaultMessage: 'Close',
      })}
      footer={null}
      onCancel={close}
      destroyOnHidden
      data-testid="embed-image-dialog"
    >
      <div className="flex flex-col gap-4">
        {error && <Alert type="error" showIcon title={error} />}
        <div className="flex items-center justify-between gap-4">
          <Typography.Text>
            {formatMessage({
              id: 'pages.resources.images.publicLinkSwitch',
              defaultMessage: 'Public (available to unauthorized users)',
            })}
          </Typography.Text>
          <Switch
            checked={!!current?.public}
            disabled={readonly || busy}
            data-testid="embed-image-public-switch"
            onChange={(value) => void flipPublic(value)}
          />
        </div>
        {current?.public && publicLink ? (
          <>
            <Typography.Paragraph
              copyable={{ text: publicLink }}
              data-testid="embed-image-public-link"
            >
              <code className="break-all">{publicLink}</code>
            </Typography.Paragraph>
            <Card
              size="small"
              title={formatMessage({
                id: 'pages.resources.images.embedCode',
                defaultMessage: 'Embed code',
              })}
            >
              <Typography.Paragraph
                copyable={{ text: embedCode ?? '' }}
                data-testid="embed-image-embed-code"
                className="mb-0"
              >
                <code className="break-all">{embedCode}</code>
              </Typography.Paragraph>
            </Card>
          </>
        ) : (
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.resources.images.embedHint',
              defaultMessage:
                'Turn on the public switch to generate a no-login link and an embed code.',
            })}
          </Typography.Text>
        )}
      </div>
    </Modal>
  );
}
