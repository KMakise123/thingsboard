/**
 * RuleNodeDetailsTab — the details tab of the node details drawer (M8 brief
 * §3 wave-3 K2). Header: the NODE-level fields (name required, debugSettings
 * two switches per the ui-ngx 4.4 debug panel shape, singletonMode only when
 * the descriptor declares a singleton clustering mode, queueName only when
 * the node declares hasQueueName, description). Below: the generated
 * NodeConfigForm for the CONFIGURATION tree.
 *
 * Transaction contract (M7 WidgetConfigPanel parity): every keystroke writes
 * the MAIN draft through the frozen recipes (`updateNodeFields` /
 * `updateNodeConfiguration`, each coalescing per channel) — the canvas node
 * re-renders live (WYSIWYG). The drawer owns the checkpoint (index.tsx);
 * this tab is only the write surface. Without a session it degrades to a
 * read-only display.
 */
import { Input, Space, Switch, Typography } from 'antd';
import { useIntl } from 'react-intl';
import { NodeConfigForm } from '@/components/rule-node/NodeConfigForm';
import type { EditorSession } from '@/core/editor/session';
import {
  updateNodeConfiguration,
  updateNodeFields,
  writeRuleChainDraft,
} from '@/core/rulechain/rule-chain-draft';
import type { CanvasNode, CanvasRuleChain } from '@/core/rulechain/types';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

export interface RuleNodeDetailsTabProps {
  node: CanvasNode;
  descriptor?: RuleNodeComponentDescriptor;
  /** Absent → read-only display (placeholder-compatible usage). */
  session?: EditorSession<CanvasRuleChain>;
}

/** ui-ngx isSingleton(): SINGLETON or USER_PREFERENCE clustering modes. */
function supportsSingletonMode(
  descriptor: RuleNodeComponentDescriptor | undefined,
): boolean {
  return (
    descriptor?.clusteringMode === 'SINGLETON' ||
    descriptor?.clusteringMode === 'USER_PREFERENCE'
  );
}

export function RuleNodeDetailsTab({
  node,
  descriptor,
  session,
}: RuleNodeDetailsTabProps) {
  const { formatMessage } = useIntl();
  const editable = Boolean(session);
  const definition = descriptor?.configurationDescriptor?.nodeDefinition;
  const hasQueueName = descriptor?.hasQueueName ?? definition?.hasQueueName;
  const debugSettings = node.debugSettings ?? {};

  const write = (patch: Parameters<typeof updateNodeFields>[1]): void => {
    if (session) {
      writeRuleChainDraft(session, updateNodeFields(node.uid, patch));
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Typography.Text strong>
          {formatMessage({
            id: 'editor.ruleNode.details.name',
            defaultMessage: 'Name',
          })}
          {' *'}
        </Typography.Text>
        <Input
          value={node.name}
          disabled={!editable}
          maxLength={255}
          status={node.name.trim() === '' ? 'error' : undefined}
          data-testid="rc-details-name"
          onChange={(event) => write({ name: event.target.value })}
        />
        {node.name.trim() === '' ? (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>
            {formatMessage({
              id: 'editor.ruleNode.details.nameRequired',
              defaultMessage: 'Name is required',
            })}
          </Typography.Text>
        ) : null}
      </Space>

      <Space wrap size={16}>
        <Space size={4}>
          <Switch
            size="small"
            checked={debugSettings.failuresEnabled === true}
            disabled={!editable}
            data-testid="rc-details-debug-failures"
            onChange={(value) =>
              write({
                debugSettings: { ...debugSettings, failuresEnabled: value },
              })
            }
          />
          <Typography.Text>
            {formatMessage({
              id: 'editor.ruleNode.details.debugFailures',
              defaultMessage: 'Debug failures',
            })}
          </Typography.Text>
        </Space>
        <Space size={4}>
          <Switch
            size="small"
            checked={debugSettings.allEnabled === true}
            disabled={!editable}
            data-testid="rc-details-debug-all"
            onChange={(value) =>
              write({ debugSettings: { ...debugSettings, allEnabled: value } })
            }
          />
          <Typography.Text>
            {formatMessage({
              id: 'editor.ruleNode.details.debugAll',
              defaultMessage: 'Debug all messages',
            })}
          </Typography.Text>
        </Space>
        {supportsSingletonMode(descriptor) ? (
          <Space size={4}>
            <Switch
              size="small"
              checked={node.singletonMode === true}
              disabled={!editable}
              data-testid="rc-details-singleton"
              onChange={(value) => write({ singletonMode: value })}
            />
            <Typography.Text>
              {formatMessage({
                id: 'editor.ruleNode.details.singletonMode',
                defaultMessage: 'Singleton mode',
              })}
            </Typography.Text>
          </Space>
        ) : null}
      </Space>

      {hasQueueName ? (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Typography.Text>
            {formatMessage({
              id: 'editor.ruleNode.details.queueName',
              defaultMessage: 'Queue',
            })}
          </Typography.Text>
          <Input
            value={node.queueName ?? ''}
            disabled={!editable}
            data-testid="rc-details-queue-name"
            onChange={(event) => write({ queueName: event.target.value })}
          />
        </Space>
      ) : null}

      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Typography.Text>
          {formatMessage({
            id: 'editor.ruleNode.details.description',
            defaultMessage: 'Node description',
          })}
        </Typography.Text>
        <Input.TextArea
          value={node.description ?? ''}
          disabled={!editable}
          autoSize={{ minRows: 1, maxRows: 4 }}
          data-testid="rc-details-description"
          onChange={(event) => write({ description: event.target.value })}
        />
      </Space>

      {descriptor ? (
        <NodeConfigForm
          descriptor={descriptor}
          configuration={node.configuration}
          onChange={(configuration) => {
            if (session) {
              writeRuleChainDraft(
                session,
                updateNodeConfiguration(node.uid, configuration),
              );
            }
          }}
          disabled={!editable}
        />
      ) : (
        <Typography.Text type="secondary">{node.clazz}</Typography.Text>
      )}
    </Space>
  );
}
