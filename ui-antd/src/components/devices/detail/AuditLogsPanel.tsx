/**
 * Audit-logs tab panel (spec 3.3 `audit-logs`): entity-scoped read with the
 * ui-ngx column set — createdTime / actionType / actionStatus / userName —
 * plus the action payload as an expandable row. Server-side pagination.
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Input, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/devices/server-error-text';
import type { AuditActionType, AuditLog } from '@/services/tb/audit-log';
import { getAuditLogsByEntityId } from '@/services/tb/audit-log';
import type { EntityId } from '@/types/tb';

const SEARCH_DEBOUNCE_MS = 400;

export default function AuditLogsPanel({ entityId }: { entityId: EntityId }) {
  const { formatMessage } = useIntl();
  const [searchInput, setSearchInput] = useState('');
  const [searchCommitted, setSearchCommitted] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Server-side text search, debounced (same shape as the list page).
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchCommitted(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', entityId.id, searchCommitted, page, pageSize],
    queryFn: () =>
      getAuditLogsByEntityId(entityId, {
        pageSize,
        page: page - 1,
        textSearch: searchCommitted || undefined,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
    placeholderData: (previous) => previous,
  });

  const columns = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.auditCreatedTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 180,
      render: (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.auditActionType',
        defaultMessage: 'Action type',
      }),
      dataIndex: 'actionType',
      width: 220,
      render: (actionType: AuditActionType) =>
        formatMessage({
          id: `pages.devices.detail.auditAction.${actionType}`,
          defaultMessage: actionType,
        }),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.auditActionStatus',
        defaultMessage: 'Status',
      }),
      dataIndex: 'actionStatus',
      width: 110,
      render: (status: AuditLog['actionStatus']) => (
        <Tag color={status === 'SUCCESS' ? 'success' : 'error'}>{status}</Tag>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.auditUserName',
        defaultMessage: 'User',
      }),
      dataIndex: 'userName',
      ellipsis: true,
      render: (userName?: string) => userName || '-',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <Input.Search
          allowClear
          className="w-64"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={formatMessage({
            id: 'pages.devices.detail.auditSearch',
            defaultMessage: 'Search audit logs',
          })}
        />
      </Space>

      {logsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.auditLoadFailed',
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
        pagination={{
          current: page,
          pageSize,
          total: logsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
        expandable={{
          expandedRowRender: (record) => (
            <pre className="max-h-72 overflow-auto text-xs">
              {JSON.stringify(record.actionData ?? {}, null, 2)}
            </pre>
          ),
          rowExpandable: (record) =>
            Object.keys(record.actionData ?? {}).length > 0 ||
            !!record.actionFailureDetails,
        }}
        locale={{
          emptyText: (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.devices.detail.auditEmpty',
                defaultMessage: 'No audit logs',
              })}
            </Typography.Text>
          ),
        }}
      />
    </div>
  );
}
