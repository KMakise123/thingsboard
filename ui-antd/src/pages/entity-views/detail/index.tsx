/**
 * Entity-view detail page (spec 3.4「6 tab 且禁添加遥测」).
 *
 * The ui-ngx entity-view form lives in the page header (PageContainer
 * content): view mode renders it disabled, the Edit toggle unlocks it with
 * save/cancel and the dirty guard (tab switch, back arrow, beforeunload).
 * Below it, the six-tab set of ui-ngx entity-view-tabs — attributes
 * (CLIENT scope), latest telemetry (add-telemetry disabled), alarms,
 * relations, then the TA-only audit-logs and version-control. No details /
 * calculated-fields / events tabs. Only the active tab mounts
 * (destroyOnHidden) to protect the WS manager's 10-cmd budget.
 *
 * Entity views are tenant-admin land; a hand-typed URL as CU gets the
 * read-only surface and never the TA-only tabs, whatever ?tab= says.
 */
import { EditOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import { Alert, App, Button, Card, Form, Spin, Tabs, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import AlarmsPanel from '@/components/entities/detail/AlarmsPanel';
import AttributesPanel from '@/components/entities/detail/AttributesPanel';
import AuditLogsPanel from '@/components/entities/detail/AuditLogsPanel';
import {
  assembleDetailTabs,
  type DetailTabEntry,
} from '@/components/entities/detail/detail-tabs';
import LatestTelemetryPanel from '@/components/entities/detail/LatestTelemetryPanel';
import RelationsPanel from '@/components/entities/detail/RelationsPanel';
import VersionControlPanel from '@/components/entities/detail/VersionControlPanel';
import { serverErrorText } from '@/components/entities/server-error-text';
import EntityViewFormFields from '@/components/entity-views/EntityViewFormFields';
import {
  buildEntityViewPayload,
  type EntityViewFormValues,
  emptyFormNumbers,
  entityViewToFormNumbers,
  formNumbersToFormValues,
  formValuesToNumbers,
  isEntityViewFormDirty,
} from '@/components/entity-views/entity-view-form';
import PageContainer from '@/components/layout/page-container';
import {
  getEntityViewInfoById,
  saveEntityView,
} from '@/services/tb/entity-view';
import type { EntityViewInfo } from '@/types/tb';
import { AttributeScope, EntityType } from '@/types/tb';
import { useAuthority } from '../use-authority';
import {
  type DetailTab,
  isTaOnlyDetailTab,
  useDetailTabUrlState,
} from './url-state';

export default function EntityViewDetailPage() {
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

  const entityViewQuery = useQuery({
    queryKey: ['entity-view', 'detail', id],
    queryFn: () => getEntityViewInfoById(id as string),
    enabled: !!id,
  });
  const entityView = entityViewQuery.data;

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ['entity-view', 'detail', id],
    });
    void queryClient.invalidateQueries({ queryKey: ['entity-views', 'list'] });
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
          id: 'pages.entityViews.detail.unsavedTitle',
          defaultMessage: 'Unsaved changes',
        }),
        content: formatMessage({
          id: 'pages.entityViews.detail.unsavedText',
          defaultMessage:
            'The entity view has unsaved changes. Leave anyway? Changes will be lost.',
        }),
        okText: formatMessage({
          id: 'pages.entityViews.detail.unsavedLeave',
          defaultMessage: 'Leave',
        }),
        cancelText: formatMessage({
          id: 'pages.entityViews.detail.cancel',
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

  const saveMutation = useMutation({
    mutationFn: (values: EntityViewFormValues) =>
      saveEntityView(
        buildEntityViewPayload(formValuesToNumbers(values), entityView),
      ),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.entityViews.detail.toastSaved',
          defaultMessage: 'Entity view saved.',
        }),
      );
      invalidate();
      leaveEditMode();
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.entityViews.detail.saveFailed',
            defaultMessage: 'Failed to save the entity view: {reason}',
          },
          { reason: serverErrorText(error) },
        ),
      );
    },
  });

  const tabItems = buildTabItems({
    formatMessage,
    entityView,
    readOnly,
  });

  return (
    <PageContainer
      title={entityView?.name ?? id}
      breadcrumbLabel={entityView?.name ?? id}
      tags={
        entityView ? (
          <HeaderTags entityView={entityView} formatMessage={formatMessage} />
        ) : undefined
      }
      extra={
        !readOnly && (
          <Button
            icon={<EditOutlined />}
            onClick={toggleEdit}
            danger={editing && dirty}
            disabled={!entityView}
          >
            {formatMessage({
              id: editing
                ? 'pages.entityViews.detail.cancelEdit'
                : 'pages.entityViews.detail.edit',
              defaultMessage: editing ? 'Cancel edit' : 'Edit',
            })}
          </Button>
        )
      }
      // The wrapper guards this against unsaved changes (dirty), ADR 0008.
      onBack={() => history.push('/entityViews')}
      dirty={dirty}
      content={
        entityView ? (
          <HeaderForm
            // Fresh form instance per server state: a remount is the one
            // way initialValues reliably re-apply after a save + refetch.
            key={JSON.stringify(entityViewToFormNumbers(entityView))}
            entityView={entityView}
            editing={editing && !readOnly}
            saving={saveMutation.isPending}
            onDirtyChange={setDirty}
            onFinish={(values) => saveMutation.mutate(values)}
          />
        ) : null
      }
    >
      <Card>
        {entityViewQuery.isPending && (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        )}
        {entityViewQuery.isError && (
          <Alert
            type="error"
            showIcon
            message={formatMessage({
              id: 'pages.entityViews.detail.loadFailed',
              defaultMessage: 'Failed to load the entity view',
            })}
            description={serverErrorText(entityViewQuery.error)}
          />
        )}
        {entityView && (
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
 * The header form: the shared entity-view field set. View mode renders the
 * form disabled (ui-ngx `fieldset disabled` semantics) so read and edit
 * share one field declaration; dirty is Form.useWatch against the entity's
 * baseline, and a key remount re-applies server values after a save.
 */
function HeaderForm({
  entityView,
  editing,
  saving,
  onDirtyChange,
  onFinish,
}: {
  entityView?: EntityViewInfo;
  editing: boolean;
  saving: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onFinish: (values: EntityViewFormValues) => void;
}) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<EntityViewFormValues>();
  const baseline = useMemo(
    () =>
      entityView ? entityViewToFormNumbers(entityView) : emptyFormNumbers(),
    [entityView],
  );
  const values = Form.useWatch([], form);
  const numbers = useMemo(
    () => (values ? formValuesToNumbers(values as EntityViewFormValues) : null),
    [values],
  );
  // Dirty is only meaningful while editing (same reasoning as the device
  // details tab: the disabled form can transiently diverge from baseline).
  const dirty =
    editing && !!numbers && isEntityViewFormDirty(numbers, baseline);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  return (
    <Form<EntityViewFormValues>
      form={form}
      layout="vertical"
      initialValues={formNumbersToFormValues(baseline)}
      onFinish={onFinish}
      disabled={!editing || saving}
    >
      <EntityViewFormFields />
      {editing && (
        <Button
          type="primary"
          htmlType="submit"
          loading={saving}
          disabled={!dirty}
        >
          {formatMessage({
            id: 'pages.entityViews.detail.save',
            defaultMessage: 'Save',
          })}
        </Button>
      )}
    </Form>
  );
}

/** Type tag + public tag in the header (ui-ngx shows both on the entity). */
function HeaderTags({
  entityView,
  formatMessage,
}: {
  entityView: EntityViewInfo;
  formatMessage: ReturnType<typeof useIntl>['formatMessage'];
}) {
  return (
    <>
      {entityView.type ? <Tag>{entityView.type}</Tag> : null}
      {entityView.customerIsPublic ? (
        <Tag color="blue">
          {formatMessage({
            id: 'pages.entityViews.detail.public',
            defaultMessage: 'Public',
          })}
        </Tag>
      ) : null}
    </>
  );
}

/**
 * Entity-view tab registry (M2 shared shape): the six ui-ngx
 * entity-view-tabs entries in order; audit-logs and version-control are
 * TA-only. Attributes default to CLIENT_SCOPE (ui-ngx defaultAttributeScope)
 * and the latest-telemetry panel carries disableAddTelemetry.
 */
function buildTabItems({
  formatMessage,
  entityView,
  readOnly,
}: {
  formatMessage: ReturnType<typeof useIntl>['formatMessage'];
  entityView?: EntityViewInfo;
  readOnly: boolean;
}): ReturnType<typeof assembleDetailTabs> {
  const entries: Array<DetailTabEntry> = [
    {
      key: 'attributes',
      label: formatMessage({
        id: 'pages.entityViews.detail.tabAttributes',
        defaultMessage: 'Attributes',
      }),
      render: () =>
        entityView ? (
          <AttributesPanel
            entityId={entityView.id}
            readOnly={readOnly}
            defaultScope={AttributeScope.CLIENT_SCOPE}
          />
        ) : null,
    },
    {
      key: 'latest-telemetry',
      label: formatMessage({
        id: 'pages.entityViews.detail.tabLatestTelemetry',
        defaultMessage: 'Latest telemetry',
      }),
      render: () =>
        entityView ? (
          <LatestTelemetryPanel entityId={entityView.id} disableAddTelemetry />
        ) : null,
    },
    {
      key: 'alarms',
      label: formatMessage({
        id: 'pages.entityViews.detail.tabAlarms',
        defaultMessage: 'Alarms',
      }),
      render: () =>
        entityView ? (
          <AlarmsPanel entityId={entityView.id} readOnly={readOnly} />
        ) : null,
    },
    {
      key: 'relations',
      label: formatMessage({
        id: 'pages.entityViews.detail.tabRelations',
        defaultMessage: 'Relations',
      }),
      render: () =>
        entityView ? (
          <RelationsPanel entityId={entityView.id} readOnly={readOnly} />
        ) : null,
    },
    {
      key: 'audit-logs',
      taOnly: true,
      label: formatMessage({
        id: 'pages.entityViews.detail.tabAuditLogs',
        defaultMessage: 'Audit logs',
      }),
      render: () =>
        entityView ? <AuditLogsPanel entityId={entityView.id} /> : null,
    },
    {
      key: 'version-control',
      taOnly: true,
      label: formatMessage({
        id: 'pages.entityViews.detail.tabVersionControl',
        defaultMessage: 'Version control',
      }),
      render: () =>
        entityView ? (
          <VersionControlPanel
            entityId={entityView.id}
            entityType={EntityType.ENTITY_VIEW}
          />
        ) : null,
    },
  ];
  return assembleDetailTabs(entries, readOnly);
}
