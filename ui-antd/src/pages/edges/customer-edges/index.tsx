/**
 * Customer-scope Edge instances page (M13 wave-5a, spec §5.1; ui-ngx
 * customer-scope edges table parity): title reads "Customer title: Edge
 * instances", every row belongs to this customer, so the row "delete" is
 * really an unassign (edge stays alive, just leaves the customer). Header
 * holds the "assign existing edges" dialog (tenant candidates → per-row
 * assignEdgeToCustomer fan-out) plus the batch unassign. TENANT_ADMIN only
 * (lives under the customers route family).
 */

import {
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
import { useBatchRun } from '@/components/shared/use-batch-run';
import { createListUrlState } from '@/pages/customers/list-url-state';
import {
  CustomerScopePageShell,
  useCustomerScopeTitle,
} from '@/pages/customers/scope-page-shell';
import {
  AssignEntitiesDialog,
  type AssignEntitiesOption,
} from '@/pages/edges/assign-entities-dialog';
import {
  assignEdgeToCustomer,
  getCustomerEdgeInfos,
  getTenantEdgeInfos,
  unassignEdgeFromCustomer,
} from '@/services/tb/edge';
import type { PageLink } from '@/types/tb';
import type { EdgeInfo } from '@/types/tb/edge';

const SCOPE_EDGES_KEY = ['customers', 'edges', 'scope'] as const;

const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  type: 'type',
  label: 'label',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

export default function CustomerEdgesPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = id;
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = listUrlState.useListUrlState();
  const titleQuery = useCustomerScopeTitle(customerId);

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

  const edgesQuery = useQuery({
    queryKey: [
      ...SCOPE_EDGES_KEY,
      customerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () =>
      getCustomerEdgeInfos(
        customerId as string,
        listUrlState.toPageLink(urlState),
      ),
    enabled: !!customerId,
    placeholderData: keepPreviousData,
  });
  const edges: Array<EdgeInfo> = edgesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_EDGES_KEY });

  // ---- selection + batch
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedEdges = edges.filter((edge) =>
    selectedRowKeys.includes(edge.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // The customer-scope "delete" is an unassign (the edge itself is kept).
  const confirmUnassign = (targets: Array<EdgeInfo>) => {
    if (targets.length === 0) {
      return;
    }
    modal.confirm({
      title:
        targets.length === 1
          ? formatMessage(
              {
                id: 'pages.edge.unassignTitle',
                defaultMessage:
                  "Are you sure you want to unassign the edge '{name}'?",
              },
              { name: targets[0].name },
            )
          : formatMessage(
              {
                id: 'pages.edge.customerEdges.unassignManyTitle',
                defaultMessage:
                  'Are you sure you want to unassign {count, plural, =1 {1 edge} other {# edges}}?',
              },
              { count: targets.length },
            ),
      content:
        targets.length === 1
          ? formatMessage({
              id: 'pages.edge.unassignText',
              defaultMessage:
                'After the confirmation the edge will be unassigned and will not be accessible by the customer.',
            })
          : formatMessage({
              id: 'pages.edge.customerEdges.unassignManyText',
              defaultMessage:
                'After the confirmation the selected edges will be unassigned and will not be accessible by the customer.',
            }),
      okText: formatMessage({
        id: 'pages.edge.action.unassign',
        defaultMessage: 'Unassign from customer',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        const summary = await batch.run(
          targets,
          (edge) => edge.name,
          (edge) => unassignEdgeFromCustomer(edge.id.id),
        );
        setSelectedRowKeys([]);
        void invalidate();
        void message.success(
          formatMessage({
            id: 'pages.edge.toastUnassigned',
            defaultMessage: 'Edge unassigned from the customer.',
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
      },
    });
  };

  const runAssign = async (selected: Array<AssignEntitiesOption>) => {
    setAssignOpen(false);
    setBatchOpen(true);
    const summary = await batch.run(
      selected,
      (entry) => entry.label,
      (entry) => assignEdgeToCustomer(customerId as string, entry.id),
    );
    void invalidate();
    void message.success(
      formatMessage({
        id: 'pages.edge.toastAssigned',
        defaultMessage: 'Edge assigned to the customer.',
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

  const loadEdgeCandidates = (pageLink: PageLink) =>
    getTenantEdgeInfos(pageLink).then((page) => ({
      ...page,
      data: page.data.map<AssignEntitiesOption>((edge) => ({
        id: edge.id.id,
        label: edge.name,
      })),
    }));

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<EdgeInfo>[] = useMemo(() => {
    const cols: ProColumns<EdgeInfo>[] = [
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
          id: 'pages.edge.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        render: (_, record) => (
          <Typography.Link
            onClick={() => history.push(`/edges/${record.id.id}`)}
          >
            {record.name}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.edge.type',
          defaultMessage: 'Edge type',
        }),
        dataIndex: 'type',
        sorter: true,
        sortOrder: sortOrderFor('type'),
      },
      {
        title: formatMessage({
          id: 'pages.edge.label',
          defaultMessage: 'Label',
        }),
        dataIndex: 'label',
        sorter: true,
        sortOrder: sortOrderFor('label'),
        render: (_, record) => record.label || '-',
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
                  key: 'unassign',
                  label: formatMessage({
                    id: 'pages.edge.action.unassign',
                    defaultMessage: 'Unassign from customer',
                  }),
                  onClick: () => confirmUnassign([record]),
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
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<EdgeInfo>['onChange'] = (
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

  const scopeTitle = formatMessage({
    id: 'menu.edge.instances',
    defaultMessage: 'Edge instances',
  });

  return (
    <CustomerScopePageShell
      customerId={customerId}
      customerTitle={titleQuery.data}
      loadError={titleQuery.isError ? titleQuery.error : undefined}
      title={titleQuery.data ? `${titleQuery.data}: ${scopeTitle}` : scopeTitle}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.edge.search',
              defaultMessage: 'Search edges',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void edgesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.edge.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          {selectedEdges.length > 0 && (
            <>
              <Typography.Text type="secondary">
                {formatMessage(
                  {
                    id: 'pages.edge.selectedCount',
                    defaultMessage: '{count} selected',
                  },
                  { count: selectedEdges.length },
                )}
              </Typography.Text>
              <Button onClick={() => confirmUnassign(selectedEdges)}>
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
              id: 'pages.edge.customerEdges.assignExisting',
              defaultMessage: 'Assign existing edges',
            })}
          </Button>
        </div>
      }
    >
      {edgesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.edge.loadFailed',
            defaultMessage: 'Failed to load edges',
          })}
          description={serverErrorText(edgesQuery.error)}
        />
      )}

      <ProTable<EdgeInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={edges}
        loading={edgesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: edgesQuery.data?.totalElements ?? 0,
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
            id: 'pages.edge.empty',
            defaultMessage: 'No edges found',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <AssignEntitiesDialog
        open={assignOpen}
        title={formatMessage({
          id: 'pages.edge.customerEdges.assignExisting',
          defaultMessage: 'Assign existing edges',
        })}
        loadCandidates={loadEdgeCandidates}
        onClose={() => setAssignOpen(false)}
        onConfirm={(selected) => void runAssign(selected)}
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
