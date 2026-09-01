/**
 * Entity-view list page (spec 3.4, ui-ngx entity-views-table parity).
 *
 * Mirrors the device list pattern: ProTable renders `dataSource` fed by
 * useQuery (no `request` prop, no direct HTTP); 400ms debounced server-side
 * text search; page/pageSize/sort/textSearch/type live in the URL
 * (bookmark/refresh restores them). Filters follow the ui-ngx
 * entity-views-table exactly — text search plus the free-tag type filter;
 * entity views have no profile and no active concept (RECON §2).
 *
 * Row actions mirror ui-ngx tenant scope: edit (dialog), make public,
 * assign to customer, unassign / make private, delete — all tenant-admin
 * only; customer users (hand-typed URL) get the read-only view. Row click
 * opens the detail page.
 */
import { MoreOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
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
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { AssignCustomerModal } from '@/components/entities/AssignCustomerModal';
import { serverErrorText } from '@/components/entities/server-error-text';
import EntityViewDialog from '@/components/entity-views/EntityViewDialog';
import PageContainer from '@/components/layout/page-container';
import {
  assignEntityViewToCustomer,
  deleteEntityView,
  getCustomerEntityViews,
  getEntityViewTypes,
  getTenantEntityViews,
  makeEntityViewPublic,
  unassignEntityViewFromCustomer,
} from '@/services/tb/entity-view';
import type { EntityViewInfo } from '@/types/tb';
import { useAuthority } from '../use-authority';
import {
  toEntityViewListFilter,
  toPageLink,
  useEntityViewListUrlState,
} from './url-state';

const ENTITY_VIEWS_QUERY_KEY = ['entity-views', 'list'] as const;

/** Table column key -> sortable server property (EntityViewInfo fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  type: 'type',
  customerTitle: 'customerTitle',
};

const SEARCH_DEBOUNCE_MS = 400;

/** TB's null-customer UUID (EntityId.NULL_UUID). */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

function hasCustomer(entityView: EntityViewInfo): boolean {
  return !!entityView.customerId && entityView.customerId.id !== NULL_UUID;
}

export default function EntityViewsListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useEntityViewListUrlState();
  const { authority } = useAuthority();
  const readOnly = authority !== 'TENANT_ADMIN';

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

  // ---- type filter options (the free-tag list, ui-ngx subtype select)
  const typesQuery = useQuery({
    queryKey: ['entity-view-types', 'filter'],
    queryFn: getEntityViewTypes,
    staleTime: 60_000,
  });

  // ---- the list itself
  const entityViewsQuery = useQuery({
    queryKey: [
      ...ENTITY_VIEWS_QUERY_KEY,
      authority,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.type,
    ],
    queryFn: () =>
      getTenantEntityViews(
        toPageLink(urlState),
        toEntityViewListFilter(urlState),
      ),
    placeholderData: keepPreviousData,
  });
  const entityViews: Array<EntityViewInfo> = entityViewsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ENTITY_VIEWS_QUERY_KEY });

  // ---- dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<EntityViewInfo | null>(null);
  const [assignTargets, setAssignTargets] = useState<Array<EntityViewInfo>>([]);

  const deleteMutation = useMutation({
    mutationFn: (entityViewId: string) => deleteEntityView(entityViewId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.entityViews.list.toastDeleted',
          defaultMessage: 'Entity view deleted.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({
      customerId,
      entityViewId,
    }: {
      customerId: string;
      entityViewId: string;
    }) => assignEntityViewToCustomer(customerId, entityViewId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.entityViews.list.toastAssigned',
          defaultMessage: 'Entity views assigned to the customer.',
        }),
      );
      setAssignTargets([]);
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (entityViewId: string) =>
      unassignEntityViewFromCustomer(entityViewId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.entityViews.list.toastUnassigned',
          defaultMessage: 'Entity view unassigned.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const makePublicMutation = useMutation({
    mutationFn: (entityViewId: string) => makeEntityViewPublic(entityViewId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.entityViews.list.toastMadePublic',
          defaultMessage: 'Entity view is now public.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmUnassign = (entityView: EntityViewInfo) => {
    const isPublic = entityView.customerIsPublic;
    modal.confirm({
      title: isPublic
        ? formatMessage(
            {
              id: 'pages.entityViews.list.makePrivateTitle',
              defaultMessage:
                "Are you sure you want to make the entity view '{name}' private?",
            },
            { name: entityView.name },
          )
        : formatMessage(
            {
              id: 'pages.entityViews.list.unassignTitle',
              defaultMessage:
                "Are you sure you want to unassign the entity view '{name}'?",
            },
            { name: entityView.name },
          ),
      content: formatMessage({
        id: isPublic
          ? 'pages.entityViews.list.makePrivateText'
          : 'pages.entityViews.list.unassignText',
        defaultMessage: isPublic
          ? "After the confirmation the entity view and all its data will be made private and won't be accessible by others."
          : "After the confirmation the entity view will be unassigned and won't be accessible by the customer.",
      }),
      okText: formatMessage({
        id: isPublic
          ? 'pages.entityViews.list.actionMakePrivate'
          : 'pages.entityViews.list.actionUnassign',
        defaultMessage: isPublic
          ? 'Make entity view private'
          : 'Unassign from customer',
      }),
      cancelText: formatMessage({
        id: 'pages.entityViews.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => unassignMutation.mutateAsync(entityView.id.id),
    });
  };

  const confirmMakePublic = (entityView: EntityViewInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.entityViews.list.makePublicTitle',
          defaultMessage:
            "Are you sure you want to make the entity view '{name}' public?",
        },
        { name: entityView.name },
      ),
      content: formatMessage({
        id: 'pages.entityViews.list.makePublicText',
        defaultMessage:
          'After the confirmation the entity view and all its data will be made public and accessible by others.',
      }),
      okText: formatMessage({
        id: 'pages.entityViews.list.actionMakePublic',
        defaultMessage: 'Make entity view public',
      }),
      cancelText: formatMessage({
        id: 'pages.entityViews.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => makePublicMutation.mutateAsync(entityView.id.id),
    });
  };

  const confirmDelete = (entityView: EntityViewInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.entityViews.list.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the entity view '{name}'?",
        },
        { name: entityView.name },
      ),
      content: formatMessage({
        id: 'pages.entityViews.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the entity view and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.entityViews.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.entityViews.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(entityView.id.id),
    });
  };

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<EntityViewInfo>[] = useMemo(() => {
    const cols: ProColumns<EntityViewInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.entityViews.list.createdTime',
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
          id: 'pages.entityViews.list.name',
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
          id: 'pages.entityViews.list.type',
          defaultMessage: 'Entity view type',
        }),
        dataIndex: 'type',
        sorter: true,
        sortOrder: sortOrderFor('type'),
        render: (_, record) => record.type || '-',
      },
    ];
    if (!readOnly) {
      cols.push(
        {
          title: formatMessage({
            id: 'pages.entityViews.list.customer',
            defaultMessage: 'Customer',
          }),
          dataIndex: 'customerTitle',
          sorter: true,
          sortOrder: sortOrderFor('customerTitle'),
          render: (_, record) =>
            hasCustomer(record) ? record.customerTitle : '-',
        },
        {
          title: formatMessage({
            id: 'pages.entityViews.list.public',
            defaultMessage: 'Public',
          }),
          dataIndex: 'customerIsPublic',
          width: 90,
          render: (_, record) => (
            <Checkbox checked={!!record.customerIsPublic} disabled />
          ),
        },
      );
    }
    cols.push({
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) =>
        readOnly
          ? []
          : [
              <Dropdown
                key="more"
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'edit',
                      label: formatMessage({
                        id: 'pages.entityViews.list.actionEdit',
                        defaultMessage: 'Edit',
                      }),
                      onClick: () => {
                        setEditingView(record);
                        setDialogOpen(true);
                      },
                    },
                    ...(!hasCustomer(record)
                      ? [
                          {
                            key: 'make-public',
                            label: formatMessage({
                              id: 'pages.entityViews.list.actionMakePublic',
                              defaultMessage: 'Make entity view public',
                            }),
                            onClick: () => confirmMakePublic(record),
                          },
                          {
                            key: 'assign',
                            label: formatMessage({
                              id: 'pages.entityViews.list.actionAssign',
                              defaultMessage: 'Assign to customer',
                            }),
                            onClick: () => setAssignTargets([record]),
                          },
                        ]
                      : [
                          {
                            key: 'unassign',
                            label: formatMessage({
                              id: record.customerIsPublic
                                ? 'pages.entityViews.list.actionMakePrivate'
                                : 'pages.entityViews.list.actionUnassign',
                              defaultMessage: record.customerIsPublic
                                ? 'Make entity view private'
                                : 'Unassign from customer',
                            }),
                            onClick: () => confirmUnassign(record),
                          },
                        ]),
                    {
                      key: 'delete',
                      danger: true,
                      label: formatMessage({
                        id: 'pages.entityViews.list.actionDelete',
                        defaultMessage: 'Delete',
                      }),
                      onClick: () => confirmDelete(record),
                    },
                  ],
                }}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  onClick={(event) => event.stopPropagation()}
                />
              </Dropdown>,
            ],
    });
    return cols;
  }, [formatMessage, readOnly, urlState.sortProperty, urlState.sortDirection]);

  const onTableChange: TableProps<EntityViewInfo>['onChange'] = (
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
              id: 'pages.entityViews.list.search',
              defaultMessage: 'Search entity views',
            })}
          />
          <Select
            allowClear
            showSearch
            className="w-56"
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            value={urlState.type}
            placeholder={formatMessage({
              id: 'pages.entityViews.list.typeAll',
              defaultMessage: 'All types',
            })}
            options={(typesQuery.data ?? []).map((subtype) => ({
              label: subtype.type,
              value: subtype.type,
            }))}
            onChange={(value) => patch({ type: value ?? undefined, page: 1 })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void entityViewsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.entityViews.list.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          {!readOnly && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingView(null);
                setDialogOpen(true);
              }}
            >
              {formatMessage({
                id: 'pages.entityViews.list.add',
                defaultMessage: 'Add entity view',
              })}
            </Button>
          )}
        </div>
      }
    >
      {entityViewsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.entityViews.list.loadFailed',
            defaultMessage: 'Failed to load entity views',
          })}
          description={serverErrorText(entityViewsQuery.error)}
        />
      )}

      <ProTable<EntityViewInfo>
        rowKey={(record) => record.id.id}
        columns={columns}
        dataSource={entityViews}
        loading={entityViewsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => history.push(`/entityViews/${record.id.id}`),
        })}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: entityViewsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.entityViews.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.entityViews.list.empty',
            defaultMessage: 'No entity views found',
          }),
        }}
      />

      <EntityViewDialog
        open={dialogOpen}
        entityView={editingView}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void invalidate();
        }}
      />
      <AssignCustomerModal
        open={assignTargets.length > 0}
        entityCount={assignTargets.length}
        onClose={() => setAssignTargets([])}
        onConfirm={(customer) => {
          const targets = assignTargets;
          if (targets.length > 0) {
            assignMutation.mutate({
              customerId: customer.id.id,
              entityViewId: targets[0].id.id,
            });
          }
        }}
      />
    </PageContainer>
  );
}
