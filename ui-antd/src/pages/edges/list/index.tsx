/**
 * Edge instances list — tenant scope (M13 wave-3, spec §5.1; ui-ngx
 * edges-table-config.resolver.ts parity).
 *
 * Data always rides the edgeInfos family with an explicit createdTime DESC
 * default (R23); search/paging/sort/type filter live in the URL. Row
 * actions mirror the ngx tenant matrix: make public / assign to customer /
 * unassign / make private (an unassign of the public customer) / the five
 * manage sub-page entries (routes land in wave 5 — the links go live ahead
 * of them on purpose) / sync (fire-and-forget toast + per-row loading, no
 * polling, R09) / delete. The create dialog mints routingKey/secret locally
 * (read-only, R08) and auto-opens the install instructions unless the
 * notDisplayInstructionsAfterAddEdge user preference opts out. CSV import
 * posts the ngx edge column mapping to /api/edge/bulk_import (R25).
 *
 * CUSTOMER_USER rides this wave too: the query pins to the own-customer
 * edgeInfos endpoint (the JWT customerId claim), every write control hides
 * (create/import/delete/action matrix/batch, incl. the selection boxes) and
 * the tenant-only customer/public columns collapse. List, row-to-detail and
 * the type filter stay. The tenant-admin customer-scope page lives at
 * /customers/:id/edges (wave 5a).
 */
import {
  DeleteOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
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
  Form,
  Input,
  Modal,
  Select,
  Space,
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { AssignCustomerModal } from '@/components/entities/AssignCustomerModal';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useAuthority } from '@/components/shared/use-authority';
import { useBatchRun } from '@/components/shared/use-batch-run';
import {
  assignEdgeToCustomer,
  deleteEdge,
  getCustomerEdgeInfos,
  getEdgeTypes,
  getTenantEdgeInfos,
  getUserSettings,
  makeEdgePublic,
  saveEdge,
  syncEdge,
  unassignEdgeFromCustomer,
} from '@/services/tb/edge';
import type { Customer } from '@/types/tb';
import type { Edge, EdgeInfo } from '@/types/tb/edge';
import {
  EdgeInstructionsDialog,
  type EdgeInstructionsDialogMode,
} from '../instructions-dialog';
import { generateRoutingKey, generateSecret } from './edge-keys';
import { EdgeImportModal } from './import-dialog';
import {
  EDGE_SORTABLE_COLUMNS,
  toPageLink,
  useEdgeListUrlState,
} from './url-state';

const EDGE_QUERY_KEY = ['edges', 'instances'] as const;
const SEARCH_DEBOUNCE_MS = 400;

/** TB's null-customer UUID (EntityId.NULL_UUID). */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

interface EdgeFormValues {
  name: string;
  type: string;
  label?: string;
  description?: string;
}

export default function EdgeListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useEdgeListUrlState();
  const [form] = Form.useForm<EdgeFormValues>();
  // CU reads the customer-scoped endpoint over the own customerId (JWT
  // claim, v1 device-list precedent) and gets the read-only collapse.
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

  // ---- the list itself
  const edgesQuery = useQuery({
    queryKey: [
      ...EDGE_QUERY_KEY,
      authority,
      cuCustomerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.type,
    ],
    queryFn: () =>
      readOnly && cuCustomerId
        ? getCustomerEdgeInfos(
            cuCustomerId,
            toPageLink(urlState),
            urlState.type,
          )
        : getTenantEdgeInfos(toPageLink(urlState), urlState.type),
    placeholderData: keepPreviousData,
  });
  const edges: Array<EdgeInfo> = edgesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: EDGE_QUERY_KEY });

  // ---- edge type facets for the filter dropdown
  const typesQuery = useQuery({
    queryKey: ['edges', 'types'],
    queryFn: getEdgeTypes,
    staleTime: 60_000,
  });

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedEdges = edges.filter((edge) =>
    selectedRowKeys.includes(edge.id.id),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [routingKey, setRoutingKey] = useState('');
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [assignTargets, setAssignTargets] = useState<Array<EdgeInfo>>([]);

  /** ngx auto-opens the install instructions with the saved entity unless the preference opts out. */
  const [instructions, setInstructions] = useState<{
    edge: Pick<EdgeInfo, 'id'>;
    mode: EdgeInstructionsDialogMode;
  } | null>(null);

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  // ---- per-row sync loading (fire-and-forget, no polling)
  const [syncingId, setSyncingId] = useState<string>();
  const syncOne = async (edge: EdgeInfo) => {
    setSyncingId(edge.id.id);
    try {
      await syncEdge(edge.id.id);
      void message.success(
        formatMessage({
          id: 'pages.edge.syncStarted',
          defaultMessage: 'Sync process started successfully!',
        }),
      );
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setSyncingId(undefined);
    }
  };

  // ---- create dialog (routingKey/secret minted locally, read-only, R08)
  const openCreate = () => {
    setRoutingKey(generateRoutingKey());
    setSecret(generateSecret(20));
    form.resetFields();
    setCreateOpen(true);
  };

  const saveNewEdge = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const draft = {
        name: values.name.trim(),
        type: values.type.trim() || 'default',
        label: values.label?.trim() || undefined,
        routingKey,
        secret,
        additionalInfo: { description: values.description ?? '' },
      } as Edge;
      const saved = await saveEdge(draft);
      setCreateOpen(false);
      void message.success(
        formatMessage({
          id: 'pages.edge.toastSaved',
          defaultMessage: 'Edge saved.',
        }),
      );
      void invalidate();
      // Re-read the preference at save time (ngx parity): the cached query
      // may predate the dialog's "don't show again" write in this session.
      const settings = await getUserSettings().catch(() => null);
      if (settings?.notDisplayInstructionsAfterAddEdge !== true) {
        setInstructions({ edge: saved, mode: 'afterAdd' });
      }
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  // ---- assign / unassign / public flows (ngx tenant action matrix)
  const runAssign = async (customerId: string) => {
    if (assignTargets.length === 0) {
      return;
    }
    const targets = assignTargets;
    setAssignTargets([]);
    setBatchOpen(true);
    const summary = await batch.run(
      targets,
      (edge) => edge.name,
      (edge) => assignEdgeToCustomer(customerId, edge.id.id),
    );
    setSelectedRowKeys([]);
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

  const makePublic = async (edge: EdgeInfo) => {
    try {
      await makeEdgePublic(edge.id.id);
      void message.success(
        formatMessage({
          id: 'pages.edge.toastPublic',
          defaultMessage: 'Edge is public.',
        }),
      );
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const unassignOne = async (edge: EdgeInfo, successTextId: string) => {
    try {
      await unassignEdgeFromCustomer(edge.id.id);
      void message.success(
        formatMessage({ id: successTextId, defaultMessage: successTextId }),
      );
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const confirmMakePublic = (edge: EdgeInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.makePublicTitle',
          defaultMessage:
            "Are you sure you want to make the edge '{name}' public?",
        },
        { name: edge.name },
      ),
      content: formatMessage({
        id: 'pages.edge.makePublicText',
        defaultMessage:
          'After the confirmation the edge and all its data will be made public and accessible by others.',
      }),
      okText: formatMessage({
        id: 'pages.edge.action.makePublic',
        defaultMessage: 'Make edge public',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => makePublic(edge),
    });
  };

  /** "Make private" is an unassign of the public customer (ngx parity). */
  const confirmMakePrivate = (edge: EdgeInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.makePrivateTitle',
          defaultMessage:
            "Are you sure you want to make the edge '{name}' private?",
        },
        { name: edge.name },
      ),
      content: formatMessage({
        id: 'pages.edge.makePrivateText',
        defaultMessage:
          'After the confirmation the edge and all its data will become private and will not be accessible by others.',
      }),
      okText: formatMessage({
        id: 'pages.edge.action.makePrivate',
        defaultMessage: 'Make edge private',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => unassignOne(edge, 'pages.edge.toastPrivate'),
    });
  };

  const confirmUnassign = (edge: EdgeInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.unassignTitle',
          defaultMessage:
            "Are you sure you want to unassign the edge '{name}'?",
        },
        { name: edge.name },
      ),
      content: formatMessage({
        id: 'pages.edge.unassignText',
        defaultMessage:
          'After the confirmation the edge will be unassigned and will not be accessible by the customer.',
      }),
      okText: formatMessage({
        id: 'pages.edge.action.unassign',
        defaultMessage: 'Unassign from customer',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => unassignOne(edge, 'pages.edge.toastUnassigned'),
    });
  };

  // ---- delete flows (single + batch; confirm-quad)
  const deleteOne = async (edge: EdgeInfo) => {
    try {
      await deleteEdge(edge.id.id);
      setSelectedRowKeys([]);
      void message.success(
        formatMessage({
          id: 'pages.edge.toastDeleted',
          defaultMessage: 'Edge deleted.',
        }),
      );
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const confirmDeleteOne = (edge: EdgeInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.deleteOneTitle',
          defaultMessage: "Are you sure you want to delete the edge '{name}'?",
        },
        { name: edge.name },
      ),
      content: formatMessage({
        id: 'pages.edge.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the edge and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.edge.action.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOne(edge),
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedEdges.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.edge.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 edge} other {# edges}}?',
        },
        { count: selectedEdges.length },
      ),
      content: formatMessage({
        id: 'pages.edge.deleteManyText',
        defaultMessage:
          'Be careful, after the confirmation all selected edges will be removed and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.edge.action.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        const summary = await batch.run(
          [...selectedEdges],
          (edge) => edge.name,
          (edge) => deleteEdge(edge.id.id),
        );
        setSelectedRowKeys([]);
        void invalidate();
        void message.success(
          formatMessage(
            {
              id: 'pages.edge.batchResult',
              defaultMessage: '{ok} succeeded, {fail} failed.',
            },
            { ok: summary.ok, fail: summary.failed },
          ),
        );
      },
    });
  };

  // ---- columns (ngx tenant parity: createdTime/name/type/label/customer/public)
  // biome-ignore lint/correctness/useExhaustiveDependencies: excluded row-action handlers take the row as an argument and read no reactive state (stable setters / batch runner only); the listed deps (incl. syncingId) cover every value that shapes the rendered columns
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
        render: (_, record) =>
          dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: formatMessage({
          id: 'pages.edge.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        // Wave-5a carry-over fix: the row opens the edge detail (OTA list
        // title-link shape).
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            className="px-0"
            onClick={() => history.push(`/edges/${record.id.id}`)}
          >
            {record.name}
          </Button>
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
      // Tenant-only columns: CU collapses to the four base columns (ngx
      // customer_user parity).
      ...(!readOnly
        ? [
            {
              title: formatMessage({
                id: 'pages.edge.customer',
                defaultMessage: 'Customer',
              }),
              dataIndex: 'customerTitle',
              sorter: true,
              sortOrder: sortOrderFor('customerTitle'),
              render: (_: unknown, record: EdgeInfo) =>
                record.customerTitle || '-',
            },
            {
              title: formatMessage({
                id: 'pages.edge.public',
                defaultMessage: 'Public',
              }),
              dataIndex: 'customerIsPublic',
              width: 90,
              render: (_: unknown, record: EdgeInfo) => (
                <Checkbox checked={record.customerIsPublic} disabled />
              ),
            },
          ]
        : []),
    ];
    if (!readOnly) {
      cols.push({
        valueType: 'option',
        width: 110,
        fixed: 'right',
        render: (_, record) => [
          <Button
            key="sync"
            type="text"
            size="small"
            icon={<SyncOutlined spin={syncingId === record.id.id} />}
            disabled={syncingId !== undefined && syncingId !== record.id.id}
            aria-label={formatMessage({
              id: 'pages.edge.action.sync',
              defaultMessage: 'Sync Edge',
            })}
            title={formatMessage({
              id: 'pages.edge.action.sync',
              defaultMessage: 'Sync Edge',
            })}
            onClick={() => void syncOne(record)}
          />,
          <Dropdown
            key="more"
            trigger={['click']}
            menu={{
              items: [
                ...(hasCustomer(record)
                  ? [
                      record.customerIsPublic
                        ? {
                            key: 'makePrivate',
                            label: formatMessage({
                              id: 'pages.edge.action.makePrivate',
                              defaultMessage: 'Make edge private',
                            }),
                            onClick: () => confirmMakePrivate(record),
                          }
                        : {
                            key: 'unassign',
                            label: formatMessage({
                              id: 'pages.edge.action.unassign',
                              defaultMessage: 'Unassign from customer',
                            }),
                            onClick: () => confirmUnassign(record),
                          },
                    ]
                  : [
                      {
                        key: 'makePublic',
                        label: formatMessage({
                          id: 'pages.edge.action.makePublic',
                          defaultMessage: 'Make edge public',
                        }),
                        onClick: () => confirmMakePublic(record),
                      },
                      {
                        key: 'assign',
                        label: formatMessage({
                          id: 'pages.edge.action.assign',
                          defaultMessage: 'Assign to customer',
                        }),
                        onClick: () => setAssignTargets([record]),
                      },
                    ]),
                { type: 'divider' as const },
                ...MANAGE_TARGETS.map((target) => ({
                  key: `manage-${target.suffix}`,
                  label: formatMessage({
                    id: target.labelId,
                    defaultMessage: target.defaultMessage,
                  }),
                  onClick: () =>
                    history.push(`/edges/${record.id.id}/${target.suffix}`),
                })),
                { type: 'divider' as const },
                {
                  key: 'delete',
                  danger: true,
                  label: formatMessage({
                    id: 'pages.edge.action.delete',
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
      });
    }
    return cols;
  }, [
    formatMessage,
    urlState.sortProperty,
    urlState.sortDirection,
    syncingId,
    readOnly,
  ]);

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
      ? EDGE_SORTABLE_COLUMNS[sort.field as string]
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
    <PageContainer
      title={formatMessage({
        id: 'menu.edge.instances',
        defaultMessage: 'Edge instances',
      })}
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
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-56"
            loading={typesQuery.isPending}
            value={urlState.type}
            placeholder={formatMessage({
              id: 'pages.edge.typeFilter',
              defaultMessage: 'All edge types',
            })}
            options={(typesQuery.data ?? []).map((subtype) => ({
              label: subtype.type,
              value: subtype.type,
            }))}
            onChange={(value) =>
              // ngx resetSortAndFilter on type switch: back to the default
              // order with the filter in the URL.
              patch({
                type: value ?? undefined,
                sortProperty: 'createdTime',
                sortDirection: 'DESC',
                page: 1,
              })
            }
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
          <div className="flex-1" />
          {!readOnly && (
            <Space>
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
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={confirmDeleteSelected}
                  >
                    {formatMessage({
                      id: 'pages.edge.batchDelete',
                      defaultMessage: 'Delete selected',
                    })}
                  </Button>
                  <Button onClick={() => setAssignTargets(selectedEdges)}>
                    {formatMessage({
                      id: 'pages.edge.batchAssign',
                      defaultMessage: 'Assign to customer',
                    })}
                  </Button>
                </>
              )}
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportOpen(true)}
              >
                {formatMessage({
                  id: 'pages.edge.import',
                  defaultMessage: 'Import edges',
                })}
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreate}
              >
                {formatMessage({
                  id: 'pages.edge.add',
                  defaultMessage: 'Add edge',
                })}
              </Button>
            </Space>
          )}
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
        rowSelection={
          readOnly
            ? undefined
            : {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys),
              }
        }
      />

      <Modal
        open={createOpen}
        title={formatMessage({
          id: 'pages.edge.add',
          defaultMessage: 'Add edge',
        })}
        width={640}
        okText={formatMessage({
          id: 'pages.edge.add',
          defaultMessage: 'Add edge',
        })}
        cancelText={formatMessage({
          id: 'pages.edge.cancel',
          defaultMessage: 'Cancel',
        })}
        confirmLoading={saving}
        onOk={() => void saveNewEdge()}
        onCancel={() => setCreateOpen(false)}
      >
        <Form<EdgeFormValues>
          form={form}
          layout="vertical"
          initialValues={{ type: 'default' }}
        >
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'pages.edge.name',
              defaultMessage: 'Name',
            })}
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage({
                  id: 'pages.edge.nameRequired',
                  defaultMessage: 'Name is required.',
                }),
              },
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.edge.nameMaxLength',
                  defaultMessage: 'Name should be less than 256 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="type"
            label={formatMessage({
              id: 'pages.edge.type',
              defaultMessage: 'Edge type',
            })}
            extra={formatMessage({
              id: 'pages.edge.typeFreeText',
              defaultMessage:
                'Free-form subtype (defaults to "default" for a fresh deployment).',
            })}
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage({
                  id: 'pages.edge.typeRequired',
                  defaultMessage: 'Edge type is required.',
                }),
              },
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.edge.typeMaxLength',
                  defaultMessage: 'Type should be less than 256 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="label"
            label={formatMessage({
              id: 'pages.edge.label',
              defaultMessage: 'Label',
            })}
            rules={[
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.edge.labelMaxLength',
                  defaultMessage: 'Label should be less than 256 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.edge.routingKey',
              defaultMessage: 'Edge key',
            })}
          >
            <Input value={routingKey} disabled data-testid="edge-routing-key" />
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.edge.secret',
              defaultMessage: 'Edge secret',
            })}
          >
            <Input value={secret} disabled data-testid="edge-secret" />
          </Form.Item>
          <Form.Item
            name="description"
            label={formatMessage({
              id: 'pages.edge.description',
              defaultMessage: 'Description',
            })}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <EdgeImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          void invalidate();
        }}
      />
      <AssignCustomerModal
        open={assignTargets.length > 0}
        entityCount={assignTargets.length}
        onClose={() => setAssignTargets([])}
        onConfirm={(customer: Customer) => void runAssign(customer.id.id)}
      />
      <EdgeInstructionsDialog
        open={instructions !== null}
        edge={instructions?.edge ?? null}
        mode={instructions?.mode ?? 'afterAdd'}
        onClose={() => setInstructions(null)}
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

function hasCustomer(edge: EdgeInfo): boolean {
  return !!edge.customerId && edge.customerId.id !== NULL_UUID;
}

/** Manage sub-page targets (routes mount in wave 5; ngx suffix parity). */
const MANAGE_TARGETS = [
  {
    suffix: 'devices',
    labelId: 'pages.edge.action.manageDevices',
    defaultMessage: 'Manage devices',
  },
  {
    suffix: 'assets',
    labelId: 'pages.edge.action.manageAssets',
    defaultMessage: 'Manage assets',
  },
  {
    suffix: 'entityViews',
    labelId: 'pages.edge.action.manageEntityViews',
    defaultMessage: 'Manage entity views',
  },
  {
    suffix: 'dashboards',
    labelId: 'pages.edge.action.manageDashboards',
    defaultMessage: 'Manage dashboards',
  },
  {
    suffix: 'ruleChains',
    labelId: 'pages.edge.action.manageRuleChains',
    defaultMessage: 'Manage rule chains',
  },
] as const;
