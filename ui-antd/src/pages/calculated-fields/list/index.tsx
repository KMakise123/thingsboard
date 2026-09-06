/**
 * Calculated fields — standalone tenant-wide list (M14 wave-4, R12, spec
 * 6.1-1..3/16/17). ProTable manual feeding + private url-state; sort
 * whitelist HARD `createdTime|name` (other columns 500 server-side, so no
 * sorter); three filter dimensions inline in the toolbar (R12 sanctioned
 * form — types multi / entityType / entities multi); row click opens the
 * edit dialog (no detail route, R02).
 *
 * Row actions: Copy (re-select target entity) / Export (JSON without
 * entityId) / Events (EventsPanel, DEBUG_CALCULATED_FIELD) / Debug settings
 * (read → save with new debugSettings, ngx onDebugConfigChanged parity) /
 * Delete; batch = delete only. Header: Create + Import (JSON, ALARM and
 * unknown types rejected, TENANT references rewritten — R16). No "Add from
 * IoT Hub" (R36).
 */
import {
  BugOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FieldTimeOutlined,
  ImportOutlined,
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
import { useModel } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import EventsPanel from '@/components/devices/detail/EventsPanel';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
import { getTenantAssets } from '@/services/tb/asset';
import { getAssetProfileList } from '@/services/tb/asset-profile';
import {
  deleteCalculatedField,
  getCalculatedFieldById,
  getCalculatedFields,
  saveCalculatedField,
} from '@/services/tb/calculated-fields';
import { getTenantDevices } from '@/services/tb/device';
import { getDeviceProfileList } from '@/services/tb/device-profile';
import type {
  CalculatedField,
  CalculatedFieldDebugSettings,
  CalculatedFieldInfo,
  CalculatedFieldType,
} from '@/types/tb/calculated-fields';
import { EntityType } from '@/types/tb/entity';
import CfDialog, { type CfDialogMode } from '../components/cf-dialog';
import {
  CF_PAGE_TYPES,
  CF_SUPPORTED_ENTITY_TYPES,
  type CfHostEntityType,
  defaultDebugSettings,
} from '../components/data';
import {
  exportCalculatedField,
  parseImportedField,
  readImportFile,
  rewriteTenantReferences,
} from '../components/import-export';
import {
  CF_PAGE_SIZES,
  CF_SORTABLE_COLUMNS,
  useCfListUrlState,
} from './url-state';

const CF_QUERY_KEY = ['calculated-fields-list'] as const;
const SEARCH_DEBOUNCE_MS = 400;

const TYPE_TAG_COLOR: Partial<Record<CalculatedFieldType, string>> = {
  SIMPLE: 'blue',
  SCRIPT: 'purple',
  PROPAGATION: 'geekblue',
  RELATED_ENTITIES_AGGREGATION: 'gold',
  ENTITY_AGGREGATION: 'gold',
  GEOFENCING: 'cyan',
};

/** Detail-route prefix per host entity type (entityName jump link). */
const ENTITY_ROUTE_PREFIX: Record<CfHostEntityType, string> = {
  DEVICE: '/devices',
  ASSET: '/assets',
  DEVICE_PROFILE: '/deviceProfiles',
  ASSET_PROFILE: '/assetProfiles',
};

interface DialogState {
  field: CalculatedField;
  mode: CfDialogMode;
  lockType?: boolean;
}

/** Entities filter select — server search within the chosen entityType. */
function EntitiesFilterSelect({
  entityType,
  value,
  onChange,
}: {
  entityType: CfHostEntityType | '';
  value?: Array<string>;
  onChange?: (value: Array<string>) => void;
}) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');
  const enabled = entityType !== '';
  const rowsQuery = useQuery({
    queryKey: ['cf-filter-entities', entityType, search],
    queryFn: async () => {
      const text = search || undefined;
      switch (entityType) {
        case 'DEVICE':
          return getTenantDevices({ pageSize: 50, page: 0, textSearch: text });
        case 'ASSET':
          return getTenantAssets({ pageSize: 50, page: 0, textSearch: text });
        case 'DEVICE_PROFILE':
          return getDeviceProfileList({
            pageSize: 50,
            page: 0,
            textSearch: text,
          });
        default:
          return getAssetProfileList({
            pageSize: 50,
            page: 0,
            textSearch: text,
          });
      }
    },
    enabled,
    placeholderData: keepPreviousData,
  });
  return (
    <Select
      mode="multiple"
      className="min-w-56"
      maxTagCount={2}
      value={value ?? []}
      disabled={!enabled}
      showSearch
      filterOption={false}
      onSearch={setSearch}
      loading={rowsQuery.isFetching}
      onChange={(next) => onChange?.(next)}
      options={(rowsQuery.data?.data ?? []).map((row) => ({
        label: row.name,
        // row.id is the EntityId object ({entityType, id}) — the wire UUID
        // is row.id.id; a raw object value would crash the options render.
        value: row.id.id,
      }))}
      placeholder={
        enabled
          ? formatMessage({
              id: 'pages.calculatedFields.filter.entitiesPlaceholder',
              defaultMessage: 'Filter by entities',
            })
          : formatMessage({
              id: 'pages.calculatedFields.filter.entitiesNeedType',
              defaultMessage: 'Pick an entity type first',
            })
      }
      allowClear
    />
  );
}

export default function CalculatedFieldsListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { initialState } = useModel('@@initialState');
  const tenantId = initialState?.currentUser?.tenantId?.id ?? '';

  const { state, patch } = useCfListUrlState();

  const [searchInput, setSearchInput] = useState(state.textSearch);
  useEffect(() => {
    setSearchInput(state.textSearch);
  }, [state.textSearch]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: the debounced write goes through patch (a stable writer); urlState.textSearch re-syncs the input each commit
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== state.textSearch) {
        patch({ textSearch: next, page: 1 });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: [
      ...CF_QUERY_KEY,
      state.page,
      state.pageSize,
      state.sortProperty,
      state.sortDirection,
      state.textSearch,
      state.types.join(','),
      state.entityType,
      state.entities.join(','),
    ],
    queryFn: () =>
      getCalculatedFields(
        {
          pageSize: state.pageSize,
          page: state.page - 1,
          textSearch: state.textSearch.trim() || undefined,
          sortOrder: {
            property: state.sortProperty,
            direction: state.sortDirection,
          },
        },
        {
          types: state.types.length > 0 ? state.types : undefined,
          entityType: state.entityType || undefined,
          entities: state.entities.length > 0 ? state.entities : undefined,
        },
      ),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: CF_QUERY_KEY });

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [eventsRow, setEventsRow] = useState<CalculatedFieldInfo | null>(null);
  const [debugRow, setDebugRow] = useState<{
    field: CalculatedFieldInfo;
    settings: CalculatedFieldDebugSettings;
  } | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const batch = useBatchRun();
  const importInputRef = useRef<HTMLInputElement>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalculatedField(id),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.calculatedFields.toastDeleted',
          defaultMessage: 'Calculated field deleted.',
        }),
      );
      void invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const debugSaveMutation = useMutation({
    // ngx onDebugConfigChanged: re-read the entity, save with the new
    // debugSettings (the whole field is replayed).
    mutationFn: async (input: {
      id: string;
      settings: CalculatedFieldDebugSettings;
    }) => {
      const field = await getCalculatedFieldById(input.id);
      return saveCalculatedField({ ...field, debugSettings: input.settings });
    },
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.calculatedFields.toastSaved',
          defaultMessage: 'Calculated field saved.',
        }),
      );
      setDebugRow(null);
      void invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const confirmDeleteOne = (row: CalculatedFieldInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.calculatedFields.deleteOneTitle',
          defaultMessage:
            "Are you sure you want to delete the calculated field '{name}'?",
        },
        { name: row.name },
      ),
      content: formatMessage({
        id: 'pages.calculatedFields.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the calculated field will become unrecoverable.',
      }),
      okText: formatMessage({
        id: 'pages.calculatedFields.delete',
        defaultMessage: 'Delete',
      }),
      okButtonProps: { danger: true },
      cancelText: formatMessage({
        id: 'pages.calculatedFields.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(row.id.id),
    });
  };

  const confirmDeleteSelected = () => {
    const rows = (listQuery.data?.data ?? []).filter((row) =>
      selectedKeys.includes(row.id.id),
    );
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.calculatedFields.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 calculated field} other {# calculated fields}}?',
        },
        { count: rows.length },
      ),
      content: formatMessage({
        id: 'pages.calculatedFields.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the calculated field will become unrecoverable.',
      }),
      okText: formatMessage({
        id: 'pages.calculatedFields.delete',
        defaultMessage: 'Delete',
      }),
      okButtonProps: { danger: true },
      cancelText: formatMessage({
        id: 'pages.calculatedFields.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        await batch.run(
          rows,
          (row) => row.id.id,
          (row) => deleteCalculatedField(row.id.id),
        );
        setSelectedKeys([]);
        void invalidate();
      },
    });
  };

  const openCopy = (row: CalculatedFieldInfo) => {
    // ngx copyCalculatedField (pageMode): clone minus id, minus the target
    // entity — the copy must be re-attached to an entity.
    const { id: _id, entityId: _entityId, ...clone } = row;
    setDialog({ field: clone as CalculatedField, mode: 'copy' });
  };

  const onImportFile = async (file: File) => {
    const text = await readImportFile(file);
    const result = parseImportedField(text);
    if (!result.ok) {
      void message.error(
        formatMessage(
          {
            id: 'pages.calculatedFields.importRejected',
            defaultMessage:
              '{reason, select, parse {The file is not valid JSON.} type {ALARM and unknown calculated-field types cannot be imported here.} other {The file does not contain a calculated field.}}',
          },
          { reason: result.reason },
        ),
      );
      return;
    }
    const rewritten = rewriteTenantReferences(result.field, tenantId);
    setDialog({ field: rewritten, mode: 'import', lockType: true });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers take the row as an argument and only read stable state (setters, intl, urlState writer); the listed deps cover every value that shapes the rendered columns
  const columns: Array<ProColumns<CalculatedFieldInfo>> = useMemo(() => {
    // Only whitelisted columns get a sorter (contract #18); the rest
    // render sortable: false — no sort UI at all.
    const sortable = (
      property: string,
    ): {
      sorter: boolean;
      sortOrder?: 'ascend' | 'descend';
    } => ({
      sorter: property in CF_SORTABLE_COLUMNS,
      sortOrder:
        property in CF_SORTABLE_COLUMNS && state.sortProperty === property
          ? state.sortDirection === 'ASC'
            ? 'ascend'
            : 'descend'
          : undefined,
    });
    const cols: Array<ProColumns<CalculatedFieldInfo>> = [
      {
        title: formatMessage({
          id: 'pages.calculatedFields.createdTime',
          defaultMessage: 'Created time',
        }),
        dataIndex: 'createdTime',
        width: 170,
        ...sortable('createdTime'),
        render: (_, record) =>
          dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: formatMessage({
          id: 'pages.calculatedFields.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        ellipsis: true,
        ...sortable('name'),
      },
      {
        title: formatMessage({
          id: 'pages.calculatedFields.entityType',
          defaultMessage: 'Entity type',
        }),
        key: 'entityType',
        width: '12%',
        render: (_: unknown, row) =>
          formatMessage({
            id: `pages.calculatedFields.entityType.${row.entityId.entityType}`,
            defaultMessage: row.entityId.entityType,
          }),
      },
      {
        title: formatMessage({
          id: 'pages.calculatedFields.entityName',
          defaultMessage: 'Entity',
        }),
        key: 'entityName',
        ellipsis: true,
        render: (_: unknown, row) => (
          // Stop the row-click edit; the link jumps to the entity detail.
          <span onClick={(event) => event.stopPropagation()}>
            <Typography.Link
              href={`${ENTITY_ROUTE_PREFIX[row.entityId.entityType as CfHostEntityType]}/${row.entityId.id}`}
            >
              {row.entityName ?? row.entityId.id}
            </Typography.Link>
          </span>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.calculatedFields.type',
          defaultMessage: 'Type',
        }),
        key: 'type',
        width: '16%',
        render: (_: unknown, row) => (
          <Tag color={TYPE_TAG_COLOR[row.type] ?? 'default'}>
            {formatMessage({
              id: `pages.calculatedFields.type.${row.type}`,
              defaultMessage: row.type,
            })}
          </Tag>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.calculatedFields.actions',
          defaultMessage: 'Actions',
        }),
        key: 'actions',
        width: 220,
        render: (_: unknown, row) => (
          <Space size={0} onClick={(event) => event.stopPropagation()}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              title={formatMessage({
                id: 'pages.calculatedFields.copy',
                defaultMessage: 'Copy',
              })}
              onClick={() => openCopy(row)}
            />
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              title={formatMessage({
                id: 'pages.calculatedFields.export',
                defaultMessage: 'Export',
              })}
              onClick={() => void exportCalculatedField(row.id.id)}
            />
            <Button
              type="text"
              size="small"
              icon={<FieldTimeOutlined />}
              title={formatMessage({
                id: 'pages.calculatedFields.events',
                defaultMessage: 'Events',
              })}
              onClick={() => setEventsRow(row)}
            />
            <Button
              type="text"
              size="small"
              icon={<BugOutlined />}
              danger={row.debugSettings?.allEnabled === true}
              title={formatMessage({
                id: 'pages.calculatedFields.debugSettings',
                defaultMessage: 'Debug settings',
              })}
              onClick={() =>
                setDebugRow({
                  field: row,
                  settings: row.debugSettings ?? defaultDebugSettings(),
                })
              }
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              title={formatMessage({
                id: 'pages.calculatedFields.delete',
                defaultMessage: 'Delete',
              })}
              onClick={() => confirmDeleteOne(row)}
            />
          </Space>
        ),
      },
    ];
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatMessage, state.sortProperty, state.sortDirection]);

  const onTableChange: TableProps<CalculatedFieldInfo>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    const property = sort?.field
      ? CF_SORTABLE_COLUMNS[sort.field as string]
      : undefined;
    if (property && sort.order) {
      patch({
        sortProperty: property,
        sortDirection: sort.order === 'ascend' ? 'ASC' : 'DESC',
        page: 1,
      });
    } else if (sort && !sort.order) {
      patch({ sortProperty: 'createdTime', sortDirection: 'DESC', page: 1 });
    }
    if (
      pagination.current &&
      pagination.pageSize &&
      (pagination.current !== state.page ||
        pagination.pageSize !== state.pageSize)
    ) {
      patch({ page: pagination.current, pageSize: pagination.pageSize });
    }
  };

  const rows = listQuery.data?.data ?? [];

  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.calculatedFields',
        defaultMessage: 'Calculated fields',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-56"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.calculatedFields.search',
              defaultMessage: 'Search calculated fields',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void listQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.calculatedFields.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space wrap>
            <Select
              mode="multiple"
              maxTagCount={1}
              className="min-w-44"
              value={state.types}
              allowClear
              placeholder={formatMessage({
                id: 'pages.calculatedFields.filter.types',
                defaultMessage: 'Filter by types',
              })}
              onChange={(next) => patch({ types: next, page: 1 })}
              options={CF_PAGE_TYPES.map((type) => ({
                value: type,
                label: formatMessage({
                  id: `pages.calculatedFields.type.${type}`,
                  defaultMessage: type,
                }),
              }))}
            />
            <Select
              className="w-44"
              value={state.entityType || undefined}
              allowClear
              placeholder={formatMessage({
                id: 'pages.calculatedFields.filter.entityType',
                defaultMessage: 'Filter by entity type',
              })}
              onChange={(next) =>
                patch({
                  entityType: (next ?? '') as CfHostEntityType | '',
                  entities: [],
                  page: 1,
                })
              }
              options={CF_SUPPORTED_ENTITY_TYPES.map((entityType) => ({
                value: entityType,
                label: formatMessage({
                  id: `pages.calculatedFields.entityType.${entityType}`,
                  defaultMessage: entityType,
                }),
              }))}
            />
            <EntitiesFilterSelect
              entityType={state.entityType}
              value={state.entities}
              onChange={(next) => patch({ entities: next, page: 1 })}
            />
          </Space>
        </div>
      }
    >
      {listQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.calculatedFields.loadFailed',
            defaultMessage: 'Failed to load calculated fields',
          })}
          description={serverErrorText(listQuery.error)}
        />
      )}

      <ProTable<CalculatedFieldInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={rows}
        loading={listQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({
          // Row click = the detail/edit state (R02: no detail route).
          onClick: () =>
            setDialog({ field: record as CalculatedField, mode: 'edit' }),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: state.page,
          pageSize: state.pageSize,
          total: listQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: CF_PAGE_SIZES,
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.calculatedFields.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.calculatedFields.empty',
            defaultMessage: 'No calculated fields found',
          }),
        }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys),
        }}
      />

      <div className="mt-3">
        {selectedKeys.length > 0 && (
          <Space>
            <Typography.Text type="secondary">
              {formatMessage(
                {
                  id: 'pages.calculatedFields.selectedCount',
                  defaultMessage: '{count} selected',
                },
                { count: selectedKeys.length },
              )}
            </Typography.Text>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={confirmDeleteSelected}
            >
              {formatMessage({
                id: 'pages.calculatedFields.batchDelete',
                defaultMessage: 'Delete selected',
              })}
            </Button>
          </Space>
        )}
      </div>

      <Space className="mt-3" wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() =>
            setDialog({
              field: {
                type: 'SIMPLE',
                name: '',
              } as CalculatedField,
              mode: 'create',
            })
          }
        >
          {formatMessage({
            id: 'pages.calculatedFields.add',
            defaultMessage: 'Add calculated field',
          })}
        </Button>
        <Button
          icon={<ImportOutlined />}
          onClick={() => importInputRef.current?.click()}
        >
          {formatMessage({
            id: 'pages.calculatedFields.import',
            defaultMessage: 'Import',
          })}
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void onImportFile(file);
            }
          }}
        />
      </Space>

      {dialog && (
        <CfDialog
          field={dialog.field}
          mode={dialog.mode}
          lockType={dialog.lockType}
          tenantId={tenantId}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void invalidate();
          }}
        />
      )}

      <Modal
        open={!!eventsRow}
        onCancel={() => setEventsRow(null)}
        footer={null}
        width={960}
        title={formatMessage(
          {
            id: 'pages.calculatedFields.eventsTitle',
            defaultMessage: "Events: '{name}'",
          },
          { name: eventsRow?.name ?? '' },
        )}
        destroyOnHidden
      >
        {eventsRow && (
          <EventsPanel
            entityId={{
              entityType: EntityType.CALCULATED_FIELD,
              id: eventsRow.id.id,
            }}
            tenantId={tenantId}
            eventTypes={['DEBUG_CALCULATED_FIELD']}
            defaultEventType="DEBUG_CALCULATED_FIELD"
          />
        )}
      </Modal>

      <Modal
        open={!!debugRow}
        onCancel={() => setDebugRow(null)}
        onOk={() =>
          debugRow &&
          debugSaveMutation.mutate({
            id: debugRow.field.id.id,
            settings: debugRow.settings,
          })
        }
        confirmLoading={debugSaveMutation.isPending}
        okText={formatMessage({
          id: 'pages.calculatedFields.apply',
          defaultMessage: 'Apply',
        })}
        cancelText={formatMessage({
          id: 'pages.calculatedFields.cancel',
          defaultMessage: 'Cancel',
        })}
        title={formatMessage({
          id: 'pages.calculatedFields.debugSettings',
          defaultMessage: 'Debug settings',
        })}
      >
        {debugRow && (
          <div className="flex flex-col gap-3">
            <Typography.Text>
              {formatMessage(
                {
                  id: 'pages.calculatedFields.debugFor',
                  defaultMessage: "Debug switches for '{name}'.",
                },
                { name: debugRow.field.name },
              )}
            </Typography.Text>
            <Space className="justify-between">
              <Typography.Text>
                {formatMessage({
                  id: 'pages.calculatedFields.debugFailures',
                  defaultMessage: 'Debug failures',
                })}
              </Typography.Text>
              <Switch
                checked={debugRow.settings.failuresEnabled === true}
                disabled={debugRow.settings.allEnabled === true}
                onChange={(checked) =>
                  setDebugRow((previous) =>
                    previous
                      ? {
                          ...previous,
                          settings: {
                            ...previous.settings,
                            failuresEnabled: checked,
                          },
                        }
                      : previous,
                  )
                }
              />
            </Space>
            <Space className="justify-between">
              <Typography.Text>
                {formatMessage({
                  id: 'pages.calculatedFields.debugAll',
                  defaultMessage: 'Debug all',
                })}
              </Typography.Text>
              <Switch
                checked={debugRow.settings.allEnabled === true}
                onChange={(checked) =>
                  setDebugRow((previous) =>
                    previous
                      ? {
                          ...previous,
                          settings: {
                            ...previous.settings,
                            allEnabled: checked,
                            failuresEnabled: true,
                          },
                        }
                      : previous,
                  )
                }
              />
            </Space>
          </div>
        )}
      </Modal>

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
