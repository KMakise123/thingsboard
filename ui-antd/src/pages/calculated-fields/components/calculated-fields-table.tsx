/**
 * Shared calculated-fields table, both page modes (M14 wave-5, R17, spec
 * 6.1-18; ui-ngx CalculatedFieldsTableConfig pageMode parity):
 *
 * - tenant mode (standalone page): full columns incl. entityType + entity
 *   jump link, row click opens the edit dialog, external (URL) state for
 *   search/sort/pagination/filters handed in by the list page;
 * - entity mode (device/asset/device-profile/asset-profile detail tabs):
 *   createdTime/name/type columns only, NO filter header (the tab fetches
 *   the entity-scoped endpoint), inline Edit added (ngx tab mode), edit
 *   opens the SAME CfDialog, copy keeps the target entity (only pageMode
 *   clears it).
 *
 * Row actions shared by both modes: Copy / Export / Events (EventsPanel,
 * DEBUG_CALCULATED_FIELD) / Debug settings / Delete (+ batch delete).
 * Header: Create + Import (JSON, ALARM/unknown rejected, TENANT references
 * rewritten — R16). No "Add from IoT Hub" (R36).
 */
import {
  BugOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FieldTimeOutlined,
  ImportOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Modal,
  Space,
  Switch,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import EventsPanel from '@/components/devices/detail/EventsPanel';
import { serverErrorText } from '@/components/entities/server-error-text';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
import {
  deleteCalculatedField,
  getCalculatedFieldById,
  getCalculatedFields,
  getCalculatedFieldsByEntityId,
  saveCalculatedField,
} from '@/services/tb/calculated-fields';
import type {
  CalculatedField,
  CalculatedFieldDebugSettings,
  CalculatedFieldInfo,
  CalculatedFieldType,
} from '@/types/tb/calculated-fields';
import type { EntityId } from '@/types/tb/entity';
import { EntityType } from '@/types/tb/entity';
import {
  CF_PAGE_SIZES,
  CF_SORTABLE_COLUMNS,
  type CfListUrlState,
  toPageLink,
} from '../list/url-state';
import type { CfDialogMode } from './cf-dialog';
import CfDialog from './cf-dialog';
import { type CfHostEntityType, defaultDebugSettings } from './data';
import {
  exportCalculatedField,
  parseImportedField,
  readImportFile,
  rewriteTenantReferences,
} from './import-export';

const CF_QUERY_KEY = ['calculated-fields-table'] as const;

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

export interface CalculatedFieldsTableProps {
  mode: 'tenant' | 'entity';
  /** Entity mode: the hosting entity (entity-scoped endpoint). */
  entityId?: EntityId;
  tenantId: string;
  /**
   * Tenant mode: the URL-backed state owned by the list page (sort/filter/
   * pagination). Entity mode keeps a private in-memory state instead.
   */
  urlState?: CfListUrlState;
  onUrlStateChange?: (patch: Partial<CfListUrlState>) => void;
  /** Bump to force a refetch (list-page Refresh button). */
  refreshSignal?: number;
}

/** Entity-mode default state (tab mode: no URL persistence, ngx parity). */
const ENTITY_DEFAULT_STATE: CfListUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  types: [],
  entityType: '',
  entities: [],
};

export default function CalculatedFieldsTable({
  mode,
  entityId,
  tenantId,
  urlState,
  onUrlStateChange,
  refreshSignal = 0,
}: CalculatedFieldsTableProps) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  // Entity mode keeps its own in-memory table state; tenant mode is
  // controlled from the list page (URL state).
  const [entityState, setEntityState] =
    useState<CfListUrlState>(ENTITY_DEFAULT_STATE);
  const state =
    mode === 'tenant' ? (urlState ?? ENTITY_DEFAULT_STATE) : entityState;
  const patch =
    mode === 'tenant'
      ? (partial: Partial<CfListUrlState>) => onUrlStateChange?.(partial)
      : (partial: Partial<CfListUrlState>) =>
          setEntityState((previous) => ({ ...previous, ...partial }));

  const listQuery = useQuery({
    queryKey: [
      ...CF_QUERY_KEY,
      mode,
      entityId?.id ?? 'tenant',
      refreshSignal,
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
      mode === 'entity' && entityId
        ? getCalculatedFieldsByEntityId(entityId, toPageLink(state))
        : getCalculatedFields(toPageLink(state), {
            types: state.types.length > 0 ? state.types : undefined,
            entityType: state.entityType || undefined,
            entities: state.entities.length > 0 ? state.entities : undefined,
          }),
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
    // ngx copyCalculatedField: pageMode ALSO strips the target entity (the
    // copy must be re-attached); tab mode copies onto the same entity.
    const clone: Record<string, unknown> = { ...row };
    delete clone.id;
    if (mode === 'tenant') {
      delete clone.entityId;
    }
    setDialog({ field: clone as unknown as CalculatedField, mode: 'copy' });
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers take the row as an argument and only read stable state (setters, intl, mode); the listed deps cover every value that shapes the rendered columns
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
      ...(mode === 'tenant'
        ? [
            {
              title: formatMessage({
                id: 'pages.calculatedFields.entityType',
                defaultMessage: 'Entity type',
              }),
              key: 'entityType',
              width: '12%',
              render: (_: unknown, row: CalculatedFieldInfo) =>
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
              render: (_: unknown, row: CalculatedFieldInfo) => (
                <span onClick={(event) => event.stopPropagation()}>
                  <Typography.Link
                    href={`${ENTITY_ROUTE_PREFIX[row.entityId.entityType as CfHostEntityType]}/${row.entityId.id}`}
                  >
                    {row.entityName ?? row.entityId.id}
                  </Typography.Link>
                </span>
              ),
            },
          ]
        : []),
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
        width: mode === 'entity' ? 260 : 220,
        render: (_: unknown, row) => (
          <Space size={0} onClick={(event) => event.stopPropagation()}>
            {mode === 'entity' && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                title={formatMessage({
                  id: 'pages.calculatedFields.edit',
                  defaultMessage: 'Edit',
                })}
                data-testid="cf-row-edit"
                onClick={() =>
                  setDialog({ field: row as CalculatedField, mode: 'edit' })
                }
              />
            )}
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
  }, [formatMessage, state.sortProperty, state.sortDirection, mode]);

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
    <div className="flex flex-col gap-3">
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
          // Row click = the edit state (tenant page mode only; ngx tab mode
          // has no rowPointer).
          onClick:
            mode === 'tenant'
              ? () =>
                  setDialog({
                    field: record as CalculatedField,
                    mode: 'edit',
                  })
              : undefined,
          style: mode === 'tenant' ? { cursor: 'pointer' } : undefined,
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

      <Space wrap>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() =>
            setDialog({
              field: { type: 'SIMPLE', name: '' } as CalculatedField,
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
    </div>
  );
}
