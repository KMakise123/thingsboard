/**
 * Tenant-profiles list page (spec 3.7; SA only per routes/access).
 *
 * ui-ngx tenant-profiles-table parity: columns createdTime / name /
 * description / default(checkbox); row actions export (JSON download) +
 * set-default (non-default rows only, confirm, POST .../default); delete is
 * refused for the default profile both on single rows and in the selection
 * (deleteEnabled / entitySelectionEnabled guards — the default profile is
 * what new tenants fall back to). The name links into the detail page.
 */
import {
  DeleteOutlined,
  DownloadOutlined,
  FlagOutlined,
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
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
import {
  deleteTenantProfile,
  getTenantProfileById,
  getTenantProfiles,
  setDefaultTenantProfile,
} from '@/services/tb/tenant-profile';
import type { TenantProfile } from '@/types/tb/tenant';
import { toPageLink, useTenantProfilesListUrlState } from './url-state';

const PROFILES_QUERY_KEY = ['tenant-profiles', 'list'] as const;

/** Table column key -> sortable server property (TenantProfile fields). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  description: 'description',
  isDefault: 'isDefault',
};

const SEARCH_DEBOUNCE_MS = 400;

export default function TenantProfilesListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useTenantProfilesListUrlState();

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
  const profilesQuery = useQuery({
    queryKey: [
      ...PROFILES_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getTenantProfiles(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const profiles: Array<TenantProfile> = profilesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['tenant-profiles'] });

  // ---- selection & batch (default rows are unselectable — ui-ngx
  // entitySelectionEnabled guard)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedProfiles = profiles.filter((profile) =>
    selectedRowKeys.includes(profile.id.id),
  );

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) => deleteTenantProfile(profileId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.tenantProfiles.list.toastDeleted',
          defaultMessage: 'Tenant profile deleted.',
        }),
      );
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (profileId: string) => setDefaultTenantProfile(profileId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.tenantProfiles.list.toastDefaultSet',
          defaultMessage: 'Default tenant profile updated.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = (profile: TenantProfile) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.tenantProfiles.list.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the tenant profile '{name}'?",
        },
        { name: profile.name },
      ),
      content: formatMessage({
        id: 'pages.tenantProfiles.list.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the tenant profile and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.tenantProfiles.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(profile.id.id),
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedProfiles.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.tenantProfiles.list.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 tenant profile} other {# tenant profiles}}?',
        },
        { count: selectedProfiles.length },
      ),
      content: formatMessage({
        id: 'pages.tenantProfiles.list.deleteManyText',
        defaultMessage:
          'Be careful, after the confirmation all selected tenant profiles will be removed and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.tenantProfiles.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        setBatchOpen(true);
        const summary = await batch.run(
          selectedProfiles,
          (profile) => profile.name,
          (profile) => deleteTenantProfile(profile.id.id),
        );
        setSelectedRowKeys([]);
        void invalidate();
        if (summary.failed > 0) {
          void message.warning(
            formatMessage(
              {
                id: 'pages.tenantProfiles.list.batchResult',
                defaultMessage: '{ok} succeeded, {fail} failed.',
              },
              { ok: summary.ok, fail: summary.failed },
            ),
          );
        } else {
          void message.success(
            formatMessage({
              id: 'pages.tenantProfiles.list.toastDeleted',
              defaultMessage: 'Tenant profile deleted.',
            }),
          );
        }
      },
    });
  };

  const confirmSetDefault = (profile: TenantProfile) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.tenantProfiles.list.setDefaultTitle',
          defaultMessage:
            "Are you sure you want to make the tenant profile '{name}' default?",
        },
        { name: profile.name },
      ),
      content: formatMessage({
        id: 'pages.tenantProfiles.list.setDefaultText',
        defaultMessage:
          'After the confirmation the tenant profile will be marked as default and used for new tenants without an explicit profile.',
      }),
      okText: formatMessage({
        id: 'pages.tenantProfiles.list.actionSetDefault',
        defaultMessage: 'Make default',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => setDefaultMutation.mutateAsync(profile.id.id),
    });
  };

  // ui-ngx export: GET the full profile, strip id/createdTime/tenantId and
  // force default=false, download as <name>.json.
  const exportProfile = async (profile: TenantProfile) => {
    try {
      const full = await getTenantProfileById(profile.id.id);
      const exported = {
        ...full,
        default: false,
        id: undefined,
        createdTime: undefined,
        tenantId: undefined,
      };
      const blob = new Blob([JSON.stringify(exported, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${full.name}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design; only sort state changes the rendered columns
  const columns: ProColumns<TenantProfile>[] = useMemo(() => {
    const sortOrderFor = (
      property: string,
    ): 'ascend' | 'descend' | undefined => {
      if (urlState.sortProperty !== property) {
        return undefined;
      }
      return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
    };
    return [
      {
        title: formatMessage({
          id: 'pages.tenantProfiles.list.createdTime',
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
          id: 'pages.tenantProfiles.list.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        render: (_, record) => (
          // Entry point to the detail page (ui-ngx open-details action).
          <Typography.Link
            onClick={() => history.push(`/tenantProfiles/${record.id.id}`)}
          >
            {record.name}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.tenantProfiles.list.description',
          defaultMessage: 'Description',
        }),
        dataIndex: 'description',
        sorter: true,
        sortOrder: sortOrderFor('description'),
        render: (_, record) => record.description || '-',
      },
      {
        title: formatMessage({
          id: 'pages.tenantProfiles.list.default',
          defaultMessage: 'Default',
        }),
        dataIndex: 'isDefault',
        width: 90,
        align: 'center',
        sorter: true,
        sortOrder: sortOrderFor('isDefault'),
        render: (_, record) => <Checkbox checked={!!record.default} disabled />,
      },
      {
        valueType: 'option',
        width: 100,
        fixed: 'right',
        render: (_, record) => [
          <Button
            key="export"
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            title={formatMessage({
              id: 'pages.tenantProfiles.list.actionExport',
              defaultMessage: 'Export',
            })}
            onClick={() => void exportProfile(record)}
          />,
          <Dropdown
            key="more"
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'set-default',
                  icon: <FlagOutlined />,
                  disabled: !!record.default,
                  label: formatMessage({
                    id: 'pages.tenantProfiles.list.actionSetDefault',
                    defaultMessage: 'Make default',
                  }),
                  onClick: () => confirmSetDefault(record),
                },
                {
                  key: 'delete',
                  danger: true,
                  icon: <DeleteOutlined />,
                  disabled: !!record.default,
                  label: formatMessage({
                    id: 'pages.tenantProfiles.list.actionDelete',
                    defaultMessage: 'Delete',
                  }),
                  onClick: () => confirmDelete(record),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>,
        ],
      },
    ];
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  const onTableChange: TableProps<TenantProfile>['onChange'] = (
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
              id: 'pages.tenantProfiles.list.search',
              defaultMessage: 'Search tenant profiles',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void profilesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.tenantProfiles.list.refresh',
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
                      id: 'pages.tenantProfiles.list.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedProfiles.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.tenantProfiles.list.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => history.push('/tenantProfiles/create')}
            >
              {formatMessage({
                id: 'pages.tenantProfiles.list.add',
                defaultMessage: 'Add tenant profile',
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
            id: 'pages.tenantProfiles.list.loadFailed',
            defaultMessage: 'Failed to load tenant profiles',
          })}
          description={serverErrorText(profilesQuery.error)}
        />
      )}

      <ProTable<TenantProfile>
        rowKey={(record) => record.id.id}
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
                id: 'pages.tenantProfiles.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.tenantProfiles.list.empty',
            defaultMessage: 'No tenant profiles',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          getCheckboxProps: (record) => ({ disabled: !!record.default }),
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
    </PageContainer>
  );
}
