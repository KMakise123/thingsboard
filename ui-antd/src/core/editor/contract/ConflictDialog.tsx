/**
 * 409 three-option conflict dialog — §3.8 / ADR 0004 §2 (409 = 显式三选项
 * 对话框). Generic core hoisted from pages/dashboards/editor/contract in M8
 * wave F: the server side is rendered from a minimal display descriptor
 * (title + version) so any editor suite can bind it. The dashboard shim
 * (pages/dashboards/editor/contract/ConflictDialog.tsx) keeps the frozen
 * `serverDashboard` prop name and maps Dashboard onto the descriptor.
 *
 * Props are FROZEN: {open, serverEntity, onLoadServer, onOverwrite,
 * onExportLocal, onClose}; the dialog renders the real decision content and
 * the shell owns the async flows behind the three callbacks.
 *
 * Content honesty (占位三态 rule): the server side shows title + version
 * when known, or an explicit "server state unknown" alert when the
 * conflict-time GET failed (serverEntity null — only Option C remains fully
 * safe). The local side is described as an unsaved dirty draft: the dialog
 * only ever opens on a conflicted, dirty save, so the statement is exact.
 *
 * i18n note: the message ids stay under `editor.dashboard.contract.conflict`
 * (they were introduced by the dashboard editor and are now shared copy for
 * every editor suite — moving them would churn frozen locale keys).
 */
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { useIntl } from 'react-intl';

/** Minimal server-entity display descriptor used by the dialog. */
export interface ConflictServerEntityDescriptor {
  title?: string;
  version?: number;
}

export interface ConflictDialogProps {
  open: boolean;
  /** Server entity observed at conflict time (null = GET failed). */
  serverEntity?: ConflictServerEntityDescriptor | null;
  onLoadServer: () => void;
  onOverwrite: () => void;
  onExportLocal: () => void;
  onClose: () => void;
}

export function ConflictDialog({
  open,
  serverEntity,
  onLoadServer,
  onOverwrite,
  onExportLocal,
  onClose,
}: ConflictDialogProps) {
  const { formatMessage } = useIntl();
  const t = (id: string, defaultMessage: string) => ({ id, defaultMessage });

  const options = [
    {
      key: 'loadServer',
      testId: 'editor-conflict-load-server',
      primary: true,
      danger: false,
      label: formatMessage(
        t(
          'editor.dashboard.contract.conflict.loadServer',
          'Load server version',
        ),
      ),
      text: formatMessage(
        t(
          'editor.dashboard.contract.conflict.loadServerText',
          'Discard the local draft and continue editing the server version.',
        ),
      ),
      onClick: onLoadServer,
      disabled: false,
    },
    {
      key: 'overwrite',
      testId: 'editor-conflict-overwrite',
      primary: false,
      danger: true,
      label: formatMessage(
        t(
          'editor.dashboard.contract.conflict.overwrite',
          'Overwrite with mine',
        ),
      ),
      text: formatMessage(
        t(
          'editor.dashboard.contract.conflict.overwriteText',
          'Fetch the latest server version, then force-save the local draft.',
        ),
      ),
      onClick: onOverwrite,
      disabled: false,
    },
    {
      key: 'exportLocal',
      testId: 'editor-conflict-export-local',
      primary: false,
      danger: false,
      label: formatMessage(
        t(
          'editor.dashboard.contract.conflict.exportLocal',
          'Export local JSON and give up',
        ),
      ),
      text: formatMessage(
        t(
          'editor.dashboard.contract.conflict.exportLocalText',
          'Download the local draft JSON and return to the read-only view.',
        ),
      ),
      onClick: onExportLocal,
      disabled: false,
    },
  ];

  return (
    <Modal
      open={open}
      title={formatMessage(
        t('editor.dashboard.conflict.title', 'Save conflict'),
      )}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="editor-conflict-dialog"
    >
      <Typography.Paragraph type="secondary">
        {formatMessage(
          t(
            'editor.dashboard.contract.conflict.intro',
            'The content on the server was changed by someone else; choose how to handle your local version.',
          ),
        )}
      </Typography.Paragraph>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div data-testid="editor-conflict-server">
          {serverEntity ? (
            <Typography.Text>
              {formatMessage(
                t(
                  'editor.dashboard.contract.conflict.serverSection',
                  'Server latest version',
                ),
              )}
              {': '}
              <Typography.Text strong>{serverEntity.title}</Typography.Text>
              {typeof serverEntity.version === 'number'
                ? ` (v${serverEntity.version})`
                : ''}
            </Typography.Text>
          ) : (
            <Alert
              type="warning"
              showIcon
              message={formatMessage(
                t(
                  'editor.dashboard.contract.conflict.serverUnknown',
                  'The latest server version could not be fetched; only the local draft can be exported.',
                ),
              )}
            />
          )}
        </div>
        <Typography.Text data-testid="editor-conflict-local">
          {formatMessage(
            t('editor.dashboard.contract.conflict.localSection', 'Local draft'),
          )}
          {': '}
          {formatMessage(
            t(
              'editor.dashboard.contract.conflict.localDirty',
              'Contains unsaved changes',
            ),
          )}
        </Typography.Text>
        {options.map((option) => (
          <div key={option.key}>
            <Button
              type={option.primary ? 'primary' : 'default'}
              danger={option.danger}
              disabled={option.disabled}
              onClick={option.onClick}
              data-testid={option.testId}
              block
            >
              {option.label}
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {option.text}
            </Typography.Text>
          </div>
        ))}
      </Space>
    </Modal>
  );
}
