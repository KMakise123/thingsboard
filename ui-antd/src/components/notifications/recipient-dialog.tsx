/**
 * Shared create/edit recipient (notification target) dialog — M12 wave 3-A,
 * spec §4.4; the recipients page hosts it and the sent/rules agents reuse it
 * for their inline "new recipient" entries (ui-ngx
 * recipient-notification-dialog parity).
 *
 * Structure per target type: PLATFORM_USERS → the role-narrowed usersFilter
 * select plus the variant-specific pickers; SLACK → channel-type radio +
 * conversation search (getSlackConversations); MICROSOFT_TEAMS → old/new API
 * switch + webhookUrl/channelName. Save rides saveNotificationTarget; the
 * caller closes via onClose and refreshes via onSaved.
 *
 * The per-type blocks render through one `Form.Item shouldUpdate` render-prop
 * (M11 linked-fields pattern) instead of Form.useWatch: the watch lags one
 * render behind setFieldsValue, which would leave the conditional fields
 * unregistered on a same-tick submit.
 */
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import { useAuthority } from '@/components/shared/use-authority';
import { getCustomerById, getCustomers } from '@/services/tb/customer';
import {
  getSlackConversations,
  saveNotificationTarget,
} from '@/services/tb/notification';
import { getTenantInfo, getTenantInfos } from '@/services/tb/tenant';
import {
  getTenantProfileInfoById,
  getTenantProfileInfos,
} from '@/services/tb/tenant-profile';
import { getUserById, getUsers } from '@/services/tb/user';
import type { User } from '@/types/tb';
import {
  type NotificationTarget,
  NotificationTargetType,
  SlackConversationType,
  UsersFilterType,
} from '@/types/tb/notification';
import { RecipientEntitySelect } from './recipient-entity-select';
import {
  emptyRecipientFormValues,
  formValuesToTarget,
  type RecipientFormValues,
  targetToFormValues,
  userFilterTypesFor,
} from './recipient-target-logic';

export interface RecipientDialogProps {
  open: boolean;
  /** Edit source; null/undefined = create. */
  target?: NotificationTarget | null;
  onClose: () => void;
  /** Fired after a successful save (caller invalidates + closes). */
  onSaved: () => void;
}

/** usersFilter variant -> locale key (all 8; visibility is role-narrowed). */
const USER_FILTER_NAME_KEYS: Record<UsersFilterType, string> = {
  [UsersFilterType.ALL_USERS]:
    'pages.notifications.recipients.usersFilter.allUsers',
  [UsersFilterType.TENANT_ADMINISTRATORS]:
    'pages.notifications.recipients.usersFilter.tenantAdministrators',
  [UsersFilterType.CUSTOMER_USERS]:
    'pages.notifications.recipients.usersFilter.customerUsers',
  [UsersFilterType.USER_LIST]:
    'pages.notifications.recipients.usersFilter.userList',
  [UsersFilterType.ORIGINATOR_ENTITY_OWNER_USERS]:
    'pages.notifications.recipients.usersFilter.originatorEntityOwnerUsers',
  [UsersFilterType.AFFECTED_USER]:
    'pages.notifications.recipients.usersFilter.affectedUser',
  [UsersFilterType.SYSTEM_ADMINISTRATORS]:
    'pages.notifications.recipients.usersFilter.systemAdministrators',
  [UsersFilterType.AFFECTED_TENANT_ADMINISTRATORS]:
    'pages.notifications.recipients.usersFilter.affectedTenantAdministrators',
};

const PICKER_PAGE_SORT = (property: string) => ({
  pageSize: 50,
  page: 0,
  sortOrder: { property, direction: 'ASC' as const },
});

const userTitle = (user: User) => user.name || user.email;

export default function RecipientDialog({
  open,
  target,
  onClose,
  onSaved,
}: RecipientDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { authority } = useAuthority();
  const isSysAdmin = authority === 'SYS_ADMIN';
  const [form] = Form.useForm<RecipientFormValues>();
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string>();

  // Drives the Slack conversation query key only; the conditional FIELD
  // rendering goes through shouldUpdate (see the file comment).
  const conversationType = Form.useWatch('conversationType', form);

  // Re-seed on every open (destroyOnHidden unmounts the fields; the store
  // keeps stale preserve values otherwise).
  useEffect(() => {
    if (!open) {
      return;
    }
    setErrorText(undefined);
    form.resetFields();
    form.setFieldsValue(
      target ? targetToFormValues(target) : emptyRecipientFormValues(),
    );
  }, [open, target, form]);

  // Slack conversations: fetched per channel type (ngx caches per type and
  // clears the picked conversation when the type changes).
  const slackQuery = useQuery({
    queryKey: ['notifications', 'slack-conversations', conversationType ?? ''],
    queryFn: () =>
      getSlackConversations(
        (conversationType ??
          SlackConversationType.PUBLIC_CHANNEL) as SlackConversationType,
      ),
    enabled: open && !!conversationType,
  });
  const conversations = slackQuery.data ?? [];

  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });

  /** Full conversation for the stored id: fetched list first, then the edit
   * source's payload (so a saved target round-trips without a refetch). */
  const resolveConversation = (conversationId?: string) => {
    if (!conversationId) {
      return undefined;
    }
    return (
      conversations.find((entry) => entry.id === conversationId) ??
      (target?.configuration.type === NotificationTargetType.SLACK &&
      target.configuration.conversation.id === conversationId
        ? target.configuration.conversation
        : undefined)
    );
  };

  const save = async () => {
    let values: RecipientFormValues;
    try {
      values = await form.validateFields();
    } catch {
      // Validation errors render inline next to the fields.
      return;
    }
    const conversation = resolveConversation(values.conversationId);
    if (values.targetType === NotificationTargetType.SLACK && !conversation) {
      // Id picked but the workspace list never confirmed it (fetch failed).
      setErrorText(
        label(
          'pages.notifications.recipients.conversationUnavailable',
          'Pick the conversation from the list.',
        ),
      );
      return;
    }
    setSaving(true);
    try {
      await saveNotificationTarget(
        formValuesToTarget(values, {
          existing: target,
          conversation,
          isSysAdmin,
        }),
      );
      void message.success(
        label(
          'pages.notifications.recipients.toastSaved',
          'Recipient group saved.',
        ),
      );
      onSaved();
    } catch (error) {
      setErrorText(serverErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  const usersFilterOptions = userFilterTypesFor(authority).map((type) => ({
    value: type,
    label: label(USER_FILTER_NAME_KEYS[type], type),
  }));

  return (
    <Modal
      open={open}
      title={
        target
          ? label('pages.notifications.recipients.edit', 'Edit recipient group')
          : label('pages.notifications.recipients.add', 'Add recipient group')
      }
      okText={label(
        target
          ? 'pages.notifications.recipients.save'
          : 'pages.notifications.recipients.add',
        target ? 'Save' : 'Add',
      )}
      cancelText={label('pages.notifications.recipients.cancel', 'Cancel')}
      confirmLoading={saving}
      onOk={() => void save()}
      onCancel={onClose}
      destroyOnHidden
      mask={{ closable: false }}
      width={560}
    >
      {errorText && (
        <Alert
          type="error"
          showIcon
          title={errorText}
          className="mb-4"
          data-testid="recipient-dialog-error"
        />
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={label('pages.notifications.recipients.name', 'Name')}
          rules={[
            {
              required: true,
              message: label(
                'pages.notifications.recipients.nameRequired',
                'Name is required',
              ),
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="targetType"
          label={label('pages.notifications.recipients.fieldType', 'Type')}
        >
          <Radio.Group>
            <Space orientation="vertical">
              <Radio value={NotificationTargetType.PLATFORM_USERS}>
                {label(
                  'pages.notifications.recipients.targetType.platformUsers',
                  'Platform users',
                )}
              </Radio>
              <Radio value={NotificationTargetType.SLACK}>Slack</Radio>
              <Radio value={NotificationTargetType.MICROSOFT_TEAMS}>
                Microsoft Teams
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prev, next) =>
            prev.targetType !== next.targetType ||
            prev.usersFilterType !== next.usersFilterType ||
            prev.filterByTenants !== next.filterByTenants ||
            prev.useOldApi !== next.useOldApi
          }
        >
          {({ getFieldValue }) => {
            const targetType = getFieldValue('targetType');
            const usersFilterType = getFieldValue('usersFilterType');
            const filterByTenants = getFieldValue('filterByTenants');
            const useOldApi = getFieldValue('useOldApi');

            if (targetType === NotificationTargetType.PLATFORM_USERS) {
              return (
                <>
                  <Form.Item
                    name="usersFilterType"
                    label={label(
                      'pages.notifications.recipients.fieldUsersFilter',
                      'User filter',
                    )}
                  >
                    <Select options={usersFilterOptions} />
                  </Form.Item>

                  {usersFilterType === UsersFilterType.TENANT_ADMINISTRATORS &&
                    isSysAdmin && (
                      <>
                        <Form.Item name="filterByTenants">
                          <Radio.Group>
                            <Radio value={true}>
                              {label(
                                'pages.notifications.recipients.filterByTenants.tenants',
                                'Tenants',
                              )}
                            </Radio>
                            <Radio value={false}>
                              {label(
                                'pages.notifications.recipients.filterByTenants.tenantProfiles',
                                'Tenant profiles',
                              )}
                            </Radio>
                          </Radio.Group>
                        </Form.Item>
                        {filterByTenants ? (
                          <Form.Item
                            name="tenantsIds"
                            label={label(
                              'pages.notifications.recipients.fieldTenants',
                              'Tenants',
                            )}
                            extra={label(
                              'pages.notifications.recipients.tenantsHint',
                              'If empty, the group covers all tenants',
                            )}
                          >
                            <RecipientEntitySelect
                              mode="multiple"
                              queryKey={[
                                'notifications',
                                'recipients-pickers',
                                'tenants',
                              ]}
                              fetchPage={(textSearch) =>
                                getTenantInfos({
                                  ...PICKER_PAGE_SORT('title'),
                                  textSearch: textSearch || undefined,
                                })
                              }
                              toOption={(tenant) => ({
                                label: tenant.title,
                                value: tenant.id.id,
                              })}
                              resolveOne={async (id) => {
                                const tenant = await getTenantInfo(id);
                                return { label: tenant.title, value: id };
                              }}
                              placeholder={label(
                                'pages.notifications.recipients.searchTenants',
                                'Search tenants',
                              )}
                            />
                          </Form.Item>
                        ) : (
                          <Form.Item
                            name="tenantProfilesIds"
                            label={label(
                              'pages.notifications.recipients.fieldTenantProfiles',
                              'Tenant profiles',
                            )}
                            extra={label(
                              'pages.notifications.recipients.tenantProfilesHint',
                              'If empty, the group covers all tenant profiles',
                            )}
                          >
                            <RecipientEntitySelect
                              mode="multiple"
                              queryKey={[
                                'notifications',
                                'recipients-pickers',
                                'tenant-profiles',
                              ]}
                              fetchPage={(textSearch) =>
                                getTenantProfileInfos({
                                  ...PICKER_PAGE_SORT('name'),
                                  textSearch: textSearch || undefined,
                                })
                              }
                              toOption={(profile) => ({
                                label: profile.name,
                                value: profile.id.id,
                              })}
                              resolveOne={async (id) => {
                                const profile =
                                  await getTenantProfileInfoById(id);
                                return { label: profile.name, value: id };
                              }}
                              placeholder={label(
                                'pages.notifications.recipients.searchTenantProfiles',
                                'Search tenant profiles',
                              )}
                            />
                          </Form.Item>
                        )}
                      </>
                    )}

                  {usersFilterType === UsersFilterType.CUSTOMER_USERS && (
                    <Form.Item
                      name="customerId"
                      label={label(
                        'pages.notifications.recipients.fieldCustomer',
                        'Customer',
                      )}
                      rules={[
                        {
                          required: true,
                          message: label(
                            'pages.notifications.recipients.customerRequired',
                            'Customer is required',
                          ),
                        },
                      ]}
                    >
                      <RecipientEntitySelect
                        queryKey={[
                          'notifications',
                          'recipients-pickers',
                          'customers',
                        ]}
                        fetchPage={(textSearch) =>
                          getCustomers({
                            ...PICKER_PAGE_SORT('title'),
                            textSearch: textSearch || undefined,
                          })
                        }
                        toOption={(customer) => ({
                          label: customer.title,
                          value: customer.id.id,
                        })}
                        resolveOne={async (id) => {
                          const customer = await getCustomerById(id);
                          return { label: customer.title, value: id };
                        }}
                        placeholder={label(
                          'pages.notifications.recipients.searchCustomers',
                          'Search customers',
                        )}
                      />
                    </Form.Item>
                  )}

                  {usersFilterType === UsersFilterType.USER_LIST && (
                    <Form.Item
                      name="usersIds"
                      label={label(
                        'pages.notifications.recipients.fieldUsers',
                        'Users',
                      )}
                      rules={[
                        {
                          required: true,
                          message: label(
                            'pages.notifications.recipients.usersRequired',
                            'User list is required',
                          ),
                        },
                      ]}
                    >
                      <RecipientEntitySelect
                        mode="multiple"
                        queryKey={[
                          'notifications',
                          'recipients-pickers',
                          'users',
                        ]}
                        fetchPage={(textSearch) =>
                          getUsers({
                            ...PICKER_PAGE_SORT('email'),
                            textSearch: textSearch || undefined,
                          })
                        }
                        toOption={(user) => ({
                          label: userTitle(user),
                          value: user.id.id,
                        })}
                        resolveOne={async (id) => {
                          const user = await getUserById(id);
                          return { label: userTitle(user), value: id };
                        }}
                        placeholder={label(
                          'pages.notifications.recipients.searchUsers',
                          'Search users',
                        )}
                      />
                    </Form.Item>
                  )}
                </>
              );
            }

            if (targetType === NotificationTargetType.SLACK) {
              return (
                <>
                  <Form.Item
                    name="conversationType"
                    label={label(
                      'pages.notifications.recipients.slackChannelType',
                      'Slack channel type',
                    )}
                  >
                    <Radio.Group
                      onChange={() =>
                        form.setFieldsValue({ conversationId: undefined })
                      }
                    >
                      <Space orientation="vertical">
                        <Radio value={SlackConversationType.PUBLIC_CHANNEL}>
                          {label(
                            'pages.notifications.recipients.slackType.publicChannel',
                            'Public channel',
                          )}
                        </Radio>
                        <Radio value={SlackConversationType.PRIVATE_CHANNEL}>
                          {label(
                            'pages.notifications.recipients.slackType.privateChannel',
                            'Private channel',
                          )}
                        </Radio>
                        <Radio value={SlackConversationType.DIRECT}>
                          {label(
                            'pages.notifications.recipients.slackType.direct',
                            'Direct message',
                          )}
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item
                    name="conversationId"
                    label={label(
                      'pages.notifications.recipients.fieldConversation',
                      'Conversation',
                    )}
                    rules={[
                      {
                        required: true,
                        message: label(
                          'pages.notifications.recipients.conversationRequired',
                          'Conversation is required',
                        ),
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      loading={slackQuery.isFetching}
                      options={conversations.map((entry) => ({
                        label: entry.wholeName || entry.name,
                        value: entry.id,
                      }))}
                      placeholder={label(
                        'pages.notifications.recipients.searchConversations',
                        'Search conversations',
                      )}
                    />
                  </Form.Item>
                </>
              );
            }

            if (targetType === NotificationTargetType.MICROSOFT_TEAMS) {
              return (
                <>
                  <Form.Item>
                    <Space>
                      <Form.Item name="useOldApi" noStyle>
                        <Radio.Group>
                          <Radio value={true}>
                            {label(
                              'pages.notifications.recipients.useOldApi',
                              'Use old API',
                            )}
                          </Radio>
                          <Radio value={false}>
                            {label(
                              'pages.notifications.recipients.useNewApi',
                              'Use new Workflows API',
                            )}
                          </Radio>
                        </Radio.Group>
                      </Form.Item>
                      <Button
                        type="link"
                        size="small"
                        href="https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/"
                        target="_blank"
                        title={label(
                          'pages.notifications.recipients.deprecatedNotice',
                          'Office 365 connectors are retired; consider the Workflows API',
                        )}
                      >
                        {label(
                          'pages.notifications.recipients.deprecatedNotice',
                          'Office 365 connectors are retired',
                        )}
                      </Button>
                    </Space>
                  </Form.Item>
                  <Form.Item
                    name="webhookUrl"
                    label={
                      useOldApi
                        ? label(
                            'pages.notifications.recipients.webhookUrl',
                            'Webhook URL',
                          )
                        : label(
                            'pages.notifications.recipients.workflowUrl',
                            'Workflow URL',
                          )
                    }
                    rules={[
                      {
                        required: true,
                        message: label(
                          useOldApi
                            ? 'pages.notifications.recipients.webhookUrlRequired'
                            : 'pages.notifications.recipients.workflowUrlRequired',
                          useOldApi
                            ? 'Webhook URL is required'
                            : 'Workflow URL is required',
                        ),
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="channelName"
                    label={label(
                      'pages.notifications.recipients.fieldChannelName',
                      'Channel name',
                    )}
                    rules={[
                      {
                        required: true,
                        message: label(
                          'pages.notifications.recipients.channelNameRequired',
                          'Channel name is required',
                        ),
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </>
              );
            }

            return null;
          }}
        </Form.Item>

        <Form.Item
          name="description"
          label={label(
            'pages.notifications.recipients.description',
            'Description',
          )}
        >
          <Input.TextArea rows={2} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
