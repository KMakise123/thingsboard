/**
 * Edge-scope assets page (M13 wave-5a, spec §5.3; ui-ngx edge-scope asset
 * table parity): rows are the assets already assigned to this edge — no
 * create/import here. TA gets the assign-existing dialog + unassign (single
 * and batch fan-out); CUSTOMER_USER gets the read-only collapse (filters,
 * list and the detail jump stay, assignment controls hide). No type filter
 * control: ngx shows the type column but ships no filter header on this
 * table, so the endpoint's optional `type` param stays unused.
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
import { getTenantAssets } from '@/services/tb/asset';
import {
  assignEdgeAsset,
  getEdgeAssets,
  unassignEdgeAsset,
} from '@/services/tb/edge';
import type { PageLink } from '@/types/tb';
import type { AssetInfo } from '@/types/tb/asset';
import {
  AssignEntitiesDialog,
  type AssignEntitiesOption,
} from '../assign-entities-dialog';
import { EdgeScopePageShell, useEdgeScopeName } from '../detail/scope-shell';
import { useAuthority } from '../detail/use-authority';

const SCOPE_ASSETS_KEY = ['edges', 'assets', 'scope'] as const;

const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  assetProfileName: 'assetProfileName',
  label: 'label',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

export default function EdgeAssetsPage() {
  const { id } = useParams<{ id: string }>();
  const edgeId = id;
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
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

  const assetsQuery = useQuery({
    queryKey: [
      ...SCOPE_ASSETS_KEY,
      edgeId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () =>
      getEdgeAssets(edgeId as string, listUrlState.toPageLink(urlState)),
    enabled: !!edgeId,
    placeholderData: keepPreviousData,
  });
  // The endpoint returns AssetInfo rows (joined profile name).
  const assets = (assetsQuery.data?.data ?? []) as Array<AssetInfo>;
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_ASSETS_KEY });

  // ---- selection + batch
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedAssets = assets.filter((asset) =>
    selectedRowKeys.includes(asset.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const confirmUnassign = (targets: Array<AssetInfo>) => {
    if (targets.length === 0) {
      return;
    }
    modal.confirm({
      title:
        targets.length === 1
          ? formatMessage(
              {
                id: 'pages.edge.scope.unassignOneTitle',
                defaultMessage:
                  "Are you sure you want to unassign '{name}' from the edge?",
              },
              { name: targets[0].name },
            )
          : formatMessage(
              {
                id: 'pages.edge.scope.unassignManyTitle',
                defaultMessage:
                  'Are you sure you want to unassign {count, plural, =1 {1 entity} other {# entities}} from the edge?',
              },
              { count: targets.length },
            ),
      content:
        targets.length === 1
          ? formatMessage({
              id: 'pages.edge.scope.unassignText',
              defaultMessage:
                'After the confirmation the entity will no longer belong to this edge.',
            })
          : formatMessage({
              id: 'pages.edge.scope.unassignManyText',
              defaultMessage:
                'After the confirmation the selected entities will no longer belong to this edge.',
            }),
      okText: formatMessage({
        id: 'pages.edge.scope.actionUnassign',
        defaultMessage: 'Unassign from edge',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        const summary = await batch.run(
          targets,
          (asset) => asset.name,
          (asset) => unassignEdgeAsset(edgeId as string, asset.id.id),
        );
        setSelectedRowKeys([]);
        void invalidate();
        void message.success(
          formatMessage({
            id: 'pages.edge.scope.toastUnassigned',
            defaultMessage: 'Entities unassigned from the edge.',
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
      (entry) => assignEdgeAsset(edgeId as string, entry.id),
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

  const loadAssetCandidates = (pageLink: PageLink) =>
    getTenantAssets(pageLink).then((page) => ({
      ...page,
      data: page.data.map<AssignEntitiesOption>((asset) => ({
        id: asset.id.id,
        label: asset.name,
      })),
    }));

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<AssetInfo>[] = useMemo(() => {
    const cols: ProColumns<AssetInfo>[] = [
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
            onClick={() => history.push(`/assets/${record.id.id}`)}
          >
            {record.name}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.edge.scope.columnAssetProfile',
          defaultMessage: 'Asset profile',
        }),
        dataIndex: 'assetProfileName',
        sorter: true,
        sortOrder: sortOrderFor('assetProfileName'),
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
    ];
    if (!readOnly) {
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
        ],
      });
    }
    return cols;
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection, readOnly]);

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<AssetInfo>['onChange'] = (
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
        id: 'pages.edge.scope.assetsTitle',
        defaultMessage: 'Assets',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.edge.scope.assetsSearch',
              defaultMessage: 'Search assets',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void assetsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.edge.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          {!readOnly && (
            <>
              {selectedAssets.length > 0 && (
                <>
                  <Typography.Text type="secondary">
                    {formatMessage(
                      {
                        id: 'pages.edge.selectedCount',
                        defaultMessage: '{count} selected',
                      },
                      { count: selectedAssets.length },
                    )}
                  </Typography.Text>
                  <Button onClick={() => confirmUnassign(selectedAssets)}>
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
                  id: 'pages.edge.scope.assignAssets',
                  defaultMessage: 'Assign existing assets',
                })}
              </Button>
            </>
          )}
        </div>
      }
    >
      {assetsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.edge.scope.assetsLoadFailed',
            defaultMessage: 'Failed to load assets',
          })}
          description={serverErrorText(assetsQuery.error)}
        />
      )}

      <ProTable<AssetInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={assets}
        loading={assetsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: assetsQuery.data?.totalElements ?? 0,
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
            id: 'pages.edge.scope.assetsEmpty',
            defaultMessage: 'No assets on this edge',
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
            id: 'pages.edge.scope.assignAssets',
            defaultMessage: 'Assign existing assets',
          })}
          loadCandidates={loadAssetCandidates}
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
