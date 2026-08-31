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
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
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
import AlarmsPanel from '@/components/devices/detail/AlarmsPanel';
import AttributesPanel from '@/components/devices/detail/AttributesPanel';
import AuditLogsPanel from '@/components/devices/detail/AuditLogsPanel';
import EventsPanel from '@/components/devices/detail/EventsPanel';
import LatestTelemetryPanel from '@/components/devices/detail/LatestTelemetryPanel';
import RelationsPanel from '@/components/devices/detail/RelationsPanel';
import { serverErrorText } from '@/components/devices/server-error-text';
import { getDeviceInfoById } from '@/services/tb/device';
import type { DeviceInfo } from '@/types/tb';
import DetailsTab from './DetailsTab';
import { type DetailTab, useDetailTabUrlState } from './url-state';
import { useAuthority } from './use-authority';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { modal } = App.useApp();
  const { authority } = useAuthority();
  const readOnly = authority !== 'TENANT_ADMIN';
  const { tab, setTab } = useDetailTabUrlState();

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
    <div className="flex flex-col gap-3">
      <Card>
        <Space orientation="vertical" size={4} className="w-full">
          <Space align="center">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => history.push('/devices')}
              title={formatMessage({
                id: 'pages.devices.detail.back',
                defaultMessage: 'Back to devices',
              })}
            />
            <Typography.Title level={4} className="!mb-0">
              {device?.name ?? id}
            </Typography.Title>
            {device && (
              <Tag color={device.active ? 'success' : 'error'}>
                {formatMessage({
                  id: device.active
                    ? 'pages.devices.detail.active'
                    : 'pages.devices.detail.inactive',
                  defaultMessage: device.active ? 'Active' : 'Inactive',
                })}
              </Tag>
            )}
            <div className="flex-1" />
            {!readOnly && (
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
            )}
          </Space>
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
        </Space>
      </Card>

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
    </div>
  );
}

/**
 * Tab registry. The three TA-only tabs disappear for CU exactly like
 * ui-ngx's device-tabs template (@if authority === TENANT_ADMIN).
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
}) {
  const items: Array<{
    key: DetailTab;
    label: string;
    children: React.ReactNode;
  }> = [
    {
      key: 'details',
      label: formatMessage({
        id: 'pages.devices.detail.tabDetails',
        defaultMessage: 'Details',
      }),
      children: device ? (
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
      children: device ? (
        <AttributesPanel deviceId={device.id.id} readOnly={readOnly} />
      ) : null,
    },
    {
      key: 'latest-telemetry',
      label: formatMessage({
        id: 'pages.devices.detail.tabLatestTelemetry',
        defaultMessage: 'Latest telemetry',
      }),
      children: device ? (
        <LatestTelemetryPanel deviceId={device.id.id} />
      ) : null,
    },
    {
      key: 'alarms',
      label: formatMessage({
        id: 'pages.devices.detail.tabAlarms',
        defaultMessage: 'Alarms',
      }),
      children: device ? (
        <AlarmsPanel deviceId={device.id.id} readOnly={readOnly} />
      ) : null,
    },
    {
      key: 'events',
      label: formatMessage({
        id: 'pages.devices.detail.tabEvents',
        defaultMessage: 'Events',
      }),
      children: device ? (
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
      children: device ? (
        <RelationsPanel deviceEntityId={device.id} readOnly={readOnly} />
      ) : null,
    },
    {
      key: 'audit-logs',
      label: formatMessage({
        id: 'pages.devices.detail.tabAuditLogs',
        defaultMessage: 'Audit logs',
      }),
      children: device ? <AuditLogsPanel entityId={device.id} /> : null,
    },
  ];
  if (readOnly) {
    return items;
  }
  // TA-only tabs are appended as their panels land (each commit wires one).
  return items;
}
