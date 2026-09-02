/**
 * Device-profile detail page (spec 3.8). Shell mirrors the device detail
 * page: PageContainer header (name + default tag), one Tabs container whose
 * active tab lives in the URL (`?tab=`), destroyOnHidden so only the active
 * tab mounts. Tabs follow ui-ngx device-profile-tabs: the general form
 * (page-header edit toggle + unsaved-changes guard) plus transport
 * configuration / calculated fields / alarm rules / device provisioning /
 * audit logs / version control. Profiles are tenant-admin territory (route
 * access canTenantAdmin); the raw tabs are built inline because the shared
 * assembleDetailTabs registry does not carry the profile-specific keys.
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
import AlarmRulesPanel from '@/components/entities/detail/AlarmRulesPanel';
import AuditLogsPanel from '@/components/entities/detail/AuditLogsPanel';
import CalculatedFieldsPanel from '@/components/entities/detail/CalculatedFieldsPanel';
import VersionControlPanel from '@/components/entities/detail/VersionControlPanel';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { getDeviceProfileById } from '@/services/tb/device-profile';
import { EntityType } from '@/types/tb';
import type { DeviceProfile } from '@/types/tb/device-profile';
import GeneralTab from './GeneralTab';
import ProvisioningTab from './ProvisioningTab';
import TransportTab from './TransportTab';
import { type DetailTab, useDetailTabUrlState } from './url-state';

export default function DeviceProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { modal } = App.useApp();
  const { tab, setTab } = useDetailTabUrlState();

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['device-profile', 'detail', id],
    queryFn: () => getDeviceProfileById(id as string),
    enabled: !!id,
  });
  const profile = profileQuery.data;

  // Browser-level unsaved-changes guard while the general form is dirty.
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
          id: 'pages.device-profiles.detail.unsavedTitle',
          defaultMessage: 'Unsaved changes',
        }),
        content: formatMessage({
          id: 'pages.device-profiles.detail.unsavedText',
          defaultMessage:
            'The device profile has unsaved changes. Leave anyway? Changes will be lost.',
        }),
        okText: formatMessage({
          id: 'pages.device-profiles.detail.unsavedLeave',
          defaultMessage: 'Leave',
        }),
        cancelText: formatMessage({
          id: 'pages.device-profiles.list.cancel',
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
    profile,
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
      title={profile?.name ?? id}
      breadcrumbLabel={profile?.name ?? id}
      tags={
        profile?.default ? (
          <Tag color="processing">
            {formatMessage({
              id: 'pages.device-profiles.detail.defaultTag',
              defaultMessage: 'Default',
            })}
          </Tag>
        ) : undefined
      }
      extra={
        <Button
          icon={<EditOutlined />}
          onClick={toggleEdit}
          danger={editing && dirty}
          disabled={!profile}
        >
          {formatMessage({
            id: editing
              ? 'pages.device-profiles.detail.cancelEdit'
              : 'pages.device-profiles.detail.edit',
            defaultMessage: editing ? 'Cancel edit' : 'Edit',
          })}
        </Button>
      }
      onBack={() => history.push('/deviceProfiles')}
      dirty={dirty}
      content={
        profile && (
          <Space size={16} wrap>
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.device-profiles.dialog.transportType',
                defaultMessage: 'Transport type',
              })}
              :{' '}
              {profile.transportType === 'DEFAULT'
                ? formatMessage({
                    id: 'pages.device-profiles.transport.DEFAULT',
                    defaultMessage: 'Default',
                  })
                : profile.transportType}
            </Typography.Text>
            {profile.description && (
              <Typography.Text type="secondary">
                {profile.description}
              </Typography.Text>
            )}
          </Space>
        )
      }
    >
      <Card>
        {profileQuery.isPending && (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        )}
        {profileQuery.isError && (
          <Alert
            type="error"
            showIcon
            title={formatMessage({
              id: 'pages.device-profiles.detail.loadFailed',
              defaultMessage: 'Failed to load the device profile',
            })}
            description={serverErrorText(profileQuery.error)}
          />
        )}
        {profile && (
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

function buildTabItems({
  formatMessage,
  profile,
  editing,
  onEditingChange,
  onDirtyChange,
}: {
  formatMessage: ReturnType<typeof useIntl>['formatMessage'];
  profile?: DeviceProfile;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  return [
    {
      key: 'details',
      label: formatMessage({
        id: 'pages.device-profiles.detail.tabDetails',
        defaultMessage: 'Details',
      }),
      children: profile ? (
        <GeneralTab
          profile={profile}
          editing={editing}
          onEditingChange={onEditingChange}
          onDirtyChange={onDirtyChange}
        />
      ) : null,
    },
    {
      key: 'transport-configuration',
      label: formatMessage({
        id: 'pages.device-profiles.detail.tabTransportConfiguration',
        defaultMessage: 'Transport configuration',
      }),
      children: profile ? <TransportTab profile={profile} /> : null,
    },
    {
      key: 'calculated-fields',
      label: formatMessage({
        id: 'pages.device-profiles.detail.tabCalculatedFields',
        defaultMessage: 'Calculated fields',
      }),
      children: profile ? (
        <CalculatedFieldsPanel entityId={profile.id} />
      ) : null,
    },
    {
      key: 'alarm-rules',
      label: formatMessage({
        id: 'pages.device-profiles.detail.tabAlarmRules',
        defaultMessage: 'Alarm rules',
      }),
      children: profile ? <AlarmRulesPanel entityId={profile.id} /> : null,
    },
    {
      key: 'device-provisioning',
      label: formatMessage({
        id: 'pages.device-profiles.detail.tabDeviceProvisioning',
        defaultMessage: 'Device provisioning',
      }),
      children: profile ? <ProvisioningTab profile={profile} /> : null,
    },
    {
      key: 'audit-logs',
      label: formatMessage({
        id: 'pages.device-profiles.detail.tabAuditLogs',
        defaultMessage: 'Audit logs',
      }),
      children: profile ? <AuditLogsPanel entityId={profile.id} /> : null,
    },
    {
      key: 'version-control',
      label: formatMessage({
        id: 'pages.device-profiles.detail.tabVersionControl',
        defaultMessage: 'Version control',
      }),
      children: profile ? (
        <VersionControlPanel
          entityId={profile.id}
          entityType={EntityType.DEVICE_PROFILE}
        />
      ) : null,
    },
  ];
}
