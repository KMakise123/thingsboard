/**
 * UploadImageDialog — gallery upload face (M11 wave-2C, spec §3.2/§3.3).
 * ui-ngx upload-image-dialog.component.ts parity:
 *
 * - multipart upload with the title prefilled from the file name (only
 *   while the user has not touched the field; the FULL name including the
 *   extension is what upstream fills);
 * - SCADA symbols: the owning page may pass `extractUploadTitle` (the
 *   page-scoped light SVG metadata reader) — its title overrides the file
 *   name prefill while untouched (upstream reads
 *   parseScadaSymbolMetadataFromContent; the full content-rewriting
 *   upload belongs to the editor wave 2D);
 * - the imageSubType part decides the gallery the upload lands in.
 */
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Form, Input, Modal, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { uploadImage } from '@/services/tb/image';
import type { ImageResourceInfo } from '@/types/tb/image';
import { ResourceSubType } from '@/types/tb/resource';

export interface UploadImageDialogProps {
  open: boolean;
  imageSubType: ResourceSubType.IMAGE | ResourceSubType.SCADA_SYMBOL;
  /**
   * Optional SVG metadata title reader (SCADA page passes the page-scoped
   * light parser). Undefined = file-name prefill only.
   */
  extractUploadTitle?: (file: File) => Promise<string | undefined>;
  onClose: () => void;
  /** Fired after a successful upload. */
  onUploaded: (image: ImageResourceInfo) => void;
}

export function UploadImageDialog({
  open,
  imageSubType,
  extractUploadTitle,
  onClose,
  onUploaded,
}: UploadImageDialogProps) {
  const { formatMessage } = useIntl();
  const [file, setFile] = useState<File | undefined>();
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const isScada = imageSubType === ResourceSubType.SCADA_SYMBOL;

  useEffect(() => {
    if (open) {
      setFile(undefined);
      setTitle('');
      setTitleTouched(false);
      setSubmitting(false);
      setError(undefined);
    }
  }, [open]);

  const selectFile = async (selected: File) => {
    setFile(selected);
    setError(undefined);
    if (!titleTouched) {
      // Upstream prefill: the full file name (extension included).
      setTitle(selected.name);
      if (isScada && extractUploadTitle) {
        const metadataTitle = await extractUploadTitle(selected);
        if (metadataTitle && !titleTouched) {
          setTitle(metadataTitle);
        }
      }
    }
  };

  const confirm = async () => {
    if (!file) {
      setError(
        formatMessage({
          id: 'pages.resources.images.uploadFileRequired',
          defaultMessage: 'Please select a file to upload.',
        }),
      );
      return;
    }
    if (!title.trim()) {
      setTitleTouched(true);
      setError(
        formatMessage({
          id: 'pages.resources.images.nameRequired',
          defaultMessage: 'Name is required.',
        }),
      );
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const saved = await uploadImage(file, title.trim(), imageSubType);
      onUploaded(saved);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const accept = isScada ? '.svg,image/svg+xml' : 'image/*';

  return (
    <Modal
      open={open}
      title={formatMessage(
        isScada
          ? {
              id: 'pages.resources.scadaSymbols.upload',
              defaultMessage: 'Upload SCADA symbol',
            }
          : {
              id: 'pages.resources.images.upload',
              defaultMessage: 'Upload image',
            },
      )}
      okText={formatMessage({
        id: 'pages.resources.images.upload',
        defaultMessage: 'Upload',
      })}
      cancelText={formatMessage({
        id: 'pages.resources.images.cancel',
        defaultMessage: 'Cancel',
      })}
      confirmLoading={submitting}
      onOk={() => void confirm()}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="upload-image-dialog"
    >
      <div className="flex flex-col gap-4">
        {error && <Alert type="error" showIcon title={error} />}
        <Form layout="vertical" component="div">
          <Form.Item
            label={formatMessage({
              id: 'pages.resources.images.fieldFile',
              defaultMessage: 'File',
            })}
            required
          >
            <Upload.Dragger
              accept={accept}
              maxCount={1}
              showUploadList={!!file}
              fileList={
                file
                  ? [{ uid: 'upload-image', name: file.name, status: 'done' }]
                  : []
              }
              beforeUpload={async (selected) => {
                await selectFile(selected);
                return false;
              }}
              onRemove={() => setFile(undefined)}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <Typography.Text>
                {formatMessage({
                  id: 'pages.resources.images.uploadHint',
                  defaultMessage: 'Click or drag a file here to upload.',
                })}
              </Typography.Text>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.resources.images.fieldTitle',
              defaultMessage: 'Title',
            })}
            required
          >
            <Input
              value={title}
              data-testid="upload-image-title"
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleTouched(true);
              }}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
