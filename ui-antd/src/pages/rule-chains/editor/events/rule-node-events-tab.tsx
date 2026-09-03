/**
 * RuleNodeEventsTab — the node details drawer's DEBUG_RULE_NODE events tab
 * (M8 wave-3 D implementation of the wave-C seam
 * `details/events-tab.ts`, which re-exports from here so the frozen import
 * path keeps resolving).
 *
 * Graceful degradation (K2 may render this tab passing ONLY {ruleNodeId}):
 *  - `tenantId` omitted → resolved from GET /api/auth/user (tenant admin is
 *    the only authority on this surface); the table stays idle until known.
 *  - `node`/`descriptor` omitted or the node is not a script-family node →
 *    the 用这条消息测试 row action is hidden (ui-ngx parity: the action only
 *    exists where a test dialog exists).
 *  - empty `ruleNodeId` (unsaved node — the backend has not minted the id) →
 *    an explicit "save the chain first" hint instead of a doomed request.
 */

import { BugOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { scriptFamilyProfileFor } from '@/components/rule-node/fields/script-config';
import type { CanvasNode } from '@/core/rulechain/types';
import { getCurrentUser } from '@/services/tb/auth';
import { EntityType } from '@/types/tb';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

import type { DebugEventBody } from './debug-events-table';
import { DebugEventsTable } from './debug-events-table';
import { TestWithMessageModal } from './test-with-message-modal';

export interface RuleNodeEventsTabProps {
  /** Wire rule node id (empty for a node the backend has not saved yet). */
  ruleNodeId: string;
  /** Canvas node — enables the test-with-this-message row action. */
  node?: CanvasNode;
  /** Component descriptor of the node (additive; reserved for the K2 drawer). */
  descriptor?: RuleNodeComponentDescriptor;
  /** Tenant scope of the events API; defaults to the session user's. */
  tenantId?: string;
  testIdPrefix?: string;
}

export function RuleNodeEventsTab({
  ruleNodeId,
  node,
  descriptor: _descriptor,
  tenantId,
  testIdPrefix = 'rc-node-events',
}: RuleNodeEventsTabProps) {
  const { formatMessage } = useIntl();
  const [testBody, setTestBody] = useState<DebugEventBody | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  // Tenant fallback: the drawer does not carry the chain meta, so the
  // session user's tenant scopes the request (TENANT_ADMIN-only surface).
  const userQuery = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: getCurrentUser,
    enabled: tenantId === undefined,
    staleTime: 10 * 60 * 1000,
  });
  const resolvedTenantId = tenantId ?? userQuery.data?.tenantId?.id ?? '';

  const isScriptNode = Boolean(node && scriptFamilyProfileFor(node.clazz));

  const entityId = useMemo(
    () => ({ entityType: EntityType.RULE_NODE, id: ruleNodeId }),
    [ruleNodeId],
  );

  if (!ruleNodeId) {
    return (
      <Typography.Text type="secondary" data-testid={`${testIdPrefix}-unsaved`}>
        {formatMessage({
          id: 'editor.ruleChain.events.nodeUnsaved',
          defaultMessage:
            'Save the rule chain to collect debug events for this node.',
        })}
      </Typography.Text>
    );
  }

  const rowAction = isScriptNode
    ? (body: DebugEventBody) => (
        <Button
          type="text"
          size="small"
          icon={<BugOutlined />}
          data-testid={`${testIdPrefix}-test-action`}
          onClick={() => {
            setTestBody(body);
            setTestOpen(true);
          }}
        >
          {formatMessage({
            id: 'editor.ruleChain.events.testWithThisMessage',
            defaultMessage: 'Test with this message',
          })}
        </Button>
      )
    : undefined;

  return (
    <div>
      <DebugEventsTable
        entityId={entityId}
        tenantId={resolvedTenantId}
        eventType="DEBUG_RULE_NODE"
        rowAction={rowAction}
        testIdPrefix={testIdPrefix}
      />
      {node && (
        <TestWithMessageModal
          open={testOpen}
          node={node}
          eventBody={testBody}
          onClose={() => setTestOpen(false)}
        />
      )}
    </div>
  );
}
