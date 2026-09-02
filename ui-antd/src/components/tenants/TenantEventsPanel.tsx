/**
 * Tenant events tab (ui-ngx tenant-tabs events tab parity): the typed
 * events endpoint against the TENANT entity, default type ERROR, server
 * pagination, body blob as an expandable row. Same wire shape as the device
 * events panel, but the entity is the tenant itself and the tenantId query
 * param is the tenant's own id (ui-ngx passes nullUid and lets the server
 * resolve it — this backend wants the id, same as the device tab).
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { type EventTypeId, getEvents } from '@/services/tb/events';
import { EntityType } from '@/types/tb';

const EVENT_TYPES: Array<EventTypeId> = ['ERROR'];

export default function TenantEventsPanel({ tenantId }: { tenantId: string }) {
  const { formatMessage } = useIntl();
  const [eventType, setEventType] = useState<EventTypeId>('ERROR');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const entityId = useMemo(
    () => ({ entityType: EntityType.TENANT, id: tenantId }),
    [tenantId],
  );

  const eventsQuery = useQuery({
    queryKey: ['events', 'tenant', tenantId, eventType, page, pageSize],
    queryFn: () =>
      getEvents(entityId, tenantId, eventType, {
        pageSize,
        page: page - 1,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
    placeholderData: (previous) => previous,
  });

  const columns = [
    {
      title: formatMessage({
        id: 'pages.tenants.detail.eventCreatedTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 180,
      render: (ts: number) => (
        <span className="tabular-nums">
          {dayjs(ts).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.tenants.detail.eventType',
        defaultMessage: 'Type',
      }),
      dataIndex: 'type',
      width: 130,
    },
    {
      title: formatMessage({
        id: 'pages.tenants.detail.eventMessage',
        defaultMessage: 'Message',
      }),
      key: 'summary',
      ellipsis: true,
      render: (_: unknown, record: { body: Record<string, unknown> }) =>
        record.body?.message && typeof record.body.message === 'string'
          ? record.body.message
          : '-',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <Select<EventTypeId>
          className="w-64"
          value={eventType}
          onChange={(next) => {
            setEventType(next);
            setPage(1);
          }}
          options={EVENT_TYPES.map((type) => ({
            value: type,
            label: type,
          }))}
        />
      </Space>

      {eventsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.tenants.detail.eventLoadFailed',
            defaultMessage: 'Failed to load events',
          })}
          description={serverErrorText(eventsQuery.error)}
        />
      )}

      <Table
        rowKey={(record) => record.id.id}
        size="small"
        columns={columns}
        dataSource={eventsQuery.data?.data ?? []}
        loading={eventsQuery.isPending}
        pagination={{
          current: page,
          pageSize,
          total: eventsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
        expandable={{
          expandedRowRender: (record) => (
            <pre className="max-h-72 overflow-auto text-xs">
              {JSON.stringify(record.body, null, 2)}
            </pre>
          ),
          rowExpandable: (record) => Object.keys(record.body ?? {}).length > 0,
        }}
        locale={{
          emptyText: (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.tenants.detail.eventEmpty',
                defaultMessage: 'No events',
              })}
            </Typography.Text>
          ),
        }}
      />
    </div>
  );
}
