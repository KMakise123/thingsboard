/**
 * MultipleGalleryImageInput — controlled ordered image list (M11 wave-2C,
 * spec §3.8; ui-ngx multiple-gallery-image-input.component.ts parity):
 *
 *   value: string[] of `tb-image;…` links (plain URLs pass through)
 *
 * Add from the gallery picker or a plain link; remove per item; reorder
 * with up/down moves (the fork's equivalent of upstream's drag-drop — no
 * dnd dependency). Emits the prefixed array in list order.
 */
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  LinkOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { Button, Card, Input, Space, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { ImageGalleryPickerModal } from '@/components/images/gallery-image-input';
import {
  isImageResourceUrl,
  prependTbImagePrefix,
  removeTbImagePrefix,
} from '@/components/images/image-utils';
import { useImageObjectUrl } from '@/components/images/use-image-object-url';

function ItemPreview({ link }: { link: string }) {
  const needsAuth = isImageResourceUrl(link);
  const loaded = useImageObjectUrl(needsAuth ? link : undefined);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={needsAuth ? loaded : link}
      alt={link}
      data-testid="multiple-gallery-image-input-thumb"
      className="max-h-16 max-w-full object-contain"
    />
  );
}

export interface MultipleGalleryImageInputProps {
  /** Ordered links; each entry carries the `tb-image;` prefix on the wire. */
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
}

export function MultipleGalleryImageInput({
  value,
  onChange,
  disabled = false,
}: MultipleGalleryImageInputProps) {
  const { formatMessage } = useIntl();
  const links = (value ?? []).map(removeTbImagePrefix);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkEditing, setLinkEditing] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');

  const emit = (nextLinks: string[]) => {
    onChange?.(
      nextLinks
        .filter((entry) => entry.trim())
        .map((entry) => prependTbImagePrefix(entry)),
    );
  };

  const addLink = (link: string) => {
    emit([...links, link]);
  };

  const removeAt = (index: number) => {
    emit(links.filter((_entry, position) => position !== index));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= links.length) {
      return;
    }
    const next = [...links];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    emit(next);
  };

  return (
    <div
      className="flex flex-col gap-2"
      data-testid="multiple-gallery-image-input"
    >
      {links.map((link, index) => {
        // Occurrence-count key: stable across reorder, unique for repeated
        // links (biome noArrayIndexKey-safe — no array index in the key).
        const duplicatesBefore = links
          .slice(0, index)
          .filter((entry) => entry === link).length;
        return (
          <Card
            key={`${link}-${duplicatesBefore}`}
            size="small"
            data-testid="multiple-gallery-image-input-item"
            styles={{
              body: { display: 'flex', alignItems: 'center', gap: 12 },
            }}
          >
            <div className="flex h-16 w-24 items-center justify-center overflow-hidden">
              <ItemPreview link={link} />
            </div>
            <Typography.Text ellipsis className="flex-1" title={link}>
              {link}
            </Typography.Text>
            {!disabled ? (
              <Space size={4}>
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowUpOutlined />}
                  aria-label={formatMessage({
                    id: 'pages.resources.images.moveUp',
                    defaultMessage: 'Move up',
                  })}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                />
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowDownOutlined />}
                  aria-label={formatMessage({
                    id: 'pages.resources.images.moveDown',
                    defaultMessage: 'Move down',
                  })}
                  disabled={index === links.length - 1}
                  onClick={() => move(index, index + 1)}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={formatMessage({
                    id: 'pages.resources.images.removeImage',
                    defaultMessage: 'Remove image',
                  })}
                  onClick={() => removeAt(index)}
                />
              </Space>
            ) : null}
          </Card>
        );
      })}
      {!disabled ? (
        <div className="flex flex-col gap-2">
          <Space wrap>
            <Button
              size="small"
              icon={<PictureOutlined />}
              data-testid="multiple-gallery-image-input-add"
              onClick={() => setPickerOpen(true)}
            >
              {formatMessage({
                id: 'pages.resources.images.addFromGallery',
                defaultMessage: 'Add from gallery',
              })}
            </Button>
            <Button
              size="small"
              icon={<LinkOutlined />}
              data-testid="multiple-gallery-image-input-set-link"
              onClick={() => setLinkEditing(true)}
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
                data-testid="multiple-gallery-image-input-link-field"
                onChange={(event) => setLinkDraft(event.target.value)}
              />
              <Button
                type="primary"
                data-testid="multiple-gallery-image-input-link-apply"
                onClick={() => {
                  if (linkDraft.trim()) {
                    addLink(linkDraft.trim());
                  }
                  setLinkDraft('');
                  setLinkEditing(false);
                }}
              >
                {formatMessage({
                  id: 'pages.resources.images.applyLink',
                  defaultMessage: 'Apply',
                })}
              </Button>
              <Button
                data-testid="multiple-gallery-image-input-link-cancel"
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
        onPicked={(image) => addLink(image.link ?? '')}
      />
    </div>
  );
}
