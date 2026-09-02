/**
 * Asset-profile detail page (spec 3.8). Same shell as the device-profile
 * detail page; tabs follow ui-ngx asset-profile-tabs: details /
 * calculated fields / alarm rules / audit logs / version control (no
 * transport or provisioning — assets have neither).
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
import { getAssetProfileById } from '@/services/tb/asset-profile';
import { EntityType } from '@/types/tb';
import GeneralTab from './GeneralTab';
import { type DetailTab, useDetailTabUrlState } from './url-state';

export default function AssetProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { modal } = App.useApp();
  const { tab, setTab } = useDetailTabUrlState();

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['asset-profile', 'detail', id],
    queryFn: () => getAssetProfileById(id as string),
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
          id: 'pages.asset-profiles.detail.unsavedTitle',
          defaultMessage: 'Unsaved changes',
        }),
        content: formatMessage({
          id: 'pages.asset-profiles.detail.unsavedText',
          defaultMessage:
            'The asset profile has unsaved changes. Leave anyway? Changes will be lost.',
        }),
        okText: formatMessage({
          id: 'pages.asset-profiles.detail.unsavedLeave',
          defaultMessage: 'Leave',
        }),
        cancelText: formatMessage({
          id: 'pages.asset-profiles.list.cancel',
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

  const tabItems = [
    {
      key: 'details',
      label: formatMessage({
        id: 'pages.asset-profiles.detail.tabDetails',
        defaultMessage: 'Details',
      }),
      children: profile ? (
        <GeneralTab
          profile={profile}
          editing={editing}
          onEditingChange={(next) => {
            setEditing(next);
            if (!next) {
              setDirty(false);
            }
          }}
          onDirtyChange={setDirty}
        />
      ) : null,
    },
    {
      key: 'calculated-fields',
      label: formatMessage({
        id: 'pages.asset-profiles.detail.tabCalculatedFields',
        defaultMessage: 'Calculated fields',
      }),
      children: profile ? (
        <CalculatedFieldsPanel entityId={profile.id} />
      ) : null,
    },
    {
      key: 'alarm-rules',
      label: formatMessage({
        id: 'pages.asset-profiles.detail.tabAlarmRules',
        defaultMessage: 'Alarm rules',
      }),
      children: profile ? <AlarmRulesPanel entityId={profile.id} /> : null,
    },
    {
      key: 'audit-logs',
      label: formatMessage({
        id: 'pages.asset-profiles.detail.tabAuditLogs',
        defaultMessage: 'Audit logs',
      }),
      children: profile ? <AuditLogsPanel entityId={profile.id} /> : null,
    },
    {
      key: 'version-control',
      label: formatMessage({
        id: 'pages.asset-profiles.detail.tabVersionControl',
        defaultMessage: 'Version control',
      }),
      children: profile ? (
        <VersionControlPanel
          entityId={profile.id}
          entityType={EntityType.ASSET_PROFILE}
        />
      ) : null,
    },
  ];

  return (
    <PageContainer
      title={profile?.name ?? id}
      breadcrumbLabel={profile?.name ?? id}
      tags={
        profile?.default ? (
          <Tag color="processing">
            {formatMessage({
              id: 'pages.asset-profiles.detail.defaultTag',
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
              ? 'pages.asset-profiles.detail.cancelEdit'
              : 'pages.asset-profiles.detail.edit',
            defaultMessage: editing ? 'Cancel edit' : 'Edit',
          })}
        </Button>
      }
      onBack={() => history.push('/assetProfiles')}
      dirty={dirty}
      content={
        profile && (
          <Space size={16} wrap>
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
              id: 'pages.asset-profiles.detail.loadFailed',
              defaultMessage: 'Failed to load the asset profile',
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
