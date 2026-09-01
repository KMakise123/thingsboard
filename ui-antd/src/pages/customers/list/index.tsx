/**
 * Customer list page (spec 3.5「customers CRUD」, ui-ngx customers-table
 * parity: createdTime / title / email / country / city + manage-users /
 * devices / assets / dashboards / delete row actions).
 *
 * Devices-list pattern (pages/devices/list): ProTable renders `dataSource`
 * fed by useQuery (no `request` prop), server pages are 0-based with an
 * explicit sort, filters/page/sort live in the URL, row delete confirms
 * first. Create/edit share the CustomerDialog (the same form also renders
 * inline on the detail page header).
 */

import { MoreOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
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
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { deleteCustomer, getCustomers } from '@/services/tb/customer';
import type { Customer } from '@/types/tb';
import { createListUrlState } from '../list-url-state';

const CUSTOMERS_QUERY_KEY = ['customers', 'list'] as const;

/** Table column key -> sortable server property (Customer fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

export default function CustomersListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = listUrlState.useListUrlState();

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

  const customersQuery = useQuery({
    queryKey: [
      ...CUSTOMERS_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getCustomers(listUrlState.toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const customers: Array<Customer> = customersQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });

  // ---- dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => deleteCustomer(customerId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.list.toastDeleted',
          defaultMessage: 'Customer deleted.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = (customer: Customer) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.customers.list.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the customer '{title}'?",
        },
        { title: customer.title },
      ),
      content: formatMessage({
        id: 'pages.customers.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the customer and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.customers.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.customers.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(customer.id.id),
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<Customer>[] = useMemo(() => {
    const cols: ProColumns<Customer>[] = [
      {
        title: formatMessage({
          id: 'pages.customers.list.columnCreatedTime',
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
          id: 'pages.customers.list.columnTitle',
          defaultMessage: 'Customer title',
        }),
        dataIndex: 'title',
        sorter: true,
        sortOrder: sortOrderFor('title'),
        render: (_, record) => (
          <Typography.Link
            onClick={() => history.push(`/customers/${record.id.id}`)}
          >
            {record.title}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.customers.list.columnEmail',
          defaultMessage: 'Email',
        }),
        dataIndex: 'email',
        render: (_, record) => record.email || '-',
      },
      {
        title: formatMessage({
          id: 'pages.customers.list.columnCountry',
          defaultMessage: 'Country',
        }),
        dataIndex: 'country',
        render: (_, record) => record.country || '-',
      },
      {
        title: formatMessage({
          id: 'pages.customers.list.columnCity',
          defaultMessage: 'City',
        }),
        dataIndex: 'city',
        render: (_, record) => record.city || '-',
      },
    ];
    cols.push({
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
                key: 'users',
                label: formatMessage({
                  id: 'pages.customers.list.manageUsers',
                  defaultMessage: 'Manage users',
                }),
                onClick: () => history.push(`/customers/${record.id.id}/users`),
              },
              {
                key: 'devices',
                label: formatMessage({
                  id: 'pages.customers.list.manageDevices',
                  defaultMessage: 'Manage devices',
                }),
                onClick: () =>
                  history.push(`/customers/${record.id.id}/devices`),
              },
              {
                key: 'assets',
                label: formatMessage({
                  id: 'pages.customers.list.manageAssets',
                  defaultMessage: 'Manage assets',
                }),
                onClick: () =>
                  history.push(`/customers/${record.id.id}/assets`),
              },
              {
                key: 'dashboards',
                label: formatMessage({
                  id: 'pages.customers.list.manageDashboards',
                  defaultMessage: 'Manage dashboards',
                }),
                onClick: () =>
                  history.push(`/customers/${record.id.id}/dashboards`),
              },
              { type: 'divider' as const },
              {
                key: 'edit',
                label: formatMessage({
                  id: 'pages.customers.list.edit',
                  defaultMessage: 'Edit',
                }),
                onClick: () => {
                  setEditingCustomer(record);
                  setDialogOpen(true);
                },
              },
              {
                key: 'delete',
                danger: true,
                label: formatMessage({
                  id: 'pages.customers.list.actionDelete',
                  defaultMessage: 'Delete',
                }),
                onClick: () => confirmDelete(record),
              },
            ],
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            title={formatMessage({
              id: 'pages.customers.list.more',
              defaultMessage: 'More actions',
            })}
          />
        </Dropdown>,
      ],
    });
    return cols;
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<Customer>['onChange'] = (
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
              id: 'pages.customers.list.search',
              defaultMessage: 'Search customers',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void customersQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.customers.list.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCustomer(null);
              setDialogOpen(true);
            }}
          >
            {formatMessage({
              id: 'pages.customers.list.add',
              defaultMessage: 'New customer',
            })}
          </Button>
        </div>
      }
    >
      {customersQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.customers.list.loadFailed',
            defaultMessage: 'Failed to load customers',
          })}
          description={serverErrorText(customersQuery.error)}
        />
      )}

      <ProTable<Customer>
        rowKey={(record) => record.id.id}
        columns={columns}
        dataSource={customers}
        loading={customersQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: customersQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.customers.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.customers.list.empty',
            defaultMessage: 'No customers',
          }),
        }}
      />

      <CustomerDialog
        open={dialogOpen}
        customer={editingCustomer}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void invalidate();
        }}
      />
    </PageContainer>
  );
}
