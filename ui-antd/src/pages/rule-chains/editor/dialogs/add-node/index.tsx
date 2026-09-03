/**
 * AddNodeDialog — real implementation (M8 brief §3 wave C): shows the
 * component display name + description, the node-level name field (prefilled
 * with the component display name, ui-ngx parity) and the configuration form
 * SLOT (frozen seam; wave 3 K2 wires the generated form — the JSON fallback
 * occupies it in wave C).
 *
 * The dialog COLLECTS only; the commit (addNode recipe, ONE transaction
 * group at the drop position) belongs to the shell via payload.onConfirm.
 */
import { Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

import { NodeConfigFormSlot } from './node-config-form-slot';

export interface AddNodeDialogPayload {
  descriptor: RuleNodeComponentDescriptor;
  position: { x: number; y: number };
  onConfirm: (result: {
    descriptor: RuleNodeComponentDescriptor;
    position: { x: number; y: number };
    name: string;
    configuration: Record<string, unknown>;
  }) => void;
}

interface AddNodeDialogProps {
  open: boolean;
  /** AddNodeDialogPayload — dialogs narrow the shared `unknown` contract. */
  payload?: unknown;
  onClose: () => void;
}

export function AddNodeDialog({ open, payload, onClose }: AddNodeDialogProps) {
  const { formatMessage } = useIntl();
  // the host mounts a dialog only while it is active — the payload is
  // present at mount, so the one-time initializers below read it directly
  const typed = payload as AddNodeDialogPayload | undefined;
  const [name, setName] = useState(() => typed?.descriptor?.name ?? '');
  const [configuration, setConfiguration] = useState<Record<string, unknown>>(
    () =>
      structuredClone(
        typed?.descriptor?.configurationDescriptor?.nodeDefinition
          ?.defaultConfiguration ?? {},
      ),
  );

  if (!typed) {
    return null;
  }
  const { descriptor } = typed;
  const definition = descriptor.configurationDescriptor?.nodeDefinition;

  const submit = () => {
    typed.onConfirm({
      descriptor,
      position: typed.position,
      name: name.trim() || descriptor.name,
      configuration,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.ruleChain.canvas.addNode.title',
        defaultMessage: 'Add rule node',
      })}
      okText={formatMessage({
        id: 'editor.ruleChain.canvas.addNode.ok',
        defaultMessage: 'OK',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
    >
      <div data-testid="rc-add-node-dialog">
        <Typography.Paragraph type="secondary">
          {definition?.description ?? descriptor.clazz}
        </Typography.Paragraph>
        <Typography.Text>
          {formatMessage({
            id: 'editor.ruleChain.canvas.addNode.name',
            defaultMessage: 'Name',
          })}
        </Typography.Text>
        <Input
          value={name}
          data-testid="rc-add-node-name"
          style={{ marginBottom: 12 }}
          onChange={(event) => setName(event.target.value)}
        />
        <NodeConfigFormSlot
          descriptor={descriptor}
          configuration={configuration}
          onChange={setConfiguration}
        />
      </div>
    </Modal>
  );
}
