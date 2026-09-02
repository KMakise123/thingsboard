/**
 * Tenants list page (spec 3.7; SA only per routes/access).
 *
 * ui-ngx tenants-table parity: columns createdTime / title /
 * tenantProfileName / email / country / city; the row "manage tenant
 * admins" entry jumps to /tenants/:id/users; edit dialog / delete confirm
 * match the other entity lists. The title links into the detail page
 * (ui-ngx open-details action). ProTable renders `dataSource` fed by
 * useQuery (no `request` prop, no direct HTTP); search/page/sort live in
 * the URL for bookmark restore.
 */
import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { history } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Dropdown,
  Input,
  Space,
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { TenantDialog } from '@/components/tenants/TenantDialog';
import { deleteTenant, getTenantInfos } from '@/services/tb/tenant';
import type { TenantInfo } from '@/types/tb/tenant';
import { toPageLink, useTenantsListUrlState } from './url-state';

const TENANTS_QUERY_KEY = ['tenants', 'list'] as const;

/** Table column key -> sortable server property (TenantInfo fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
  tenantProfileName: 'tenantProfileName',
  email: 'email',
  country: 'country',
  city: 'city',
};

const SEARCH_DEBOUNCE_MS = 400;

export default function TenantsListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useTenantsListUrlState();

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
  const tenantsQuery = useQuery({
    queryKey: [
      ...TENANTS_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getTenantInfos(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const tenants: Array<TenantInfo> = tenantsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['tenants'] });

  // ---- dialogs & mutations
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TenantInfo | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (tenantId: string) => deleteTenant(tenantId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.tenants.list.toastDeleted',
          defaultMessage: 'Tenant deleted.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = (tenant: TenantInfo) => {
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

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only sort state changes the rendered columns
  const columns: ProColumns<TenantInfo>[] = useMemo(() => {
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
          id: 'pages.tenants.list.createdTime',
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
          id: 'pages.tenants.list.title',
          defaultMessage: 'Title',
        }),
        dataIndex: 'title',
        sorter: true,
        sortOrder: sortOrderFor('title'),
        render: (_, record) => (
          // Entry point to the detail page (ui-ngx open-details action).
          <Typography.Link
            onClick={() => history.push(`/tenants/${record.id.id}`)}
          >
            {record.title}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.tenants.list.tenantProfile',
          defaultMessage: 'Tenant profile',
        }),
        dataIndex: 'tenantProfileName',
        sorter: true,
        sortOrder: sortOrderFor('tenantProfileName'),
        render: (_, record) => record.tenantProfileName || '-',
      },
      {
        title: formatMessage({
          id: 'pages.tenants.list.email',
          defaultMessage: 'Email',
        }),
        dataIndex: 'email',
        sorter: true,
        sortOrder: sortOrderFor('email'),
        render: (_, record) => record.email || '-',
      },
      {
        title: formatMessage({
          id: 'pages.tenants.list.country',
          defaultMessage: 'Country',
        }),
        dataIndex: 'country',
        sorter: true,
        sortOrder: sortOrderFor('country'),
        render: (_, record) => record.country || '-',
      },
      {
        title: formatMessage({
          id: 'pages.tenants.list.city',
          defaultMessage: 'City',
        }),
        dataIndex: 'city',
        sorter: true,
        sortOrder: sortOrderFor('city'),
        render: (_, record) => record.city || '-',
      },
      {
        valueType: 'option',
        width: 100,
        fixed: 'right',
        render: (_, record) => [
          <Button
            key="edit"
            type="text"
            size="small"
            icon={<EditOutlined />}
            title={formatMessage({
              id: 'pages.tenants.list.actionEdit',
              defaultMessage: 'Edit',
            })}
            onClick={() => {
              setEditTarget(record);
              setDialogOpen(true);
            }}
          />,
          <Dropdown
            key="more"
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'manage-admins',
                  icon: <UserOutlined />,
                  label: formatMessage({
                    id: 'pages.tenants.list.actionManageAdmins',
                    defaultMessage: 'Manage tenant admins',
                  }),
                  onClick: () => history.push(`/tenants/${record.id.id}/users`),
                },
                {
                  key: 'delete',
                  danger: true,
                  icon: <DeleteOutlined />,
                  label: formatMessage({
                    id: 'pages.tenants.list.actionDelete',
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
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  const onTableChange: TableProps<TenantInfo>['onChange'] = (
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
    <PageContainer
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.tenants.list.search',
              defaultMessage: 'Search tenants',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void tenantsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.tenants.list.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditTarget(null);
                setDialogOpen(true);
              }}
            >
              {formatMessage({
                id: 'pages.tenants.list.add',
                defaultMessage: 'Add tenant',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {tenantsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.tenants.list.loadFailed',
            defaultMessage: 'Failed to load tenants',
          })}
          description={serverErrorText(tenantsQuery.error)}
        />
      )}

      <ProTable<TenantInfo>
        rowKey={(record) => record.id.id}
        columns={columns}
        dataSource={tenants}
        loading={tenantsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: tenantsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.tenants.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.tenants.list.empty',
            defaultMessage: 'No tenants',
          }),
        }}
      />

      <TenantDialog
        open={dialogOpen}
        tenant={editTarget}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        onSaved={() => {
          setDialogOpen(false);
          setEditTarget(null);
          void invalidate();
          void message.success(
            formatMessage({
              id: 'pages.tenants.list.toastSaved',
              defaultMessage: 'Tenant saved.',
            }),
          );
        }}
      />
    </PageContainer>
  );
}
