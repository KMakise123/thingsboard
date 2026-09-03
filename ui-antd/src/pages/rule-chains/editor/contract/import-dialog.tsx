/**
 * Rule-chain import dialog (M8 wave-3 D; ImportDashboardModal form parity):
 * file select → client-side parse + legacy-migration report → a confirm
 * step that SPELLS OUT the migration result and the create semantics (task
 * 明示迁移结果与新建语义) → POST chain + POST metadata → onImported(chain)
 * (the list page navigates to the editor).
 */
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Descriptions, Modal, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import type { RuleChain } from '@/types/tb/rule-chain';

import {
  describeImport,
  importRuleChainFromFile,
  parseRuleChainImport,
  RuleChainImportError,
} from './import-export';

export interface ImportRuleChainDialogProps {
  open: boolean;
  onClose: () => void;
  /** Fires after chain + metadata saved; the caller navigates to the editor. */
  onImported: (chain: RuleChain) => void;
}

export function ImportRuleChainDialog({
  open,
  onClose,
  onImported,
}: ImportRuleChainDialogProps) {
  const { formatMessage } = useIntl();
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [report, setReport] = useState<ReturnType<
    typeof describeImport
  > | null>(null);

  useEffect(() => {
    if (open) {
      setFileText(null);
      setFileName('');
      setSubmitting(false);
      setError(undefined);
      setReport(null);
    }
  }, [open]);

  const parseSelected = async (selected: File) => {
    setError(undefined);
    setReport(null);
    const text = await selected.text();
    setFileText(text);
    setFileName(selected.name);
    try {
      const { data, bulkCount } = parseRuleChainImport(text);
      setReport({
        ...describeImport(data),
        ...(bulkCount !== undefined ? { bulkCount } : {}),
      });
    } catch (parseError) {
      if (parseError instanceof RuleChainImportError) {
        setError(formatMessage({ id: parseError.localeKey }));
      } else {
        setError(
          formatMessage({
            id: 'ruleChains.list.importParseError',
            defaultMessage: 'Failed to parse the file: not valid JSON.',
          }),
        );
      }
      setFileText(null);
    }
    return false;
  };

  const confirm = async () => {
    if (!fileText) {
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      // re-parse through the same pipeline the report used — one code path
      const { chain } = await importRuleChainFromFile(fileText);
      onImported(chain);
      onClose();
    } catch (importError) {
      setError(
        formatMessage(
          {
            id: 'ruleChains.list.importFailed',
            defaultMessage: 'Failed to import the rule chain: {error}',
          },
          {
            error:
              importError instanceof RuleChainImportError
                ? formatMessage({ id: importError.localeKey })
                : serverErrorText(importError),
          },
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'ruleChains.list.importTitle',
        defaultMessage: 'Import rule chain',
      })}
      destroyOnHidden
      maskClosable={false}
      confirmLoading={submitting}
      okText={formatMessage({
        id: 'ruleChains.list.importOk',
        defaultMessage: 'Import and open',
      })}
      cancelText={formatMessage({
        id: 'ruleChains.list.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{ disabled: !report }}
      onOk={() => void confirm()}
      onCancel={onClose}
      data-testid="rc-import-dialog"
    >
      <div className="flex flex-col gap-4">
        {error && <Alert type="error" showIcon message={error} />}
        <Upload.Dragger
          accept=".json,application/json"
          maxCount={1}
          showUploadList={!!fileText}
          fileList={
            fileText
              ? [{ uid: 'rulechain', name: fileName, status: 'done' }]
              : []
          }
          beforeUpload={(selected) => {
            void parseSelected(selected);
            return false;
          }}
          onRemove={() => {
            setFileText(null);
            setReport(null);
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <Typography.Text>
            {formatMessage({
              id: 'ruleChains.list.importDropHint',
              defaultMessage:
                'Drop a rule chain JSON file or click to select one.',
            })}
          </Typography.Text>
        </Upload.Dragger>

        {report && (
          <div data-testid="rc-import-confirm">
            <Typography.Text strong>
              {formatMessage({
                id: 'ruleChains.list.importConfirmTitle',
                defaultMessage: 'Confirm import',
              })}
            </Typography.Text>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
              {formatMessage({
                id: 'ruleChains.list.importConfirmIntro',
                defaultMessage:
                  'A NEW rule chain will be created from the file (no carried id/tenant/root flag):',
              })}
            </Typography.Paragraph>
            <Descriptions
              size="small"
              column={2}
              data-testid="rc-import-report"
            >
              <Descriptions.Item
                label={formatMessage({
                  id: 'ruleChains.list.importConfirmName',
                  defaultMessage: 'Name',
                })}
              >
                {report.name}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({
                  id: 'ruleChains.list.importConfirmNodes',
                  defaultMessage: 'Nodes',
                })}
              >
                {report.nodeCount}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({
                  id: 'ruleChains.list.importConfirmConnections',
                  defaultMessage: 'Connections',
                })}
              >
                {report.connectionCount}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({
                  id: 'ruleChains.list.importConfirmNotes',
                  defaultMessage: 'Notes',
                })}
              >
                {report.noteCount}
              </Descriptions.Item>
            </Descriptions>
            {report.migratedDebugNodes > 0 && (
              <Typography.Text type="warning" data-testid="rc-import-migrated">
                {formatMessage(
                  {
                    id: 'ruleChains.list.importConfirmMigrated',
                    defaultMessage:
                      'Legacy format migrated: debugMode nodes → debugSettings ({count}).',
                  },
                  { count: report.migratedDebugNodes },
                )}
              </Typography.Text>
            )}
            {report.migratedCrossChain > 0 && (
              <Typography.Text type="warning">
                {formatMessage(
                  {
                    id: 'ruleChains.list.importConfirmCrossChain',
                    defaultMessage:
                      '{count} cross-chain connection(s) migrated into Rule Chain Input node(s).',
                  },
                  { count: report.migratedCrossChain },
                )}
              </Typography.Text>
            )}
            {report.bulkCount !== undefined && report.bulkCount > 1 && (
              <Typography.Text type="warning">
                {formatMessage(
                  {
                    id: 'ruleChains.list.importBulkNote',
                    defaultMessage:
                      'The file is a bulk export ({count} chains); only the first one is imported.',
                  },
                  { count: report.bulkCount },
                )}
              </Typography.Text>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
