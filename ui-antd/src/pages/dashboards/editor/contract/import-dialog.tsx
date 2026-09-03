/**
 * Import-into-editor dialog — §3.8 导入 (v2 parity restoration). Two stages
 * inside one modal:
 *
 *  1. pick — antd Upload.Dragger (client-side parse only, `beforeUpload`
 *     returns false so nothing is POSTed); parse errors surface the
 *     DashboardImportError locale key via the house toast.
 *  2. confirm — replace-current-draft warning + imported digest (widget
 *     count) + the 补录 section listing every alias referenced by the
 *     imported widgets but absent from the imported entityAliases; per
 *     alias the user completes (name input → default device-type filter
 *     stub, adjustable later in the Aliases dialog) or skips (dangling
 *     reference kept, renders as empty data — the documented v1 fallback).
 *
 * On apply, the dialog hands the NORMALIZED configuration plus the created
 * alias stubs to `onApply`; the shell commits them as ONE
 * `session.write('import-dashboard', …)` group (undoable). Draft-only: no
 * query invalidation, no POST.
 */
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Modal, Space, Typography, Upload } from 'antd';
import { App as AntdApp } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';

import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { DashboardImportError } from '@/pages/dashboards/list/import-export';
import type {
  DashboardConfiguration,
  EntityAlias,
} from '@/types/tb/dashboard';
import {
  type MissingEntityAlias,
  createMissingAliasStub,
  findMissingEntityAliases,
  importDashboardIntoEditor,
} from './import-dashboard';

export interface ImportDashboardDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Commits the import: receives the normalized imported configuration and
   * the alias stubs created in the 补录 section (skipped aliases are simply
   * absent). One call = one undoable transaction group, by shell contract.
   */
  onApply: (
    configuration: DashboardConfiguration,
    createdAliases: EntityAlias[],
  ) => void;
}

interface ParsedImport {
  configuration: DashboardConfiguration;
  widgetCount: number;
  missing: MissingEntityAlias[];
}

interface AliasDecisions {
  created: Record<string, string>; // aliasId → chosen name
  skipped: string[];
}

export function ImportDashboardDialog({
  open,
  onClose,
  onApply,
}: ImportDashboardDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = AntdApp.useApp();
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [decisions, setDecisions] = useState<AliasDecisions>(
    () => ({ created: {}, skipped: [] }),
  );

  const t = (id: string, defaultMessage: string) => ({ id, defaultMessage });

  const reset = (): void => {
    setParsed(null);
    setDecisions({ created: {}, skipped: [] });
  };

  const handleFile = async (file: File): Promise<void> => {
    try {
      const imported = await importDashboardIntoEditor(file);
      const normalized = validateAndUpdateDashboard(imported);
      const configuration = normalized.configuration as DashboardConfiguration;
      setParsed({
        configuration,
        widgetCount: Object.keys(configuration.widgets ?? {}).length,
        missing: findMissingEntityAliases(configuration),
      });
      setDecisions({ created: {}, skipped: [] });
    } catch (error) {
      message.error(
        `${formatMessage({
          id: 'editor.dashboard.toolbar.importFailed',
          defaultMessage: 'Import failed',
        })}: ${
          error instanceof DashboardImportError
            ? formatMessage({ id: error.localeKey })
            : String(error instanceof Error ? error.message : error)
        }`,
      );
    }
  };

  const apply = (): void => {
    if (!parsed) {
      return;
    }
    const createdAliases = Object.entries(decisions.created).map(
      ([aliasId, name]) => createMissingAliasStub(aliasId, name),
    );
    onApply(parsed.configuration, createdAliases);
    reset();
    message.success(
      formatMessage(
        t(
          'editor.dashboard.contract.import.applied',
          'Imported (undoable)',
        ),
      ),
    );
  };

  const decide = (aliasId: string, mode: 'create' | 'skip'): void => {
    setDecisions((prev) => {
      const created = { ...prev.created };
      const skipped = prev.skipped.filter((id) => id !== aliasId);
      if (mode === 'create') {
        created[aliasId] = created[aliasId] || aliasId;
      } else {
        delete created[aliasId];
        skipped.push(aliasId);
      }
      return { created, skipped };
    });
  };

  return (
    <Modal
      open={open}
      title={formatMessage(
        t('editor.dashboard.contract.import.title', 'Import dashboard'),
      )}
      onCancel={() => {
        reset();
        onClose();
      }}
      destroyOnHidden
      maskClosable={false}
      footer={
        parsed ? (
          <Space>
            <Button
              data-testid="editor-import-cancel"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              {formatMessage({
                id: 'editor.common.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
            <Button
              type="primary"
              data-testid="editor-import-apply"
              onClick={apply}
            >
              {formatMessage(
                t('editor.dashboard.contract.import.apply', 'Import'),
              )}
            </Button>
          </Space>
        ) : null
      }
      data-testid="editor-import-dialog"
    >
      {parsed ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message={formatMessage(
              t(
                'editor.dashboard.contract.import.confirmTitle',
                'Confirm import',
              ),
            )}
            description={formatMessage(
              t(
                'editor.dashboard.contract.import.confirmText',
                'The imported content replaces the current draft; it is one undo group and can be restored with undo.',
              ),
            )}
          />
          <Typography.Text data-testid="editor-import-widget-count">
            {formatMessage(
              t(
                'editor.dashboard.contract.import.widgetCount',
                '{count} widget(s)',
              ),
              { count: parsed.widgetCount },
            )}
          </Typography.Text>
          {parsed.missing.length > 0 ? (
            <div data-testid="editor-import-missing-aliases">
              <Typography.Text>
                {formatMessage(
                  t(
                    'editor.dashboard.contract.import.missingAliases',
                    'The imported widgets reference {count} undefined entity aliases — complete or skip them:',
                  ),
                  { count: parsed.missing.length },
                )}
              </Typography.Text>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                {formatMessage(
                  t(
                    'editor.dashboard.contract.import.defaultFilterNote',
                    'Completed aliases default to a device-type filter and can be adjusted later in the Aliases dialog.',
                  ),
                )}
              </Typography.Paragraph>
              {parsed.missing.map(({ aliasId, widgetIds }) => (
                <div
                  key={aliasId}
                  style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                  data-testid={`editor-import-alias-${aliasId}`}
                >
                  {decisions.skipped.includes(aliasId) ? (
                    <Typography.Text type="secondary" delete>
                      {aliasId} · {widgetIds.length}
                    </Typography.Text>
                  ) : (
                    <Input
                      size="small"
                      value={decisions.created[aliasId] ?? aliasId}
                      addonBefore={formatMessage(
                        t(
                          'editor.dashboard.contract.import.aliasNameLabel',
                          'Alias name',
                        ),
                      )}
                      onChange={(event) =>
                        setDecisions((prev) => ({
                          ...prev,
                          created: {
                            ...prev.created,
                            [aliasId]: event.target.value,
                          },
                        }))
                      }
                      data-testid={`editor-import-alias-name-${aliasId}`}
                    />
                  )}
                  {decisions.skipped.includes(aliasId) ? (
                    <Button
                      size="small"
                      data-testid={`editor-import-alias-create-${aliasId}`}
                      onClick={() => decide(aliasId, 'create')}
                    >
                      {formatMessage(
                        t(
                          'editor.dashboard.contract.import.create',
                          'Complete',
                        ),
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      data-testid={`editor-import-alias-skip-${aliasId}`}
                      onClick={() => decide(aliasId, 'skip')}
                    >
                      {formatMessage(
                        t('editor.dashboard.contract.import.skip', 'Skip'),
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </Space>
      ) : (
        <Upload.Dragger
          accept="application/json,.json"
          maxCount={1}
          showUploadList={false}
          data-testid="editor-import-dragger"
          beforeUpload={(file) => {
            void handleFile(file);
            return false;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text" data-testid="editor-import-pick-hint">
            {formatMessage(
              t(
                'editor.dashboard.contract.import.pickHint',
                'Click or drag a dashboard JSON file here',
              ),
            )}
          </p>
        </Upload.Dragger>
      )}
    </Modal>
  );
}
