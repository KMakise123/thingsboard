/**
 * 409 three-option conflict dialog — rule-chain binding (§3.8 / ADR 0004
 * §2; M8 wave-3 D). Form-aligned twin of core/editor/contract/
 * ConflictDialog.tsx (the M7 dashboards dialog): same three-option layout,
 * same testids (editor-conflict-dialog / -server / -local / -load-server /
 * -overwrite / -export-local) so the behavior contract is uniform across
 * editor suites — with rule-chain copy (the core dialog's shared intro text
 * names the dashboard, and core/ is outside this wave's file boundary).
 *
 * Props mirror the core dialog: {open, serverEntity, onLoadServer,
 * onOverwrite, onExportLocal, onClose}; the shell owns the async flows
 * behind the three callbacks. serverEntity null = the conflict-time GET
 * failed ("server state unknown" warning; only Option C is fully safe).
 */
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { useIntl } from 'react-intl';

/** Minimal server-entity display descriptor used by the dialog. */
export interface ConflictServerEntityDescriptor {
  title?: string;
  version?: number;
}

export interface RuleChainConflictDialogProps {
  open: boolean;
  /** Server metadata observed at conflict time (null = GET failed). */
  serverEntity?: ConflictServerEntityDescriptor | null;
  onLoadServer: () => void;
  onOverwrite: () => void;
  onExportLocal: () => void;
  onClose: () => void;
}

export function RuleChainConflictDialog({
  open,
  serverEntity,
  onLoadServer,
  onOverwrite,
  onExportLocal,
  onClose,
}: RuleChainConflictDialogProps) {
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
          'editor.ruleChain.contract.conflict.loadServer',
          'Load server version',
        ),
      ),
      text: formatMessage(
        t(
          'editor.ruleChain.contract.conflict.loadServerText',
          'Discard the local draft and continue editing the server version.',
        ),
      ),
      onClick: onLoadServer,
    },
    {
      key: 'overwrite',
      testId: 'editor-conflict-overwrite',
      primary: false,
      danger: true,
      label: formatMessage(
        t(
          'editor.ruleChain.contract.conflict.overwrite',
          'Overwrite with mine',
        ),
      ),
      text: formatMessage(
        t(
          'editor.ruleChain.contract.conflict.overwriteText',
          'Fetch the latest server version, then force-save the local draft.',
        ),
      ),
      onClick: onOverwrite,
    },
    {
      key: 'exportLocal',
      testId: 'editor-conflict-export-local',
      primary: false,
      danger: false,
      label: formatMessage(
        t(
          'editor.ruleChain.contract.conflict.exportLocal',
          'Export local JSON and give up',
        ),
      ),
      text: formatMessage(
        t(
          'editor.ruleChain.contract.conflict.exportLocalText',
          'Download the local draft JSON and leave the editor.',
        ),
      ),
      onClick: onExportLocal,
    },
  ];

  return (
    <Modal
      open={open}
      title={formatMessage(
        t('editor.ruleChain.contract.conflict.title', 'Save conflict'),
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
            'editor.ruleChain.contract.conflict.intro',
            'The rule chain on the server was changed by someone else; the local draft is unsaved.',
          ),
        )}
      </Typography.Paragraph>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div data-testid="editor-conflict-server">
          {serverEntity ? (
            <Typography.Text>
              {formatMessage(
                t(
                  'editor.ruleChain.contract.conflict.serverSection',
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
                  'editor.ruleChain.contract.conflict.serverUnknown',
                  'The latest server version could not be fetched; only the local draft can be exported.',
                ),
              )}
            />
          )}
        </div>
        <Typography.Text data-testid="editor-conflict-local">
          {formatMessage(
            t('editor.ruleChain.contract.conflict.localSection', 'Local draft'),
          )}
          {': '}
          {formatMessage(
            t(
              'editor.ruleChain.contract.conflict.localDirty',
              'Contains unsaved changes',
            ),
          )}
        </Typography.Text>
        {options.map((option) => (
          <div key={option.key}>
            <Button
              type={option.primary ? 'primary' : 'default'}
              danger={option.danger}
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
