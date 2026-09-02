/**
 * Dashboards list page (`/dashboards`, brief §0.A, recon §4 parity).
 *
 * Tenant scope: createdTime / title / assigned-customers / public columns and
 * the row operation set (export / make-public + public link / make-private /
 * delete with a danger confirm). Customer users get the read-only face of the
 * same page: the customer-scoped endpoint, no action column and no selection
 * — the title link opens the readonly dashboard view (ui-ngx open-details).
 *
 * Page / pageSize / sort / search restore from the URL (createListUrlState).
 * Import/export + manage-customers/batch machinery land with their own units;
 * this module consumes services/tb/dashboard.ts as-is (W1 contract).
 */

import {
  DownloadOutlined,
  MoreOutlined,
  ReloadOutlined,
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
  Checkbox,
  Dropdown,
  Input,
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { useAuthority } from '@/components/shared/use-authority';
import { getCustomerDashboards } from '@/services/tb/customer';
import {
  deleteDashboard,
  getTenantDashboards,
  makeDashboardPrivate,
  makeDashboardPublic,
} from '@/services/tb/dashboard';
import type { DashboardInfo } from '@/types/tb/dashboard';
import { exportDashboardToFile } from './import-export';
import { listUrlState } from './url-state';

const DASHBOARDS_QUERY_KEY = ['dashboards', 'list'] as const;

/** Table column key -> sortable server property (DashboardInfo fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
};

const SEARCH_DEBOUNCE_MS = 400;

/** ui-ngx getDashboardAssignedCustomersText: non-public titles, joined. */
function assignedCustomersText(dashboard: DashboardInfo): string {
  return (dashboard.assignedCustomers ?? [])
    .filter((info) => !info.public)
    .map((info) => info.title ?? '')
    .filter(Boolean)
    .join(', ');
}

/** ui-ngx isPublicDashboard: any assigned customer flagged public. */
function isPublicDashboard(dashboard: DashboardInfo): boolean {
  return (dashboard.assignedCustomers ?? []).some((info) => info.public);
}

/** ui-ngx getPublicDashboardLink: host + /dashboard/{id}?publicId=… */
function publicDashboardLink(dashboard: DashboardInfo): string | null {
  const publicCustomer = (dashboard.assignedCustomers ?? []).find(
    (info) => info.public && info.customerId,
  );
  if (!publicCustomer?.customerId || !dashboard.id) {
    return null;
  }
  const port = window.location.port;
  const portPart = port && port !== '80' && port !== '443' ? `:${port}` : '';
  return `${window.location.protocol}//${window.location.hostname}${portPart}/dashboard/${dashboard.id.id}?publicId=${publicCustomer.customerId.id}`;
}

export default function DashboardsListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = listUrlState.useListUrlState();
  const { authority, customerId: cuCustomerId } = useAuthority();
  const readOnly = authority === 'CUSTOMER_USER';

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

  // ---- the list itself (scope by authority)
  const dashboardsQuery = useQuery({
    queryKey: [
      ...DASHBOARDS_QUERY_KEY,
      authority,
      cuCustomerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => {
      const pageLink = listUrlState.toPageLink(urlState);
      return readOnly && cuCustomerId
        ? getCustomerDashboards(cuCustomerId, pageLink)
        : getTenantDashboards(pageLink);
    },
    placeholderData: keepPreviousData,
  });
  const dashboards: Array<DashboardInfo> = dashboardsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: DASHBOARDS_QUERY_KEY });

  // ---- row operations
  const deleteMutation = useMutation({
    mutationFn: (dashboardId: string) => deleteDashboard(dashboardId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'dashboards.list.toastDeleted',
          defaultMessage: 'Dashboard deleted.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const makePublicMutation = useMutation({
    mutationFn: (dashboardId: string) => makeDashboardPublic(dashboardId),
    onSuccess: (dashboard) => {
      void invalidate();
      // v1 shows the generated link only — the anonymous public page is a
      // registered omission (brief §0).
      const link = publicDashboardLink(dashboard);
      modal.info({
        title: formatMessage({
          id: 'dashboards.list.publicLinkTitle',
          defaultMessage: 'Dashboard is now public',
        }),
        content: (
          <div className="mt-3 flex flex-col gap-2">
            <Typography.Text>
              {formatMessage({
                id: 'dashboards.list.publicLinkLabel',
                defaultMessage: 'Public link',
              })}
              :
            </Typography.Text>
            {link ? <Typography.Text copyable>{link}</Typography.Text> : null}
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'dashboards.list.publicLinkHint',
                defaultMessage:
                  'The anonymous public page ships later; the link is generated for reference only.',
              })}
            </Typography.Text>
          </div>
        ),
      });
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
          id: 'dashboards.list.makePrivateSuccess',
          defaultMessage: 'Dashboard is now private.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const exportOne = async (dashboard: DashboardInfo) => {
    try {
      await exportDashboardToFile(dashboard.id.id);
    } catch (error) {
      void message.error(
        formatMessage(
          {
            id: 'dashboards.list.exportFailed',
            defaultMessage: 'Failed to export the dashboard: {error}',
          },
          { error: serverErrorText(error) },
        ),
      );
    }
  };

  // NOTE on confirm close behaviour: antd keeps a confirm open (loading)
  // until the onOk promise settles; the same mutateAsync pattern as the
  // devices/assets/customers lists is used here. During the W3 live check
  // dialogs appeared to never close — that was the background-tab rAF
  // freeze (rc-motion waits for a frame before `-leave-active`, hidden tabs
  // never render), not the mutation bridge; foreground verification closes
  // promptly.

  const confirmMakePublic = (dashboard: DashboardInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'dashboards.list.makePublicTitle',
          defaultMessage:
            "Are you sure you want to make the dashboard '{title}' public?",
        },
        { title: dashboard.title },
      ),
      content: formatMessage({
        id: 'dashboards.list.makePublicText',
        defaultMessage:
          'After the confirmation the dashboard and all its data will be made public and accessible by others.',
      }),
      okText: formatMessage({
        id: 'dashboards.list.actionMakePublic',
        defaultMessage: 'Make dashboard public',
      }),
      cancelText: formatMessage({
        id: 'dashboards.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => makePublicMutation.mutateAsync(dashboard.id.id),
    });
  };

  const confirmMakePrivate = (dashboard: DashboardInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'dashboards.list.makePrivateTitle',
          defaultMessage:
            "Are you sure you want to make the dashboard '{title}' private?",
        },
        { title: dashboard.title },
      ),
      content: formatMessage({
        id: 'dashboards.list.makePrivateText',
        defaultMessage:
          "After the confirmation the dashboard will be made private and won't be accessible by others.",
      }),
      okText: formatMessage({
        id: 'dashboards.list.actionMakePrivate',
        defaultMessage: 'Make dashboard private',
      }),
      cancelText: formatMessage({
        id: 'dashboards.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => makePrivateMutation.mutateAsync(dashboard.id.id),
    });
  };

  const confirmDelete = (dashboard: DashboardInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'dashboards.list.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the dashboard '{title}'?",
        },
        { title: dashboard.title },
      ),
      content: formatMessage({
        id: 'dashboards.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the dashboard and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'dashboards.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'dashboards.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(dashboard.id.id),
    });
  };

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<DashboardInfo>[] = useMemo(() => {
    const cols: ProColumns<DashboardInfo>[] = [
      {
        title: formatMessage({
          id: 'dashboards.list.createdTime',
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
          id: 'dashboards.list.title',
          defaultMessage: 'Title',
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
    ];
    if (!readOnly) {
      cols.push({
        title: formatMessage({
          id: 'dashboards.list.assignedCustomers',
          defaultMessage: 'Assigned to customers',
        }),
        key: 'customersTitle',
        render: (_, record) => assignedCustomersText(record) || '-',
      });
      // Public flag column, tenant scope only (ui-ngx checkBoxCell; a
      // disabled checkbox — read-only boolean, not an action).
      cols.push({
        title: formatMessage({
          id: 'dashboards.list.publicColumn',
          defaultMessage: 'Public',
        }),
        key: 'dashboardIsPublic',
        width: 80,
        align: 'center',
        render: (_, record) => (
          <Checkbox checked={isPublicDashboard(record)} disabled />
        ),
      });
      cols.push({
        valueType: 'option',
        width: 100,
        fixed: 'right',
        render: (_, record) => [
          <Button
            key="export"
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            title={formatMessage({
              id: 'dashboards.list.actionExport',
              defaultMessage: 'Export dashboard',
            })}
            onClick={() => void exportOne(record)}
          />,
          <Dropdown
            key="more"
            trigger={['click']}
            menu={{
              items: [
                isPublicDashboard(record)
                  ? {
                      key: 'make-private',
                      label: formatMessage({
                        id: 'dashboards.list.actionMakePrivate',
                        defaultMessage: 'Make dashboard private',
                      }),
                      onClick: () => confirmMakePrivate(record),
                    }
                  : {
                      key: 'make-public',
                      label: formatMessage({
                        id: 'dashboards.list.actionMakePublic',
                        defaultMessage: 'Make dashboard public',
                      }),
                      onClick: () => confirmMakePublic(record),
                    },
                {
                  key: 'delete',
                  danger: true,
                  label: formatMessage({
                    id: 'dashboards.list.actionDelete',
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
      });
    }
    return cols;
  }, [formatMessage, readOnly, urlState.sortProperty, urlState.sortDirection]);

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
              id: 'dashboards.list.search',
              defaultMessage: 'Search dashboards',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void dashboardsQuery.refetch()}
          >
            {formatMessage({
              id: 'dashboards.list.refresh',
              defaultMessage: 'Refresh',
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
            id: 'dashboards.list.loadFailed',
            defaultMessage: 'Failed to load dashboards',
          })}
          description={serverErrorText(dashboardsQuery.error)}
        />
      )}

      <ProTable<DashboardInfo>
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
                id: 'dashboards.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'dashboards.list.empty',
            defaultMessage: 'No dashboards',
          }),
        }}
      />
    </PageContainer>
  );
}
