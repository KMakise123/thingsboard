/**
 * Dashboard import dialog (brief §3): file select -> local JSON validation
 * (title + configuration) -> POST /api/dashboard -> refresh + toast, owned
 * by the caller through onImported. v1 does not open the missing-entity-
 * aliases dialog (registered omission — the alias resolver falls back to an
 * empty dataset for unresolved aliases).
 */
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Modal, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { DashboardImportError, importDashboardFromFile } from './import-export';

export interface ImportDashboardModalProps {
  open: boolean;
  onClose: () => void;
  /** Fires after the dashboard saved (list invalidates + success toast). */
  onImported: (title: string) => void;
}

interface SelectedFile {
  name: string;
  file: File;
}

export function ImportDashboardModal({
  open,
  onClose,
  onImported,
}: ImportDashboardModalProps) {
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
      const saved = await importDashboardFromFile(file.file);
      onImported(saved.title);
      onClose();
    } catch (error) {
      if (error instanceof DashboardImportError) {
        setImportError(
          formatMessage({
            id: error.localeKey,
            defaultMessage:
              'Invalid dashboard file: the title or configuration is missing.',
          }),
        );
      } else {
        setImportError(
          formatMessage(
            {
              id: 'dashboards.list.importFailed',
              defaultMessage: 'Failed to import the dashboard: {error}',
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
        id: 'dashboards.list.importTitle',
        defaultMessage: 'Import dashboard',
      })}
      destroyOnHidden
      maskClosable={false}
      confirmLoading={submitting}
      okText={formatMessage({
        id: 'dashboards.list.importOk',
        defaultMessage: 'Import',
      })}
      cancelText={formatMessage({
        id: 'dashboards.list.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{ disabled: !file }}
      onOk={() => void confirm()}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-4">
        {importError && <Alert type="error" showIcon title={importError} />}
        <Upload.Dragger
          accept=".json,application/json"
          maxCount={1}
          showUploadList={!!file}
          fileList={
            file ? [{ uid: 'dashboard', name: file.name, status: 'done' }] : []
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
              id: 'dashboards.list.importDropHint',
              defaultMessage:
                'Drop a dashboard JSON file or click to select one.',
            })}
          </Typography.Text>
        </Upload.Dragger>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'dashboards.list.importHint',
            defaultMessage:
              'The file must carry a title and a configuration. Missing entity aliases are imported as-is (no alias assignment in v1).',
          })}
        </Typography.Text>
      </div>
    </Modal>
  );
}
