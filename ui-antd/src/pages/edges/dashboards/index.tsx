/**
 * Edge-scope dashboards page (M13 wave-5a, spec §5.3; ui-ngx edge-scope
 * dashboard table parity): rows are the dashboards already assigned to this
 * edge. The title link opens the dashboard in the readonly view (the ngx
 * "open dashboard" row action), the export button reuses the dashboards
 * domain's export helper. TA gets the assign-existing dialog + unassign
 * (single and batch fan-out); CUSTOMER_USER keeps list / open / export and
 * loses every assignment control.
 */

import {
  DownloadOutlined,
  MoreOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
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
import { serverErrorText } from '@/components/entities/server-error-text';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useAuthority } from '@/components/shared/use-authority';
import { useBatchRun } from '@/components/shared/use-batch-run';
import { createListUrlState } from '@/pages/customers/list-url-state';
import { exportDashboardToFile } from '@/pages/dashboards/list/import-export';
import { getTenantDashboards } from '@/services/tb/dashboard';
import {
  assignEdgeDashboard,
  getEdgeDashboards,
  unassignEdgeDashboard,
} from '@/services/tb/edge';
import type { PageLink } from '@/types/tb';
import type { DashboardInfo } from '@/types/tb/dashboard';
import {
  AssignEntitiesDialog,
  type AssignEntitiesOption,
} from '../assign-entities-dialog';
import { EdgeScopePageShell, useEdgeScopeName } from '../detail/scope-shell';
import {
  EDGE_SCOPE_UNASSIGN_TEXTS,
  useEdgeUnassign,
} from '../use-edge-unassign';

const SCOPE_DASHBOARDS_KEY = ['edges', 'dashboards', 'scope'] as const;

const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

export default function EdgeDashboardsPage() {
  const { id } = useParams<{ id: string }>();
  const edgeId = id;
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { authority } = useAuthority();
  const readOnly = authority !== 'TENANT_ADMIN';
  const { state: urlState, patch } = listUrlState.useListUrlState();
  const nameQuery = useEdgeScopeName(edgeId);

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

  const dashboardsQuery = useQuery({
    queryKey: [
      ...SCOPE_DASHBOARDS_KEY,
      edgeId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () =>
      getEdgeDashboards(edgeId as string, listUrlState.toPageLink(urlState)),
    enabled: !!edgeId,
    placeholderData: keepPreviousData,
  });
  const dashboards: Array<DashboardInfo> = dashboardsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_DASHBOARDS_KEY });

  // ---- selection + batch
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedDashboards = dashboards.filter((dashboard) =>
    selectedRowKeys.includes(dashboard.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const confirmUnassign = useEdgeUnassign<DashboardInfo>({
    batch,
    openBatch: () => setBatchOpen(true),
    clearSelection: () => setSelectedRowKeys([]),
    invalidate,
    texts: EDGE_SCOPE_UNASSIGN_TEXTS,
    labelOf: (dashboard) => dashboard.title,
    unassignOne: (dashboard) =>
      unassignEdgeDashboard(edgeId as string, dashboard.id.id),
  });

  const runAssign = async (selected: Array<AssignEntitiesOption>) => {
    setAssignOpen(false);
    setBatchOpen(true);
    const summary = await batch.run(
      selected,
      (entry) => entry.label,
      (entry) => assignEdgeDashboard(edgeId as string, entry.id),
    );
    void invalidate();
    void message.success(
      formatMessage({
        id: 'pages.edge.scope.toastAssigned',
        defaultMessage: 'Entities assigned to the edge.',
      }),
    );
    if (summary.failed > 0) {
      void message.warning(
        formatMessage(
          {
            id: 'pages.edge.batchResult',
            defaultMessage: '{ok} succeeded, {fail} failed.',
          },
          { ok: summary.ok, fail: summary.failed },
        ),
      );
    }
  };

  const loadDashboardCandidates = (pageLink: PageLink) =>
    getTenantDashboards(pageLink).then((page) => ({
      ...page,
      data: page.data.map<AssignEntitiesOption>((dashboard) => ({
        id: dashboard.id.id,
        label: dashboard.title,
      })),
    }));

  const exportOne = async (dashboard: DashboardInfo) => {
    try {
      await exportDashboardToFile(dashboard.id.id);
    } catch (error) {
      void message.error(
        formatMessage(
          {
            id: 'pages.edge.scope.exportFailed',
            defaultMessage: 'Failed to export the dashboard: {error}',
          },
          { error: serverErrorText(error) },
        ),
      );
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: excluded row-action handlers take the row as an argument and read no reactive state (stable setters / batch runner only); the listed deps cover every value that shapes the rendered columns, edgeId included so unassign never binds a stale route param
  const columns: ProColumns<DashboardInfo>[] = useMemo(() => {
    const cols: ProColumns<DashboardInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.edge.createdTime',
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
          id: 'pages.edge.scope.columnTitle',
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
            id: 'pages.edge.scope.actionExport',
            defaultMessage: 'Export dashboard',
          })}
          onClick={() => void exportOne(record)}
        />,
        ...(readOnly
          ? []
          : [
              <Dropdown
                key="more"
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'unassign',
                      label: formatMessage({
                        id: 'pages.edge.scope.actionUnassign',
                        defaultMessage: 'Unassign from edge',
                      }),
                      onClick: () => confirmUnassign([record]),
                    },
                  ],
                }}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} />
              </Dropdown>,
            ]),
      ],
    });
    return cols;
  }, [
    formatMessage,
    urlState.sortProperty,
    urlState.sortDirection,
    readOnly,
    edgeId,
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
    <EdgeScopePageShell
      edgeId={edgeId}
      edgeName={nameQuery.data?.name}
      loadError={nameQuery.isError ? nameQuery.error : undefined}
      title={formatMessage({
        id: 'pages.edge.scope.dashboardsTitle',
        defaultMessage: 'Dashboards',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.edge.scope.dashboardsSearch',
              defaultMessage: 'Search dashboards',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void dashboardsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.edge.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          {!readOnly && (
            <>
              {selectedDashboards.length > 0 && (
                <>
                  <Typography.Text type="secondary">
                    {formatMessage(
                      {
                        id: 'pages.edge.selectedCount',
                        defaultMessage: '{count} selected',
                      },
                      { count: selectedDashboards.length },
                    )}
                  </Typography.Text>
                  <Button onClick={() => confirmUnassign(selectedDashboards)}>
                    {formatMessage({
                      id: 'pages.edge.scope.batchUnassign',
                      defaultMessage: 'Unassign selected',
                    })}
                  </Button>
                </>
              )}
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setAssignOpen(true)}
              >
                {formatMessage({
                  id: 'pages.edge.scope.assignDashboards',
                  defaultMessage: 'Assign existing dashboards',
                })}
              </Button>
            </>
          )}
        </div>
      }
    >
      {dashboardsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.edge.scope.dashboardsLoadFailed',
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
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: dashboardsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.edge.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.edge.scope.dashboardsEmpty',
            defaultMessage: 'No dashboards on this edge',
          }),
        }}
        rowSelection={
          readOnly
            ? undefined
            : {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
              }
        }
      />

      {!readOnly && (
        <AssignEntitiesDialog
          open={assignOpen}
          title={formatMessage({
            id: 'pages.edge.scope.assignDashboards',
            defaultMessage: 'Assign existing dashboards',
          })}
          loadCandidates={loadDashboardCandidates}
          onClose={() => setAssignOpen(false)}
          onConfirm={(selected) => void runAssign(selected)}
        />
      )}
      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => {
          setBatchOpen(false);
          batch.reset();
        }}
      />
    </EdgeScopePageShell>
  );
}
