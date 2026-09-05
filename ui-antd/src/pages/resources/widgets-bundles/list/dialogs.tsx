/**
 * Create/edit + export + import dialogs of the widgets-bundles list page
 * (M11 wave 1B, ui-ngx widgets-bundle-dialog + import-export parity).
 *
 * The bundle edit face covers title / description / image URL. The image
 * field is a plain URL passthrough for now — the real picker
 * (gallery-image-input) belongs to the images wave (2C) and replaces this
 * input when it lands (registered in the wave report).
 *
 * Export mirrors the upstream prompt: the include-widgets checkbox picks
 * the full-details channel vs the by-reference fqn channel.
 */
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Checkbox, Form, Input, Modal, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import type { WidgetsBundle } from '@/types/tb/widgets-bundle';
import {
  importWidgetsBundleFromFile,
  WidgetsBundleImportError,
} from './import-export';

export interface BundleEditDialogProps {
  open: boolean;
  /** undefined = create; otherwise the bundle being edited. */
  bundle?: WidgetsBundle;
  confirmLoading?: boolean;
  onOk: (values: {
    title: string;
    description?: string;
    image?: string;
  }) => void;
  onClose: () => void;
}

interface BundleFormValues {
  title: string;
  description?: string;
  image?: string;
}

export function BundleEditDialog({
  open,
  bundle,
  confirmLoading,
  onOk,
  onClose,
}: BundleEditDialogProps) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<BundleFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        title: bundle?.title,
        description: bundle?.description,
        image: bundle?.image,
      });
    }
  }, [open, bundle, form]);

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: bundle
          ? 'pages.resources.widgetsBundles.editTitle'
          : 'pages.resources.widgetsBundles.createTitle',
        defaultMessage: bundle
          ? 'Edit widgets bundle'
          : 'Create new widgets bundle',
      })}
      okText={formatMessage({
        id: 'pages.resources.widgetsBundles.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.resources.widgetsBundles.cancel',
        defaultMessage: 'Cancel',
      })}
      confirmLoading={confirmLoading}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
      data-testid="widgets-bundle-edit-dialog"
    >
      <Form<BundleFormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => onOk(values)}
      >
        <Form.Item
          name="title"
          label={formatMessage({
            id: 'pages.resources.widgetsBundles.title',
            defaultMessage: 'Title',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.resources.widgetsBundles.titleRequired',
                defaultMessage: 'Title is required.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="description"
          label={formatMessage({
            id: 'pages.resources.widgetsBundles.description',
            defaultMessage: 'Description',
          })}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          name="image"
          label={formatMessage({
            id: 'pages.resources.widgetsBundles.image',
            defaultMessage: 'Image URL',
          })}
          extra={formatMessage({
            id: 'pages.resources.widgetsBundles.imageHint',
            defaultMessage:
              'Interim plain-URL input — the gallery picker lands with the images wave.',
          })}
        >
          <Input allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export interface BundleExportDialogProps {
  open: boolean;
  bundleTitle: string;
  onClose: () => void;
  onExport: (includeWidgets: boolean) => Promise<void>;
}

export function BundleExportDialog({
  open,
  bundleTitle,
  onClose,
  onExport,
}: BundleExportDialogProps) {
  const { formatMessage } = useIntl();
  const [includeWidgets, setIncludeWidgets] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setIncludeWidgets(true);
      setBusy(false);
      setError(undefined);
    }
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onExport(includeWidgets);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.resources.widgetsBundles.exportTitle',
        defaultMessage: 'Export widgets bundle',
      })}
      okText={formatMessage({
        id: 'pages.resources.widgetsBundles.exportOk',
        defaultMessage: 'Export',
      })}
      confirmLoading={busy}
      onOk={() => void confirm()}
      onCancel={onClose}
      destroyOnHidden
      data-testid="widgets-bundle-export-dialog"
    >
      <div className="flex flex-col gap-4">
        {error && <Alert type="error" showIcon title={error} />}
        <Typography.Text>
          {formatMessage(
            {
              id: 'pages.resources.widgetsBundles.exportPrompt',
              defaultMessage: "Export the widgets bundle '{title}'?",
            },
            { title: bundleTitle },
          )}
        </Typography.Text>
        <Checkbox
          checked={includeWidgets}
          onChange={(event) => setIncludeWidgets(event.target.checked)}
          data-testid="widgets-bundle-export-include-widgets"
        >
          {formatMessage({
            id: 'pages.resources.widgetsBundles.exportIncludeWidgets',
            defaultMessage:
              'Include bundle widgets (full types; unchecked exports fqn references only)',
          })}
        </Checkbox>
      </div>
    </Modal>
  );
}

export interface ImportWidgetsBundleModalProps {
  open: boolean;
  onClose: () => void;
  /** Fires after the bundle saved (list invalidates + success toast). */
  onImported: (title: string) => void;
}

interface SelectedFile {
  name: string;
  file: File;
}

export function ImportWidgetsBundleModal({
  open,
  onClose,
  onImported,
}: ImportWidgetsBundleModalProps) {
  const { formatMessage } = useIntl();
  const [file, setFile] = useState<SelectedFile>();
  const [submitting, setSubmitting] = useState(false);
  const [importError, setImportError] = useState<string>();

  useEffect(() => {
    if (open) {
      setFile(undefined);
      setSubmitting(false);
      setImportError(undefined);
    }
  }, [open]);

  const confirm = async () => {
    if (!file) {
      return;
    }
    setSubmitting(true);
    setImportError(undefined);
    try {
      const saved = await importWidgetsBundleFromFile(file.file);
      onImported(saved.title);
      onClose();
    } catch (error) {
      if (error instanceof WidgetsBundleImportError) {
        setImportError(
          formatMessage({
            id: error.localeKey,
            defaultMessage:
              'Invalid widgets bundle file: the bundle title or a widget channel is missing.',
          }),
        );
      } else {
        setImportError(
          formatMessage(
            {
              id: 'pages.resources.widgetsBundles.importFailed',
              defaultMessage: 'Failed to import the widgets bundle: {error}',
            },
            {
              error: error instanceof Error ? error.message : String(error),
            },
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.resources.widgetsBundles.importTitle',
        defaultMessage: 'Import widgets bundle',
      })}
      destroyOnHidden
      maskClosable={false}
      confirmLoading={submitting}
      okText={formatMessage({
        id: 'pages.resources.widgetsBundles.importOk',
        defaultMessage: 'Import',
      })}
      cancelText={formatMessage({
        id: 'pages.resources.widgetsBundles.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{ disabled: !file }}
      onOk={() => void confirm()}
      onCancel={onClose}
      data-testid="widgets-bundle-import-dialog"
    >
      <div className="flex flex-col gap-4">
        {importError && <Alert type="error" showIcon title={importError} />}
        <Upload.Dragger
          accept=".json,application/json"
          maxCount={1}
          showUploadList={!!file}
          fileList={
            file
              ? [{ uid: 'widgetsBundle', name: file.name, status: 'done' }]
              : []
          }
          beforeUpload={async (selected) => {
            setFile({ name: selected.name, file: selected });
            return false;
          }}
          onRemove={() => setFile(undefined)}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <Typography.Text>
            {formatMessage({
              id: 'pages.resources.widgetsBundles.importDropHint',
              defaultMessage:
                'Drop a widgets bundle JSON file or click to select one.',
            })}
          </Typography.Text>
        </Upload.Dragger>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.resources.widgetsBundles.importHint',
            defaultMessage:
              'Carried widget types import through the updateExistingByFqn channel; the bundle membership is rebuilt from types + fqn references.',
          })}
        </Typography.Text>
      </div>
    </Modal>
  );
}
