/**
 * Customer-scope dashboards page (spec M2, RECON risk 5 adjudication):
 * the MINIMAL face only — list (createdTime / title) + assign (pick a
 * tenant dashboard) + unassign, both confirmed where destructive. No
 * rendering, no CRUD: the dashboards domain owns that in M5. The legacy
 * non-Infos endpoint shape lives behind services/tb/customer.ts.
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
import { useParams } from '@umijs/max';
import { Alert, App, Button, Input, type TableProps } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { CustomerDashboardAssignDialog } from '@/components/customers/CustomerDashboardAssignDialog';
import { serverErrorText } from '@/components/entities/server-error-text';
import type { CustomerDashboardInfo } from '@/services/tb/customer';
import {
  assignDashboardToCustomer,
  getCustomerDashboards,
  unassignDashboardFromCustomer,
} from '@/services/tb/customer';
import { createListUrlState } from '../list-url-state';
import {
  CustomerScopePageShell,
  useCustomerScopeTitle,
} from '../scope-page-shell';

const SCOPE_DASHBOARDS_KEY = ['customers', 'dashboards', 'scope'] as const;

const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

export default function CustomerDashboardsPage() {
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

  const dashboardsQuery = useQuery({
    queryKey: [
      ...SCOPE_DASHBOARDS_KEY,
      customerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () =>
      getCustomerDashboards(
        customerId as string,
        listUrlState.toPageLink(urlState),
      ),
    enabled: !!customerId,
    placeholderData: keepPreviousData,
  });
  const dashboards: Array<CustomerDashboardInfo> =
    dashboardsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_DASHBOARDS_KEY });

  const [assignOpen, setAssignOpen] = useState(false);

  const assignMutation = useMutation({
    mutationFn: (dashboardId: string) =>
      assignDashboardToCustomer(customerId as string, dashboardId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.dashboards.toastAssigned',
          defaultMessage: 'The dashboard has been assigned to the customer.',
        }),
      );
      setAssignOpen(false);
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (dashboardId: string) =>
      unassignDashboardFromCustomer(customerId as string, dashboardId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.dashboards.toastUnassigned',
          defaultMessage: 'Dashboard unassigned.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmUnassign = (dashboard: CustomerDashboardInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.customers.dashboards.unassignTitle',
          defaultMessage:
            "Are you sure you want to unassign the dashboard '{title}'?",
        },
        { title: dashboard.title },
      ),
      content: formatMessage({
        id: 'pages.customers.dashboards.unassignText',
        defaultMessage:
          'After the confirmation the customer will no longer have access to this dashboard.',
      }),
      okText: formatMessage({
        id: 'pages.customers.dashboards.actionUnassign',
        defaultMessage: 'Unassign',
      }),
      cancelText: formatMessage({
        id: 'pages.customers.dashboards.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => unassignMutation.mutateAsync(dashboard.id.id),
    });
  };

  const columns: ProColumns<CustomerDashboardInfo>[] = [
    {
      title: formatMessage({
        id: 'pages.customers.dashboards.columnCreatedTime',
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
        id: 'pages.customers.dashboards.columnTitle',
        defaultMessage: 'Dashboard title',
      }),
      dataIndex: 'title',
      sorter: true,
      sortOrder: sortOrderFor('title'),
    },
    {
      valueType: 'option',
      width: 100,
      render: (_, record) => [
        <Button
          key="unassign"
          size="small"
          onClick={() => confirmUnassign(record)}
        >
          {formatMessage({
            id: 'pages.customers.dashboards.actionUnassign',
            defaultMessage: 'Unassign',
          })}
        </Button>,
      ],
    },
  ];

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<CustomerDashboardInfo>['onChange'] = (
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
        id: 'pages.customers.dashboards.title',
        defaultMessage: 'Customer dashboards',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.customers.dashboards.search',
              defaultMessage: 'Search dashboards',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void dashboardsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.customers.dashboards.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAssignOpen(true)}
          >
            {formatMessage({
              id: 'pages.customers.dashboards.actionAssign',
              defaultMessage: 'Assign dashboard',
            })}
          </Button>
        </div>
      }
    >
      {dashboardsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.customers.dashboards.loadFailed',
            defaultMessage: 'Failed to load dashboards',
          })}
          description={serverErrorText(dashboardsQuery.error)}
        />
      )}

      <ProTable<CustomerDashboardInfo>
        rowKey={(record) => record.id.id}
        columns={columns}
        dataSource={dashboards}
        loading={dashboardsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: dashboardsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.customers.dashboards.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.customers.dashboards.empty',
            defaultMessage: 'No dashboards',
          }),
        }}
      />

      <CustomerDashboardAssignDialog
        open={assignOpen}
        confirmLoading={assignMutation.isPending}
        onClose={() => setAssignOpen(false)}
        onConfirm={(dashboardId) => assignMutation.mutate(dashboardId)}
      />
    </CustomerScopePageShell>
  );
}
