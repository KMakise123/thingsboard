/**
 * Customer-scope assets page (spec 3.5「作用域页 ×4」, ui-ngx customer
 * assets subtree): same shape as the customer devices page over the asset
 * domain — no create/assign here (assets are created tenant-side and
 * assigned), rows offer unassign (this customer, single + batch fan-out),
 * delete (confirmed), and the name link into the asset detail page.
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
import {
  deleteAsset,
  getCustomerAssets,
  unassignAssetFromCustomer,
} from '@/services/tb/asset';
import type { AssetInfo } from '@/types/tb';
import { createListUrlState } from '../list-url-state';
import {
  CustomerScopePageShell,
  useCustomerScopeTitle,
} from '../scope-page-shell';

const SCOPE_ASSETS_KEY = ['customers', 'assets', 'scope'] as const;

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

export default function CustomerAssetsPage() {
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

  const assetsQuery = useQuery({
    queryKey: [
      ...SCOPE_ASSETS_KEY,
      customerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () =>
      getCustomerAssets(
        customerId as string,
        listUrlState.toPageLink(urlState),
      ),
    enabled: !!customerId,
    placeholderData: keepPreviousData,
  });
  const assets: Array<AssetInfo> = assetsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_ASSETS_KEY });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedAssets = assets.filter((asset) =>
    selectedRowKeys.includes(asset.id.id),
  );

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  const deleteOneMutation = useMutation({
    mutationFn: (assetId: string) => deleteAsset(assetId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.assets.toastDeleted',
          defaultMessage: 'Asset deleted.',
        }),
      );
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmUnassign = (targets: Array<AssetInfo>) => {
    if (targets.length === 0) {
      return;
    }
    modal.confirm({
      title:
        targets.length === 1
          ? formatMessage(
              {
                id: 'pages.customers.assets.unassignTitle',
                defaultMessage:
                  "Are you sure you want to unassign the asset '{name}'?",
              },
              { name: targets[0].name },
            )
          : formatMessage(
              {
                id: 'pages.customers.assets.unassignManyTitle',
                defaultMessage:
                  'Are you sure you want to unassign {count, plural, =1 {1 asset} other {# assets}}?',
              },
              { count: targets.length },
            ),
      content:
        targets.length === 1
          ? formatMessage({
              id: 'pages.customers.assets.unassignText',
              defaultMessage:
                'After the confirmation the asset will no longer belong to this customer.',
            })
          : formatMessage({
              id: 'pages.customers.assets.unassignManyText',
              defaultMessage:
                'After the confirmation the selected assets will no longer belong to this customer.',
            }),
      okText: formatMessage({
        id: 'pages.customers.assets.actionUnassign',
        defaultMessage: 'Unassign from this customer',
      }),
      cancelText: formatMessage({
        id: 'pages.customers.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        const summary = await batch.run(
          targets,
          (asset) => asset.name,
          (asset) => unassignAssetFromCustomer(asset.id.id),
        );
        setSelectedRowKeys([]);
        void invalidate();
        void message.success(
          formatMessage({
            id: 'pages.customers.assets.toastUnassigned',
            defaultMessage: 'Assets unassigned from the customer.',
          }),
        );
        if (summary.failed > 0) {
          void message.warning(
            formatMessage(
              {
                id: 'pages.devices.list.batchResult',
                defaultMessage: '{ok} succeeded, {fail} failed.',
              },
              { ok: summary.ok, fail: summary.failed },
            ),
          );
        }
      },
    });
  };

  const confirmDeleteOne = (asset: AssetInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.customers.assets.deleteTitle',
          defaultMessage: "Are you sure you want to delete the asset '{name}'?",
        },
        { name: asset.name },
      ),
      content: formatMessage({
        id: 'pages.customers.assets.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the asset and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.customers.assets.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.customers.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOneMutation.mutateAsync(asset.id.id),
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<AssetInfo>[] = useMemo(() => {
    const cols: ProColumns<AssetInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.customers.assets.columnCreatedTime',
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
          id: 'pages.customers.assets.columnName',
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
          id: 'pages.customers.assets.columnProfile',
          defaultMessage: 'Asset profile',
        }),
        dataIndex: 'assetProfileName',
        sorter: true,
        sortOrder: sortOrderFor('assetProfileName'),
      },
      {
        title: formatMessage({
          id: 'pages.customers.assets.columnLabel',
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
                    id: 'pages.customers.assets.actionUnassign',
                    defaultMessage: 'Unassign from this customer',
                  }),
                  onClick: () => confirmUnassign([record]),
                },
                {
                  key: 'delete',
                  danger: true,
                  label: formatMessage({
                    id: 'pages.customers.assets.actionDelete',
                    defaultMessage: 'Delete',
                  }),
                  onClick: () => confirmDeleteOne(record),
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
    <CustomerScopePageShell
      customerId={customerId}
      customerTitle={titleQuery.data}
      loadError={titleQuery.isError ? titleQuery.error : undefined}
      title={formatMessage({
        id: 'pages.customers.assets.title',
        defaultMessage: 'Customer assets',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.customers.assets.search',
              defaultMessage: 'Search assets',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void assetsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.customers.assets.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          {selectedAssets.length > 0 && (
            <>
              <Typography.Text type="secondary">
                {formatMessage(
                  {
                    id: 'pages.customers.assets.selectedCount',
                    defaultMessage: '{count} selected',
                  },
                  { count: selectedAssets.length },
                )}
              </Typography.Text>
              <Button onClick={() => confirmUnassign(selectedAssets)}>
                {formatMessage({
                  id: 'pages.customers.assets.batchUnassign',
                  defaultMessage: 'Unassign selected assets',
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
            id: 'pages.customers.assets.loadFailed',
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
                id: 'pages.customers.assets.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.customers.assets.empty',
            defaultMessage: 'No assets',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
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
