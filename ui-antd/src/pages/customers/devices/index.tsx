/**
 * Customer-scope devices page (spec 3.5「作用域页 ×4」, ui-ngx customer
 * devices subtree): every row already belongs to this customer, so there is
 * no create/assign here — the ops mirror ui-ngx's customer-scope device
 * table minus tenant-side extras: unassign (this customer, single + batch
 * fan-out), delete (confirmed), and the name link as the edit entry into
 * the device detail page.
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
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { CheckConnectivityModal } from '@/components/devices/CheckConnectivityModal';
import { DeviceCredentialsModal } from '@/components/devices/DeviceCredentialsModal';
import { serverErrorText } from '@/components/entities/server-error-text';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
import {
  deleteDevice,
  getCustomerDevices,
  unassignDeviceFromCustomer,
} from '@/services/tb/device';
import type { DeviceInfo } from '@/types/tb';
import { createListUrlState } from '../list-url-state';
import {
  CustomerScopePageShell,
  useCustomerScopeTitle,
} from '../scope-page-shell';

const SCOPE_DEVICES_KEY = ['customers', 'devices', 'scope'] as const;

const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  deviceProfileName: 'deviceProfileName',
  label: 'label',
  active: 'active',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

export default function CustomerDevicesPage() {
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

  const devicesQuery = useQuery({
    queryKey: [
      ...SCOPE_DEVICES_KEY,
      customerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () =>
      getCustomerDevices(
        customerId as string,
        listUrlState.toPageLink(urlState),
      ),
    enabled: !!customerId,
    placeholderData: keepPreviousData,
  });
  const devices: Array<DeviceInfo> = devicesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_DEVICES_KEY });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedDevices = devices.filter((device) =>
    selectedRowKeys.includes(device.id.id),
  );

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  // Row-action dialogs shared with the tenant devices list (consumed
  // as-is; the page is TA-only so credentials are never read-only).
  const [credentialsDevice, setCredentialsDevice] = useState<DeviceInfo | null>(
    null,
  );
  const [connectivityDeviceId, setConnectivityDeviceId] = useState<string>();

  const deleteOneMutation = useMutation({
    mutationFn: (deviceId: string) => deleteDevice(deviceId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.customers.devices.toastDeleted',
          defaultMessage: 'Device deleted.',
        }),
      );
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmUnassign = (targets: Array<DeviceInfo>) => {
    if (targets.length === 0) {
      return;
    }
    modal.confirm({
      title:
        targets.length === 1
          ? formatMessage(
              {
                id: 'pages.customers.devices.unassignTitle',
                defaultMessage:
                  "Are you sure you want to unassign the device '{name}'?",
              },
              { name: targets[0].name },
            )
          : formatMessage(
              {
                id: 'pages.customers.devices.unassignManyTitle',
                defaultMessage:
                  'Are you sure you want to unassign {count, plural, =1 {1 device} other {# devices}}?',
              },
              { count: targets.length },
            ),
      content:
        targets.length === 1
          ? formatMessage({
              id: 'pages.customers.devices.unassignText',
              defaultMessage:
                'After the confirmation the device will no longer belong to this customer.',
            })
          : formatMessage({
              id: 'pages.customers.devices.unassignManyText',
              defaultMessage:
                'After the confirmation the selected devices will no longer belong to this customer.',
            }),
      okText: formatMessage({
        id: 'pages.customers.devices.actionUnassign',
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
          (device) => device.name,
          (device) => unassignDeviceFromCustomer(device.id.id),
        );
        setSelectedRowKeys([]);
        void invalidate();
        void message.success(
          formatMessage({
            id: 'pages.customers.devices.toastUnassigned',
            defaultMessage: 'Devices unassigned from the customer.',
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

  const confirmDeleteOne = (device: DeviceInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.customers.devices.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the device '{name}'?",
        },
        { name: device.name },
      ),
      content: formatMessage({
        id: 'pages.customers.devices.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the device and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.customers.devices.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.customers.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOneMutation.mutateAsync(device.id.id),
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<DeviceInfo>[] = useMemo(() => {
    const cols: ProColumns<DeviceInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.customers.devices.columnCreatedTime',
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
          id: 'pages.customers.devices.columnName',
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
          id: 'pages.customers.devices.columnProfile',
          defaultMessage: 'Device profile',
        }),
        dataIndex: 'deviceProfileName',
        sorter: true,
        sortOrder: sortOrderFor('deviceProfileName'),
      },
      {
        title: formatMessage({
          id: 'pages.customers.devices.columnLabel',
          defaultMessage: 'Label',
        }),
        dataIndex: 'label',
        sorter: true,
        sortOrder: sortOrderFor('label'),
        render: (_, record) => record.label || '-',
      },
      {
        title: formatMessage({
          id: 'pages.customers.devices.columnState',
          defaultMessage: 'State',
        }),
        dataIndex: 'active',
        width: 100,
        sorter: true,
        sortOrder: sortOrderFor('active'),
        render: (_, record) => (
          <Tag color={record.active ? 'success' : 'error'}>
            {formatMessage({
              id: record.active
                ? 'pages.customers.devices.active'
                : 'pages.customers.devices.inactive',
              defaultMessage: record.active ? 'Active' : 'Inactive',
            })}
          </Tag>
        ),
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
                  key: 'credentials',
                  label: formatMessage({
                    id: 'pages.devices.list.actionCredentials',
                    defaultMessage: 'Manage credentials',
                  }),
                  onClick: () => setCredentialsDevice(record),
                },
                {
                  key: 'connectivity',
                  label: formatMessage({
                    id: 'pages.devices.list.actionConnectivity',
                    defaultMessage: 'Check connectivity',
                  }),
                  onClick: () => setConnectivityDeviceId(record.id.id),
                },
                {
                  key: 'unassign',
                  label: formatMessage({
                    id: 'pages.customers.devices.actionUnassign',
                    defaultMessage: 'Unassign from this customer',
                  }),
                  onClick: () => confirmUnassign([record]),
                },
                {
                  key: 'delete',
                  danger: true,
                  label: formatMessage({
                    id: 'pages.customers.devices.actionDelete',
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
    <CustomerScopePageShell
      customerId={customerId}
      customerTitle={titleQuery.data}
      loadError={titleQuery.isError ? titleQuery.error : undefined}
      title={formatMessage({
        id: 'pages.customers.devices.title',
        defaultMessage: 'Customer devices',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.customers.devices.search',
              defaultMessage: 'Search devices',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void devicesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.customers.devices.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          {selectedDevices.length > 0 && (
            <>
              <Typography.Text type="secondary">
                {formatMessage(
                  {
                    id: 'pages.customers.devices.selectedCount',
                    defaultMessage: '{count} selected',
                  },
                  { count: selectedDevices.length },
                )}
              </Typography.Text>
              <Button onClick={() => confirmUnassign(selectedDevices)}>
                {formatMessage({
                  id: 'pages.customers.devices.batchUnassign',
                  defaultMessage: 'Unassign selected devices',
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
            id: 'pages.customers.devices.loadFailed',
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
                id: 'pages.customers.devices.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.customers.devices.empty',
            defaultMessage: 'No devices',
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
      <DeviceCredentialsModal
        open={!!credentialsDevice}
        device={credentialsDevice}
        readOnly={false}
        onClose={() => setCredentialsDevice(null)}
      />
      <CheckConnectivityModal
        open={!!connectivityDeviceId}
        deviceId={connectivityDeviceId}
        onClose={() => setConnectivityDeviceId(undefined)}
      />
    </CustomerScopePageShell>
  );
}
