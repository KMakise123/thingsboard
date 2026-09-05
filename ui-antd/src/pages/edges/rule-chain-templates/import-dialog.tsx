/**
 * EDGE rule chain import dialog (M13 wave-5b template page). Runs the same
 * pipeline as the M8 CORE import (parse → legacy migrations → create-prepare
 * → POST /api/ruleChain → POST /api/ruleChain/metadata) with one override:
 * the created chain's type is forced to EDGE, so a CORE chain file cannot
 * silently land outside the template page's scope. The confirm step spells
 * out the create semantics (no carried identity) before anything is posted.
 */
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Descriptions, Modal, Typography, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { migrateRuleChainImport } from '@/core/rulechain/model';
import {
  describeImport,
  type ImportReport,
  parseRuleChainImport,
  prepareRuleChainImport,
  RuleChainImportError,
} from '@/pages/rule-chains/editor/contract/import-export';
import { saveRuleChain, saveRuleChainMetaData } from '@/services/tb/rule-chain';
import type { RuleChain } from '@/types/tb/rule-chain';

export interface ImportEdgeChainDialogProps {
  open: boolean;
  onClose: () => void;
  /** Fires after chain + metadata saved; the caller navigates to the canvas. */
  onImported: (chain: RuleChain) => void;
}

export function ImportEdgeChainDialog({
  open,
  onClose,
  onImported,
}: ImportEdgeChainDialogProps) {
  const { formatMessage } = useIntl();
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [report, setReport] = useState<ImportReport | null>(null);

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
      setFileText(null);
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
      // One code path with the report: parse → migrate → prepare, then the
      // EDGE override and the chain + metadata posts.
      const { data } = parseRuleChainImport(fileText);
      const prepared = prepareRuleChainImport(migrateRuleChainImport(data));
      const saved = await saveRuleChain({
        ...prepared.ruleChain,
        type: 'EDGE',
      });
      const chainId = saved.id?.id;
      if (!chainId) {
        throw new RuleChainImportError('ruleChains.list.importFailed');
      }
      await saveRuleChainMetaData({
        ...prepared.metadata,
        ruleChainId: saved.id,
      });
      onImported(saved);
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
      data-testid="rc-edge-import-dialog"
    >
      <div className="flex flex-col gap-4">
        {error && <Alert type="error" showIcon title={error} />}
        <Alert
          type="info"
          showIcon
          title={formatMessage({
            id: 'pages.edge.templates.importEdgeHint',
            defaultMessage: 'The imported chain is created as an EDGE chain.',
          })}
        />
        <Upload.Dragger
          accept=".json,application/json"
          maxCount={1}
          showUploadList={!!fileText}
          fileList={
            fileText
              ? [{ uid: 'edge-rulechain', name: fileName, status: 'done' }]
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
          <div data-testid="rc-edge-import-confirm">
            <Typography.Text strong>
              {formatMessage({
                id: 'ruleChains.list.importConfirmIntro',
                defaultMessage:
                  'A NEW rule chain will be created from the file (no carried id/tenant/root flag):',
              })}
            </Typography.Text>
            <Descriptions size="small" column={2}>
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
            </Descriptions>
          </div>
        )}
      </div>
    </Modal>
  );
}
