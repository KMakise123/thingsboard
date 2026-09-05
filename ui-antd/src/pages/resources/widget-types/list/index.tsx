/**
 * Widget types list page (routes /resources/widget-types, M11 wave 1B —
 * spec §3.1, ui-ngx widget-types-table-config.resolver.ts parity).
 *
 * Columns createdTime / name / bundles / widgetType(kind) / system /
 * deprecated; search + paging + sort carried by the URL; the deprecated
 * filter is a three-state segmented control (ALL/ACTUAL/DEPRECATED →
 * deprecatedFilter query param). Tenant admins see system rows read-only
 * (§1: system = tenantId NULL_UUID); the system column shows when the
 * session is SYS_ADMIN or the loaded page contains system rows (spec §3.1
 * 「含 system 类型时显示」 — the marker upstream always renders stays
 * visible whenever it carries signal).
 *
 * Row click navigates to the detail face at
 * /resources/widget-types/{id} — ROUTING GAP registered with the main
 * session: wave 0 did not add that dynamic segment, so the URL resolves
 * once the route lands (the 编辑 action below already reaches the M9
 * editor at /widgets/editor/{id}).
 */
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  InfoCircleOutlined,
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
  Segmented,
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
import { deleteWidgetType, getWidgetTypes } from '@/services/tb/widget-type';
import type { WidgetTypeInfo } from '@/types/tb/widget-type';

import { ExportWidgetTypesDialog, ImportWidgetTypeModal } from './dialogs';
import {
  exportWidgetTypesToZip,
  exportWidgetTypeToFile,
} from './import-export';
import { SelectTemplateDialog } from './select-template-dialog';
import {
  type DeprecatedFilterState,
  toPageLink,
  useWidgetTypesUrlState,
} from './url-state';

const WIDGET_TYPES_QUERY_KEY = ['widget-types', 'list'] as const;

/** Table column key -> sortable server property (WidgetTypeInfo fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  deprecated: 'deprecated',
};

/** TB's null-tenant UUID (EntityId.NULL_UUID) — the system marker. */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

const SEARCH_DEBOUNCE_MS = 400;

const KIND_DEFAULTS: Record<string, string> = {
  timeseries: 'Timeseries',
  latest: 'Latest values',
  rpc: 'Control widget',
  alarm: 'Alarm widget',
  static: 'Static',
};

export default function WidgetTypesListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useWidgetTypesUrlState();
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
  const typesQuery = useQuery({
    queryKey: [
      ...WIDGET_TYPES_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.deprecatedFilter,
    ],
    queryFn: () =>
      getWidgetTypes(toPageLink(urlState), {
        deprecatedFilter: urlState.deprecatedFilter,
      }),
    placeholderData: keepPreviousData,
  });
  const rows: Array<WidgetTypeInfo> = typesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: WIDGET_TYPES_QUERY_KEY });

  /** upstream isWidgetTypeEditable: TENANT owns non-system rows, SYS all. */
  const isEditable = (row: WidgetTypeInfo): boolean =>
    isTenantAdmin ? row.tenantId?.id !== NULL_UUID : authority === 'SYS_ADMIN';

  const pageHasSystemRows = useMemo(
    () => rows.some((row) => row.tenantId?.id === NULL_UUID),
    [rows],
  );
  const showSystemColumn = authority === 'SYS_ADMIN' || pageHasSystemRows;

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedRows = rows.filter((row) =>
    selectedRowKeys.includes(row.id?.id ?? ''),
  );
  /** Only editable (tenant-owned for TA) rows join a batch export. */
  const exportableRows = selectedRows.filter(isEditable);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportTargets, setExportTargets] = useState<WidgetTypeInfo[]>([]);

  const deleteMutation = useMutation({
    mutationFn: (widgetTypeId: string) => deleteWidgetType(widgetTypeId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.resources.widgetTypes.toastDeleted',
          defaultMessage: 'Widget type deleted.',
        }),
      );
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = (row: WidgetTypeInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.resources.widgetTypes.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the widget type '{name}'?",
        },
        { name: row.name },
      ),
      content: formatMessage({
        id: 'pages.resources.widgetTypes.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the widget type will become unrecoverable. Dashboards referencing it degrade to placeholders.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.resources.widgetTypes.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.resources.widgetTypes.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(row.id?.id ?? ''),
    });
  };

  const runExport = async (
    targets: WidgetTypeInfo[],
    includeResources: boolean,
  ) => {
    if (targets.length === 1) {
      await exportWidgetTypeToFile(
        targets[0].id?.id ?? '',
        targets[0].name ?? 'widget',
        includeResources,
      );
      return;
    }
    await exportWidgetTypesToZip(
      targets.map((row) => ({
        id: row.id?.id ?? '',
        name: row.name ?? 'widget',
      })),
      includeResources,
    );
  };

  // ---- columns
  const sortOrderFor = (property: string): 'ascend' | 'descend' | undefined => {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<WidgetTypeInfo>[] = useMemo(() => {
    const cols: ProColumns<WidgetTypeInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.resources.widgetTypes.createdTime',
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
          id: 'pages.resources.widgetTypes.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        render: (_, record) => (
          <Typography.Text strong>{record.name}</Typography.Text>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.resources.widgetTypes.bundles',
          defaultMessage: 'Widgets bundles',
        }),
        dataIndex: 'bundles',
        render: (_, record) =>
          record.bundles?.length ? (
            <Space size={4} wrap>
              {record.bundles.map((bundle) => (
                <Tag key={bundle.id?.id ?? bundle.name}>{bundle.name}</Tag>
              ))}
            </Space>
          ) : (
            '-'
          ),
      },
      {
        title: formatMessage({
          id: 'pages.resources.widgetTypes.kind',
          defaultMessage: 'Type',
        }),
        dataIndex: 'widgetType',
        width: 140,
        render: (_, record) =>
          record.widgetType
            ? formatMessage({
                id: `pages.resources.widgetTypes.kindValue.${record.widgetType}`,
                defaultMessage:
                  KIND_DEFAULTS[record.widgetType] ?? record.widgetType,
              })
            : '-',
      },
    ];
    if (showSystemColumn) {
      cols.push({
        title: formatMessage({
          id: 'pages.resources.widgetTypes.system',
          defaultMessage: 'System',
        }),
        dataIndex: 'tenantId',
        width: 90,
        align: 'center',
        render: (_, record) =>
          record.tenantId?.id === NULL_UUID ? (
            <Tag color="blue" data-testid="widget-system-flag">
              {formatMessage({
                id: 'pages.resources.widgetTypes.systemYes',
                defaultMessage: 'System',
              })}
            </Tag>
          ) : (
            '-'
          ),
      });
    }
    cols.push({
      title: formatMessage({
        id: 'pages.resources.widgetTypes.deprecated',
        defaultMessage: 'Deprecated',
      }),
      dataIndex: 'deprecated',
      width: 110,
      sorter: true,
      sortOrder: sortOrderFor('deprecated'),
      align: 'center',
      render: (_, record) =>
        record.deprecated ? (
          <Tag color="error">
            {formatMessage({
              id: 'pages.resources.widgetTypes.deprecatedYes',
              defaultMessage: 'Deprecated',
            })}
          </Tag>
        ) : (
          '-'
        ),
    });
    cols.push({
      valueType: 'option',
      width: 170,
      fixed: 'right',
      render: (_, record) => {
        const editable = isEditable(record);
        const typeId = record.id?.id ?? '';
        return [
          <Tooltip
            key="export"
            title={formatMessage({
              id: 'pages.resources.widgetTypes.export',
              defaultMessage: 'Export',
            })}
          >
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              aria-label={formatMessage({
                id: 'pages.resources.widgetTypes.export',
                defaultMessage: 'Export',
              })}
              onClick={(event) => {
                event.stopPropagation();
                setExportTargets([record]);
              }}
            />
          </Tooltip>,
          <Tooltip
            key="details"
            title={formatMessage({
              id: 'pages.resources.widgetTypes.details',
              defaultMessage: 'Widget details',
            })}
          >
            <Button
              type="text"
              size="small"
              icon={<InfoCircleOutlined />}
              aria-label={formatMessage({
                id: 'pages.resources.widgetTypes.details',
                defaultMessage: 'Widget details',
              })}
              onClick={(event) => {
                event.stopPropagation();
                history.push(`/resources/widget-types/${typeId}`);
              }}
            />
          </Tooltip>,
          editable ? (
            <Tooltip
              key="edit"
              title={formatMessage({
                id: 'pages.resources.widgetTypes.edit',
                defaultMessage: 'Edit in widget editor',
              })}
            >
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                aria-label={formatMessage({
                  id: 'pages.resources.widgetTypes.edit',
                  defaultMessage: 'Edit in widget editor',
                })}
                onClick={(event) => {
                  event.stopPropagation();
                  history.push(`/widgets/editor/${typeId}`);
                }}
              />
            </Tooltip>
          ) : null,
          editable ? (
            <Tooltip
              key="delete"
              title={formatMessage({
                id: 'pages.resources.widgetTypes.delete',
                defaultMessage: 'Delete',
              })}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={formatMessage({
                  id: 'pages.resources.widgetTypes.delete',
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
    });
    return cols;
  }, [
    formatMessage,
    showSystemColumn,
    urlState.sortProperty,
    urlState.sortDirection,
    isTenantAdmin,
    authority,
  ]);

  const onTableChange: TableProps<WidgetTypeInfo>['onChange'] = (
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
      // Sort cleared -> back to the default order (name ASC, ui-ngx parity).
      patch({ sortProperty: 'name', sortDirection: 'ASC', page: 1 });
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
      // Explicit title: PageContainer auto-resolution only handles dotted
      // leaf names, not nested relative names (wave-0 stub gap, kept).
      title={formatMessage({
        id: 'menu.resources.widgetTypes',
        defaultMessage: 'Widget types',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.resources.widgetTypes.search',
              defaultMessage: 'Search widget types',
            })}
          />
          <Segmented<DeprecatedFilterState>
            value={urlState.deprecatedFilter}
            onChange={(value) => patch({ deprecatedFilter: value, page: 1 })}
            options={[
              {
                label: formatMessage({
                  id: 'pages.resources.widgetTypes.deprecatedAll',
                  defaultMessage: 'All',
                }),
                value: 'ALL',
              },
              {
                label: formatMessage({
                  id: 'pages.resources.widgetTypes.deprecatedActual',
                  defaultMessage: 'Actual',
                }),
                value: 'ACTUAL',
              },
              {
                label: formatMessage({
                  id: 'pages.resources.widgetTypes.deprecatedOnly',
                  defaultMessage: 'Deprecated',
                }),
                value: 'DEPRECATED',
              },
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void typesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.resources.widgetTypes.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {exportableRows.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.resources.widgetTypes.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: exportableRows.length },
                  )}
                </Typography.Text>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => setExportTargets(exportableRows)}
                >
                  {formatMessage({
                    id: 'pages.resources.widgetTypes.exportSelected',
                    defaultMessage: 'Export selected',
                  })}
                </Button>
              </>
            )}
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportOpen(true)}
            >
              {formatMessage({
                id: 'pages.resources.widgetTypes.import',
                defaultMessage: 'Import widget type',
              })}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
              data-testid="widget-types-create"
            >
              {formatMessage({
                id: 'pages.resources.widgetTypes.create',
                defaultMessage: 'Create new widget type',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {typesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.resources.widgetTypes.loadFailed',
            defaultMessage: 'Failed to load widget types',
          })}
          description={serverErrorText(typesQuery.error)}
        />
      )}

      <ProTable<WidgetTypeInfo>
        rowKey={(record) => record.id?.id ?? ''}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={rows}
        loading={typesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () =>
            history.push(`/resources/widget-types/${record.id?.id ?? ''}`),
        })}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: typesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.resources.widgetTypes.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.resources.widgetTypes.empty',
            defaultMessage: 'No widget types',
          }),
        }}
        rowSelection={
          // System rows stay out of the selection set for tenants (§1 read-only).
          {
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            getCheckboxProps: (record) => ({
              disabled: !isEditable(record),
            }),
          }
        }
      />

      <SelectTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <ImportWidgetTypeModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(name) => {
          void invalidate();
          void message.success(
            formatMessage(
              {
                id: 'pages.resources.widgetTypes.toastImported',
                defaultMessage: "Widget type '{name}' imported.",
              },
              { name },
            ),
          );
        }}
      />
      <ExportWidgetTypesDialog
        open={exportTargets.length > 0}
        count={exportTargets.length}
        onClose={() => setExportTargets([])}
        onExport={(includeResources) =>
          runExport(exportTargets, includeResources)
        }
      />
    </PageContainer>
  );
}
