/**
 * NestedChainDialog — name input for ctrl+r "create nested rule chain"
 * (ui-ngx create-nested-rulechain-dialog parity). Validation of the
 * selection happens BEFORE this dialog opens (shell →
 * validateNestedChainSelection); the dialog itself only collects the new
 * chain's display name. The shell owns the full commit: POST the new chain,
 * POST the exported sub-graph metadata, then the ONE-group canvas
 * replacement (see canvas/nested-chain.ts).
 */
import { Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface NestedChainDialogPayload {
  nodeCount: number;
  onConfirm: (name: string) => void;
}

interface NestedChainDialogProps {
  open: boolean;
  /** NestedChainDialogPayload — narrowed from the shared `unknown` contract. */
  payload?: unknown;
  onClose: () => void;
}

export function NestedChainDialog({
  open,
  payload,
  onClose,
}: NestedChainDialogProps) {
  const { formatMessage } = useIntl();
  const [name, setName] = useState('');
  const typed = payload as NestedChainDialogPayload | undefined;

  if (!typed) {
    return null;
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    typed.onConfirm(trimmed);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.ruleChain.canvas.nestedChain.title',
        defaultMessage: 'Create nested rule chain',
      })}
      okText={formatMessage({
        id: 'editor.ruleChain.canvas.addNode.ok',
        defaultMessage: 'OK',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{ disabled: !name.trim() }}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
    >
      <div data-testid="rc-nested-chain-dialog">
        <Typography.Paragraph type="secondary">
          {formatMessage(
            {
              id: 'editor.ruleChain.canvas.nestedChain.summary',
              defaultMessage:
                'Export {count} selected nodes into a new rule chain.',
            },
            { count: typed.nodeCount },
          )}
        </Typography.Paragraph>
        <Typography.Text>
          {formatMessage({
            id: 'editor.ruleChain.canvas.nestedChain.name',
            defaultMessage: 'Name',
          })}
        </Typography.Text>
        <Input
          value={name}
          autoFocus
          data-testid="rc-nested-chain-name"
          onPressEnter={submit}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
    </Modal>
  );
}
