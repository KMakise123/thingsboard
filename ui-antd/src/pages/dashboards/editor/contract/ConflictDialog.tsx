/**
 * 409 three-option conflict dialog — §3.8 / ADR 0004 §2 (409 = 显式三选项
 * 对话框). Props are FROZEN: {open, serverDashboard, onLoadServer,
 * onOverwrite, onExportLocal, onClose}; the dialog renders the real decision
 * content and the shell owns the async flows behind the three callbacks.
 *
 * Content honesty (占位三态 rule): the server side shows title + version
 * when known, or an explicit "server state unknown" alert when the
 * conflict-time GET failed (serverDashboard null — only Option C remains
 * fully safe). The local side is described as an unsaved dirty draft: the
 * dialog only ever opens on a conflicted, dirty save, so the statement is
 * exact. Async outcomes are toasted by the shell (frozen props carry no
 * loading/error channel); on overwrite exhaustion the dialog STAYS OPEN
 * with a refreshed server snapshot.
 */
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { useIntl } from 'react-intl';

import type { Dashboard } from '@/types/tb/dashboard';

export interface ConflictDialogProps {
  open: boolean;
  /** Server entity observed at conflict time (null = GET failed). */
  serverDashboard?: Dashboard | null;
  onLoadServer: () => void;
  onOverwrite: () => void;
  onExportLocal: () => void;
  onClose: () => void;
}

export function ConflictDialog({
  open,
  serverDashboard,
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
            'The dashboard on the server was changed by someone else; the local draft is unsaved.',
          ),
        )}
      </Typography.Paragraph>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div data-testid="editor-conflict-server">
          {serverDashboard ? (
            <Typography.Text>
              {formatMessage(
                t(
                  'editor.dashboard.contract.conflict.serverSection',
                  'Server latest version',
                ),
              )}
              {': '}
              <Typography.Text strong>{serverDashboard.title}</Typography.Text>
              {typeof serverDashboard.version === 'number'
                ? ` (v${serverDashboard.version})`
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
