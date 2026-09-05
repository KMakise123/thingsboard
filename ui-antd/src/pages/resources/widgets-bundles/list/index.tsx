/**
 * Widgets bundles list page (routes /resources/widgets-bundles, M11 wave
 * 1B — spec §3.1, ui-ngx widgets-bundles-table-config.resolver.ts parity).
 *
 * Columns createdTime / title / system; search + paging + sort carried by
 * the URL (default sort title ASC — ui-ngx defaultSortOrder). Row click
 * opens the bundle-widgets manager at /resources/widgets-bundles/{id}
 * (upstream entityAdded/openWidgetsBundle target the same face). Tenant
 * admins see system bundles read-only (§1: tenantId NULL_UUID).
 */
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
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
  Input,
  Space,
  type TableProps,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { useAuthority } from '@/components/shared/use-authority';
import {
  deleteWidgetsBundle,
  getWidgetsBundles,
  saveWidgetsBundle,
} from '@/services/tb/widgets-bundle';
import type { WidgetsBundle } from '@/types/tb/widgets-bundle';

import {
  BundleEditDialog,
  BundleExportDialog,
  ImportWidgetsBundleModal,
} from './dialogs';
import { exportWidgetsBundleToFile } from './import-export';
import { toPageLink, useWidgetsBundlesUrlState } from './url-state';

const WIDGETS_BUNDLES_QUERY_KEY = ['widgets-bundles', 'list'] as const;

/** Table column key -> sortable server property (WidgetsBundle fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
};

/** TB's null-tenant UUID (EntityId.NULL_UUID) — the system marker. */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

const SEARCH_DEBOUNCE_MS = 400;

export default function WidgetsBundlesListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useWidgetsBundlesUrlState();
  const { authority } = useAuthority();
  const isTenantAdmin = authority === 'TENANT_ADMIN';

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
  const bundlesQuery = useQuery({
    queryKey: [
      ...WIDGETS_BUNDLES_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getWidgetsBundles(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const rows: Array<WidgetsBundle> = bundlesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: WIDGETS_BUNDLES_QUERY_KEY });

  /** upstream isWidgetsBundleEditable: TENANT owns non-system, SYS all. */
  const isEditable = (row: WidgetsBundle): boolean =>
    isTenantAdmin ? row.tenantId?.id !== NULL_UUID : authority === 'SYS_ADMIN';

  // ---- dialogs
  const [editTarget, setEditTarget] = useState<WidgetsBundle | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<WidgetsBundle>();
  const [importOpen, setImportOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (bundle: WidgetsBundle) => saveWidgetsBundle(bundle),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.resources.widgetsBundles.toastSaved',
          defaultMessage: 'Widgets bundle saved.',
        }),
      );
      setEditOpen(false);
      setEditTarget(undefined);
      void invalidate();
      // upstream entityAdded parity: a fresh bundle opens its manager face.
      if (!editTarget?.id) {
        history.push(`/resources/widgets-bundles/${saved.id?.id ?? ''}`);
      }
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (widgetsBundleId: string) =>
      deleteWidgetsBundle(widgetsBundleId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.resources.widgetsBundles.toastDeleted',
          defaultMessage: 'Widgets bundle deleted.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = (row: WidgetsBundle) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.resources.widgetsBundles.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the widgets bundle '{title}'?",
        },
        { title: row.title },
      ),
      content: formatMessage({
        id: 'pages.resources.widgetsBundles.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the widgets bundle will become unrecoverable. The widget types it groups stay.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.resources.widgetsBundles.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.resources.widgetsBundles.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(row.id?.id ?? ''),
    });
  };

  // ---- columns
  const sortOrderFor = (property: string): 'ascend' | 'descend' | undefined => {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<WidgetsBundle>[] = useMemo(() => {
    const cols: ProColumns<WidgetsBundle>[] = [
      {
        title: formatMessage({
          id: 'pages.resources.widgetsBundles.createdTime',
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
          id: 'pages.resources.widgetsBundles.title',
          defaultMessage: 'Title',
        }),
        dataIndex: 'title',
        sorter: true,
        sortOrder: sortOrderFor('title'),
        render: (_, record) => (
          <Space size={6}>
            <Typography.Text strong>{record.title}</Typography.Text>
            {record.scada ? <Tag>SCADA</Tag> : null}
          </Space>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.resources.widgetsBundles.system',
          defaultMessage: 'System',
        }),
        dataIndex: 'tenantId',
        width: 90,
        align: 'center',
        render: (_, record) =>
          record.tenantId?.id === NULL_UUID ? (
            <Tag color="blue">
              {formatMessage({
                id: 'pages.resources.widgetsBundles.systemYes',
                defaultMessage: 'System',
              })}
            </Tag>
          ) : (
            '-'
          ),
      },
      {
        valueType: 'option',
        width: 140,
        fixed: 'right',
        render: (_, record) => {
          const editable = isEditable(record);
          return [
            <Tooltip
              key="export"
              title={formatMessage({
                id: 'pages.resources.widgetsBundles.export',
                defaultMessage: 'Export',
              })}
            >
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                aria-label={formatMessage({
                  id: 'pages.resources.widgetsBundles.export',
                  defaultMessage: 'Export',
                })}
                onClick={(event) => {
                  event.stopPropagation();
                  setExportTarget(record);
                }}
              />
            </Tooltip>,
            editable ? (
              <Tooltip
                key="edit"
                title={formatMessage({
                  id: 'pages.resources.widgetsBundles.edit',
                  defaultMessage: 'Edit widgets bundle',
                })}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  aria-label={formatMessage({
                    id: 'pages.resources.widgetsBundles.edit',
                    defaultMessage: 'Edit widgets bundle',
                  })}
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditTarget(record);
                    setEditOpen(true);
                  }}
                />
              </Tooltip>
            ) : null,
            editable ? (
              <Tooltip
                key="delete"
                title={formatMessage({
                  id: 'pages.resources.widgetsBundles.delete',
                  defaultMessage: 'Delete',
                })}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={formatMessage({
                    id: 'pages.resources.widgetsBundles.delete',
                    defaultMessage: 'Delete',
                  })}
                  onClick={(event) => {
                    event.stopPropagation();
                    confirmDelete(record);
                  }}
                />
              </Tooltip>
            ) : null,
          ].filter(Boolean);
        },
      },
    ];
    return cols;
  }, [
    formatMessage,
    urlState.sortProperty,
    urlState.sortDirection,
    isTenantAdmin,
    authority,
  ]);

  const onTableChange: TableProps<WidgetsBundle>['onChange'] = (
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
      // Sort cleared -> back to the default order (title ASC, ui-ngx parity).
      patch({ sortProperty: 'title', sortDirection: 'ASC', page: 1 });
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
              id: 'pages.resources.widgetsBundles.search',
              defaultMessage: 'Search widgets bundles',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void bundlesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.resources.widgetsBundles.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportOpen(true)}
            >
              {formatMessage({
                id: 'pages.resources.widgetsBundles.import',
                defaultMessage: 'Import widgets bundle',
              })}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditTarget(undefined);
                setEditOpen(true);
              }}
              data-testid="widgets-bundles-create"
            >
              {formatMessage({
                id: 'pages.resources.widgetsBundles.create',
                defaultMessage: 'Create new widgets bundle',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {bundlesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.resources.widgetsBundles.loadFailed',
            defaultMessage: 'Failed to load widgets bundles',
          })}
          description={serverErrorText(bundlesQuery.error)}
        />
      )}

      <ProTable<WidgetsBundle>
        rowKey={(record) => record.id?.id ?? ''}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={rows}
        loading={bundlesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () =>
            history.push(`/resources/widgets-bundles/${record.id?.id ?? ''}`),
        })}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: bundlesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.resources.widgetsBundles.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.resources.widgetsBundles.empty',
            defaultMessage: 'No widgets bundles',
          }),
        }}
      />

      <BundleEditDialog
        open={editOpen}
        bundle={editTarget}
        confirmLoading={saveMutation.isPending}
        onOk={(values) => {
          saveMutation.mutate({
            ...(editTarget ?? {}),
            title: values.title,
            description: values.description ?? '',
            ...(values.image ? { image: values.image } : {}),
          });
        }}
        onClose={() => {
          setEditOpen(false);
          setEditTarget(undefined);
        }}
      />
      <BundleExportDialog
        open={Boolean(exportTarget)}
        bundleTitle={exportTarget?.title ?? ''}
        onClose={() => setExportTarget(undefined)}
        onExport={(includeWidgets) =>
          exportWidgetsBundleToFile(
            exportTarget?.id?.id ?? '',
            exportTarget?.title ?? 'widgets_bundle',
            includeWidgets,
          )
        }
      />
      <ImportWidgetsBundleModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(title) => {
          void invalidate();
          void message.success(
            formatMessage(
              {
                id: 'pages.resources.widgetsBundles.toastImported',
                defaultMessage: "Widgets bundle '{title}' imported.",
              },
              { title },
            ),
          );
        }}
      />
    </PageContainer>
  );
}
