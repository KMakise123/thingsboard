/**
 * Shared user-management table (spec 3.5 six operations, M3
 * componentization of the M2 /users page).
 *
 * One source for two hosts that differ only in data source and ownership
 * scope:
 *   - /users (TA): fetchUsers=getUsers, the server resolves the tenant
 *     scope from the caller's authority; the authority picker in the
 *     dialog decides TENANT_ADMIN vs CUSTOMER_USER (ui-ngx hosts them on
 *     two pages; this one hosts both — hence the authority column).
 *   - /tenants/:id/users (SA): fetchUsers=getTenantUsers(tenantId),
 *     scope={authority: TENANT_ADMIN, tenantId} hides the authority
 *     picker and stamps created users; the host adds the login-as row
 *     entry through `rowMenuExtraItems`.
 *
 * The component owns the whole surface below the page header: toolbar
 * (search / refresh / add), the ProTable, the six operations with their
 * confirmations, the UserDialog + ActivationLinkDialog pair, and the
 * bookmarkable URL state (page/sort/search — shared url-state module).
 */
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Input,
  type MenuProps,
  type TableProps,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { ActivationLinkDialog } from '@/components/users/ActivationLinkDialog';
import {
  UserDialog,
  type UserSaveOutcome,
} from '@/components/users/UserDialog';
import { UserRowMenu } from '@/components/users/UserRowMenu';
import { toPageLink, useUsersListUrlState } from '@/components/users/url-state';
import {
  deleteUser,
  getUserActivationLinkInfo,
  sendActivationMail,
  setUserCredentialsEnabled,
} from '@/services/tb/user';
import { Authority, type User } from '@/types/tb';
import type { PageData, PageLink } from '@/types/tb/page';

const SEARCH_DEBOUNCE_MS = 400;

/** Table column key -> sortable server property (UserController allowlist). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
};

interface ActivationLinkState {
  open: boolean;
  link?: string;
  ttlMs?: number;
}

export interface UsersTableProps {
  /** react-query key prefix isolating the host page's cache slice. */
  queryKeyPrefix: readonly string[];
  /** Server list entry point (authority-scoped or tenant-scoped). */
  fetchUsers: (pageLink: PageLink) => Promise<PageData<User>>;
  /** Fixed create scope handed to UserDialog (see UserDialogScope). */
  scope?: {
    authority?: Authority;
    tenantId?: string;
    customerId?: string;
  };
  /** Hide the authority column when the host fixes one authority. */
  hideAuthorityColumn?: boolean;
  /** Row-menu entries injected before delete (login-as on the SA page). */
  rowMenuExtraItems?: (
    user: User,
  ) => NonNullable<MenuProps['items']>[number] | null;
  /** Placeholder of the toolbar search box. */
  searchPlaceholder: string;
  /** Toolbar add-button label. */
  addLabel: string;
}

export function UsersTable({
  queryKeyPrefix,
  fetchUsers,
  scope,
  hideAuthorityColumn = false,
  rowMenuExtraItems,
  searchPlaceholder,
  addLabel,
}: UsersTableProps) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useUsersListUrlState();

  // ---- text search (server-side, debounced; URL carries the committed value)
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

  // ---- the list itself
  const usersQuery = useQuery({
    queryKey: [
      ...queryKeyPrefix,
      'list',
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => fetchUsers(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const users: Array<User> = usersQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeyPrefix });

  // ---- dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activationLink, setActivationLink] = useState<ActivationLinkState>({
    open: false,
  });

  const linkQuery = useMutation({
    mutationFn: (userId: string) => getUserActivationLinkInfo(userId),
    onSuccess: (info) => {
      setActivationLink({
        open: true,
        link: info.value,
        ttlMs: info.ttlMs,
      });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.users.list.toastDeleted',
          defaultMessage: 'User deleted.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const resendMutation = useMutation({
    mutationFn: (email: string) => sendActivationMail(email),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.users.list.toastActivationEmailSent',
          defaultMessage: 'Activation email was successfully sent!',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const credentialsMutation = useMutation({
    mutationFn: (params: { userId: string; enabled: boolean }) =>
      setUserCredentialsEnabled(params.userId, params.enabled),
    onSuccess: (_data, params) => {
      void message.success(
        formatMessage({
          id: params.enabled
            ? 'pages.users.list.toastAccountEnabled'
            : 'pages.users.list.toastAccountDisabled',
          defaultMessage: params.enabled
            ? 'User account was successfully enabled!'
            : 'User account was successfully disabled!',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  // ---- row-action handlers (confirmations per the delete/resend ops)
  const confirmDelete = (user: User) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.users.list.deleteTitle',
          defaultMessage: "Are you sure you want to delete the user '{email}'?",
        },
        { email: user.email },
      ),
      content: formatMessage({
        id: 'pages.users.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the user and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.users.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.users.userDialog.actionCancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(user.id.id),
    });
  };

  const confirmResendActivation = (user: User) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.users.list.resendTitle',
          defaultMessage:
            "Are you sure you want to resend the activation email to '{email}'?",
        },
        { email: user.email },
      ),
      content: formatMessage({
        id: 'pages.users.list.resendText',
        defaultMessage:
          'The activation email contains the link the user needs to create a password.',
      }),
      okText: formatMessage({
        id: 'pages.users.list.actionResendActivation',
        defaultMessage: 'Resend activation',
      }),
      cancelText: formatMessage({
        id: 'pages.users.userDialog.actionCancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => resendMutation.mutateAsync(user.email),
    });
  };

  const openActivationLink = (user: User) => {
    setActivationLink({ open: false });
    linkQuery.mutate(user.id.id);
  };

  const handleSaved = (result: { user: User; outcome: UserSaveOutcome }) => {
    setDialogOpen(false);
    setEditingUser(null);
    void invalidate();
    if (result.outcome.type === 'activationLink') {
      void message.success(
        formatMessage({
          id: 'pages.users.list.toastCreated',
          defaultMessage: 'User created.',
        }),
      );
      setActivationLink({
        open: true,
        link: result.outcome.link,
        ttlMs: result.outcome.ttlMs,
      });
      return;
    }
    if (result.outcome.type === 'activationMailSent') {
      void message.success(
        formatMessage({
          id: 'pages.users.list.toastCreated',
          defaultMessage: 'User created.',
        }),
      );
      void message.success(
        formatMessage({
          id: 'pages.users.list.toastActivationEmailSent',
          defaultMessage: 'Activation email was successfully sent!',
        }),
      );
      return;
    }
    void message.success(
      formatMessage({
        id: 'pages.users.list.toastSaved',
        defaultMessage: 'User saved.',
      }),
    );
  };

  // ---- columns (ui-ngx users-table order: createdTime / names / email)
  // biome-ignore lint/correctness/useExhaustiveDependencies: row actions are a self-contained menu component; only sort state changes the rendered columns
  const columns: ProColumns<User>[] = useMemo(() => {
    const sortOrderFor = (
      property: string,
    ): 'ascend' | 'descend' | undefined => {
      if (urlState.sortProperty !== property) {
        return undefined;
      }
      return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
    };
    return [
      {
        title: formatMessage({
          id: 'pages.users.list.createdTime',
          defaultMessage: 'Created time',
        }),
        dataIndex: 'createdTime',
        width: 170,
        sorter: true,
        sortOrder: sortOrderFor('createdTime'),
        render: (_, record) => (
          <span className="tabular-nums">
            {dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss')}
          </span>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.users.list.firstName',
          defaultMessage: 'First name',
        }),
        dataIndex: 'firstName',
        width: 140,
        sorter: true,
        sortOrder: sortOrderFor('firstName'),
        render: (_, record) => record.firstName || '-',
      },
      {
        title: formatMessage({
          id: 'pages.users.list.lastName',
          defaultMessage: 'Last name',
        }),
        dataIndex: 'lastName',
        width: 140,
        sorter: true,
        sortOrder: sortOrderFor('lastName'),
        render: (_, record) => record.lastName || '-',
      },
      {
        title: formatMessage({
          id: 'pages.users.list.email',
          defaultMessage: 'Email',
        }),
        dataIndex: 'email',
        sorter: true,
        sortOrder: sortOrderFor('email'),
      },
      ...(hideAuthorityColumn
        ? []
        : [
            {
              title: formatMessage({
                id: 'pages.users.list.authority',
                defaultMessage: 'Authority',
              }),
              dataIndex: 'authority',
              width: 140,
              render: (_, record) => (
                <Tag
                  color={
                    record.authority === Authority.TENANT_ADMIN
                      ? 'geekblue'
                      : 'cyan'
                  }
                >
                  {formatMessage({
                    id:
                      record.authority === Authority.TENANT_ADMIN
                        ? 'pages.users.list.authorityTenantAdmin'
                        : 'pages.users.list.authorityCustomerUser',
                    defaultMessage:
                      record.authority === Authority.TENANT_ADMIN
                        ? 'Tenant admin'
                        : 'Customer user',
                  })}
                </Tag>
              ),
            } satisfies ProColumns<User>,
          ]),
      {
        valueType: 'option',
        width: 80,
        fixed: 'right',
        render: (_, record) => [
          <UserRowMenu
            key={`menu-${record.id.id}`}
            user={record}
            extraItems={rowMenuExtraItems}
            onEdit={(user) => {
              setEditingUser(user);
              setDialogOpen(true);
            }}
            onDisplayActivationLink={openActivationLink}
            onResendActivation={confirmResendActivation}
            onSetCredentialsEnabled={(user, enabled) =>
              credentialsMutation.mutate({ userId: user.id.id, enabled })
            }
            onDelete={confirmDelete}
          />,
        ],
      },
    ];
  }, [
    formatMessage,
    urlState.sortProperty,
    urlState.sortDirection,
    hideAuthorityColumn,
    rowMenuExtraItems,
  ]);

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
      // Sort cleared -> back to the default order.
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
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input.Search
          allowClear
          className="w-64"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={searchPlaceholder}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void usersQuery.refetch()}
        >
          {formatMessage({
            id: 'pages.users.list.refresh',
            defaultMessage: 'Refresh',
          })}
        </Button>
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUser(null);
            setDialogOpen(true);
          }}
        >
          {addLabel}
        </Button>
      </div>

      {usersQuery.isError && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.users.list.loadFailed',
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
                id: 'pages.users.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.users.list.empty',
            defaultMessage: 'No users',
          }),
        }}
      />

      <UserDialog
        open={dialogOpen}
        user={editingUser}
        scope={scope}
        onClose={() => {
          setDialogOpen(false);
          setEditingUser(null);
        }}
        onSaved={handleSaved}
      />
      <ActivationLinkDialog
        open={activationLink.open}
        link={activationLink.link}
        ttlMs={activationLink.ttlMs}
        onClose={() => setActivationLink({ open: false })}
      />
    </>
  );
}
