/**
 * Asset list page (spec 3.4「与 3.3 同构」, ui-ngx assets-table parity).
 *
 * Mirrors the device list (ProTable dataSource fed by useQuery — no `request`
 * prop, no direct HTTP; mutations invalidate via queryClient; server pages
 * 0-based with explicit sortOrder; filters/page/sort live in the URL for
 * bookmark restore). Asset deltas: no active state (AssetInfo has no
 * online/offline concept and the assetInfos endpoints accept no `active`
 * parameter), no credentials/connectivity actions (assets have none), and
 * the row action set follows ui-ngx: edit dialog / make-public + assign
 * (unassigned) / unassign (assigned, not public) / make-private (public —
 * its action IS the unassign call) / delete, plus CSV import and the
 * tenant-scope customerIsPublic column (ui-ngx checkBoxCell). Batch
 * operations fan out per entity through the shared runner (no bulk
 * endpoints upstream — BCR C-1; the switch point to real bulk APIs is the
 * per-item task lambda below).
 *
 * Tenant admins get the full action set; customer users a read-only view
 * over their customer's assets (spec §2 CU principle 3).
 */

import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
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
  Select,
  Space,
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { AssetDialog } from '@/components/assets/AssetDialog';
import { AssetImportModal } from '@/components/assets/AssetImportModal';
import { AssignCustomerModal } from '@/components/entities/AssignCustomerModal';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { BatchProgressModal } from '@/pages/devices/list/BatchProgressModal';
import { useBatchRun } from '@/pages/devices/list/use-batch-run';
import {
  assignAssetToCustomer,
  deleteAsset,
  getAssetProfiles,
  getCustomerAssets,
  getTenantAssets,
  makeAssetPublic,
  unassignAssetFromCustomer,
} from '@/services/tb/asset';
import type { AssetInfo } from '@/types/tb';
import {
  toAssetListFilter,
  toPageLink,
  useAssetListUrlState,
} from './url-state';
import { useAuthority } from './use-authority';

const ASSETS_QUERY_KEY = ['assets', 'list'] as const;

/** Table column key -> sortable server property (AssetInfo fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  assetProfileName: 'assetProfileName',
  label: 'label',
  customerTitle: 'customerTitle',
};

const SEARCH_DEBOUNCE_MS = 400;

export default function AssetsListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useAssetListUrlState();
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

  // ---- profile filter options (server-searched autocomplete)
  const [profileFilterSearch, setProfileFilterSearch] = useState('');
  const [profileFilterDebounced, setProfileFilterDebounced] = useState('');
  const profileTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(profileTimer.current);
    profileTimer.current = setTimeout(
      () => setProfileFilterDebounced(profileFilterSearch.trim()),
      300,
    );
    return () => clearTimeout(profileTimer.current);
  }, [profileFilterSearch]);

  const profileOptionsQuery = useQuery({
    queryKey: ['asset-profiles', 'filter', profileFilterDebounced],
    queryFn: () =>
      getAssetProfiles({
        pageSize: 50,
        page: 0,
        textSearch: profileFilterDebounced || undefined,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
  });

  // ---- the list itself
  const assetsQuery = useQuery({
    queryKey: [
      ...ASSETS_QUERY_KEY,
      authority,
      cuCustomerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.assetProfileId,
    ],
    queryFn: () => {
      const pageLink = toPageLink(urlState);
      const filter = toAssetListFilter(urlState);
      return readOnly && cuCustomerId
        ? getCustomerAssets(cuCustomerId, pageLink, filter)
        : getTenantAssets(pageLink, filter);
    },
    placeholderData: keepPreviousData,
  });
  const assets: Array<AssetInfo> = assetsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedAssets = assets.filter((asset) =>
    selectedRowKeys.includes(asset.id.id),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AssetInfo | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [assignTargets, setAssignTargets] = useState<Array<AssetInfo>>([]);

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  const deleteOneMutation = useMutation({
    mutationFn: (assetId: string) => deleteAsset(assetId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.assets.list.toastDeleted',
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

  const reportBatchSummary = (
    summary: { ok: number; failed: number },
    successMessageId: string,
  ) => {
    if (summary.failed > 0) {
      void message.warning(
        formatMessage(
          {
            id: 'pages.assets.list.batchResult',
            defaultMessage: '{ok} succeeded, {fail} failed.',
          },
          { ok: summary.ok, fail: summary.failed },
        ),
      );
    } else {
      void message.success(
        formatMessage({
          id: successMessageId,
          defaultMessage: 'Done.',
        }),
      );
    }
  };

  const confirmDeleteOne = (asset: AssetInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.assets.list.deleteTitle',
          defaultMessage: "Are you sure you want to delete the asset '{name}'?",
        },
        { name: asset.name },
      ),
      content: formatMessage({
        id: 'pages.assets.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the asset and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.assets.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.assets.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOneMutation.mutateAsync(asset.id.id),
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedAssets.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.assets.list.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 asset} other {# assets}}?',
        },
        { count: selectedAssets.length },
      ),
      content: formatMessage({
        id: 'pages.assets.list.deleteManyText',
        defaultMessage:
          'Be careful, after the confirmation all selected assets will be removed and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.assets.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.assets.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        // BCR C-1 switch point: per-entity DELETE fan-out; swap the task
        // lambda for a bulk endpoint once the backend provides one.
        const summary = await batch.run(
          selectedAssets,
          (asset) => asset.name,
          (asset) => deleteAsset(asset.id.id),
        );
        setSelectedRowKeys([]);
        void invalidate();
        reportBatchSummary(summary, 'pages.assets.list.toastDeleted');
      },
    });
  };

  const makePublicMutation = useMutation({
    mutationFn: (assetId: string) => makeAssetPublic(assetId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.assets.list.toastMadePublic',
          defaultMessage: 'Asset is now public.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  // ui-ngx makePublic: explicit confirm, then POST to the public-customer
  // endpoint (RECON §6 — making it private again is the unassign flow).
  const confirmMakePublic = (asset: AssetInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.assets.list.makePublicTitle',
          defaultMessage:
            "Are you sure you want to make the asset '{name}' public?",
        },
        { name: asset.name },
      ),
      content: formatMessage({
        id: 'pages.assets.list.makePublicText',
        defaultMessage:
          'After the confirmation the asset and all its data will be made public and accessible by others.',
      }),
      okText: formatMessage({
        id: 'pages.assets.list.actionMakePublic',
        defaultMessage: 'Make asset public',
      }),
      cancelText: formatMessage({
        id: 'pages.assets.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => makePublicMutation.mutateAsync(asset.id.id),
    });
  };

  const confirmUnassign = (targets: Array<AssetInfo>) => {
    if (targets.length === 0) {
      return;
    }
    modal.confirm({
      title:
        targets.length === 1
          ? formatMessage(
              {
                id: 'pages.assets.list.unassignTitle',
                defaultMessage:
                  "Are you sure you want to unassign the asset '{name}'?",
              },
              { name: targets[0].name },
            )
          : formatMessage(
              {
                id: 'pages.assets.list.unassignManyTitle',
                defaultMessage:
                  'Are you sure you want to unassign {count, plural, =1 {1 asset} other {# assets}}?',
              },
              { count: targets.length },
            ),
      content:
        targets.length === 1
          ? formatMessage({
              id: 'pages.assets.list.unassignText',
              defaultMessage:
                'After the confirmation the asset will be unassigned and will not be accessible by the customer.',
            })
          : formatMessage({
              id: 'pages.assets.list.unassignManyText',
              defaultMessage:
                'After the confirmation all selected assets will be unassigned and will not be accessible by the customer.',
            }),
      okText: formatMessage({
        id: 'pages.assets.list.actionUnassign',
        defaultMessage: 'Unassign from customer',
      }),
      cancelText: formatMessage({
        id: 'pages.assets.list.cancel',
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
        reportBatchSummary(summary, 'pages.assets.list.toastUnassigned');
      },
    });
  };

  const runAssign = async (customerId: string) => {
    if (assignTargets.length === 0) {
      return;
    }
    const targets = assignTargets;
    setAssignTargets([]);
    setBatchOpen(true);
    const summary = await batch.run(
      targets,
      (asset) => asset.name,
      (asset) => assignAssetToCustomer(customerId, asset.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    reportBatchSummary(summary, 'pages.assets.list.toastAssigned');
  };

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<AssetInfo>[] = useMemo(() => {
    const cols: ProColumns<AssetInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.assets.list.createdTime',
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
          id: 'pages.assets.list.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        render: (_, record) => (
          // Entry point to the detail page (ui-ngx open-details-page link).
          <Typography.Link
            onClick={() => history.push(`/assets/${record.id.id}`)}
          >
            {record.name}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.assets.list.profile',
          defaultMessage: 'Asset profile',
        }),
        dataIndex: 'assetProfileName',
        sorter: true,
        sortOrder: sortOrderFor('assetProfileName'),
      },
      {
        title: formatMessage({
          id: 'pages.assets.list.label',
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
        title: formatMessage({
          id: 'pages.assets.list.customer',
          defaultMessage: 'Customer',
        }),
        dataIndex: 'customerTitle',
        sorter: true,
        sortOrder: sortOrderFor('customerTitle'),
        render: (_, record) => record.customerTitle || '-',
      });
      // Public flag as its own column, tenant scope only (ui-ngx
      // checkBoxCell at assets-table-config L174-176; AntD-ized as a
      // disabled checkbox — it is a read-only boolean, not an action).
      cols.push({
        title: formatMessage({
          id: 'pages.assets.list.publicColumn',
          defaultMessage: 'Public',
        }),
        dataIndex: 'customerIsPublic',
        width: 80,
        align: 'center',
        render: (_, record) => (
          <Checkbox checked={record.customerIsPublic} disabled />
        ),
      });
    }
    cols.push({
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) =>
        [
          !readOnly ? (
            <Button
              key="edit"
              type="text"
              size="small"
              icon={<EditOutlined />}
              title={formatMessage({
                id: 'pages.assets.list.actionEdit',
                defaultMessage: 'Edit',
              })}
              onClick={() => {
                setEditTarget(record);
                setDialogOpen(true);
              }}
            />
          ) : null,
          !readOnly ? (
            <Dropdown
              key="more"
              trigger={['click']}
              menu={{
                items: [
                  // ui-ngx cellAction semantics (assets-table-config
                  // L203-228): unassigned -> make-public + assign; assigned
                  // and not public -> unassign; assigned and public ->
                  // make-private, whose action IS the unassign call.
                  ...(hasCustomer(record)
                    ? [
                        record.customerIsPublic
                          ? {
                              key: 'make-private',
                              label: formatMessage({
                                id: 'pages.assets.list.actionMakePrivate',
                                defaultMessage: 'Make asset private',
                              }),
                              onClick: () => confirmUnassign([record]),
                            }
                          : {
                              key: 'unassign',
                              label: formatMessage({
                                id: 'pages.assets.list.actionUnassign',
                                defaultMessage: 'Unassign from customer',
                              }),
                              onClick: () => confirmUnassign([record]),
                            },
                      ]
                    : [
                        {
                          key: 'make-public',
                          label: formatMessage({
                            id: 'pages.assets.list.actionMakePublic',
                            defaultMessage: 'Make asset public',
                          }),
                          onClick: () => confirmMakePublic(record),
                        },
                        {
                          key: 'assign',
                          label: formatMessage({
                            id: 'pages.assets.list.actionAssign',
                            defaultMessage: 'Assign to customer',
                          }),
                          onClick: () => setAssignTargets([record]),
                        },
                      ]),
                  {
                    key: 'delete',
                    danger: true,
                    label: formatMessage({
                      id: 'pages.assets.list.actionDelete',
                      defaultMessage: 'Delete',
                    }),
                    onClick: () => confirmDeleteOne(record),
                  },
                ],
              }}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          ) : null,
        ].filter(Boolean),
    });
    return cols;
  }, [formatMessage, readOnly, urlState.sortProperty, urlState.sortDirection]);

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

  const assignedSelected = selectedAssets.filter(hasCustomer);

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
              id: 'pages.assets.list.search',
              defaultMessage: 'Search assets',
            })}
          />
          <Select
            allowClear
            showSearch
            className="w-56"
            filterOption={false}
            onSearch={setProfileFilterSearch}
            loading={profileOptionsQuery.isPending}
            value={urlState.assetProfileId}
            placeholder={formatMessage({
              id: 'pages.assets.list.profilePlaceholder',
              defaultMessage: 'All asset profiles',
            })}
            options={(profileOptionsQuery.data?.data ?? []).map((profile) => ({
              label: profile.name,
              value: profile.id.id,
            }))}
            onChange={(value) =>
              patch({ assetProfileId: value ?? undefined, page: 1 })
            }
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void assetsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.assets.list.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          {!readOnly && (
            <Space>
              {selectedAssets.length > 0 && (
                <>
                  <Typography.Text type="secondary">
                    {formatMessage(
                      {
                        id: 'pages.assets.list.selectedCount',
                        defaultMessage: '{count} selected',
                      },
                      { count: selectedAssets.length },
                    )}
                  </Typography.Text>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={confirmDeleteSelected}
                  >
                    {formatMessage({
                      id: 'pages.assets.list.batchDelete',
                      defaultMessage: 'Delete selected',
                    })}
                  </Button>
                  <Button onClick={() => setAssignTargets(selectedAssets)}>
                    {formatMessage({
                      id: 'pages.assets.list.batchAssign',
                      defaultMessage: 'Assign to customer',
                    })}
                  </Button>
                  <Button
                    disabled={assignedSelected.length === 0}
                    onClick={() => confirmUnassign(assignedSelected)}
                  >
                    {formatMessage({
                      id: 'pages.assets.list.batchUnassign',
                      defaultMessage: 'Unassign from customer',
                    })}
                  </Button>
                </>
              )}
              <Button
                icon={<DownloadOutlined />}
                onClick={() => setImportOpen(true)}
              >
                {formatMessage({
                  id: 'pages.assets.list.import',
                  defaultMessage: 'Import assets',
                })}
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditTarget(null);
                  setDialogOpen(true);
                }}
              >
                {formatMessage({
                  id: 'pages.assets.list.add',
                  defaultMessage: 'Add new asset',
                })}
              </Button>
            </Space>
          )}
        </div>
      }
    >
      {assetsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.assets.list.loadFailed',
            defaultMessage: 'Failed to load assets',
          })}
          description={serverErrorText(assetsQuery.error)}
        />
      )}

      <ProTable<AssetInfo>
        rowKey={(record) => record.id.id}
        // The page renders its own selection toolbar; silence ProTable's
        // built-in "N selected" alert bar.
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
                id: 'pages.assets.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.assets.list.empty',
            defaultMessage: 'No assets',
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

      <AssetDialog
        open={dialogOpen}
        asset={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void invalidate();
        }}
      />
      <AssetImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          void invalidate();
          void message.success(
            formatMessage({
              id: 'pages.assets.list.toastImported',
              defaultMessage: 'Import finished.',
            }),
          );
        }}
      />
      <AssignCustomerModal
        open={assignTargets.length > 0}
        entityCount={assignTargets.length}
        onClose={() => setAssignTargets([])}
        onConfirm={(customer) => void runAssign(customer.id.id)}
      />
      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => {
          setBatchOpen(false);
          batch.reset();
        }}
      />
    </PageContainer>
  );
}

function hasCustomer(asset: AssetInfo): boolean {
  return !!asset.customerId && asset.customerId.id !== NULL_UUID;
}

/** TB's null-customer UUID (EntityId.NULL_UUID). */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';
