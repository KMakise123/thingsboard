/**
 * GalleryImageInput — controlled image picker (M11 wave-2C, spec §3.8;
 * ui-ngx gallery-image-input.component.ts parity, scoped to this wave's
 * contract):
 *
 *   value: 'tb-image;/api/images/{scope}/{key}' | external URL | '' (empty)
 *
 * Render: thumbnail preview (resource links resolve through the
 * authenticated blob loader; base64/external links render directly —
 * upstream detectLinkType parity), clear, browse-from-gallery (the shared
 * gallery in selection mode inside a Modal), and a plain-link input.
 * Registered in spec §3.8 for later wiring into v1 pages (device profile
 * background image etc.) and the SCADA preview; M11 does not rewire v1.
 */
import {
  DeleteOutlined,
  LinkOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { Button, Card, Input, Modal, Space, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  isImageResourceUrl,
  prependTbImagePrefix,
  removeTbImagePrefix,
} from '@/components/images/image-utils';
import { useImageObjectUrl } from '@/components/images/use-image-object-url';
import type { ImageResourceInfo } from '@/types/tb/image';
import { ResourceSubType } from '@/types/tb/resource';
import { ImageGallery } from './image-gallery';

/** Gallery-in-a-Modal picker shared by the single/multiple inputs. */
export function ImageGalleryPickerModal({
  open,
  onClose,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  onPicked: (image: ImageResourceInfo) => void;
}) {
  const { formatMessage } = useIntl();
  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.resources.images.galleryTitle',
        defaultMessage: 'Image gallery',
      })}
      footer={null}
      width={960}
      onCancel={onClose}
      destroyOnHidden
      data-testid="image-gallery-picker"
    >
      <ImageGallery
        selectionMode
        imageSubType={ResourceSubType.IMAGE}
        onImageSelected={(image) => {
          onPicked(image);
          onClose();
        }}
      />
    </Modal>
  );
}

/** Thumbnail that picks the right src per link type. */
function LinkPreview({ link, alt }: { link: string; alt: string }) {
  const needsAuth = isImageResourceUrl(link);
  const loaded = useImageObjectUrl(needsAuth ? link : undefined);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={needsAuth ? loaded : link}
      alt={alt}
      data-testid="gallery-image-input-thumb"
      className="max-h-28 max-w-full object-contain"
    />
  );
}

export interface GalleryImageInputProps {
  /** `tb-image;…` prefixed link, a plain URL, or '' / undefined. */
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function GalleryImageInput({
  value,
  onChange,
  disabled = false,
}: GalleryImageInputProps) {
  const { formatMessage } = useIntl();
  const link = removeTbImagePrefix(value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkEditing, setLinkEditing] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');

  const emit = (nextLink: string) => {
    onChange?.(nextLink ? prependTbImagePrefix(nextLink) : '');
  };

  return (
    <Card
      size="small"
      data-testid="gallery-image-input"
      styles={{ body: { display: 'flex', flexDirection: 'column', gap: 12 } }}
    >
      <div className="flex h-28 items-center justify-center">
        {link ? (
          <LinkPreview link={link} alt={link} />
        ) : (
          <Space
            size={6}
            className="opacity-60"
            data-testid="gallery-image-input-empty"
          >
            <PictureOutlined />
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.resources.images.noImage',
                defaultMessage: 'No image',
              })}
            </Typography.Text>
          </Space>
        )}
      </div>
      {!disabled ? (
        <div className="flex flex-col gap-2">
          <Space wrap>
            {link ? (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                data-testid="gallery-image-input-clear"
                onClick={() => emit('')}
              >
                {formatMessage({
                  id: 'pages.resources.images.clearImage',
                  defaultMessage: 'Clear image',
                })}
              </Button>
            ) : null}
            <Button
              size="small"
              icon={<PictureOutlined />}
              data-testid="gallery-image-input-browse"
              onClick={() => setPickerOpen(true)}
            >
              {formatMessage({
                id: 'pages.resources.images.browseFromGallery',
                defaultMessage: 'Browse from gallery',
              })}
            </Button>
            <Button
              size="small"
              icon={<LinkOutlined />}
              data-testid="gallery-image-input-set-link"
              onClick={() => {
                setLinkDraft(link);
                setLinkEditing(true);
              }}
            >
              {formatMessage({
                id: 'pages.resources.images.setLink',
                defaultMessage: 'Set link',
              })}
            </Button>
          </Space>
          {linkEditing ? (
            <Space.Compact className="w-full">
              <Input
                value={linkDraft}
                placeholder={formatMessage({
                  id: 'pages.resources.images.imageLink',
                  defaultMessage: 'Image link',
                })}
                data-testid="gallery-image-input-link-field"
                onChange={(event) => setLinkDraft(event.target.value)}
              />
              <Button
                type="primary"
                data-testid="gallery-image-input-link-apply"
                onClick={() => {
                  emit(linkDraft.trim());
                  setLinkEditing(false);
                }}
              >
                {formatMessage({
                  id: 'pages.resources.images.applyLink',
                  defaultMessage: 'Apply',
                })}
              </Button>
              <Button
                data-testid="gallery-image-input-link-cancel"
                onClick={() => setLinkEditing(false)}
              >
                {formatMessage({
                  id: 'pages.resources.images.cancel',
                  defaultMessage: 'Cancel',
                })}
              </Button>
            </Space.Compact>
          ) : null}
        </div>
      ) : null}
      <ImageGalleryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={(image) => emit(image.link ?? '')}
      />
    </Card>
  );
}
