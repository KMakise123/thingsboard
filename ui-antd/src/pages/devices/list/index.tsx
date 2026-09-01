/**
 * Device list page (spec 3.3「列表」, ui-ngx devices-table parity).
 *
 * Wave1 rules honored here: ProTable renders `dataSource` fed by useQuery
 * (no `request` prop, no direct HTTP); every mutation success goes through
 * queryClient.invalidateQueries (never actionRef.reload against a request);
 * server pages are 0-based with explicit sortOrder; filters, page, page size
 * and sort live in the URL (bookmark/refresh restores them, including
 * deviceProfileId and active). Tenant admins get the full action set,
 * customer users a read-only view over their customer's devices.
 */

import {
  ApiOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
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
  Dropdown,
  Input,
  Segmented,
  Select,
  Space,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { AssignCustomerModal } from '@/components/devices/AssignCustomerModal';
import { CheckConnectivityModal } from '@/components/devices/CheckConnectivityModal';
import { DeviceCredentialsModal } from '@/components/devices/DeviceCredentialsModal';
import { DeviceImportModal } from '@/components/devices/DeviceImportModal';
import { DeviceWizardModal } from '@/components/devices/DeviceWizardModal';
import { serverErrorText } from '@/components/devices/server-error-text';
import {
  assignDeviceToCustomer,
  deleteDevice,
  getCustomerDevices,
  getDeviceProfiles,
  getTenantDevices,
  unassignDeviceFromCustomer,
} from '@/services/tb/device';
import type { DeviceInfo } from '@/types/tb';
import { BatchProgressModal } from './BatchProgressModal';
import {
  toDeviceListFilter,
  toPageLink,
  useDeviceListUrlState,
} from './url-state';
import { useAuthority } from './use-authority';
import { useBatchRun } from './use-batch-run';

const DEVICES_QUERY_KEY = ['devices', 'list'] as const;

/** Table column key -> sortable server property (DeviceInfo fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  deviceProfileName: 'deviceProfileName',
  label: 'label',
  customerTitle: 'customerTitle',
  active: 'active',
};

const SEARCH_DEBOUNCE_MS = 400;

export default function DevicesListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useDeviceListUrlState();
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
    queryKey: ['device-profiles', 'filter', profileFilterDebounced],
    queryFn: () =>
      getDeviceProfiles({
        pageSize: 50,
        page: 0,
        textSearch: profileFilterDebounced || undefined,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
  });

  // ---- the list itself
  const devicesQuery = useQuery({
    queryKey: [
      ...DEVICES_QUERY_KEY,
      authority,
      cuCustomerId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.deviceProfileId,
      urlState.active,
    ],
    queryFn: () => {
      const pageLink = toPageLink(urlState);
      const filter = toDeviceListFilter(urlState);
      return readOnly && cuCustomerId
        ? getCustomerDevices(cuCustomerId, pageLink, filter)
        : getTenantDevices(pageLink, filter);
    },
    placeholderData: keepPreviousData,
  });
  const devices: Array<DeviceInfo> = devicesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: DEVICES_QUERY_KEY });

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedDevices = devices.filter((device) =>
    selectedRowKeys.includes(device.id.id),
  );

  const [wizardOpen, setWizardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [credentialsDevice, setCredentialsDevice] = useState<DeviceInfo | null>(
    null,
  );
  const [connectivityDeviceId, setConnectivityDeviceId] = useState<string>();
  const [assignTargets, setAssignTargets] = useState<Array<DeviceInfo>>([]);

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  const deleteOneMutation = useMutation({
    mutationFn: (deviceId: string) => deleteDevice(deviceId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.list.toastDeleted',
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

  const confirmDeleteOne = (device: DeviceInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.devices.list.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the device '{name}'?",
        },
        { name: device.name },
      ),
      content: formatMessage({
        id: 'pages.devices.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the device and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.devices.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.devices.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOneMutation.mutateAsync(device.id.id),
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedDevices.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.devices.list.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 device} other {# devices}}?',
        },
        { count: selectedDevices.length },
      ),
      content: formatMessage({
        id: 'pages.devices.list.deleteManyText',
        defaultMessage:
          'Be careful, after the confirmation all selected devices will be removed and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.devices.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.devices.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        const summary = await batch.run(
          selectedDevices,
          (device) => device.name,
          (device) => deleteDevice(device.id.id),
        );
        setSelectedRowKeys([]);
        void invalidate();
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
        } else {
          void message.success(
            formatMessage({
              id: 'pages.devices.list.toastDeleted',
              defaultMessage: 'Device deleted.',
            }),
          );
        }
      },
    });
  };

  const confirmUnassign = (targets: Array<DeviceInfo>) => {
    if (targets.length === 0) {
      return;
    }
    modal.confirm({
      title:
        targets.length === 1
          ? formatMessage(
              {
                id: 'pages.devices.list.unassignTitle',
                defaultMessage:
                  "Are you sure you want to unassign the device '{name}'?",
              },
              { name: targets[0].name },
            )
          : formatMessage(
              {
                id: 'pages.devices.list.unassignManyTitle',
                defaultMessage:
                  'Are you sure you want to unassign {count, plural, =1 {1 device} other {# devices}}?',
              },
              { count: targets.length },
            ),
      content:
        targets.length === 1
          ? formatMessage({
              id: 'pages.devices.list.unassignText',
              defaultMessage:
                'After the confirmation the device will be unassigned and will not be accessible by the customer.',
            })
          : formatMessage({
              id: 'pages.devices.list.unassignManyText',
              defaultMessage:
                'After the confirmation all selected devices will be unassigned and will not be accessible by the customer.',
            }),
      okText: formatMessage({
        id: 'pages.devices.list.actionUnassign',
        defaultMessage: 'Unassign from customer',
      }),
      cancelText: formatMessage({
        id: 'pages.devices.list.cancel',
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
            id: 'pages.devices.list.toastUnassigned',
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

  const runAssign = async (customerId: string) => {
    if (assignTargets.length === 0) {
      return;
    }
    const targets = assignTargets;
    setAssignTargets([]);
    setBatchOpen(true);
    const summary = await batch.run(
      targets,
      (device) => device.name,
      (device) => assignDeviceToCustomer(customerId, device.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage({
        id: 'pages.devices.list.toastAssigned',
        defaultMessage: 'Devices assigned to the customer.',
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
  };

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<DeviceInfo>[] = useMemo(() => {
    const cols: ProColumns<DeviceInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.devices.list.createdTime',
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
          id: 'pages.devices.list.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        render: (_, record) => (
          <Space size={4}>
            <Typography.Text strong>{record.name}</Typography.Text>
            {record.additionalInfo?.gateway ? (
              <Tag>
                {formatMessage({
                  id: 'pages.devices.list.isGateway',
                  defaultMessage: 'Is gateway',
                })}
              </Tag>
            ) : null}
          </Space>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.devices.list.profile',
          defaultMessage: 'Device profile',
        }),
        dataIndex: 'deviceProfileName',
        sorter: true,
        sortOrder: sortOrderFor('deviceProfileName'),
      },
      {
        title: formatMessage({
          id: 'pages.devices.list.label',
          defaultMessage: 'Label',
        }),
        dataIndex: 'label',
        sorter: true,
        sortOrder: sortOrderFor('label'),
        render: (_, record) => record.label || '-',
      },
      {
        title: formatMessage({
          id: 'pages.devices.list.state',
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
        title: formatMessage({
          id: 'pages.devices.list.customer',
          defaultMessage: 'Customer',
        }),
        dataIndex: 'customerTitle',
        sorter: true,
        sortOrder: sortOrderFor('customerTitle'),
        render: (_, record) =>
          record.customerTitle ? (
            <Space size={4}>
              <span>{record.customerTitle}</span>
              {record.customerIsPublic ? (
                <Tag color="blue">
                  {formatMessage({
                    id: 'pages.devices.list.public',
                    defaultMessage: 'Public',
                  })}
                </Tag>
              ) : null}
            </Space>
          ) : (
            '-'
          ),
      });
    }
    cols.push({
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) =>
        [
          <Button
            key="credentials"
            type="text"
            size="small"
            icon={<SafetyOutlined />}
            title={formatMessage({
              id: readOnly
                ? 'pages.devices.list.actionViewCredentials'
                : 'pages.devices.list.actionCredentials',
              defaultMessage: readOnly
                ? 'View credentials'
                : 'Manage credentials',
            })}
            onClick={() => setCredentialsDevice(record)}
          />,
          <Button
            key="connectivity"
            type="text"
            size="small"
            icon={<ApiOutlined />}
            title={formatMessage({
              id: 'pages.devices.list.actionConnectivity',
              defaultMessage: 'Check connectivity',
            })}
            onClick={() => setConnectivityDeviceId(record.id.id)}
          />,
          !readOnly ? (
            <Dropdown
              key="more"
              trigger={['click']}
              menu={{
                items: [
                  ...(hasCustomer(record)
                    ? [
                        {
                          key: 'unassign',
                          label: formatMessage({
                            id: 'pages.devices.list.actionUnassign',
                            defaultMessage: 'Unassign from customer',
                          }),
                          onClick: () => confirmUnassign([record]),
                        },
                      ]
                    : [
                        {
                          key: 'assign',
                          label: formatMessage({
                            id: 'pages.devices.list.actionAssign',
                            defaultMessage: 'Assign to customer',
                          }),
                          onClick: () => setAssignTargets([record]),
                        },
                      ]),
                  {
                    key: 'delete',
                    danger: true,
                    label: formatMessage({
                      id: 'pages.devices.list.actionDelete',
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

  const assignedSelected = selectedDevices.filter(hasCustomer);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input.Search
          allowClear
          className="w-64"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={formatMessage({
            id: 'pages.devices.list.search',
            defaultMessage: 'Search devices',
          })}
        />
        <Select
          allowClear
          showSearch
          className="w-56"
          filterOption={false}
          onSearch={setProfileFilterSearch}
          loading={profileOptionsQuery.isPending}
          value={urlState.deviceProfileId}
          placeholder={formatMessage({
            id: 'pages.devices.list.profilePlaceholder',
            defaultMessage: 'All device profiles',
          })}
          options={(profileOptionsQuery.data?.data ?? []).map((profile) => ({
            label: profile.name,
            value: profile.id.id,
          }))}
          onChange={(value) =>
            patch({ deviceProfileId: value ?? undefined, page: 1 })
          }
        />
        <Segmented
          value={urlState.active ?? 'any'}
          onChange={(value) =>
            patch({
              active: value === 'any' ? undefined : (value as 'true' | 'false'),
              page: 1,
            })
          }
          options={[
            {
              label: formatMessage({
                id: 'pages.devices.list.stateAny',
                defaultMessage: 'Any state',
              }),
              value: 'any',
            },
            {
              label: formatMessage({
                id: 'pages.devices.list.active',
                defaultMessage: 'Active',
              }),
              value: 'true',
            },
            {
              label: formatMessage({
                id: 'pages.devices.list.inactive',
                defaultMessage: 'Inactive',
              }),
              value: 'false',
            },
          ]}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void devicesQuery.refetch()}
        >
          {formatMessage({
            id: 'pages.devices.list.refresh',
            defaultMessage: 'Refresh',
          })}
        </Button>
        <div className="flex-1" />
        {!readOnly && (
          <Space>
            {selectedDevices.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.devices.list.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedDevices.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.devices.list.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
                <Button onClick={() => setAssignTargets(selectedDevices)}>
                  {formatMessage({
                    id: 'pages.devices.list.batchAssign',
                    defaultMessage: 'Assign to customer',
                  })}
                </Button>
                <Button
                  disabled={assignedSelected.length === 0}
                  onClick={() => confirmUnassign(assignedSelected)}
                >
                  {formatMessage({
                    id: 'pages.devices.list.batchUnassign',
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
                id: 'pages.devices.list.import',
                defaultMessage: 'Import device',
              })}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setWizardOpen(true)}
            >
              {formatMessage({
                id: 'pages.devices.list.add',
                defaultMessage: 'Add new device',
              })}
            </Button>
          </Space>
        )}
      </div>

      {devicesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.devices.list.loadFailed',
            defaultMessage: 'Failed to load devices',
          })}
          description={serverErrorText(devicesQuery.error)}
        />
      )}

      <ProTable<DeviceInfo>
        rowKey={(record) => record.id.id}
        // The page renders its own selection toolbar; silence ProTable's
        // built-in "N selected" alert bar.
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
                id: 'pages.devices.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.list.empty',
            defaultMessage: 'No devices',
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

      <DeviceWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => void invalidate()}
      />
      <DeviceImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          void invalidate();
          void message.success(
            formatMessage({
              id: 'pages.devices.list.toastImported',
              defaultMessage: 'Import finished.',
            }),
          );
        }}
      />
      <DeviceCredentialsModal
        open={!!credentialsDevice}
        device={credentialsDevice}
        readOnly={readOnly}
        onClose={() => setCredentialsDevice(null)}
      />
      <CheckConnectivityModal
        open={!!connectivityDeviceId}
        deviceId={connectivityDeviceId}
        onClose={() => setConnectivityDeviceId(undefined)}
      />
      <AssignCustomerModal
        open={assignTargets.length > 0}
        deviceCount={assignTargets.length}
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
    </div>
  );
}

function hasCustomer(device: DeviceInfo): boolean {
  return !!device.customerId && device.customerId.id !== NULL_UUID;
}

/** TB's null-customer UUID (EntityId.NULL_UUID). */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';
