/**
 * Rule-chain entity details dialog (M8 wave-3 D; the list 「详情」 action).
 * Tabs reuse the M2-M5 generic entity panels (assembleDetailTabs registry
 * shape, components/entities/detail) — attributes (SERVER_SCOPE default),
 * alarms, relations, audit-logs — plus the wave-3 D DEBUG_RULE_CHAIN events
 * table. TA-only surface by route (canTenantAdmin), so readOnly is always
 * false in practice; the panels still receive it for shape parity.
 */
import { Modal, Tabs } from 'antd';
import { useIntl } from 'react-intl';
import AlarmsPanel from '@/components/entities/detail/AlarmsPanel';
import AttributesPanel from '@/components/entities/detail/AttributesPanel';
import AuditLogsPanel from '@/components/entities/detail/AuditLogsPanel';
import RelationsPanel from '@/components/entities/detail/RelationsPanel';
import type { EntityIdOf, EntityType } from '@/types/tb';
import { AttributeScope } from '@/types/tb';
import type { RuleChain } from '@/types/tb/rule-chain';

import { DebugEventsTable } from '../editor/events/debug-events-table';

export interface RuleChainDetailsDialogProps {
  chain: RuleChain | null;
  onClose: () => void;
}

export function RuleChainDetailsDialog({
  chain,
  onClose,
}: RuleChainDetailsDialogProps) {
  const { formatMessage } = useIntl();
  if (!chain?.id) {
    return null;
  }
  const entityId: EntityIdOf<EntityType.RULE_CHAIN> = chain.id;
  const tenantId = chain.tenantId?.id ?? '';

  const tab = (key: string, labelId: string, defaultMessage: string) => ({
    key,
    label: formatMessage({ id: labelId, defaultMessage }),
  });

  return (
    <Modal
      open={Boolean(chain)}
      title={formatMessage({
        id: 'ruleChains.details.title',
        defaultMessage: 'Rule chain details',
      })}
      footer={null}
      width={960}
      destroyOnHidden
      onCancel={onClose}
      data-testid="rc-details-dialog"
    >
      <Tabs
        destroyOnHidden
        items={[
          {
            ...tab(
              'attributes',
              'ruleChains.details.tabAttributes',
              'Attributes',
            ),
            children: (
              <AttributesPanel
                entityId={entityId}
                readOnly={false}
                defaultScope={AttributeScope.SERVER_SCOPE}
                disableAttributeScopeSelection
              />
            ),
          },
          {
            ...tab('alarms', 'ruleChains.details.tabAlarms', 'Alarms'),
            children: <AlarmsPanel entityId={entityId} readOnly={false} />,
          },
          {
            ...tab('events', 'ruleChains.details.tabEvents', 'Events'),
            children: (
              <DebugEventsTable
                entityId={entityId}
                tenantId={tenantId}
                eventType="DEBUG_RULE_CHAIN"
                testIdPrefix="rc-chain-events"
              />
            ),
          },
          {
            ...tab('relations', 'ruleChains.details.tabRelations', 'Relations'),
            children: <RelationsPanel entityId={entityId} readOnly={false} />,
          },
          {
            ...tab(
              'audit-logs',
              'ruleChains.details.tabAuditLogs',
              'Audit logs',
            ),
            children: <AuditLogsPanel entityId={entityId} />,
          },
        ]}
      />
    </Modal>
  );
}
