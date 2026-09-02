/**
 * Tenant detail page (spec 3.7; SA only per routes/access).
 *
 * ui-ngx tenant-tabs parity: attributes(SERVER_SCOPE) / latest telemetry /
 * events(ERROR) / relations. NO details tab — the tenant form lives in the
 * page-header area (M2 shape, customers detail): read mode shows a compact
 * summary, Edit swaps in the shared TenantFormFields.
 *
 * Header actions follow ui-ngx: open details (edit toggle) / manage tenant
 * admins / delete. Every exit routes through the dirty guard (PageContainer
 * onBack + tab switch + beforeunload).
 */
import { DeleteOutlined, EditOutlined, UserOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Space,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import AttributesPanel from '@/components/entities/detail/AttributesPanel';
import {
  assembleDetailTabs,
  type DetailTabEntry,
} from '@/components/entities/detail/detail-tabs';
import LatestTelemetryPanel from '@/components/entities/detail/LatestTelemetryPanel';
import RelationsPanel from '@/components/entities/detail/RelationsPanel';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import TenantEventsPanel from '@/components/tenants/TenantEventsPanel';
import {
  formValuesToTenant,
  TenantFormFields,
  type TenantFormValues,
  tenantToFormValues,
} from '@/components/tenants/TenantFormFields';
import { deleteTenant, getTenantInfo, saveTenant } from '@/services/tb/tenant';
import { AttributeScope } from '@/types/tb';
import { type DetailTab, useDetailTabUrlState } from './url-state';

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { tab, setTab } = useDetailTabUrlState();

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [form] = Form.useForm<TenantFormValues>();

  const tenantQuery = useQuery({
    queryKey: ['tenant', 'detail', id],
    queryFn: () => getTenantInfo(id as string),
    enabled: !!id,
  });
  const tenant = tenantQuery.data;

  // Query data (refetched after save) is the single source of truth for the
  // form; editing state never writes back into the query cache.
  useEffect(() => {
    if (tenant && !dirty) {
      form.setFieldsValue(tenantToFormValues(tenant));
    }
  }, [tenant, dirty, form]);

  const saveMutation = useMutation({
    mutationFn: (values: TenantFormValues) =>
      saveTenant(formValuesToTenant(values, tenant)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.tenants.detail.toastSaved',
          defaultMessage: 'Tenant saved.',
        }),
      );
      setDirty(false);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'detail'] });
      void queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tenantId: string) => deleteTenant(tenantId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.tenants.list.toastDeleted',
          defaultMessage: 'Tenant deleted.',
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['tenants'] });
      history.replace('/tenants');
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

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
          id: 'pages.common.unsavedTitle',
          defaultMessage: 'Unsaved changes',
        }),
        content: formatMessage({
          id: 'pages.common.unsavedText',
          defaultMessage:
            'You have unsaved changes. Leave anyway? Changes will be lost.',
        }),
        okText: formatMessage({
          id: 'pages.common.unsavedLeave',
          defaultMessage: 'Leave',
        }),
        cancelText: formatMessage({
          id: 'pages.common.cancel',
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
    if (tenant) {
      form.setFieldsValue(tenantToFormValues(tenant));
    }
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
    if (editing) {
      if (dirty) {
        confirmDiscard(leaveEditMode);
        return;
      }
      leaveEditMode();
      return;
    }
    setEditing(true);
  };

  const save = async () => {
    // Failed validation rejects — expected control flow, swallow it (the
    // field errors render inline).
    const values = await form.validateFields().catch(() => undefined);
    if (!values) {
      return;
    }
    saveMutation.mutate(values);
  };

  const confirmDelete = () => {
    if (!tenant) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.tenants.list.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the tenant '{title}'?",
        },
        { title: tenant.title },
      ),
      content: formatMessage({
        id: 'pages.tenants.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the tenant and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.tenants.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(tenant.id.id),
    });
  };

  const tabItems = assembleDetailTabs(
    [
      {
        key: 'attributes',
        label: formatMessage({
          id: 'pages.tenants.detail.tabAttributes',
          defaultMessage: 'Attributes',
        }),
        render: () =>
          tenant ? (
            <AttributesPanel
              entityId={tenant.id}
              readOnly={false}
              defaultScope={AttributeScope.SERVER_SCOPE}
            />
          ) : null,
      },
      {
        key: 'latest-telemetry',
        label: formatMessage({
          id: 'pages.tenants.detail.tabLatestTelemetry',
          defaultMessage: 'Latest telemetry',
        }),
        render: () =>
          tenant ? <LatestTelemetryPanel entityId={tenant.id} /> : null,
      },
      {
        key: 'events',
        label: formatMessage({
          id: 'pages.tenants.detail.tabEvents',
          defaultMessage: 'Events',
        }),
        render: () =>
          tenant ? <TenantEventsPanel tenantId={tenant.id.id} /> : null,
      },
      {
        key: 'relations',
        label: formatMessage({
          id: 'pages.tenants.detail.tabRelations',
          defaultMessage: 'Relations',
        }),
        render: () =>
          tenant ? (
            <RelationsPanel entityId={tenant.id} readOnly={false} />
          ) : null,
      },
    ] satisfies Array<DetailTabEntry>,
    false,
  );

  const headerForm = (
    <Form
      form={form}
      layout="vertical"
      disabled={!editing}
      onValuesChange={() => setDirty(true)}
    >
      <TenantFormFields
        tenantId={tenant?.id.id}
        tenantProfileId={tenant?.tenantProfileId?.id}
      />
    </Form>
  );

  return (
    <PageContainer
      title={tenant?.title ?? id}
      // Dynamic breadcrumb segment: the tenant's real title (ADR 0008).
      breadcrumbLabel={tenant?.title ?? id}
      extra={
        tenant && (
          <Space>
            <Button
              icon={<UserOutlined />}
              onClick={() => history.push(`/tenants/${tenant.id.id}/users`)}
            >
              {formatMessage({
                id: 'pages.tenants.list.actionManageAdmins',
                defaultMessage: 'Manage tenant admins',
              })}
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={confirmDelete}>
              {formatMessage({
                id: 'pages.tenants.list.actionDelete',
                defaultMessage: 'Delete',
              })}
            </Button>
            {editing && (
              <>
                <Button onClick={leaveEditMode}>
                  {formatMessage({
                    id: 'pages.common.cancel',
                    defaultMessage: 'Cancel',
                  })}
                </Button>
                <Button
                  type="primary"
                  loading={saveMutation.isPending}
                  onClick={() => void save()}
                >
                  {formatMessage({
                    id: 'pages.tenants.dialog.actionSave',
                    defaultMessage: 'Save',
                  })}
                </Button>
              </>
            )}
            <Button
              icon={<EditOutlined />}
              onClick={toggleEdit}
              danger={editing && dirty}
            >
              {formatMessage({
                id: editing
                  ? 'pages.tenants.detail.cancelEdit'
                  : 'pages.tenants.detail.edit',
                defaultMessage: editing ? 'Cancel edit' : 'Edit',
              })}
            </Button>
          </Space>
        )
      }
      // The wrapper guards this against unsaved changes (dirty).
      onBack={() => history.push('/tenants')}
      dirty={dirty}
      content={
        tenantQuery.isPending ? (
          <div className="flex justify-center py-6">
            <Spin />
          </div>
        ) : tenantQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title={formatMessage({
              id: 'pages.tenants.detail.loadFailed',
              defaultMessage: 'Failed to load the tenant',
            })}
            description={serverErrorText(tenantQuery.error)}
          />
        ) : editing ? (
          headerForm
        ) : (
          <Space size={16} wrap>
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.tenants.list.tenantProfile',
                defaultMessage: 'Tenant profile',
              })}
              : {tenant?.tenantProfileName ?? '-'}
            </Typography.Text>
            {tenant?.email && (
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.tenants.form.email',
                  defaultMessage: 'Email',
                })}
                : {tenant.email}
              </Typography.Text>
            )}
            {(tenant?.country || tenant?.city) && (
              <Typography.Text type="secondary">
                {[tenant.country, tenant.city].filter(Boolean).join(' / ')}
              </Typography.Text>
            )}
            {tenant?.additionalInfo?.description && (
              <Typography.Text type="secondary" ellipsis>
                {tenant.additionalInfo.description}
              </Typography.Text>
            )}
          </Space>
        )
      }
    >
      <Card>
        {tenant && (
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
