/**
 * Export / import dialogs of the widget-types list page (M11 wave 1B).
 *
 * Export: upstream opens an export prompt with an `includeResources`
 * checkbox (import-export.service openExportDialog) — a self-contained file
 * carries the referenced JS/CSS resources as base64 payloads. The dialog is
 * count-agnostic: one selected type → `{name}.json`, several → zip.
 * Import: file select → local validation (name + descriptor) → POST with
 * `updateExistingByFqn=true` (upsert by fqn — same-fqn files UPDATE in
 * place, producing the list's "two rows after rename-import" walkthrough
 * semantics).
 */
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Checkbox, Modal, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  importWidgetTypeFromFile,
  WidgetTypeImportError,
} from './import-export';

export interface ExportWidgetTypesDialogProps {
  open: boolean;
  /** 0 → all-columns export is not offered; caller only opens with ≥ 1. */
  count: number;
  onClose: () => void;
  /** Runs the export with the picked includeResources choice. */
  onExport: (includeResources: boolean) => Promise<void>;
}

export function ExportWidgetTypesDialog({
  open,
  count,
  onClose,
  onExport,
}: ExportWidgetTypesDialogProps) {
  const { formatMessage } = useIntl();
  const [includeResources, setIncludeResources] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setIncludeResources(true);
      setBusy(false);
      setError(undefined);
    }
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await onExport(includeResources);
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
        id: 'pages.resources.widgetTypes.exportTitle',
        defaultMessage: 'Export widget type',
      })}
      okText={formatMessage({
        id: 'pages.resources.widgetTypes.exportOk',
        defaultMessage: 'Export',
      })}
      confirmLoading={busy}
      onOk={() => void confirm()}
      onCancel={onClose}
      destroyOnHidden
      data-testid="widget-export-dialog"
    >
      <div className="flex flex-col gap-4">
        {error && <Alert type="error" showIcon title={error} />}
        <Typography.Text>
          {formatMessage(
            {
              id: 'pages.resources.widgetTypes.exportPrompt',
              defaultMessage:
                'Export {count, plural, =1 {1 widget type} other {# widget types}} to a downloadable file?',
            },
            { count },
          )}
        </Typography.Text>
        <Checkbox
          checked={includeResources}
          onChange={(event) => setIncludeResources(event.target.checked)}
          data-testid="widget-export-include-resources"
        >
          {formatMessage({
            id: 'pages.resources.widgetTypes.exportIncludeResources',
            defaultMessage: 'Include resources (self-contained export)',
          })}
        </Checkbox>
      </div>
    </Modal>
  );
}

export interface ImportWidgetTypeModalProps {
  open: boolean;
  onClose: () => void;
  /** Fires after the widget type saved (list invalidates + success toast). */
  onImported: (name: string) => void;
}

interface SelectedFile {
  name: string;
  file: File;
}

export function ImportWidgetTypeModal({
  open,
  onClose,
  onImported,
}: ImportWidgetTypeModalProps) {
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
      const saved = await importWidgetTypeFromFile(file.file);
      onImported(saved.name ?? file.name);
      onClose();
    } catch (error) {
      if (error instanceof WidgetTypeImportError) {
        setImportError(
          formatMessage({
            id: error.localeKey,
            defaultMessage:
              'Invalid widget file: the name or descriptor is missing.',
          }),
        );
      } else {
        setImportError(
          formatMessage(
            {
              id: 'pages.resources.widgetTypes.importFailed',
              defaultMessage: 'Failed to import the widget type: {error}',
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
        id: 'pages.resources.widgetTypes.importTitle',
        defaultMessage: 'Import widget type',
      })}
      destroyOnHidden
      maskClosable={false}
      confirmLoading={submitting}
      okText={formatMessage({
        id: 'pages.resources.widgetTypes.importOk',
        defaultMessage: 'Import',
      })}
      cancelText={formatMessage({
        id: 'pages.resources.widgetTypes.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{ disabled: !file }}
      onOk={() => void confirm()}
      onCancel={onClose}
      data-testid="widget-import-dialog"
    >
      <div className="flex flex-col gap-4">
        {importError && <Alert type="error" showIcon title={importError} />}
        <Upload.Dragger
          accept=".json,application/json"
          maxCount={1}
          showUploadList={!!file}
          fileList={
            file ? [{ uid: 'widgetType', name: file.name, status: 'done' }] : []
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
              id: 'pages.resources.widgetTypes.importDropHint',
              defaultMessage:
                'Drop a widget type JSON file or click to select one.',
            })}
          </Typography.Text>
        </Upload.Dragger>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.resources.widgetTypes.importHint',
            defaultMessage:
              'A file whose fqn matches an existing type UPDATES that type (updateExistingByFqn); otherwise a new type is created.',
          })}
        </Typography.Text>
      </div>
    </Modal>
  );
}
