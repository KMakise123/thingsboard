/**
 * Notification inbox (M12 wave-3A, spec §4.1; ui-ngx inbox-table-config
 * parity): read-only table (createdTime/type/subject/text), unread/all
 * toggle (default unread) that resets the filters, detail dialog marking
 * read on close, per-row mark-read, mark-all-as-read and single/batch
 * delete with visible batch progress. The last row of a page (beyond page
 * 1) disappearing through read/delete steps back one page (ui-ngx parity).
 * subject/text arrive as template HTML and render sanitized (DOMPurify).
 */
import {
  CheckOutlined,
  DeleteOutlined,
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
  Modal,
  Segmented,
  Space,
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { NotificationItem } from '@/components/notifications/notification-item';
import { sanitizeNotificationHtml } from '@/components/notifications/notification-sanitize';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useAuthority } from '@/components/shared/use-authority';
import { useBatchRun } from '@/components/shared/use-batch-run';
import { SendNotificationButton } from '@/pages/notifications/sent/send-button';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/tb/notification';
import {
  NotificationStatus,
  type TbNotification,
} from '@/types/tb/notification';
import { toPageLink, useInboxUrlState } from './url-state';

const INBOX_QUERY_KEY = ['notifications', 'inbox'] as const;

/** Table column key -> sortable server property (createdTime only, ui-ngx). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
};

const SEARCH_DEBOUNCE_MS = 400;

export default function InboxPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useInboxUrlState();
  // ui-ngx shows the send button on every notification-center tab except
  // for CUSTOMER_USER (inbox-table parity; routing.module.ts:70-72).
  const { authority } = useAuthority();

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
  const notificationsQuery = useQuery({
    queryKey: [
      ...INBOX_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.unreadOnly,
    ],
    queryFn: () =>
      getNotifications(toPageLink(urlState), {
        unreadOnly: urlState.unreadOnly,
      }),
    placeholderData: keepPreviousData,
  });
  const notifications: Array<TbNotification> =
    notificationsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY });

  /** Beyond page 1, an emptied page steps back one page (ui-ngx parity). */
  const stepBackIfEmptied = (removedCount: number) => {
    if (notifications.length - removedCount === 0 && urlState.page > 1) {
      patch({ page: urlState.page - 1 });
    }
  };

  const isUnread = (notification: TbNotification): boolean =>
    notification.status !== NotificationStatus.READ;

  const typeLabel = (type: TbNotification['type']): string =>
    formatMessage({
      id: `pages.notifications.inbox.type.${type ?? 'GENERAL'}`,
      defaultMessage: type ?? 'GENERAL',
    });

  // ---- selection & batch
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedNotifications = notifications.filter((notification) =>
    selectedRowKeys.includes(notification.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  // ---- detail dialog (ui-ngx: closing it marks an unread entry read)
  const [detail, setDetail] = useState<TbNotification | null>(null);

  const resetFilters = () => {
    patch({
      page: 1,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
    });
    setSearchInput('');
  };

  const markRead = async (notification: TbNotification) => {
    try {
      await markNotificationAsRead(notification.id.id);
      if (urlState.unreadOnly) {
        stepBackIfEmptied(1);
      }
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      // ui-ngx: in unread-only mode the emptied view resets its filters.
      if (urlState.unreadOnly) {
        resetFilters();
      }
      void invalidate();
      void message.success(
        formatMessage({
          id: 'pages.notifications.inbox.toastMarkedRead',
          defaultMessage: 'Marked as read.',
        }),
      );
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const deleteWithFlow = async (targets: Array<TbNotification>) => {
    if (targets.length === 1) {
      try {
        await deleteNotification(targets[0].id.id);
        stepBackIfEmptied(1);
        setSelectedRowKeys([]);
        void invalidate();
        void message.success(
          formatMessage({
            id: 'pages.notifications.inbox.toastDeleted',
            defaultMessage: 'Notification deleted.',
          }),
        );
      } catch (error) {
        void message.error(serverErrorText(error));
      }
      return;
    }
    setBatchOpen(true);
    const summary = await batch.run(
      targets,
      (notification) => notification.id.id,
      (notification) => deleteNotification(notification.id.id),
    );
    stepBackIfEmptied(targets.length);
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage(
        {
          id: 'pages.notifications.inbox.batchResult',
          defaultMessage: '{ok} succeeded, {fail} failed.',
        },
        { ok: summary.ok, fail: summary.failed },
      ),
    );
  };

  const confirmDeleteOne = (notification: TbNotification) => {
    modal.confirm({
      title: formatMessage({
        id: 'pages.notifications.inbox.deleteOneTitle',
        defaultMessage: 'Delete this notification?',
      }),
      content: formatMessage({
        id: 'pages.notifications.inbox.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the notification will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.notifications.inbox.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.notifications.inbox.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteWithFlow([notification]),
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedNotifications.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.notifications.inbox.deleteManyTitle',
          defaultMessage:
            'Delete {count, plural, =1 {1 notification} other {# notifications}}?',
        },
        { count: selectedNotifications.length },
      ),
      content: formatMessage({
        id: 'pages.notifications.inbox.deleteManyText',
        defaultMessage: 'This cannot be undone.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.notifications.inbox.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.notifications.inbox.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteWithFlow(selectedNotifications),
    });
  };

  const closeDetail = () => {
    if (detail && isUnread(detail)) {
      void markRead(detail);
    }
    setDetail(null);
  };

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  // Columns re-create per render on purpose: the row-action handlers close
  // over urlState/notifications (ADR 0007 §5 — a memoized columns array with
  // narrow deps would freeze stale page/list reads into the row buttons).
  const columns: ProColumns<TbNotification>[] = [
    {
      title: formatMessage({
        id: 'pages.notifications.inbox.createdTime',
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
        id: 'pages.notifications.inbox.type',
        defaultMessage: 'Type',
      }),
      dataIndex: 'type',
      width: 140,
      render: (_, record) => typeLabel(record.type),
    },
    {
      title: formatMessage({
        id: 'pages.notifications.inbox.subject',
        defaultMessage: 'Subject',
      }),
      dataIndex: 'subject',
      width: 220,
      render: (_, record) =>
        record.subject ? (
          // Template subject HTML — sanitized (DOMPurify allowlist +
          // forbidden-tag sweep); never trusted raw.
          <div
            className="truncate"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized template HTML, DOMPurify allowlist + forbidden-tag sweep
            dangerouslySetInnerHTML={{
              __html: sanitizeNotificationHtml(record.subject),
            }}
          />
        ) : (
          '-'
        ),
    },
    {
      title: formatMessage({
        id: 'pages.notifications.inbox.text',
        defaultMessage: 'Text',
      }),
      dataIndex: 'text',
      render: (_, record) =>
        record.text ? (
          // Template body HTML — same sanitizer as the subject column.
          <div
            className="truncate"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized template HTML, DOMPurify allowlist + forbidden-tag sweep
            dangerouslySetInnerHTML={{
              __html: sanitizeNotificationHtml(record.text),
            }}
          />
        ) : (
          '-'
        ),
    },
    {
      title: formatMessage({
        id: 'pages.notifications.inbox.actions',
        defaultMessage: 'Actions',
      }),
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} onClick={(event) => event.stopPropagation()}>
          {isUnread(record) && (
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              data-testid="inbox-mark-read"
              title={formatMessage({
                id: 'pages.notifications.inbox.markAsRead',
                defaultMessage: 'Mark as read',
              })}
              onClick={() => void markRead(record)}
            />
          )}
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            data-testid="inbox-delete"
            title={formatMessage({
              id: 'pages.notifications.inbox.delete',
              defaultMessage: 'Delete',
            })}
            onClick={() => confirmDeleteOne(record)}
          />
        </Space>
      ),
    },
  ];

  const onTableChange: TableProps<TbNotification>['onChange'] = (
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
        id: 'menu.notifications.inbox',
        defaultMessage: 'Inbox',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.notifications.inbox.search',
              defaultMessage: 'Search notifications',
            })}
          />
          <Segmented
            data-testid="inbox-unread-toggle"
            value={urlState.unreadOnly ? 'unread' : 'all'}
            options={[
              {
                label: formatMessage({
                  id: 'pages.notifications.inbox.unreadOnly',
                  defaultMessage: 'Unread',
                }),
                value: 'unread',
              },
              {
                label: formatMessage({
                  id: 'pages.notifications.inbox.all',
                  defaultMessage: 'All',
                }),
                value: 'all',
              },
            ]}
            onChange={(value) => {
              // ui-ngx: switching the toggle resets sort and filters.
              patch({
                unreadOnly: value === 'unread',
                page: 1,
                sortProperty: 'createdTime',
                sortDirection: 'DESC',
                textSearch: '',
              });
              setSearchInput('');
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void notificationsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.notifications.inbox.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {authority === 'SYS_ADMIN' || authority === 'TENANT_ADMIN' ? (
              <SendNotificationButton />
            ) : null}
            {selectedNotifications.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.notifications.inbox.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedNotifications.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.notifications.inbox.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              ghost
              data-testid="inbox-mark-all"
              onClick={() => void markAllRead()}
            >
              {formatMessage({
                id: 'pages.notifications.inbox.markAllAsRead',
                defaultMessage: 'Mark all as read',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {notificationsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.notifications.inbox.loadFailed',
            defaultMessage: 'Failed to load notifications',
          })}
          description={serverErrorText(notificationsQuery.error)}
        />
      )}

      <ProTable<TbNotification>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={notifications}
        loading={notificationsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({ onClick: () => setDetail(record) })}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: notificationsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.notifications.inbox.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.notifications.inbox.empty',
            defaultMessage: 'No notifications',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <Modal
        open={detail !== null}
        title={formatMessage({
          id: 'pages.notifications.inbox.detailTitle',
          defaultMessage: 'Notification details',
        })}
        footer={null}
        onCancel={closeDetail}
        width={520}
      >
        {detail && (
          <NotificationItem
            notification={detail}
            onMarkRead={(target) => void markRead(target)}
          />
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
