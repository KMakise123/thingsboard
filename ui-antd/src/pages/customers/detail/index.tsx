/**
 * Customer detail page (spec 3.5「详情 7 tab」, ui-ngx customer-tabs
 * parity): attributes(SERVER_SCOPE) / latest telemetry / alarm-rules(TA) /
 * alarms / relations / audit-logs(TA) / version-control(TA,
 * entityType=CUSTOMER). NO details tab — the customer form lives in the
 * page-header area instead (M2 adjudication): read mode shows a compact
 * contact summary, Edit swaps in the shared CustomerFormFields.
 *
 * Shell mechanics mirror the device detail: only the active tab mounts
 * (destroyOnHidden — WS manager 10-cmd budget), the active tab lives in the
 * URL (`?tab=`), hand-typed TA-only tabs fall back to the default for CU,
 * and every exit routes through the dirty guard (PageContainer onBack +
 * tab switch + beforeunload).
 */
import { EditOutlined } from '@ant-design/icons';
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
import {
  CustomerFormFields,
  type CustomerFormValues,
  customerToFormValues,
  formValuesToCustomer,
} from '@/components/customers/CustomerFormFields';
import AlarmRulesPanel from '@/components/entities/detail/AlarmRulesPanel';
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
import PageContainer from '@/components/layout/page-container';
import { useAuthority } from '@/pages/devices/list/use-authority';
import { getCustomerById, saveCustomer } from '@/services/tb/customer';
import type { Customer } from '@/types/tb';
import { AttributeScope, EntityType } from '@/types/tb';
import {
  type DetailTab,
  isTaOnlyDetailTab,
  useDetailTabUrlState,
} from './url-state';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { authority } = useAuthority();
  const readOnly = authority !== 'TENANT_ADMIN';
  const { tab: requestedTab, setTab } = useDetailTabUrlState();
  // CU never sees the TA-only tabs, even via a hand-typed ?tab= URL.
  const tab =
    readOnly && isTaOnlyDetailTab(requestedTab)
      ? ('attributes' as DetailTab)
      : requestedTab;

  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [form] = Form.useForm<CustomerFormValues>();

  const customerQuery = useQuery({
    queryKey: ['customer', 'detail', id],
    queryFn: () => getCustomerById(id as string),
    enabled: !!id,
  });
  const customer = customerQuery.data;

  // Query data (refetched after save) is the single source of truth for the
  // form; editing state never writes back into the query cache.
  useEffect(() => {
    if (customer && !dirty) {
      form.setFieldsValue(customerToFormValues(customer));
    }
  }, [customer, dirty, form]);

  const saveMutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      saveCustomer(formValuesToCustomer(values, customer)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.form.toastSaved',
          defaultMessage: 'Customer saved.',
        }),
      );
      setDirty(false);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['customer', 'detail'] });
      void queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
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
    if (customer) {
      form.setFieldsValue(customerToFormValues(customer));
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

  const tabItems = buildTabItems({
    formatMessage,
    customer,
    readOnly,
  });

  const headerForm = (
    <Form
      form={form}
      layout="vertical"
      disabled={!editing}
      onValuesChange={() => setDirty(true)}
    >
      <CustomerFormFields customerId={customer?.id.id} />
    </Form>
  );

  return (
    <PageContainer
      title={customer?.title ?? id}
      // Dynamic breadcrumb segment: the customer's real title, same fallback
      // as the header title (ADR 0008).
      breadcrumbLabel={customer?.title ?? id}
      extra={
        !readOnly &&
        customer && (
          <Space>
            {editing && (
              <>
                <Button onClick={leaveEditMode}>
                  {formatMessage({
                    id: 'pages.customers.form.cancel',
                    defaultMessage: 'Cancel',
                  })}
                </Button>
                <Button
                  type="primary"
                  loading={saveMutation.isPending}
                  onClick={() => void save()}
                >
                  {formatMessage({
                    id: 'pages.customers.form.save',
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
                  ? 'pages.customers.form.cancelEdit'
                  : 'pages.customers.form.edit',
                defaultMessage: editing ? 'Cancel edit' : 'Edit',
              })}
            </Button>
          </Space>
        )
      }
      // The wrapper guards this against unsaved changes (dirty).
      onBack={() => history.push('/customers')}
      dirty={dirty}
      content={
        customerQuery.isPending ? (
          <div className="flex justify-center py-6">
            <Spin />
          </div>
        ) : customerQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title={formatMessage({
              id: 'pages.customers.detail.loadFailed',
              defaultMessage: 'Failed to load the customer',
            })}
            description={serverErrorText(customerQuery.error)}
          />
        ) : editing ? (
          headerForm
        ) : (
          <Space size={16} wrap>
            {customer?.email && (
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.customers.form.email',
                  defaultMessage: 'Email',
                })}
                : {customer.email}
              </Typography.Text>
            )}
            {customer?.phone && (
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.customers.form.phone',
                  defaultMessage: 'Phone',
                })}
                : {customer.phone}
              </Typography.Text>
            )}
            {(customer?.country || customer?.city) && (
              <Typography.Text type="secondary">
                {[customer.country, customer.city].filter(Boolean).join(' / ')}
              </Typography.Text>
            )}
            {customer?.additionalInfo?.description && (
              <Typography.Text type="secondary" ellipsis>
                {customer.additionalInfo.description}
              </Typography.Text>
            )}
          </Space>
        )
      }
    >
      <Card>
        {customer && (
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
 * Customer tab registry (M2 shared shape): 7 ordered entries, TA-only tabs
 * marked — they drop out for CU exactly like ui-ngx customer-tabs' @if
 * authority === TENANT_ADMIN blocks (alarm-rules, audit-logs,
 * version-control).
 */
function buildTabItems({
  formatMessage,
  customer,
  readOnly,
}: {
  formatMessage: ReturnType<typeof useIntl>['formatMessage'];
  customer?: Customer;
  readOnly: boolean;
}): ReturnType<typeof assembleDetailTabs> {
  const entries: Array<DetailTabEntry> = [
    {
      key: 'attributes',
      label: formatMessage({
        id: 'pages.customers.detail.tabAttributes',
        defaultMessage: 'Attributes',
      }),
      render: () =>
        customer ? (
          <AttributesPanel
            entityId={customer.id}
            readOnly={readOnly}
            defaultScope={AttributeScope.SERVER_SCOPE}
          />
        ) : null,
    },
    {
      key: 'latest-telemetry',
      label: formatMessage({
        id: 'pages.customers.detail.tabLatestTelemetry',
        defaultMessage: 'Latest telemetry',
      }),
      render: () =>
        customer ? <LatestTelemetryPanel entityId={customer.id} /> : null,
    },
    // TA-only, same slot as ui-ngx customer-tabs.
    {
      key: 'alarm-rules',
      taOnly: true,
      label: formatMessage({
        id: 'pages.customers.detail.tabAlarmRules',
        defaultMessage: 'Alarm rules',
      }),
      render: () =>
        customer ? <AlarmRulesPanel entityId={customer.id} /> : null,
    },
    {
      key: 'alarms',
      label: formatMessage({
        id: 'pages.customers.detail.tabAlarms',
        defaultMessage: 'Alarms',
      }),
      render: () =>
        customer ? (
          <AlarmsPanel entityId={customer.id} readOnly={readOnly} />
        ) : null,
    },
    {
      key: 'relations',
      label: formatMessage({
        id: 'pages.customers.detail.tabRelations',
        defaultMessage: 'Relations',
      }),
      render: () =>
        customer ? (
          <RelationsPanel entityId={customer.id} readOnly={readOnly} />
        ) : null,
    },
    // TA-only pair, same slot as ui-ngx customer-tabs.
    {
      key: 'audit-logs',
      taOnly: true,
      label: formatMessage({
        id: 'pages.customers.detail.tabAuditLogs',
        defaultMessage: 'Audit logs',
      }),
      render: () =>
        customer ? <AuditLogsPanel entityId={customer.id} /> : null,
    },
    {
      key: 'version-control',
      taOnly: true,
      label: formatMessage({
        id: 'pages.customers.detail.tabVersionControl',
        defaultMessage: 'Version control',
      }),
      render: () =>
        customer ? (
          <VersionControlPanel
            entityId={customer.id}
            entityType={EntityType.CUSTOMER}
          />
        ) : null,
    },
  ];
  return assembleDetailTabs(entries, readOnly);
}
