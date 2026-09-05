/**
 * ImageDetailsDialog — the "view + edit info" face (M11 wave-2C, spec §3.2
 * 信息编辑（title）+ 查看（原始尺寸/链接）; ui-ngx image-dialog.component.ts
 * parity): the full-size authenticated preview plus the metadata rows
 * (media type / resolution / size) and the editable title. System rows are
 * read-only for TENANT admins (§1).
 */
import { Alert, Card, Descriptions, Form, Input, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  formatFileSize,
  formatResolution,
} from '@/components/images/image-utils';
import { useImageObjectUrl } from '@/components/images/use-image-object-url';
import { updateImageInfo } from '@/services/tb/image';
import type { ImageResourceInfo } from '@/types/tb/image';

export interface ImageDetailsDialogProps {
  open: boolean;
  image?: ImageResourceInfo;
  readonly: boolean;
  onClose: () => void;
  /** Fired after a successful info save (the gallery refreshes). */
  onSaved: (image: ImageResourceInfo) => void;
}

export function ImageDetailsDialog({
  open,
  image,
  readonly,
  onClose,
  onSaved,
}: ImageDetailsDialogProps) {
  const { formatMessage } = useIntl();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const previewUrl = useImageObjectUrl(image?.link);

  useEffect(() => {
    if (open) {
      setTitle(image?.title ?? '');
      setSaving(false);
      setError(undefined);
    }
  }, [open, image]);

  const dirty = title !== (image?.title ?? '') && title.trim().length > 0;

  const confirm = async () => {
    if (!image) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const saved = await updateImageInfo({ ...image, title: title.trim() });
      onSaved(saved);
      onClose();
    } catch (cause) {
      setError(serverErrorText(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.resources.images.detailsTitle',
        defaultMessage: 'Image details',
      })}
      okText={formatMessage({
        id: 'pages.resources.images.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.resources.images.cancel',
        defaultMessage: 'Cancel',
      })}
      confirmLoading={saving}
      okButtonProps={{ disabled: readonly || !dirty }}
      onOk={() => void confirm()}
      onCancel={onClose}
      destroyOnHidden
      data-testid="image-details-dialog"
    >
      <div className="flex flex-col gap-4">
        {error && <Alert type="error" showIcon title={error} />}
        {/* Card keeps the preview on antd tokens (M11 §3.7: no raw colors). */}
        <Card
          size="small"
          styles={{ body: { display: 'flex', justifyContent: 'center' } }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={image?.title ?? ''}
            data-testid="image-details-preview"
            className="max-h-48 max-w-full object-contain"
          />
        </Card>
        <Descriptions
          size="small"
          column={1}
          items={[
            {
              key: 'mediaType',
              label: formatMessage({
                id: 'pages.resources.images.mediaType',
                defaultMessage: 'Media type',
              }),
              children: image?.descriptor?.mediaType ?? '-',
            },
            {
              key: 'resolution',
              label: formatMessage({
                id: 'pages.resources.images.resolution',
                defaultMessage: 'Resolution',
              }),
              children: formatResolution(image?.descriptor),
            },
            {
              key: 'size',
              label: formatMessage({
                id: 'pages.resources.images.size',
                defaultMessage: 'Size',
              }),
              children: formatFileSize(image?.descriptor?.size),
            },
            {
              key: 'link',
              label: formatMessage({
                id: 'pages.resources.images.link',
                defaultMessage: 'Link',
              }),
              children: <code className="break-all">{image?.link ?? '-'}</code>,
            },
          ]}
        />
        <Form layout="vertical" component="div">
          <Form.Item
            label={formatMessage({
              id: 'pages.resources.images.fieldTitle',
              defaultMessage: 'Title',
            })}
            required
          >
            <Input
              value={title}
              disabled={readonly}
              data-testid="image-details-title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
