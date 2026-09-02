/**
 * System settings → Audit logs page (spec 3.7, ui-ngx audit-log table in
 * TENANT mode — for the sys admin that is the system-domain log, SA only in
 * v1). Server-side pagination + filters in the URL (timewindow,
 * actionTypes multi-select, text search — audit-log header parity), the
 * ui-ngx column set and the details dialog (action data JSON + failure
 * details on FAILURE — the 2026 ui-ngx details-dialog shape).
 */

import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import type {
  AuditActionStatus,
  AuditActionType,
  AuditLog,
} from '@/services/tb/audit-log';
import { getAuditLogs } from '@/services/tb/audit-log';
import {
  AUDIT_SORT_PROPERTIES,
  type AuditLogsUrlState,
  useAuditLogsUrlState,
} from './url-state';

const SEARCH_DEBOUNCE_MS = 400;

/** Every wire ActionType — the filter's option set (tb-audit-log-filter). */
const ACTION_TYPES: AuditActionType[] = [
  'ADDED',
  'DELETED',
  'UPDATED',
  'ATTRIBUTES_UPDATED',
  'ATTRIBUTES_DELETED',
  'TIMESERIES_UPDATED',
  'TIMESERIES_DELETED',
  'RPC_CALL',
  'CREDENTIALS_UPDATED',
  'ASSIGNED_TO_CUSTOMER',
  'UNASSIGNED_FROM_CUSTOMER',
  'ACTIVATED',
  'SUSPENDED',
  'CREDENTIALS_READ',
  'ATTRIBUTES_READ',
  'RELATION_ADD_OR_UPDATE',
  'RELATION_DELETED',
  'RELATIONS_DELETED',
  'REST_API_RULE_ENGINE_CALL',
  'ALARM_ACK',
  'ALARM_CLEAR',
  'ALARM_DELETE',
  'ALARM_ASSIGNED',
  'ALARM_UNASSIGNED',
  'LOGIN',
  'LOGOUT',
  'LOCKOUT',
  'ASSIGNED_FROM_TENANT',
  'ASSIGNED_TO_TENANT',
  'PROVISION_SUCCESS',
  'PROVISION_FAILURE',
  'ASSIGNED_TO_EDGE',
  'UNASSIGNED_FROM_EDGE',
  'ADDED_COMMENT',
  'UPDATED_COMMENT',
  'DELETED_COMMENT',
  'SMS_SENT',
];

export default function SettingsAuditLogsPage() {
  const { formatMessage } = useIntl();
  const { state, patch } = useAuditLogsUrlState();

  const [searchInput, setSearchInput] = useState(state.textSearch);
  const [searchTimer, setSearchTimer] =
    useState<ReturnType<typeof setTimeout>>();

  const onSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      patch({ textSearch: value.trim(), page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    setSearchTimer(timer);
  };

  const timeRange: [Dayjs | null, Dayjs | null] | null = useMemo(() => {
    if (!state.startTime && !state.endTime) {
      return null;
    }
    return [
      state.startTime ? dayjs(state.startTime) : null,
      state.endTime ? dayjs(state.endTime) : null,
    ];
  }, [state.startTime, state.endTime]);

  const onTimeRangeChange = (range: [Dayjs | null, Dayjs | null] | null) => {
    patch({
      startTime: range?.[0]?.valueOf(),
      endTime: range?.[1]?.valueOf(),
      page: 1,
    });
  };

  const logsQuery = useQuery({
    queryKey: [
      'settings',
      'audit-logs',
      state.page,
      state.pageSize,
      state.sortProperty,
      state.sortDirection,
      state.textSearch,
      state.startTime,
      state.endTime,
      state.actionTypes.join(','),
    ],
    queryFn: () =>
      getAuditLogs(
        {
          pageSize: state.pageSize,
          page: state.page - 1,
          textSearch: state.textSearch || undefined,
          sortOrder: {
            property: state.sortProperty,
            direction: state.sortDirection,
          },
        },
        {
          startTime: state.startTime,
          endTime: state.endTime,
          actionTypes:
            state.actionTypes.length > 0 ? state.actionTypes : undefined,
        },
      ),
    placeholderData: (previous) => previous,
  });

  const columns: ColumnsType<AuditLog> = [
    {
      title: formatMessage({
        id: 'pages.settings.auditLogs.timestamp',
        defaultMessage: 'Timestamp',
      }),
      dataIndex: 'createdTime',
      width: 175,
      sorter: true,
      render: (ts: number) => (
        <span className="tabular-nums">
          {dayjs(ts).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.settings.auditLogs.entityType',
        defaultMessage: 'Entity type',
      }),
      dataIndex: 'entityType',
      width: 150,
      sorter: true,
      render: (_, record) => record.entityId?.entityType ?? '-',
    },
    {
      title: formatMessage({
        id: 'pages.settings.auditLogs.entityName',
        defaultMessage: 'Entity name',
      }),
      dataIndex: 'entityName',
      width: 200,
      ellipsis: true,
      sorter: true,
      render: (_, record) => record.entityName ?? '-',
    },
    {
      title: formatMessage({
        id: 'pages.settings.auditLogs.user',
        defaultMessage: 'User',
      }),
      dataIndex: 'userName',
      width: 180,
      ellipsis: true,
      sorter: true,
      render: (_, record) => record.userName ?? '-',
    },
    {
      title: formatMessage({
        id: 'pages.settings.auditLogs.actionType',
        defaultMessage: 'Action type',
      }),
      dataIndex: 'actionType',
      width: 220,
      sorter: true,
      render: (actionType: AuditActionType) =>
        formatMessage({
          id: `pages.devices.detail.auditAction.${actionType}`,
          defaultMessage: actionType,
        }),
    },
    {
      title: formatMessage({
        id: 'pages.settings.auditLogs.actionStatus',
        defaultMessage: 'Status',
      }),
      dataIndex: 'actionStatus',
      width: 110,
      sorter: true,
      render: (status: AuditActionStatus) => (
        <Tag color={status === 'SUCCESS' ? 'success' : 'error'}>
          {formatMessage({
            id:
              status === 'SUCCESS'
                ? 'pages.settings.auditLogs.statusSuccess'
                : 'pages.settings.auditLogs.statusFailure',
            defaultMessage: status,
          })}
        </Tag>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.settings.auditLogs.details',
        defaultMessage: 'Details',
      }),
      key: 'details',
      width: 90,
      render: (_, record) => <AuditDetailsButton log={record} />,
    },
  ];

  return (
    <PageContainer
      title={formatMessage({
        id: 'pages.settings.auditLogs.title',
        defaultMessage: 'Audit logs',
      })}
      breadcrumbLabel={formatMessage({
        id: 'pages.settings.auditLogs.title',
        defaultMessage: 'Audit logs',
      })}
    >
      <div className="flex flex-col gap-3">
        <Space wrap>
          <Select
            mode="multiple"
            allowClear
            maxTagCount={3}
            className="min-w-72"
            value={state.actionTypes}
            options={ACTION_TYPES.map((type) => ({
              value: type,
              label:
                formatMessage({
                  id: `pages.devices.detail.auditAction.${type}`,
                  defaultMessage: type,
                }) || type,
            }))}
            onChange={(values) =>
              patch({
                actionTypes: (values ?? []) as AuditActionType[],
                page: 1,
              })
            }
            placeholder={formatMessage({
              id: 'pages.settings.auditLogs.anyActionType',
              defaultMessage: 'Any action type',
            })}
          />
          <DatePicker.RangePicker
            showTime
            value={timeRange}
            onChange={(range) =>
              onTimeRangeChange(range as [Dayjs | null, Dayjs | null] | null)
            }
          />
          <Input
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.settings.auditLogs.search',
              defaultMessage: 'Search audit logs',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void logsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.settings.auditLogs.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
        </Space>

        {logsQuery.isError && (
          <Alert
            type="error"
            showIcon
            message={formatMessage({
              id: 'pages.settings.auditLogs.loadFailed',
              defaultMessage: 'Failed to load audit logs',
            })}
            description={serverErrorText(logsQuery.error)}
          />
        )}

        <Table<AuditLog>
          rowKey={(record) => record.id.id}
          size="small"
          columns={columns}
          dataSource={logsQuery.data?.data ?? []}
          loading={logsQuery.isPending}
          onChange={(pagination, _filters, sorter) => {
            const sort = Array.isArray(sorter) ? sorter[0] : sorter;
            const property = sort?.field
              ? (AUDIT_SORT_PROPERTIES as readonly string[]).includes(
                  sort.field as string,
                )
                ? (sort.field as AuditLogsUrlState['sortProperty'])
                : undefined
              : undefined;
            if (property && sort?.order) {
              patch({
                sortProperty: property,
                sortDirection: sort.order === 'ascend' ? 'ASC' : 'DESC',
                page: 1,
              });
            } else if (!sort?.order) {
              patch({
                sortProperty: 'createdTime',
                sortDirection: 'DESC',
                page: 1,
              });
            }
            if (
              pagination.current &&
              pagination.pageSize &&
              (pagination.current !== state.page ||
                pagination.pageSize !== state.pageSize)
            ) {
              patch({
                page: pagination.current,
                pageSize: pagination.pageSize,
              });
            }
          }}
          pagination={{
            current: state.page,
            pageSize: state.pageSize,
            total: logsQuery.data?.totalElements ?? 0,
            showSizeChanger: true,
            showTotal: (total) =>
              formatMessage(
                {
                  id: 'pages.settings.auditLogs.total',
                  defaultMessage: '{count} total',
                },
                { count: total },
              ),
          }}
          locale={{
            emptyText: (
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.settings.auditLogs.empty',
                  defaultMessage: 'No audit logs',
                })}
              </Typography.Text>
            ),
          }}
        />
      </div>
    </PageContainer>
  );
}

/** Row action: the ui-ngx audit-log details dialog (AntD-ized modal). */
function AuditDetailsButton({ log }: { log: AuditLog }) {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const failure = log.actionStatus === 'FAILURE';

  return (
    <>
      <Button type="link" size="small" onClick={() => setOpen(true)}>
        {formatMessage({
          id: 'pages.settings.auditLogs.details',
          defaultMessage: 'Details',
        })}
      </Button>
      <Modal
        open={open}
        title={formatMessage({
          id: 'pages.settings.auditLogs.detailsTitle',
          defaultMessage: 'Audit log details',
        })}
        footer={null}
        width={720}
        onCancel={() => setOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div>
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.settings.auditLogs.actionData',
                defaultMessage: 'Action data',
              })}
            </Typography.Text>
            <pre className="mt-1 max-h-72 overflow-auto text-xs">
              {JSON.stringify(log.actionData ?? {}, null, 2)}
            </pre>
          </div>
          {failure && (
            <div>
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.settings.auditLogs.failureDetails',
                  defaultMessage: 'Failure details',
                })}
              </Typography.Text>
              <pre className="mt-1 max-h-72 overflow-auto text-xs">
                {log.actionFailureDetails ?? '-'}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
