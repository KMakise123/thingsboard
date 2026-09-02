/**
 * Customer-scope dashboards page (M2 seed, upgraded by M5 W3 per recon §4
 * customer scope): list under the customer scope shell, row operations
 * export / unassign / make-private (the latter only while the current
 * customer IS the tenant's public customer — ui-ngx
 * isCurrentPublicDashboardCustomer) and the batch unassign fan-out. The M2
 * assign-dashboard picker stays as the header action. Dashboards open in
 * the readonly view through the title link.
 */

import {
  DownloadOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
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
import { CustomerDashboardAssignDialog } from '@/components/customers/CustomerDashboardAssignDialog';
import { serverErrorText } from '@/components/entities/server-error-text';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
import { exportDashboardToFile } from '@/pages/dashboards/list/import-export';
import {
  assignDashboardToCustomer,
  getCustomerDashboards,
  unassignDashboardFromCustomer,
} from '@/services/tb/customer';
import { makeDashboardPrivate } from '@/services/tb/dashboard';
import type { DashboardInfo } from '@/types/tb/dashboard';
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

/** ui-ngx isCurrentPublicDashboardCustomer: this customer is the public one. */
function isCurrentPublicCustomer(
  dashboard: DashboardInfo,
  customerId: string,
): boolean {
  return (dashboard.assignedCustomers ?? []).some(
    (info) => info.public && info.customerId?.id === customerId,
  );
}

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
  const dashboards: Array<DashboardInfo> = dashboardsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_DASHBOARDS_KEY });

  // ---- selection + batch unassign
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedDashboards = dashboards.filter((dashboard) =>
    selectedRowKeys.includes(dashboard.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

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

  const makePrivateMutation = useMutation({
    mutationFn: (dashboardId: string) => makeDashboardPrivate(dashboardId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.dashboards.toastMadePrivate',
          defaultMessage: 'Dashboard is now private.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmUnassign = (dashboard: DashboardInfo) => {
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

  const confirmMakePrivate = (dashboard: DashboardInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.customers.dashboards.makePrivateTitle',
          defaultMessage:
            "Are you sure you want to make the dashboard '{title}' private?",
        },
        { title: dashboard.title },
      ),
      content: formatMessage({
        id: 'pages.customers.dashboards.makePrivateText',
        defaultMessage:
          "After the confirmation the dashboard will be made private and won't be accessible by others.",
      }),
      okText: formatMessage({
        id: 'pages.customers.dashboards.actionMakePrivate',
        defaultMessage: 'Make dashboard private',
      }),
      cancelText: formatMessage({
        id: 'pages.customers.dashboards.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => makePrivateMutation.mutateAsync(dashboard.id.id),
    });
  };

  const confirmUnassignSelected = () => {
    if (selectedDashboards.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.customers.dashboards.unassignManyTitle',
          defaultMessage:
            'Are you sure you want to unassign {count, plural, =1 {1 dashboard} other {# dashboards}}?',
        },
        { count: selectedDashboards.length },
      ),
      content: formatMessage({
        id: 'pages.customers.dashboards.unassignManyText',
        defaultMessage:
          'After the confirmation all selected dashboards will be unassigned and will not be accessible by the customer.',
      }),
      okText: formatMessage({
        id: 'pages.customers.dashboards.actionUnassign',
        defaultMessage: 'Unassign',
      }),
      cancelText: formatMessage({
        id: 'pages.customers.dashboards.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        const summary = await batch.run(
          selectedDashboards,
          (dashboard) => dashboard.title,
          (dashboard) =>
            unassignDashboardFromCustomer(
              customerId as string,
              dashboard.id.id,
            ),
        );
        setSelectedRowKeys([]);
        void invalidate();
        if (summary.failed > 0) {
          void message.warning(
            formatMessage(
              {
                id: 'pages.customers.dashboards.batchResult',
                defaultMessage: '{ok} succeeded, {fail} failed.',
              },
              { ok: summary.ok, fail: summary.failed },
            ),
          );
        } else {
          void message.success(
            formatMessage({
              id: 'pages.customers.dashboards.toastUnassigned',
              defaultMessage: 'Dashboard unassigned.',
            }),
          );
        }
      },
    });
  };

  const exportOne = async (dashboard: DashboardInfo) => {
    try {
      await exportDashboardToFile(dashboard.id.id);
    } catch (error) {
      void message.error(
        formatMessage(
          {
            id: 'pages.customers.dashboards.exportFailed',
            defaultMessage: 'Failed to export the dashboard: {error}',
          },
          { error: serverErrorText(error) },
        ),
      );
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<DashboardInfo>[] = useMemo(() => {
    const cols: ProColumns<DashboardInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.customers.dashboards.columnCreatedTime',
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
          id: 'pages.customers.dashboards.columnTitle',
          defaultMessage: 'Dashboard title',
        }),
        dataIndex: 'title',
        sorter: true,
        sortOrder: sortOrderFor('title'),
        render: (_, record) => (
          <Typography.Link
            onClick={() => history.push(`/dashboards/${record.id.id}`)}
          >
            {record.title}
          </Typography.Link>
        ),
      },
      {
        valueType: 'option',
        width: 100,
        render: (_, record) => [
          <Button
            key="export"
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            title={formatMessage({
              id: 'pages.customers.dashboards.actionExport',
              defaultMessage: 'Export dashboard',
            })}
            onClick={() => void exportOne(record)}
          />,
          <Dropdown
            key="more"
            trigger={['click']}
            menu={{
              items: [
                isCurrentPublicCustomer(record, customerId as string)
                  ? {
                      key: 'make-private',
                      label: formatMessage({
                        id: 'pages.customers.dashboards.actionMakePrivate',
                        defaultMessage: 'Make dashboard private',
                      }),
                      onClick: () => confirmMakePrivate(record),
                    }
                  : {
                      key: 'unassign',
                      label: formatMessage({
                        id: 'pages.customers.dashboards.actionUnassign',
                        defaultMessage: 'Unassign',
                      }),
                      onClick: () => confirmUnassign(record),
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
    customerId,
  ]);

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<DashboardInfo>['onChange'] = (
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
          {selectedDashboards.length > 0 && (
            <Button
              danger
              icon={<UserDeleteOutlined />}
              onClick={confirmUnassignSelected}
            >
              {formatMessage({
                id: 'pages.customers.dashboards.batchUnassign',
                defaultMessage: 'Unassign selected',
              })}
            </Button>
          )}
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
          message={formatMessage({
            id: 'pages.customers.dashboards.loadFailed',
            defaultMessage: 'Failed to load dashboards',
          })}
          description={serverErrorText(dashboardsQuery.error)}
        />
      )}

      <ProTable<DashboardInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={dashboards}
        loading={dashboardsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
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
      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => {
          setBatchOpen(false);
          batch.reset();
        }}
      />
    </CustomerScopePageShell>
  );
}
