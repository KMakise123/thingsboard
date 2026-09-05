/**
 * Notification recipients (notification targets) list page — M12 wave 3-A,
 * spec §4.4; ui-ngx recipient-table-config parity: createdTime/name/type/
 * description columns, row click edits, single + batch delete, default sort
 * createdTime DESC. Create/edit share the RecipientDialog (also mounted by
 * the sent/rules pages for their inline entries).
 */
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Input,
  Space,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import RecipientDialog from '@/components/notifications/recipient-dialog';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
// ui-ngx keeps a send-notification entry on every notification-center tab
// (send-notification-button.component); SA/TA-only pages need no role wrap.
import { SendNotificationButton } from '@/pages/notifications/sent/send-button';
import {
  deleteNotificationTarget,
  getNotificationTargets,
} from '@/services/tb/notification';
import type { NotificationTarget } from '@/types/tb/notification';
import { NotificationTargetType } from '@/types/tb/notification';
import { toPageLink, useRecipientsUrlState } from './url-state';

const RECIPIENTS_QUERY_KEY = ['notifications', 'recipients'] as const;

/** Table column key -> sortable server property. */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
};

const SEARCH_DEBOUNCE_MS = 400;

const TARGET_TYPE_NAME_KEYS: Record<NotificationTargetType, string> = {
  [NotificationTargetType.PLATFORM_USERS]:
    'pages.notifications.recipients.targetType.platformUsers',
  [NotificationTargetType.SLACK]:
    'pages.notifications.recipients.targetType.slack',
  [NotificationTargetType.MICROSOFT_TEAMS]:
    'pages.notifications.recipients.targetType.microsoftTeams',
};

const TARGET_TYPE_TAG_COLORS: Record<NotificationTargetType, string> = {
  [NotificationTargetType.PLATFORM_USERS]: 'blue',
  [NotificationTargetType.SLACK]: 'purple',
  [NotificationTargetType.MICROSOFT_TEAMS]: 'geekblue',
};

export default function RecipientsPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useRecipientsUrlState();

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
  const targetsQuery = useQuery({
    queryKey: [
      ...RECIPIENTS_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getNotificationTargets(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const targets: Array<NotificationTarget> = targetsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: RECIPIENTS_QUERY_KEY });

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedTargets = targets.filter((target) =>
    selectedRowKeys.includes(target.id.id),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NotificationTarget | null>(null);

  const openEditor = (target: NotificationTarget | null) => {
    setEditTarget(target);
    setDialogOpen(true);
  };

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  const typeName = (type: NotificationTargetType): string =>
    formatMessage({
      id: TARGET_TYPE_NAME_KEYS[type],
      defaultMessage: type,
    });

  // ---- delete flows (single + batch)
  const runBatchDelete = async (items: Array<NotificationTarget>) => {
    setBatchOpen(true);
    const summary = await batch.run(
      items,
      (item) => item.name || item.id.id,
      (item) => deleteNotificationTarget(item.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage(
        {
          id: 'pages.notifications.recipients.batchResult',
          defaultMessage: '{ok} succeeded, {fail} failed.',
        },
        { ok: summary.ok, fail: summary.failed },
      ),
    );
  };

  const confirmDeleteOne = (target: NotificationTarget) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.notifications.recipients.deleteOneTitle',
          defaultMessage: "Delete the recipient group '{name}'?",
        },
        { name: target.name || target.id.id },
      ),
      content: formatMessage({
        id: 'pages.notifications.recipients.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the recipient group will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.notifications.recipients.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.notifications.recipients.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        try {
          await deleteNotificationTarget(target.id.id);
          setSelectedRowKeys((keys) =>
            keys.filter((key) => key !== target.id.id),
          );
          void invalidate();
          void message.success(
            formatMessage({
              id: 'pages.notifications.recipients.toastDeleted',
              defaultMessage: 'Recipient group deleted.',
            }),
          );
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      },
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedTargets.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.notifications.recipients.deleteManyTitle',
          defaultMessage:
            'Delete {count, plural, =1 {1 recipient group} other {# recipient groups}}?',
        },
        { count: selectedTargets.length },
      ),
      content: formatMessage({
        id: 'pages.notifications.recipients.deleteManyText',
        defaultMessage: 'This cannot be undone.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.notifications.recipients.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.notifications.recipients.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => runBatchDelete(selectedTargets),
    });
  };

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design
  const columns: ProColumns<NotificationTarget>[] = useMemo(() => {
    const cols: ProColumns<NotificationTarget>[] = [
      {
        title: formatMessage({
          id: 'pages.notifications.recipients.createdTime',
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
          id: 'pages.notifications.recipients.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
      },
      {
        title: formatMessage({
          id: 'pages.notifications.recipients.type',
          defaultMessage: 'Type',
        }),
        dataIndex: 'configuration.type',
        width: 170,
        render: (_, record) => (
          <Tag color={TARGET_TYPE_TAG_COLORS[record.configuration.type]}>
            {typeName(record.configuration.type)}
          </Tag>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.notifications.recipients.description',
          defaultMessage: 'Description',
        }),
        dataIndex: 'configuration.description',
        ellipsis: true,
        render: (_, record) => record.configuration.description || '-',
      },
    ];
    cols.push({
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="delete"
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          title={formatMessage({
            id: 'pages.notifications.recipients.delete',
            defaultMessage: 'Delete',
          })}
          onClick={(event) => {
            event.stopPropagation();
            confirmDeleteOne(record);
          }}
        />,
      ],
    });
    return cols;
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  const onTableChange: TableProps<NotificationTarget>['onChange'] = (
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
      title={formatMessage({
        id: 'menu.notifications.recipients',
        defaultMessage: 'Recipients',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.notifications.recipients.search',
              defaultMessage: 'Search recipients',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void targetsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.notifications.recipients.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            <SendNotificationButton />
            {selectedTargets.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.notifications.recipients.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedTargets.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.notifications.recipients.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditor(null)}
            >
              {formatMessage({
                id: 'pages.notifications.recipients.add',
                defaultMessage: 'Add recipient group',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {targetsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.notifications.recipients.loadFailed',
            defaultMessage: 'Failed to load recipient groups',
          })}
          description={serverErrorText(targetsQuery.error)}
        />
      )}

      <ProTable<NotificationTarget>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={targets}
        loading={targetsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({
          onClick: () => openEditor(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: targetsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.notifications.recipients.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.notifications.recipients.empty',
            defaultMessage: 'No recipient groups',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <RecipientDialog
        open={dialogOpen}
        target={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void invalidate();
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
