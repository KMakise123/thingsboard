/**
 * Customer-scope users page (spec 3.5「users 六操作」的 customer 子集,
 * ui-ngx customer users subtree): a self-contained thin table — columns
 * createdTime / email / firstName / lastName, row ops edit / delete /
 * show-activation-link / resend-activation (the "reset password" flow is
 * exactly those two — the backend has no resetPassword endpoint).
 * Deliberately does NOT import from the users domain; a review-driven
 * consolidation can come later.
 */

import { MoreOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useParams } from '@umijs/max';
import { Alert, App, Button, Dropdown, Input, type TableProps } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { CustomerUserActivationLinkDialog } from '@/components/customers/CustomerUserActivationLinkDialog';
import { CustomerUserEditDialog } from '@/components/customers/CustomerUserEditDialog';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  deleteUser,
  getCustomerUsers,
  sendActivationMail,
} from '@/services/tb/user';
import type { User } from '@/types/tb';
import { createListUrlState } from '../list-url-state';
import {
  CustomerScopePageShell,
  useCustomerScopeTitle,
} from '../scope-page-shell';

const SCOPE_USERS_KEY = ['customers', 'users', 'scope'] as const;

const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

export default function CustomerUsersPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = id;
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = listUrlState.useListUrlState();
  const titleQuery = useCustomerScopeTitle(customerId);

  const [searchInput, setSearchInput] = useState(urlState.textSearch);
  useEffect(() => {
    setSearchInput(urlState.textSearch);
  }, [urlState.textSearch]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== urlState.textSearch) {
        patch({ textSearch: next, page: 1 });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput, patch, urlState.textSearch]);

  const usersQuery = useQuery({
    queryKey: [
      ...SCOPE_USERS_KEY,
      customerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () =>
      getCustomerUsers(customerId as string, listUrlState.toPageLink(urlState)),
    enabled: !!customerId,
    placeholderData: keepPreviousData,
  });
  const users: Array<User> = usersQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_USERS_KEY });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activationUser, setActivationUser] = useState<User | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.users.toastDeleted',
          defaultMessage: 'User deleted.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const resendActivationMutation = useMutation({
    mutationFn: (email: string) => sendActivationMail(email),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.users.toastActivationSent',
          defaultMessage: 'The activation email has been sent.',
        }),
      );
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = (user: User) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.customers.users.deleteTitle',
          defaultMessage: "Are you sure you want to delete the user '{email}'?",
        },
        { email: user.email },
      ),
      content: formatMessage({
        id: 'pages.customers.users.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the user will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.customers.users.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.customers.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(user.id.id),
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<User>[] = useMemo(() => {
    const cols: ProColumns<User>[] = [
      {
        title: formatMessage({
          id: 'pages.customers.users.columnCreatedTime',
          defaultMessage: 'Created time',
        }),
        dataIndex: 'createdTime',
        width: 170,
        sorter: true,
        sortOrder: sortOrderFor('createdTime'),
        render: (_, record) =>
          dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: formatMessage({
          id: 'pages.customers.users.columnEmail',
          defaultMessage: 'Email',
        }),
        dataIndex: 'email',
        sorter: true,
        sortOrder: sortOrderFor('email'),
      },
      {
        title: formatMessage({
          id: 'pages.customers.users.columnFirstName',
          defaultMessage: 'First name',
        }),
        dataIndex: 'firstName',
        sorter: true,
        sortOrder: sortOrderFor('firstName'),
        render: (_, record) => record.firstName || '-',
      },
      {
        title: formatMessage({
          id: 'pages.customers.users.columnLastName',
          defaultMessage: 'Last name',
        }),
        dataIndex: 'lastName',
        sorter: true,
        sortOrder: sortOrderFor('lastName'),
        render: (_, record) => record.lastName || '-',
      },
      {
        valueType: 'option',
        width: 80,
        fixed: 'right',
        render: (_, record) => [
          <Dropdown
            key="more"
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'edit',
                  label: formatMessage({
                    id: 'pages.customers.users.actionEdit',
                    defaultMessage: 'Edit',
                  }),
                  onClick: () => setEditingUser(record),
                },
                {
                  key: 'activation-link',
                  label: formatMessage({
                    id: 'pages.customers.users.actionShowActivationLink',
                    defaultMessage: 'Show activation link',
                  }),
                  onClick: () => setActivationUser(record),
                },
                {
                  key: 'resend-activation',
                  label: formatMessage({
                    id: 'pages.customers.users.actionResendActivation',
                    defaultMessage: 'Resend activation email',
                  }),
                  onClick: () => resendActivationMutation.mutate(record.email),
                },
                { type: 'divider' as const },
                {
                  key: 'delete',
                  danger: true,
                  label: formatMessage({
                    id: 'pages.customers.users.actionDelete',
                    defaultMessage: 'Delete',
                  }),
                  onClick: () => confirmDelete(record),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>,
        ],
      },
    ];
    return cols;
  }, [
    formatMessage,
    urlState.sortProperty,
    urlState.sortDirection,
    resendActivationMutation,
  ]);

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<User>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    const property = sort?.field
      ? SORTABLE_COLUMNS[sort.field as string]
      : undefined;
    if (property && sort.order) {
      patch({
        sortProperty: property,
        sortDirection: sort.order === 'ascend' ? 'ASC' : 'DESC',
        page: 1,
      });
    } else if (!sort?.order) {
      patch({ sortProperty: 'createdTime', sortDirection: 'DESC', page: 1 });
    }
    if (
      pagination.current &&
      pagination.pageSize &&
      (pagination.current !== urlState.page ||
        pagination.pageSize !== urlState.pageSize)
    ) {
      patch({ page: pagination.current, pageSize: pagination.pageSize });
    }
  };

  return (
    <CustomerScopePageShell
      customerId={customerId}
      customerTitle={titleQuery.data}
      loadError={titleQuery.isError ? titleQuery.error : undefined}
      title={formatMessage({
        id: 'pages.customers.users.title',
        defaultMessage: 'Customer users',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.customers.users.search',
              defaultMessage: 'Search users',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void usersQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.customers.users.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
        </div>
      }
    >
      {usersQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.customers.users.loadFailed',
            defaultMessage: 'Failed to load users',
          })}
          description={serverErrorText(usersQuery.error)}
        />
      )}

      <ProTable<User>
        rowKey={(record) => record.id.id}
        columns={columns}
        dataSource={users}
        loading={usersQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: usersQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.customers.users.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.customers.users.empty',
            defaultMessage: 'No users',
          }),
        }}
      />

      <CustomerUserEditDialog
        open={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => {
          setEditingUser(null);
          void invalidate();
        }}
      />
      <CustomerUserActivationLinkDialog
        open={!!activationUser}
        userId={activationUser?.id.id}
        onClose={() => setActivationUser(null)}
      />
    </CustomerScopePageShell>
  );
}
