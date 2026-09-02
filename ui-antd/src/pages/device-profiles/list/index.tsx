/**
 * Device-profiles list page (spec 3.8; ui-ngx device-profiles-table-config
 * parity). Asset-list page pattern: ProTable dataSource fed by useQuery,
 * URL-carried page/sort/search, mutations invalidate via queryClient.
 *
 * Row actions follow ui-ngx: export + set-default (non-default only,
 * confirmed). isDefault protection mirrors ui-ngx deleteEnabled /
 * entitySelectionEnabled = !default: the default row cannot be deleted nor
 * selected for batch delete (checkbox disabled with a hint). The name links
 * to the detail page; edit opens the identity dialog (create + edit share
 * it); import is a registered v1 leftover (ui-ngx has it, spec does not ask
 * for it).
 */
import {
  DeleteOutlined,
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
  Space,
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { exportDeviceProfile } from '@/components/profiles/export-profile';
import {
  deleteDeviceProfile,
  getDeviceProfileList,
  setDefaultDeviceProfile,
} from '@/services/tb/device-profile';
import type { DeviceProfile } from '@/types/tb/device-profile';
import { ProfileDialog } from './ProfileDialog';
import { toPageLink, useDeviceProfileListUrlState } from './url-state';

const DEVICE_PROFILES_QUERY_KEY = ['device-profiles', 'list'] as const;

/** Table column key -> sortable server property (backend sort whitelist). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  type: 'type',
  transportType: 'transportType',
  description: 'description',
};

const SEARCH_DEBOUNCE_MS = 400;

export default function DeviceProfilesListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useDeviceProfileListUrlState();

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

  const profilesQuery = useQuery({
    queryKey: [
      ...DEVICE_PROFILES_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getDeviceProfileList(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const profiles: Array<DeviceProfile> = profilesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: DEVICE_PROFILES_QUERY_KEY });

  // ---- selection (default rows are not selectable — ui-ngx parity)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedProfiles = profiles.filter((profile) =>
    selectedRowKeys.includes(profile.id.id),
  );

  // ---- dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DeviceProfile | null>(null);

  const setDefaultMutation = useMutation({
    mutationFn: (profileId: string) => setDefaultDeviceProfile(profileId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.device-profiles.list.toastSetDefault',
          defaultMessage: 'Default device profile updated.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmSetDefault = (profile: DeviceProfile) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.device-profiles.list.setDefaultTitle',
          defaultMessage:
            "Are you sure you want to make the device profile '{name}' the default?",
        },
        { name: profile.name },
      ),
      content: formatMessage({
        id: 'pages.device-profiles.list.setDefaultText',
        defaultMessage:
          'After the confirmation the profile will be marked as default and will be used for new devices with no profile specified.',
      }),
      okText: formatMessage({
        id: 'pages.device-profiles.list.actionYes',
        defaultMessage: 'Yes',
      }),
      cancelText: formatMessage({
        id: 'pages.device-profiles.list.actionNo',
        defaultMessage: 'No',
      }),
      onOk: () => setDefaultMutation.mutateAsync(profile.id.id),
    });
  };

  const confirmDelete = (targets: Array<DeviceProfile>) => {
    if (targets.length === 0) {
      return;
    }
    const one = targets.length === 1;
    modal.confirm({
      title: one
        ? formatMessage(
            {
              id: 'pages.device-profiles.list.deleteTitle',
              defaultMessage:
                "Are you sure you want to delete the device profile '{name}'?",
            },
            { name: targets[0].name },
          )
        : formatMessage(
            {
              id: 'pages.device-profiles.list.deleteManyTitle',
              defaultMessage:
                'Are you sure you want to delete {count, plural, =1 {1 device profile} other {# device profiles}}?',
            },
            { count: targets.length },
          ),
      content: formatMessage({
        id: 'pages.device-profiles.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the device profile and all related data, including the related OTA updates, will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.device-profiles.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.device-profiles.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        let failed = 0;
        for (const profile of targets) {
          try {
            await deleteDeviceProfile(profile.id.id);
          } catch {
            failed += 1;
          }
        }
        setSelectedRowKeys([]);
        void invalidate();
        if (failed > 0) {
          void message.error(
            formatMessage(
              {
                id: 'pages.device-profiles.list.deleteFailed',
                defaultMessage:
                  'Deleted with {fail} failure(s). The default profile cannot be deleted.',
              },
              { fail: failed },
            ),
          );
        } else {
          void message.success(
            formatMessage({
              id: 'pages.device-profiles.list.toastDeleted',
              defaultMessage: 'Device profile deleted.',
            }),
          );
        }
      },
    });
  };

  const exportMutation = useMutation({
    mutationFn: (profileId: string) => exportDeviceProfile(profileId),
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only these deps change the rendered columns
  const columns: ProColumns<DeviceProfile>[] = useMemo(() => {
    const cols: ProColumns<DeviceProfile>[] = [
      {
        title: formatMessage({
          id: 'pages.device-profiles.list.createdTime',
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
          id: 'pages.device-profiles.list.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        render: (_, record) => (
          <Typography.Link
            onClick={() => history.push(`/deviceProfiles/${record.id.id}`)}
          >
            {record.name}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.device-profiles.list.type',
          defaultMessage: 'Profile type',
        }),
        dataIndex: 'type',
        sorter: true,
        sortOrder: sortOrderFor('type'),
        render: (_, record) =>
          record.type === 'DEFAULT'
            ? formatMessage({
                id: 'pages.device-profiles.typeDefault',
                defaultMessage: 'Default',
              })
            : record.type,
      },
      {
        title: formatMessage({
          id: 'pages.device-profiles.list.transportType',
          defaultMessage: 'Transport type',
        }),
        dataIndex: 'transportType',
        sorter: true,
        sortOrder: sortOrderFor('transportType'),
        render: (_, record) =>
          record.transportType === 'DEFAULT'
            ? formatMessage({
                id: 'pages.device-profiles.transport.DEFAULT',
                defaultMessage: 'Default',
              })
            : record.transportType,
      },
      {
        title: formatMessage({
          id: 'pages.device-profiles.list.description',
          defaultMessage: 'Description',
        }),
        dataIndex: 'description',
        sorter: true,
        sortOrder: sortOrderFor('description'),
        render: (_, record) => record.description || '-',
      },
      {
        title: formatMessage({
          id: 'pages.device-profiles.list.default',
          defaultMessage: 'Default',
        }),
        dataIndex: 'default',
        width: 80,
        align: 'center',
        render: (_, record) => <Checkbox checked={record.default} disabled />,
      },
      {
        valueType: 'option',
        width: 100,
        fixed: 'right',
        render: (_, record) => [
          <Dropdown
            key="more"
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'export',
                  label: formatMessage({
                    id: 'pages.device-profiles.list.actionExport',
                    defaultMessage: 'Export device profile',
                  }),
                  onClick: () => exportMutation.mutate(record.id.id),
                },
                ...(record.default
                  ? []
                  : [
                      {
                        key: 'set-default',
                        label: formatMessage({
                          id: 'pages.device-profiles.list.actionSetDefault',
                          defaultMessage: 'Set device profile as default',
                        }),
                        onClick: () => confirmSetDefault(record),
                      },
                    ]),
                {
                  key: 'edit',
                  label: formatMessage({
                    id: 'pages.device-profiles.list.actionEdit',
                    defaultMessage: 'Edit',
                  }),
                  onClick: () => {
                    setEditTarget(record);
                    setDialogOpen(true);
                  },
                },
                record.default
                  ? {
                      // ui-ngx deleteEnabled = !default: the entry stays
                      // visible but disabled, with the protection hint.
                      key: 'delete-disabled',
                      disabled: true,
                      label: formatMessage({
                        id: 'pages.device-profiles.list.actionDelete',
                        defaultMessage: 'Delete',
                      }),
                    }
                  : {
                      key: 'delete',
                      danger: true,
                      label: formatMessage({
                        id: 'pages.device-profiles.list.actionDelete',
                        defaultMessage: 'Delete',
                      }),
                      onClick: () => confirmDelete([record]),
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

  const onTableChange: TableProps<DeviceProfile>['onChange'] = (
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
    <PageContainer
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.device-profiles.list.search',
              defaultMessage: 'Search device profiles',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void profilesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.device-profiles.list.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {selectedProfiles.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.device-profiles.list.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedProfiles.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => confirmDelete(selectedProfiles)}
                >
                  {formatMessage({
                    id: 'pages.device-profiles.list.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditTarget(null);
                setDialogOpen(true);
              }}
            >
              {formatMessage({
                id: 'pages.device-profiles.list.add',
                defaultMessage: 'Add new device profile',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {profilesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.device-profiles.list.loadFailed',
            defaultMessage: 'Failed to load device profiles',
          })}
          description={serverErrorText(profilesQuery.error)}
        />
      )}
      <ProTable<DeviceProfile>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={profiles}
        loading={profilesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: profilesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.device-profiles.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.device-profiles.list.empty',
            defaultMessage: 'No device profiles',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          getCheckboxProps: (record) => ({
            disabled: record.default,
            // 禁选提示: the default profile cannot join a delete batch.
            title: record.default
              ? formatMessage({
                  id: 'pages.device-profiles.list.defaultProtected',
                  defaultMessage:
                    'The default device profile cannot be deleted or selected.',
                })
              : undefined,
          }),
        }}
      />
      <ProfileDialog
        open={dialogOpen}
        profile={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void invalidate();
        }}
      />
    </PageContainer>
  );
}
