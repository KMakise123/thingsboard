/**
 * RuleNodeDetailsDrawer — FROZEN PLACEHOLDER SEAM (M8 brief §3 wave C;
 * wave 3 K2 REWRITES this file with the real details form + sanitized help
 * tab + docUrl out-link — the path and prop signature below must not
 * change).
 *
 *   props: { open, node, descriptor, onClose }
 *
 * Wave-C body: honest placeholder — shows the node identity (name / class /
 * description / configuration JSON) read-only so the wave-C browser
 * walkthrough can verify wiring, plus an explicit "wave 3" note.
 */
import { Descriptions, Drawer, Typography } from 'antd';
import { useIntl } from 'react-intl';
import type { CanvasNode } from '@/core/rulechain/types';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

export interface RuleNodeDetailsDrawerProps {
  open: boolean;
  node: CanvasNode;
  descriptor?: RuleNodeComponentDescriptor;
  onClose: () => void;
}

export function RuleNodeDetailsDrawer({
  open,
  node,
  descriptor,
  onClose,
}: RuleNodeDetailsDrawerProps) {
  const { formatMessage } = useIntl();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={formatMessage({
        id: 'editor.ruleChain.canvas.details.title',
        defaultMessage: 'Rule node details',
      })}
      width={420}
      destroyOnHidden
      data-testid="rc-node-details-drawer"
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item
          label={formatMessage({
            id: 'editor.ruleChain.canvas.details.name',
            defaultMessage: 'Name',
          })}
        >
          {node.name}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage({
            id: 'editor.ruleChain.canvas.details.clazz',
            defaultMessage: 'Type',
          })}
        >
          {node.clazz}
          {descriptor?.name ? ` (${descriptor.name})` : ''}
        </Descriptions.Item>
      </Descriptions>
      {node.description ? (
        <Typography.Paragraph type="secondary">
          {node.description}
        </Typography.Paragraph>
      ) : null}
      <Typography.Paragraph type="warning" data-testid="rc-details-placeholder">
        {formatMessage({
          id: 'editor.ruleChain.canvas.details.placeholder',
          defaultMessage:
            'The details form and help land in this drawer with M8 wave 3 (K2).',
        })}
      </Typography.Paragraph>
      <Typography.Text strong>
        {formatMessage({
          id: 'editor.ruleChain.canvas.details.configuration',
          defaultMessage: 'Configuration',
        })}
      </Typography.Text>
      <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(node.configuration, null, 2)}
      </pre>
    </Drawer>
  );
}
