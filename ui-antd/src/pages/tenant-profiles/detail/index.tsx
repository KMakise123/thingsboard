/**
 * Tenant-profile detail page (spec 3.7; SA only per routes/access).
 *
 * ui-ngx tenant-profile details parity: the General form (name /
 * description / isolated rule-engine toggle with the queues editor /
 * profileData.configuration groups) lives in the page-header area; the
 * attributes / latest telemetry / audit-logs tabs render in read mode only
 * (ui-ngx hides the tabs while editing). `:id` === 'create' (the frozen
 * route table has no separate create path — ui-ngx also routes create
 * through :entityId) opens a blank form with the default configuration.
 * Every exit routes through the dirty guard (PageContainer onBack +
 * beforeunload); leaving edit mode with unsaved changes confirms first.
 */
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import AttributesPanel from '@/components/entities/detail/AttributesPanel';
import AuditLogsPanel from '@/components/entities/detail/AuditLogsPanel';
import {
  assembleDetailTabs,
  type DetailTabEntry,
} from '@/components/entities/detail/detail-tabs';
import LatestTelemetryPanel from '@/components/entities/detail/LatestTelemetryPanel';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import {
  defaultIsolatedQueues,
  formValuesToProfile,
  profileToFormValues,
  type TenantProfileFormValues,
} from '@/components/tenant-profiles/profile-form';
import { TenantProfileConfigurationFields } from '@/components/tenant-profiles/TenantProfileConfigurationFields';
import { TenantProfileQueues } from '@/components/tenant-profiles/TenantProfileQueues';
import {
  deleteTenantProfile,
  getTenantProfileById,
  saveTenantProfile,
} from '@/services/tb/tenant-profile';
import { AttributeScope } from '@/types/tb';
import { type DetailTab, useDetailTabUrlState } from './url-state';

const CREATE_ROUTE_ID = 'create';

export default function TenantProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const profileId = id as string;
  const isCreate = profileId === CREATE_ROUTE_ID;
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { tab: requestedTab, setTab } = useDetailTabUrlState();

  const [editing, setEditing] = useState(isCreate);
  const [dirty, setDirty] = useState(false);
  const [form] = Form.useForm<TenantProfileFormValues>();

  const profileQuery = useQuery({
    queryKey: ['tenant-profiles', 'detail', profileId],
    queryFn: () => getTenantProfileById(profileId),
    enabled: !isCreate && !!profileId,
  });
  const profile = profileQuery.data;

  // Query data (refetched after save) is the single source of truth for the
  // form; editing state never writes back into the query cache.
  useEffect(() => {
    if (isCreate) {
      form.setFieldsValue(profileToFormValues(null));
      return;
    }
    if (profile && !dirty) {
      form.setFieldsValue(profileToFormValues(profile));
    }
  }, [profile, dirty, form, isCreate]);

  const saveMutation = useMutation({
    mutationFn: (values: TenantProfileFormValues) =>
      saveTenantProfile(formValuesToProfile(values, profile)),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.tenantProfiles.detail.toastSaved',
          defaultMessage: 'Tenant profile saved.',
        }),
      );
      setDirty(false);
      setEditing(false);
      if (isCreate) {
        history.replace(`/tenantProfiles/${saved.id.id}`);
      }
      void queryClient.invalidateQueries({ queryKey: ['tenant-profiles'] });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (idToDelete: string) => deleteTenantProfile(idToDelete),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.tenantProfiles.list.toastDeleted',
          defaultMessage: 'Tenant profile deleted.',
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['tenant-profiles'] });
      history.replace('/tenantProfiles');
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
    if (profile) {
      form.setFieldsValue(profileToFormValues(profile));
    }
  };

  const toggleEdit = () => {
    if (editing) {
      if (dirty) {
        confirmDiscard(leaveEditMode);
        return;
      }
      if (isCreate) {
        history.replace('/tenantProfiles');
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
    if (!profile || profile.default) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.tenantProfiles.list.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the tenant profile '{name}'?",
        },
        { name: profile.name },
      ),
      content: formatMessage({
        id: 'pages.tenantProfiles.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the tenant profile and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.tenantProfiles.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(profile.id.id),
    });
  };

  // The isolated toggle seeds/clears the stock queues exactly like ui-ngx.
  const onValuesChange = (
    changed: Partial<TenantProfileFormValues>,
    values: TenantProfileFormValues,
  ) => {
    setDirty(true);
    if (changed.isolatedTbRuleEngine !== undefined) {
      form.setFieldValue(
        ['profileData', 'queueConfiguration'],
        changed.isolatedTbRuleEngine ? defaultIsolatedQueues() : null,
      );
    }
    void values;
  };

  // Tabs render in read mode only (ui-ngx tenant-profile details).
  const tabItems = assembleDetailTabs(
    [
      {
        key: 'attributes',
        label: formatMessage({
          id: 'pages.tenantProfiles.detail.tabAttributes',
          defaultMessage: 'Attributes',
        }),
        render: () =>
          profile ? (
            <AttributesPanel
              entityId={profile.id}
              readOnly={false}
              defaultScope={AttributeScope.SERVER_SCOPE}
            />
          ) : null,
      },
      {
        key: 'latest-telemetry',
        label: formatMessage({
          id: 'pages.tenantProfiles.detail.tabLatestTelemetry',
          defaultMessage: 'Latest telemetry',
        }),
        render: () =>
          profile ? <LatestTelemetryPanel entityId={profile.id} /> : null,
      },
      {
        key: 'audit-logs',
        label: formatMessage({
          id: 'pages.tenantProfiles.detail.tabAuditLogs',
          defaultMessage: 'Audit logs',
        }),
        render: () =>
          profile ? <AuditLogsPanel entityId={profile.id} /> : null,
      },
    ] satisfies Array<DetailTabEntry>,
    false,
  );

  const generalFields = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'pages.tenantProfiles.detail.name',
            defaultMessage: 'Name',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.tenantProfiles.detail.nameRequired',
                defaultMessage: 'Name is required.',
              }),
            },
            {
              max: 255,
              message: formatMessage({
                id: 'pages.tenantProfiles.detail.nameMaxLength',
                defaultMessage: 'Name must be at most 255 characters.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="isolatedTbRuleEngine"
          valuePropName="checked"
          className="flex items-center pt-8"
        >
          <Checkbox>
            {formatMessage({
              id: 'pages.tenantProfiles.detail.isolatedTbRuleEngine',
              defaultMessage: 'Isolated ThingsBoard Rule Engine queues',
            })}
          </Checkbox>
        </Form.Item>
      </div>
      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue }) =>
          getFieldValue('isolatedTbRuleEngine') ? (
            <div>
              <div className="mb-2 text-base font-medium">
                {formatMessage({
                  id: 'pages.tenantProfiles.detail.queues',
                  defaultMessage: 'Queues',
                })}
              </div>
              <TenantProfileQueues />
            </div>
          ) : null
        }
      </Form.Item>
      <Form.Item
        name="description"
        label={formatMessage({
          id: 'pages.tenantProfiles.list.description',
          defaultMessage: 'Description',
        })}
      >
        <Input.TextArea rows={2} autoSize={{ minRows: 1, maxRows: 6 }} />
      </Form.Item>
      <div>
        <div className="mb-2 text-base font-medium">
          {formatMessage({
            id: 'pages.tenantProfiles.detail.profileConfiguration',
            defaultMessage: 'Profile configuration',
          })}
        </div>
        <TenantProfileConfigurationFields
          prefix={['profileData', 'configuration']}
        />
      </div>
    </div>
  );

  const title = isCreate
    ? formatMessage({
        id: 'pages.tenantProfiles.list.add',
        defaultMessage: 'Add tenant profile',
      })
    : (profile?.name ?? profileId);

  return (
    <PageContainer
      title={title}
      breadcrumbLabel={title}
      tags={
        !isCreate && profile?.default ? (
          <Tag color="success">
            {formatMessage({
              id: 'pages.tenantProfiles.list.default',
              defaultMessage: 'Default',
            })}
          </Tag>
        ) : undefined
      }
      extra={
        (isCreate || profile) && (
          <Space>
            {editing && (
              <>
                <Button onClick={toggleEdit}>
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
                    id: 'pages.tenantProfiles.detail.actionSave',
                    defaultMessage: 'Save',
                  })}
                </Button>
              </>
            )}
            {!isCreate && profile && !profile.default && (
              <Button danger icon={<DeleteOutlined />} onClick={confirmDelete}>
                {formatMessage({
                  id: 'pages.tenantProfiles.list.actionDelete',
                  defaultMessage: 'Delete',
                })}
              </Button>
            )}
            {!isCreate && (
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
            )}
          </Space>
        )
      }
      // The wrapper guards this against unsaved changes (dirty).
      onBack={() => history.push('/tenantProfiles')}
      dirty={dirty}
      content={
        !isCreate && profileQuery.isPending ? (
          <div className="flex justify-center py-6">
            <Spin />
          </div>
        ) : !isCreate && profileQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title={formatMessage({
              id: 'pages.tenantProfiles.detail.loadFailed',
              defaultMessage: 'Failed to load the tenant profile',
            })}
            description={serverErrorText(profileQuery.error)}
          />
        ) : editing ? (
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.tenantProfiles.detail.editingHint',
              defaultMessage:
                'Edit the profile fields, then save. Unsaved changes are guarded on leave.',
            })}
          </Typography.Text>
        ) : (
          <Space size={16} wrap>
            {profile?.description && (
              <Typography.Text type="secondary" ellipsis>
                {profile.description}
              </Typography.Text>
            )}
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.tenantProfiles.detail.isolatedTbRuleEngine',
                defaultMessage: 'Isolated ThingsBoard Rule Engine queues',
              })}
              : {profile?.isolatedTbRuleEngine ? '✓' : '—'}
            </Typography.Text>
          </Space>
        )
      }
    >
      <Card>
        {editing ? (
          <Form form={form} layout="vertical" onValuesChange={onValuesChange}>
            {generalFields}
          </Form>
        ) : (
          profile && (
            <Tabs
              activeKey={requestedTab}
              onChange={(next) => setTab(next as DetailTab)}
              destroyOnHidden
              items={tabItems}
            />
          )
        )}
      </Card>
    </PageContainer>
  );
}
