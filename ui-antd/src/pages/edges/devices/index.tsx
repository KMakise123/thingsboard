/**
 * Edge-scope devices page (M13 wave-5a, spec §5.3; ui-ngx edge-scope device
 * table parity): every row is already assigned to this edge, so there is no
 * create/import/manage-credentials here (pinned). The type / deviceProfile /
 * active filter trio rides the GET endpoint's existing query params (the
 * backend treats type and deviceProfileId as mutually exclusive). TA gets
 * the assignment ops (assign-existing dialog + unassign, single and batch);
 * CUSTOMER_USER gets the read-only collapse — filters, list and the detail
 * jump stay, every assignment control hides (edge_customer_user semantics).
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
  Select,
  type TableProps,
  Tag,
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
  getDeviceProfiles,
  getDeviceTypes,
  getTenantDevices,
} from '@/services/tb/device';
import {
  assignEdgeDevice,
  getEdgeDevices,
  unassignEdgeDevice,
} from '@/services/tb/edge';
import type { DeviceInfo, PageLink } from '@/types/tb';
import {
  AssignEntitiesDialog,
  type AssignEntitiesOption,
} from '../assign-entities-dialog';
import { EdgeScopePageShell, useEdgeScopeName } from '../detail/scope-shell';
import { useAuthority } from '../detail/use-authority';

const SCOPE_DEVICES_KEY = ['edges', 'devices', 'scope'] as const;

/** Table column key -> sortable server property (endpoint schema). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  deviceProfileName: 'deviceProfileName',
  label: 'label',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

export default function EdgeDevicesPage() {
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

  // ---- the filter trio (component state; rides the GET query params)
  const [typeFilter, setTypeFilter] = useState<string>();
  const [profileIdFilter, setProfileIdFilter] = useState<string>();
  const [activeFilter, setActiveFilter] = useState<boolean>();

  const devicesQuery = useQuery({
    queryKey: [
      ...SCOPE_DEVICES_KEY,
      edgeId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      typeFilter,
      profileIdFilter,
      activeFilter,
    ],
    queryFn: () =>
      getEdgeDevices(edgeId as string, listUrlState.toPageLink(urlState), {
        // type and deviceProfileId are mutually exclusive server-side.
        type: profileIdFilter ? undefined : typeFilter,
        deviceProfileId: profileIdFilter,
        active: activeFilter,
      }),
    enabled: !!edgeId,
    placeholderData: keepPreviousData,
  });
  // The endpoint returns DeviceInfo rows (joined profile name + active).
  const devices = (devicesQuery.data?.data ?? []) as Array<DeviceInfo>;
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_DEVICES_KEY });

  // ---- filter candidates (the tenant-side facets)
  const typesQuery = useQuery({
    queryKey: ['devices', 'types'],
    queryFn: getDeviceTypes,
    staleTime: 60_000,
  });
  const profilesQuery = useQuery({
    queryKey: ['device-profiles', 'filter-options'],
    queryFn: () =>
      getDeviceProfiles({
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
    staleTime: 60_000,
  });

  // ---- selection + batch
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedDevices = devices.filter((device) =>
    selectedRowKeys.includes(device.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const confirmUnassign = (targets: Array<DeviceInfo>) => {
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
          (device) => device.name,
          (device) => unassignEdgeDevice(edgeId as string, device.id.id),
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
      (entry) => assignEdgeDevice(edgeId as string, entry.id),
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

  const loadDeviceCandidates = (pageLink: PageLink) =>
    getTenantDevices(pageLink).then((page) => ({
      ...page,
      data: page.data.map<AssignEntitiesOption>((device) => ({
        id: device.id.id,
        label: device.name,
      })),
    }));

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<DeviceInfo>[] = useMemo(() => {
    const cols: ProColumns<DeviceInfo>[] = [
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
            onClick={() => history.push(`/devices/${record.id.id}`)}
          >
            {record.name}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.edge.scope.columnDeviceProfile',
          defaultMessage: 'Device profile',
        }),
        dataIndex: 'deviceProfileName',
        sorter: true,
        sortOrder: sortOrderFor('deviceProfileName'),
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
        title: formatMessage({
          id: 'pages.edge.scope.columnState',
          defaultMessage: 'State',
        }),
        dataIndex: 'active',
        width: 100,
        render: (_, record) => (
          <Tag color={record.active ? 'success' : 'error'}>
            {formatMessage({
              id: record.active
                ? 'pages.devices.list.active'
                : 'pages.devices.list.inactive',
              defaultMessage: record.active ? 'Active' : 'Inactive',
            })}
          </Tag>
        ),
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

  const onTableChange: TableProps<DeviceInfo>['onChange'] = (
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
        id: 'pages.edge.scope.devicesTitle',
        defaultMessage: 'Devices',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-40"
            loading={typesQuery.isPending}
            value={typeFilter}
            placeholder={formatMessage({
              id: 'pages.edge.scope.filterTypePlaceholder',
              defaultMessage: 'All types',
            })}
            options={(typesQuery.data ?? []).map((subtype) => ({
              label: subtype.type,
              value: subtype.type,
            }))}
            onChange={(value) => {
              setTypeFilter(value ?? undefined);
              patch({ page: 1 });
            }}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            className="w-48"
            loading={profilesQuery.isPending}
            value={profileIdFilter}
            placeholder={formatMessage({
              id: 'pages.edge.scope.filterProfilePlaceholder',
              defaultMessage: 'All device profiles',
            })}
            options={(profilesQuery.data?.data ?? []).map((profile) => ({
              label: profile.name,
              value: profile.id.id,
            }))}
            onChange={(value) => {
              setProfileIdFilter(value ?? undefined);
              patch({ page: 1 });
            }}
          />
          <Select
            allowClear
            className="w-36"
            value={
              activeFilter === undefined
                ? undefined
                : activeFilter
                  ? 'active'
                  : 'inactive'
            }
            placeholder={formatMessage({
              id: 'pages.edge.scope.filterActivePlaceholder',
              defaultMessage: 'All states',
            })}
            options={[
              {
                label: formatMessage({
                  id: 'pages.devices.list.active',
                  defaultMessage: 'Active',
                }),
                value: 'active',
              },
              {
                label: formatMessage({
                  id: 'pages.devices.list.inactive',
                  defaultMessage: 'Inactive',
                }),
                value: 'inactive',
              },
            ]}
            onChange={(value) => {
              setActiveFilter(
                value === 'active'
                  ? true
                  : value === 'inactive'
                    ? false
                    : undefined,
              );
              patch({ page: 1 });
            }}
          />
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.edge.scope.devicesSearch',
              defaultMessage: 'Search devices',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void devicesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.edge.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          {!readOnly && (
            <>
              {selectedDevices.length > 0 && (
                <>
                  <Typography.Text type="secondary">
                    {formatMessage(
                      {
                        id: 'pages.edge.selectedCount',
                        defaultMessage: '{count} selected',
                      },
                      { count: selectedDevices.length },
                    )}
                  </Typography.Text>
                  <Button onClick={() => confirmUnassign(selectedDevices)}>
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
                  id: 'pages.edge.scope.assignDevices',
                  defaultMessage: 'Assign existing devices',
                })}
              </Button>
            </>
          )}
        </div>
      }
    >
      {devicesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.edge.scope.devicesLoadFailed',
            defaultMessage: 'Failed to load devices',
          })}
          description={serverErrorText(devicesQuery.error)}
        />
      )}

      <ProTable<DeviceInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={devices}
        loading={devicesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: devicesQuery.data?.totalElements ?? 0,
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
            id: 'pages.edge.scope.devicesEmpty',
            defaultMessage: 'No devices on this edge',
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
            id: 'pages.edge.scope.assignDevices',
            defaultMessage: 'Assign existing devices',
          })}
          loadCandidates={loadDeviceCandidates}
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
