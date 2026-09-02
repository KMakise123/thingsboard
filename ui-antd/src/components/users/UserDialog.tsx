/**
 * User create/edit dialog (add-user-dialog + user form parity, AntD form).
 *
 * Create: email / firstName / lastName / description + an authority select
 * (TENANT_ADMIN | CUSTOMER_USER — ui-ngx fixes the authority per page, the
 * /users page hosts both, so it becomes a form field) + a required customer
 * select when CUSTOMER_USER is chosen. The bottom "activation method" choice
 * mirrors add-user-dialog.component: DISPLAY_ACTIVATION_LINK (default, the
 * dialog chain then shows the link) or SEND_ACTIVATION_MAIL (backend mails
 * the link; on mail failure it rolls the user back and errors).
 *
 * Edit: same fields prefilled; authority and customer are disabled — ui-ngx
 * never edits them either (the resolver injects them from the page context),
 * and POST /api/user with a moved authority changes which user set the row
 * belongs to. Saved with saveUser(user, { sendActivationMail: false }) — the
 * backend only mails on create, but ui-ngx pins it explicitly.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Form, Input, Modal, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { getCustomerById, getCustomers } from '@/services/tb/customer';
import { getUserActivationLinkInfo, saveUser } from '@/services/tb/user';
import { Authority, EntityType, type User } from '@/types/tb';

export type UserSaveOutcome =
  | { type: 'updated' }
  | { type: 'activationMailSent' }
  | { type: 'activationLink'; link: string; ttlMs?: number };

/**
 * Host-fixed ownership scope (ui-ngx resolver injects authority + parent
 * entity the same way): when set, the authority/customer pickers disappear
 * and created users are stamped with this scope. The SA tenant-admins page
 * passes { authority: TENANT_ADMIN, tenantId }.
 */
export interface UserDialogScope {
  authority?: Authority;
  tenantId?: string;
  customerId?: string;
}

export interface UserDialogProps {
  open: boolean;
  /** Null/undefined = create mode. */
  user?: User | null;
  onClose: () => void;
  /** Save succeeded — the page toasts, invalidates and chains the dialogs. */
  onSaved: (result: { user: User; outcome: UserSaveOutcome }) => void;
  /** Fixed ownership scope (see UserDialogScope). */
  scope?: UserDialogScope;
}

interface UserFormValues {
  authority: Authority;
  email: string;
  firstName?: string;
  lastName?: string;
  customerId?: string;
  description?: string;
  activationMethod: 'DISPLAY_ACTIVATION_LINK' | 'SEND_ACTIVATION_MAIL';
}

const CUSTOMER_SEARCH_DEBOUNCE_MS = 300;

/** TB's null-customer UUID (EntityId.NULL_UUID). */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

export function UserDialog({
  open,
  user,
  onClose,
  onSaved,
  scope,
}: UserDialogProps) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<UserFormValues>();
  const editing = !!user;
  const fixedAuthority = scope?.authority;

  const [serverError, setServerError] = useState<string>();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDebounced, setCustomerDebounced] = useState('');
  const customerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const watchedAuthority = Form.useWatch('authority', form);
  const authority = fixedAuthority ?? watchedAuthority;
  const isCustomerUser = authority === Authority.CUSTOMER_USER;

  // Reset between openings, then prefill for edit.
  useEffect(() => {
    if (open) {
      setServerError(undefined);
      setCustomerSearch('');
      setCustomerDebounced('');
      form.resetFields();
      form.setFieldsValue({
        authority: user?.authority ?? fixedAuthority ?? Authority.CUSTOMER_USER,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        customerId:
          user?.customerId && user.customerId.id !== NULL_UUID
            ? user.customerId.id
            : undefined,
        description:
          typeof user?.additionalInfo?.description === 'string'
            ? user.additionalInfo.description
            : undefined,
        activationMethod: 'DISPLAY_ACTIVATION_LINK',
      });
    }
  }, [open, user, form, fixedAuthority]);

  useEffect(() => {
    clearTimeout(customerTimer.current);
    customerTimer.current = setTimeout(
      () => setCustomerDebounced(customerSearch.trim()),
      CUSTOMER_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(customerTimer.current);
  }, [customerSearch]);

  // Server-searched customer picker (create mode only, scope-free hosts).
  const customersQuery = useQuery({
    queryKey: ['customers', 'user-dialog', customerDebounced],
    queryFn: () =>
      getCustomers({
        pageSize: 50,
        page: 0,
        textSearch: customerDebounced || undefined,
        sortOrder: { property: 'title', direction: 'ASC' },
      }),
    enabled: open && !editing && !scope,
  });

  // Edit mode: resolve the assigned customer's title for the disabled select.
  // Users without a customer (tenant admins) carry the NULL_UUID — fetching
  // that id only produces a 404 noise toast, so gate it like the prefill does.
  const assignedCustomerQuery = useQuery({
    queryKey: ['customers', 'user-dialog-assigned', user?.customerId?.id],
    queryFn: () => getCustomerById(user?.customerId?.id as string),
    enabled:
      open &&
      editing &&
      !!user?.customerId?.id &&
      user.customerId.id !== NULL_UUID,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (editing && user) {
        const payload: User = {
          ...user,
          email: values.email.trim(),
          firstName: values.firstName?.trim() || undefined,
          lastName: values.lastName?.trim() || undefined,
          additionalInfo: {
            ...user.additionalInfo,
            description: values.description?.trim() || undefined,
          },
        };
        const saved = await saveUser(payload, { sendActivationMail: false });
        return { user: saved, outcome: { type: 'updated' } as const };
      }
      // No id/createdTime in the create draft — the backend mints them
      // (sending a blank EntityId UUID fails deserialization, same as the
      // device wizard learned).
      type UserDraft = Omit<User, 'id' | 'createdTime'>;
      const effectiveAuthority = scope?.authority ?? values.authority;
      const draft: UserDraft = {
        email: values.email.trim(),
        firstName: values.firstName?.trim() || undefined,
        lastName: values.lastName?.trim() || undefined,
        authority: effectiveAuthority,
        tenantId: scope?.tenantId
          ? { entityType: EntityType.TENANT, id: scope.tenantId }
          : undefined,
        customerId: scope?.customerId
          ? { entityType: EntityType.CUSTOMER, id: scope.customerId }
          : effectiveAuthority === Authority.CUSTOMER_USER && values.customerId
            ? { entityType: EntityType.CUSTOMER, id: values.customerId }
            : undefined,
        additionalInfo: {
          description: values.description?.trim() || undefined,
        },
      };
      const sendActivationMail =
        values.activationMethod === 'SEND_ACTIVATION_MAIL';
      const created = await saveUser(draft as User, { sendActivationMail });
      if (sendActivationMail) {
        return {
          user: created,
          outcome: { type: 'activationMailSent' } as const,
        };
      }
      const info = await getUserActivationLinkInfo(created.id.id);
      return {
        user: created,
        outcome: {
          type: 'activationLink',
          link: info.value ?? '',
          ttlMs: info.ttlMs,
        } as const,
      };
    },
    onSuccess: (result) => {
      onSaved(result);
    },
    onError: (error) => {
      setServerError(serverErrorText(error));
    },
  });

  const customerOptions = editing
    ? assignedCustomerQuery.data
      ? [
          {
            label: assignedCustomerQuery.data.title,
            value: assignedCustomerQuery.data.id.id,
          },
        ]
      : []
    : (customersQuery.data?.data ?? []).map((customer) => ({
        label: customer.title,
        value: customer.id.id,
      }));

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: editing
          ? 'pages.users.userDialog.editTitle'
          : 'pages.users.userDialog.createTitle',
        defaultMessage: editing ? 'Edit user' : 'Add user',
      })}
      width={560}
      onCancel={onClose}
      destroyOnHidden
      footer={null}
    >
      {serverError && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          closable
          onClose={() => setServerError(undefined)}
          title={serverError}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        initialValues={{ activationMethod: 'DISPLAY_ACTIVATION_LINK' }}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item
          name="email"
          label={formatMessage({
            id: 'pages.users.userDialog.email',
            defaultMessage: 'Email',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.users.userDialog.emailRequired',
                defaultMessage: 'Email is required.',
              }),
            },
            {
              type: 'email',
              message: formatMessage({
                id: 'pages.users.userDialog.emailInvalid',
                defaultMessage: 'Invalid email format.',
              }),
            },
          ]}
        >
          <Input autoFocus />
        </Form.Item>
        <div className="flex gap-3">
          <Form.Item
            name="firstName"
            className="flex-1"
            label={formatMessage({
              id: 'pages.users.userDialog.firstName',
              defaultMessage: 'First name',
            })}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="lastName"
            className="flex-1"
            label={formatMessage({
              id: 'pages.users.userDialog.lastName',
              defaultMessage: 'Last name',
            })}
          >
            <Input />
          </Form.Item>
        </div>
        <Form.Item
          name="authority"
          label={formatMessage({
            id: 'pages.users.userDialog.authority',
            defaultMessage: 'Authority',
          })}
          hidden={!!fixedAuthority}
          extra={
            editing
              ? formatMessage({
                  id: 'pages.users.userDialog.editScopeHint',
                  defaultMessage:
                    'Authority and customer cannot be changed after creation.',
                })
              : undefined
          }
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.users.userDialog.authorityRequired',
                defaultMessage: 'Authority is required.',
              }),
            },
          ]}
        >
          <Select
            disabled={editing}
            options={[
              {
                value: Authority.TENANT_ADMIN,
                label: formatMessage({
                  id: 'pages.users.userDialog.authorityTenantAdmin',
                  defaultMessage: 'Tenant administrator',
                }),
              },
              {
                value: Authority.CUSTOMER_USER,
                label: formatMessage({
                  id: 'pages.users.userDialog.authorityCustomerUser',
                  defaultMessage: 'Customer user',
                }),
              },
            ]}
          />
        </Form.Item>
        {isCustomerUser && !scope && (
          <Form.Item
            name="customerId"
            label={formatMessage({
              id: 'pages.users.userDialog.customer',
              defaultMessage: 'Customer',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.users.userDialog.customerRequired',
                  defaultMessage:
                    'Customer users must be assigned to a customer.',
                }),
              },
            ]}
          >
            <Select
              showSearch
              disabled={editing}
              filterOption={false}
              loading={customersQuery.isPending}
              onSearch={setCustomerSearch}
              placeholder={formatMessage({
                id: 'pages.users.userDialog.customerPlaceholder',
                defaultMessage: 'Search and select a customer',
              })}
              options={customerOptions}
            />
          </Form.Item>
        )}
        <Form.Item
          name="description"
          label={formatMessage({
            id: 'pages.users.userDialog.description',
            defaultMessage: 'Description',
          })}
        >
          <Input.TextArea rows={2} />
        </Form.Item>
        {!editing && (
          <Form.Item
            name="activationMethod"
            label={formatMessage({
              id: 'pages.users.userDialog.activationMethod',
              defaultMessage: 'Activation method',
            })}
          >
            <Select
              options={[
                {
                  value: 'DISPLAY_ACTIVATION_LINK',
                  label: formatMessage({
                    id: 'pages.users.userDialog.activationDisplay',
                    defaultMessage: 'Display activation link',
                  }),
                },
                {
                  value: 'SEND_ACTIVATION_MAIL',
                  label: formatMessage({
                    id: 'pages.users.userDialog.activationSendMail',
                    defaultMessage: 'Send activation mail',
                  }),
                },
              ]}
            />
          </Form.Item>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-t-solid pt-4">
          <Button onClick={onClose}>
            {formatMessage({
              id: 'pages.users.userDialog.actionCancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saveMutation.isPending}
          >
            {formatMessage({
              id: editing
                ? 'pages.users.userDialog.actionSave'
                : 'pages.users.userDialog.actionAdd',
              defaultMessage: editing ? 'Save' : 'Add',
            })}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
