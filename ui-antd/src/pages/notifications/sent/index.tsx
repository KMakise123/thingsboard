/**
 * Sent-notification requests list (M12 wave 3-B, spec §4.3) — ui-ngx
 * sent-table-config parity: createdTime/status/deliveryMethods/templateName
 * columns, no search box, default createdTime DESC, three-state status pill
 * with a red failure count that opens the per-recipient errors dialog, row
 * "notify again" (disabled while SCHEDULED), single + batch delete, and the
 * shared send wizard in the toolbar.
 */
import {
  DeleteOutlined,
  RedoOutlined,
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
  Space,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
import {
  deleteNotificationRequest,
  getNotificationRequests,
} from '@/services/tb/notification';
import {
  NotificationDeliveryMethod,
  type NotificationRequestInfo,
  NotificationRequestStatus,
} from '@/types/tb/notification';
import { SentErrorDialog } from './error-dialog';
import { SendNotificationButton } from './send-button';
import {
  SENT_REQUESTS_QUERY_KEY,
  toSentPageLink,
  useSentUrlState,
} from './url-state';
import { SendNotificationWizard } from './wizard';

const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
};

const STATUS_TAG_COLORS: Record<NotificationRequestStatus, string> = {
  [NotificationRequestStatus.SENT]: 'green',
  [NotificationRequestStatus.PROCESSING]: 'gold',
  [NotificationRequestStatus.SCHEDULED]: 'blue',
};

const STATUS_NAME_KEYS: Record<NotificationRequestStatus, string> = {
  [NotificationRequestStatus.SENT]: 'pages.notifications.sent.status.sent',
  [NotificationRequestStatus.PROCESSING]:
    'pages.notifications.sent.status.processing',
  [NotificationRequestStatus.SCHEDULED]:
    'pages.notifications.sent.status.scheduled',
};

const METHOD_NAME_KEYS: Record<NotificationDeliveryMethod, string> = {
  [NotificationDeliveryMethod.WEB]:
    'pages.notifications.sent.deliveryMethod.web',
  [NotificationDeliveryMethod.EMAIL]:
    'pages.notifications.sent.deliveryMethod.email',
  [NotificationDeliveryMethod.SMS]:
    'pages.notifications.sent.deliveryMethod.sms',
  [NotificationDeliveryMethod.SLACK]:
    'pages.notifications.sent.deliveryMethod.slack',
  [NotificationDeliveryMethod.MICROSOFT_TEAMS]:
    'pages.notifications.sent.deliveryMethod.microsoftTeams',
  [NotificationDeliveryMethod.MOBILE_APP]:
    'pages.notifications.sent.deliveryMethod.mobileApp',
};

export default function SentPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useSentUrlState();

  const requestsQuery = useQuery({
    queryKey: [
      ...SENT_REQUESTS_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
    ],
    queryFn: () => getNotificationRequests(toSentPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const requests: Array<NotificationRequestInfo> =
    requestsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SENT_REQUESTS_QUERY_KEY });

  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedRequests = requests.filter((request) =>
    selectedRowKeys.includes(request.id.id),
  );
  const [errorRequest, setErrorRequest] =
    useState<NotificationRequestInfo | null>(null);

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  // ---- delete flows (single + batch)
  const runBatchDelete = async (items: Array<NotificationRequestInfo>) => {
    setBatchOpen(true);
    const summary = await batch.run(
      items,
      (item) => item.templateName || item.id.id,
      (item) => deleteNotificationRequest(item.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage(
        {
          id: 'pages.notifications.sent.batchResult',
          defaultMessage: '{ok} succeeded, {fail} failed.',
        },
        { ok: summary.ok, fail: summary.failed },
      ),
    );
  };

  const confirmDeleteOne = (request: NotificationRequestInfo) => {
    modal.confirm({
      title: label(
        'pages.notifications.sent.deleteOneTitle',
        'Are you sure you want to delete the notification request?',
      ),
      content: label(
        'pages.notifications.sent.deleteOneText',
        'Be careful, after the confirmation the request will become unrecoverable.',
      ),
      okButtonProps: { danger: true },
      okText: label('pages.notifications.sent.delete', 'Delete'),
      cancelText: label('pages.notifications.sent.cancel', 'Cancel'),
      onOk: async () => {
        try {
          await deleteNotificationRequest(request.id.id);
          setSelectedRowKeys((keys) =>
            keys.filter((key) => key !== request.id.id),
          );
          void invalidate();
          void message.success(
            label(
              'pages.notifications.sent.toastDeleted',
              'Notification request deleted.',
            ),
          );
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      },
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedRequests.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.notifications.sent.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 request} other {# requests}}?',
        },
        { count: selectedRequests.length },
      ),
      content: label(
        'pages.notifications.sent.deleteManyText',
        'Be careful, after the confirmation the requests will become unrecoverable.',
      ),
      okButtonProps: { danger: true },
      okText: label('pages.notifications.sent.delete', 'Delete'),
      cancelText: label('pages.notifications.sent.cancel', 'Cancel'),
      onOk: () => runBatchDelete(selectedRequests),
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
  const columns: ProColumns<NotificationRequestInfo>[] = useMemo(() => {
    const cols: ProColumns<NotificationRequestInfo>[] = [
      {
        title: label('pages.notifications.sent.createdTime', 'Created time'),
        dataIndex: 'createdTime',
        width: 170,
        sorter: true,
        sortOrder: sortOrderFor('createdTime'),
        render: (_, record) =>
          dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: label('pages.notifications.sent.status', 'Status'),
        dataIndex: 'status',
        width: 240,
        render: (_, record) => (
          <Space size={6} wrap>
            {record.status && (
              <Tag color={STATUS_TAG_COLORS[record.status]}>
                {label(STATUS_NAME_KEYS[record.status], record.status)}
              </Tag>
            )}
            {(record.stats?.totalErrors ?? 0) > 0 && (
              <Button
                type="primary"
                size="small"
                danger
                onClick={(event) => {
                  event.stopPropagation();
                  setErrorRequest(record);
                }}
                data-testid={`sent-errors-${record.id.id}`}
              >
                {formatMessage(
                  {
                    id: 'pages.notifications.sent.fails',
                    defaultMessage:
                      '{count, plural, =1 {1 failure} other {# failures}} >',
                  },
                  { count: record.stats?.totalErrors ?? 0 },
                )}
              </Button>
            )}
          </Space>
        ),
      },
      {
        title: label(
          'pages.notifications.sent.deliveryMethods',
          'Delivery methods',
        ),
        dataIndex: 'deliveryMethods',
        width: 200,
        render: (_, record) =>
          (record.deliveryMethods ?? []).length > 0 ? (
            <Space size={4} wrap>
              {(record.deliveryMethods ?? []).map((method) => (
                <Tag key={method}>
                  {label(METHOD_NAME_KEYS[method] ?? method, method)}
                </Tag>
              ))}
            </Space>
          ) : (
            '-'
          ),
      },
      {
        title: label('pages.notifications.sent.template', 'Template'),
        dataIndex: 'templateName',
        ellipsis: true,
        render: (_, record) => record.templateName || '-',
      },
    ];
    cols.push({
      valueType: 'option',
      width: 110,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="resend"
          type="text"
          size="small"
          icon={<RedoOutlined />}
          disabled={record.status === NotificationRequestStatus.SCHEDULED}
          title={label(
            'pages.notifications.sent.wizard.againTitle',
            'Send again',
          )}
          onClick={(event) => {
            event.stopPropagation();
            setResendRequest(record);
          }}
          data-testid={`sent-resend-${record.id.id}`}
        />,
        <Button
          key="delete"
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          title={label('pages.notifications.sent.delete', 'Delete')}
          onClick={(event) => {
            event.stopPropagation();
            confirmDeleteOne(record);
          }}
        />,
      ],
    });
    return cols;
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  const onTableChange: TableProps<NotificationRequestInfo>['onChange'] = (
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

  const [resendRequest, setResendRequest] =
    useState<NotificationRequestInfo | null>(null);

  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.notifications.sent',
        defaultMessage: 'Sent',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void requestsQuery.refetch()}
          >
            {label('pages.notifications.sent.refresh', 'Refresh')}
          </Button>
          <div className="flex-1" />
          <Space>
            {selectedRequests.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.notifications.sent.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedRequests.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {label(
                    'pages.notifications.sent.batchDelete',
                    'Delete selected',
                  )}
                </Button>
              </>
            )}
            <SendNotificationButton />
          </Space>
        </div>
      }
    >
      {requestsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={label(
            'pages.notifications.sent.loadFailed',
            'Failed to load sent notifications',
          )}
          description={serverErrorText(requestsQuery.error)}
        />
      )}

      <ProTable<NotificationRequestInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={requests}
        loading={requestsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: requestsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.notifications.sent.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: label(
            'pages.notifications.sent.empty',
            'No sent notifications',
          ),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <SendNotificationWizard
        open={Boolean(resendRequest)}
        prefilledRequest={resendRequest}
        onClose={() => setResendRequest(null)}
      />

      <SentErrorDialog
        request={errorRequest}
        onClose={() => setErrorRequest(null)}
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
