/**
 * Asset detail page (spec 3.4, 8 tabs — NO details tab; the entity form
 * lives in the page-header area, mirroring the ui-ngx asset.component shape
 * where the entity fields render in the details header).
 *
 * Shell: PageContainer header (name / profile / label / customer in the
 * content slot via AssetDetailsForm) + a Tabs container whose active tab
 * lives in the URL (`?tab=`) for bookmark restore. Only the active tab is
 * mounted (destroyOnHidden) so WS subscriptions exist solely for the visible
 * tab — the manager's 10-cmd budget stays untouched (never revert to
 * pre-mounting, RECON risk 6).
 *
 * Asset tab deltas vs devices (ui-ngx asset-tabs.component.html): attributes
 * default to SERVER_SCOPE (devices use CLIENT_SCOPE), no events tab, and
 * calculated-fields / alarm-rules / audit-logs / version-control are
 * TA-only. CU never sees those tabs, even via a hand-typed ?tab= URL, and
 * gets no edit/unassign entry points (spec principle 3).
 */
import { EditOutlined, LinkOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import { Alert, App, Button, Card, Space, Spin, Tabs, Tag } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
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
import {
  getAssetInfoById,
  unassignAssetFromCustomer,
} from '@/services/tb/asset';
import { type AssetInfo, AttributeScope, EntityType } from '@/types/tb';
import { useAuthority } from '../list/use-authority';
import AssetDetailsForm from './AssetDetailsForm';
import {
  type DetailTab,
  isTaOnlyDetailTab,
  useDetailTabUrlState,
} from './url-state';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { modal, message } = App.useApp();
  const queryClient = useQueryClient();
  const { authority } = useAuthority();
  const readOnly = authority !== 'TENANT_ADMIN';
  const { tab: requestedTab, setTab } = useDetailTabUrlState();
  // CU never sees the TA-only tabs, even via a hand-typed ?tab= URL.
  const tab =
    readOnly && isTaOnlyDetailTab(requestedTab) ? 'attributes' : requestedTab;

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const assetQuery = useQuery({
    queryKey: ['asset', 'detail', id],
    queryFn: () => getAssetInfoById(id as string),
    enabled: !!id,
  });
  const asset = assetQuery.data;

  const unassignMutation = useMutation({
    mutationFn: () => unassignAssetFromCustomer((asset as AssetInfo).id.id),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.assets.detail.toastUnassigned',
          defaultMessage: 'Asset unassigned from the customer.',
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: ['asset', 'detail', id],
      });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmUnassign = () => {
    if (!asset) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.assets.detail.unassignTitle',
          defaultMessage:
            "Are you sure you want to unassign the asset '{name}'?",
        },
        { name: asset.name },
      ),
      content: formatMessage({
        id: 'pages.assets.detail.unassignText',
        defaultMessage:
          'After the confirmation the asset will be unassigned and will not be accessible by the customer.',
      }),
      okText: formatMessage({
        id: 'pages.assets.detail.actionUnassign',
        defaultMessage: 'Unassign from customer',
      }),
      cancelText: formatMessage({
        id: 'pages.assets.detail.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => unassignMutation.mutateAsync(),
    });
  };

  // Browser-level unsaved-changes guard while the header form is dirty.
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
          id: 'pages.assets.detail.unsavedTitle',
          defaultMessage: 'Unsaved changes',
        }),
        content: formatMessage({
          id: 'pages.assets.detail.unsavedText',
          defaultMessage:
            'The asset has unsaved changes. Leave anyway? Changes will be lost.',
        }),
        okText: formatMessage({
          id: 'pages.assets.detail.unsavedLeave',
          defaultMessage: 'Leave',
        }),
        cancelText: formatMessage({
          id: 'pages.assets.detail.cancel',
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
    asset,
    readOnly,
  });

  return (
    <PageContainer
      title={asset?.name ?? id}
      // Dynamic breadcrumb segment: the entity's real name, same fallback
      // as the title (ADR 0008).
      breadcrumbLabel={asset?.name ?? id}
      tags={
        asset?.customerIsPublic ? (
          <Tag color="blue">
            {formatMessage({
              id: 'pages.assets.detail.public',
              defaultMessage: 'Public',
            })}
          </Tag>
        ) : undefined
      }
      extra={
        !readOnly && (
          <Space>
            {asset && hasCustomer(asset) && (
              <Button
                icon={<LinkOutlined />}
                onClick={confirmUnassign}
                loading={unassignMutation.isPending}
              >
                {formatMessage({
                  id: 'pages.assets.detail.actionUnassign',
                  defaultMessage: 'Unassign from customer',
                })}
              </Button>
            )}
            <Button
              icon={<EditOutlined />}
              onClick={toggleEdit}
              danger={editing && dirty}
              disabled={!asset}
            >
              {formatMessage({
                id: editing
                  ? 'pages.assets.detail.cancelEdit'
                  : 'pages.assets.detail.edit',
                defaultMessage: editing ? 'Cancel edit' : 'Edit',
              })}
            </Button>
          </Space>
        )
      }
      // The wrapper guards this against unsaved changes (dirty).
      onBack={() => history.push('/assets')}
      dirty={dirty}
      content={
        asset ? (
          <AssetDetailsForm
            asset={asset}
            editing={editing && !readOnly}
            onEditingChange={(next) => {
              setEditing(next);
              if (!next) {
                setDirty(false);
              }
            }}
            onDirtyChange={setDirty}
          />
        ) : undefined
      }
    >
      <Card>
        {assetQuery.isPending && (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        )}
        {assetQuery.isError && (
          <Alert
            type="error"
            showIcon
            message={formatMessage({
              id: 'pages.assets.detail.loadFailed',
              defaultMessage: 'Failed to load the asset',
            })}
            description={serverErrorText(assetQuery.error)}
          />
        )}
        {asset && (
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

function hasCustomer(asset: AssetInfo): boolean {
  return !!asset.customerId && asset.customerId.id !== NULL_UUID;
}

/** TB's null-customer UUID (EntityId.NULL_UUID). */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

/**
 * Asset tab registry (M2 shared shape): 8 entries, TA-only tabs marked —
 * they drop out for CU exactly like ui-ngx asset-tabs @if blocks. Attribute
 * scope defaults to SERVER_SCOPE (asset parity; devices use CLIENT_SCOPE).
 */
function buildTabItems({
  formatMessage,
  asset,
  readOnly,
}: {
  formatMessage: ReturnType<typeof useIntl>['formatMessage'];
  asset?: AssetInfo;
  readOnly: boolean;
}): ReturnType<typeof assembleDetailTabs> {
  const entries: Array<DetailTabEntry> = [
    {
      key: 'attributes',
      label: formatMessage({
        id: 'pages.assets.detail.tabAttributes',
        defaultMessage: 'Attributes',
      }),
      render: () =>
        asset ? (
          <AttributesPanel
            entityId={asset.id}
            readOnly={readOnly}
            defaultScope={AttributeScope.SERVER_SCOPE}
          />
        ) : null,
    },
    {
      key: 'latest-telemetry',
      label: formatMessage({
        id: 'pages.assets.detail.tabLatestTelemetry',
        defaultMessage: 'Latest telemetry',
      }),
      render: () =>
        asset ? <LatestTelemetryPanel entityId={asset.id} /> : null,
    },
    // TA-only pair, same slot as ui-ngx asset-tabs.
    {
      key: 'calculated-fields',
      taOnly: true,
      label: formatMessage({
        id: 'pages.assets.detail.tabCalculatedFields',
        defaultMessage: 'Calculated fields',
      }),
      render: () =>
        asset ? <CalculatedFieldsPanel entityId={asset.id} /> : null,
    },
    {
      key: 'alarm-rules',
      taOnly: true,
      label: formatMessage({
        id: 'pages.assets.detail.tabAlarmRules',
        defaultMessage: 'Alarm rules',
      }),
      render: () => (asset ? <AlarmRulesPanel entityId={asset.id} /> : null),
    },
    {
      key: 'alarms',
      label: formatMessage({
        id: 'pages.assets.detail.tabAlarms',
        defaultMessage: 'Alarms',
      }),
      render: () =>
        asset ? <AlarmsPanel entityId={asset.id} readOnly={readOnly} /> : null,
    },
    {
      key: 'relations',
      label: formatMessage({
        id: 'pages.assets.detail.tabRelations',
        defaultMessage: 'Relations',
      }),
      render: () =>
        asset ? (
          <RelationsPanel entityId={asset.id} readOnly={readOnly} />
        ) : null,
    },
    // TA-only pair, same slot as ui-ngx asset-tabs.
    {
      key: 'audit-logs',
      taOnly: true,
      label: formatMessage({
        id: 'pages.assets.detail.tabAuditLogs',
        defaultMessage: 'Audit logs',
      }),
      render: () => (asset ? <AuditLogsPanel entityId={asset.id} /> : null),
    },
    {
      key: 'version-control',
      taOnly: true,
      label: formatMessage({
        id: 'pages.assets.detail.tabVersionControl',
        defaultMessage: 'Version control',
      }),
      render: () =>
        asset ? (
          <VersionControlPanel
            entityId={asset.id}
            entityType={EntityType.ASSET}
          />
        ) : null,
    },
  ];
  return assembleDetailTabs(entries, readOnly);
}
