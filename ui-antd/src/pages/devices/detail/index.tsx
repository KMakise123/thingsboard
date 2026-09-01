/**
 * Device detail page (spec 3.3「详情 10 tab」).
 *
 * Shell: header (name / label / profile / active tag) + a Tabs container
 * whose active tab lives in the URL (`?tab=`) for bookmark restore. Only the
 * active tab is mounted (destroyInactiveTabPane) so WS subscriptions exist
 * solely for the visible tab — the manager's 10-cmd budget stays untouched.
 *
 * Role gating follows ui-ngx: TENANT_ADMIN sees all ten tabs and the edit
 * surface, CUSTOMER_USER the read-only subset (no calculated-fields /
 * alarm-rules / version-control tabs, no editing). Editor entry points are
 * never rendered (spec principle 3).
 */
import { EditOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import EventsPanel from '@/components/devices/detail/EventsPanel';
import AlarmRulesPanel from '@/components/entities/detail/AlarmRulesPanel';
import AlarmsPanel from '@/components/entities/detail/AlarmsPanel';
import AttributesPanel from '@/components/entities/detail/AttributesPanel';
import AuditLogsPanel from '@/components/entities/detail/AuditLogsPanel';
import CalculatedFieldsPanel from '@/components/entities/detail/CalculatedFieldsPanel';
import {
  assembleDetailTabs,
  type DetailTabEntry,
} from '@/components/entities/detail/detail-tabs';
import LatestTelemetryPanel from '@/components/entities/detail/LatestTelemetryPanel';
import RelationsPanel from '@/components/entities/detail/RelationsPanel';
import VersionControlPanel from '@/components/entities/detail/VersionControlPanel';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { getDeviceInfoById } from '@/services/tb/device';
import type { DeviceInfo } from '@/types/tb';
import { EntityType } from '@/types/tb';
import DetailsTab from './DetailsTab';
import {
  type DetailTab,
  isTaOnlyDetailTab,
  useDetailTabUrlState,
} from './url-state';
import { useAuthority } from './use-authority';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { modal } = App.useApp();
  const { authority } = useAuthority();
  const readOnly = authority !== 'TENANT_ADMIN';
  const { tab: requestedTab, setTab } = useDetailTabUrlState();
  // CU never sees the three TA-only tabs, even via a hand-typed ?tab= URL.
  const tab =
    readOnly && isTaOnlyDetailTab(requestedTab) ? 'details' : requestedTab;

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const deviceQuery = useQuery({
    queryKey: ['device', 'detail', id],
    queryFn: () => getDeviceInfoById(id as string),
    enabled: !!id,
  });
  const device = deviceQuery.data;

  // Browser-level unsaved-changes guard while the details form is dirty.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const confirmDiscard = useCallback(
    (after: () => void) => {
      modal.confirm({
        title: formatMessage({
          id: 'pages.devices.detail.unsavedTitle',
          defaultMessage: 'Unsaved changes',
        }),
        content: formatMessage({
          id: 'pages.devices.detail.unsavedText',
          defaultMessage:
            'The device has unsaved changes. Leave anyway? Changes will be lost.',
        }),
        okText: formatMessage({
          id: 'pages.devices.detail.unsavedLeave',
          defaultMessage: 'Leave',
        }),
        cancelText: formatMessage({
          id: 'pages.devices.detail.cancel',
          defaultMessage: 'Cancel',
        }),
        okButtonProps: { danger: true },
        onOk: () => {
          after();
        },
      });
    },
    [formatMessage, modal],
  );

  const leaveEditMode = () => {
    setDirty(false);
    setEditing(false);
  };

  const onTabChange = (next: string) => {
    if (dirty) {
      confirmDiscard(() => {
        leaveEditMode();
        setTab(next as DetailTab);
      });
      return;
    }
    setTab(next as DetailTab);
  };

  const toggleEdit = () => {
    if (editing && dirty) {
      confirmDiscard(leaveEditMode);
      return;
    }
    setEditing(!editing);
    if (editing) {
      setDirty(false);
    }
  };

  const tabItems = buildTabItems({
    formatMessage,
    device,
    readOnly,
    editing,
    onEditingChange: (next) => {
      setEditing(next);
      if (!next) {
        setDirty(false);
      }
    },
    onDirtyChange: setDirty,
  });

  return (
    <PageContainer
      title={device?.name ?? id}
      // Dynamic breadcrumb segment: the entity's real name, same fallback
      // as the title (ADR 0008).
      breadcrumbLabel={device?.name ?? id}
      tags={
        device ? (
          <Tag color={device.active ? 'success' : 'error'}>
            {formatMessage({
              id: device.active
                ? 'pages.devices.detail.active'
                : 'pages.devices.detail.inactive',
              defaultMessage: device.active ? 'Active' : 'Inactive',
            })}
          </Tag>
        ) : undefined
      }
      extra={
        !readOnly && (
          <Button
            icon={<EditOutlined />}
            onClick={toggleEdit}
            danger={editing && dirty}
            disabled={!device}
          >
            {formatMessage({
              id: editing
                ? 'pages.devices.detail.cancelEdit'
                : 'pages.devices.detail.edit',
              defaultMessage: editing ? 'Cancel edit' : 'Edit',
            })}
          </Button>
        )
      }
      // The wrapper guards this against unsaved changes (dirty).
      onBack={() => history.push('/devices')}
      dirty={dirty}
      content={
        <Space size={16} wrap>
          {device?.label ? (
            <Typography.Text type="secondary">{device.label}</Typography.Text>
          ) : null}
          {device && (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.devices.detail.profile',
                defaultMessage: 'Device profile',
              })}
              : {device.deviceProfileName}
            </Typography.Text>
          )}
        </Space>
      }
    >
      <Card>
        {deviceQuery.isPending && (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        )}
        {deviceQuery.isError && (
          <Alert
            type="error"
            showIcon
            message={formatMessage({
              id: 'pages.devices.detail.loadFailed',
              defaultMessage: 'Failed to load the device',
            })}
            description={serverErrorText(deviceQuery.error)}
          />
        )}
        {device && (
          <Tabs
            activeKey={tab}
            onChange={onTabChange}
            destroyOnHidden
            items={tabItems}
          />
        )}
      </Card>
    </PageContainer>
  );
}

/**
 * Device tab registry (M2 shared shape): ordered entries, TA-only tabs
 * marked — they drop out for CU exactly like ui-ngx's device-tabs template
 * (@if authority === TENANT_ADMIN). The 10-tab order, TA-only set and
 * per-tab props are unchanged from the M1 inline buildTabItems.
 */
function buildTabItems({
  formatMessage,
  device,
  readOnly,
  editing,
  onEditingChange,
  onDirtyChange,
}: {
  formatMessage: ReturnType<typeof useIntl>['formatMessage'];
  device?: DeviceInfo;
  readOnly: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}): ReturnType<typeof assembleDetailTabs> {
  const entries: Array<DetailTabEntry> = [
    {
      key: 'details',
      label: formatMessage({
        id: 'pages.devices.detail.tabDetails',
        defaultMessage: 'Details',
      }),
      render: () =>
        device ? (
          <DetailsTab
            device={device}
            editing={editing && !readOnly}
            onEditingChange={onEditingChange}
            onDirtyChange={onDirtyChange}
          />
        ) : null,
    },
    {
      key: 'attributes',
      label: formatMessage({
        id: 'pages.devices.detail.tabAttributes',
        defaultMessage: 'Attributes',
      }),
      render: () =>
        device ? (
          <AttributesPanel entityId={device.id} readOnly={readOnly} />
        ) : null,
    },
    {
      key: 'latest-telemetry',
      label: formatMessage({
        id: 'pages.devices.detail.tabLatestTelemetry',
        defaultMessage: 'Latest telemetry',
      }),
      render: () =>
        device ? <LatestTelemetryPanel entityId={device.id} /> : null,
    },
    // TA-only pair, same slot as ui-ngx device-tabs.
    {
      key: 'calculated-fields',
      taOnly: true,
      label: formatMessage({
        id: 'pages.devices.detail.tabCalculatedFields',
        defaultMessage: 'Calculated fields',
      }),
      render: () =>
        device ? <CalculatedFieldsPanel entityId={device.id} /> : null,
    },
    {
      key: 'alarm-rules',
      taOnly: true,
      label: formatMessage({
        id: 'pages.devices.detail.tabAlarmRules',
        defaultMessage: 'Alarm rules',
      }),
      render: () => (device ? <AlarmRulesPanel entityId={device.id} /> : null),
    },
    {
      key: 'alarms',
      label: formatMessage({
        id: 'pages.devices.detail.tabAlarms',
        defaultMessage: 'Alarms',
      }),
      render: () =>
        device ? (
          <AlarmsPanel entityId={device.id} readOnly={readOnly} />
        ) : null,
    },
    {
      key: 'events',
      label: formatMessage({
        id: 'pages.devices.detail.tabEvents',
        defaultMessage: 'Events',
      }),
      render: () =>
        device ? (
          <EventsPanel
            deviceId={device.id.id}
            tenantId={device.tenantId?.id ?? ''}
          />
        ) : null,
    },
    {
      key: 'relations',
      label: formatMessage({
        id: 'pages.devices.detail.tabRelations',
        defaultMessage: 'Relations',
      }),
      render: () =>
        device ? (
          <RelationsPanel entityId={device.id} readOnly={readOnly} />
        ) : null,
    },
    {
      key: 'audit-logs',
      label: formatMessage({
        id: 'pages.devices.detail.tabAuditLogs',
        defaultMessage: 'Audit logs',
      }),
      render: () => (device ? <AuditLogsPanel entityId={device.id} /> : null),
    },
    // TA-only, same slot as ui-ngx device-tabs.
    {
      key: 'version-control',
      taOnly: true,
      label: formatMessage({
        id: 'pages.devices.detail.tabVersionControl',
        defaultMessage: 'Version control',
      }),
      render: () =>
        device ? (
          <VersionControlPanel
            entityId={device.id}
            entityType={EntityType.DEVICE}
          />
        ) : null,
    },
  ];
  return assembleDetailTabs(entries, readOnly);
}
