/**
 * Events tab panel (spec 3.3 `events`): event-type filter (default ERROR,
 * full ui-ngx type set incl. debug families) + server-side pagination via
 * the typed events endpoint. The body blob renders as an expandable row —
 * per-type column sets collapse into key fields + raw JSON.
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/devices/server-error-text';
import { type EventTypeId, getEvents } from '@/services/tb/events';
import { EntityType } from '@/types/tb';

const EVENT_TYPES: Array<EventTypeId> = [
  'ERROR',
  'LC_EVENT',
  'STATS',
  'DEBUG_RULE_NODE',
  'DEBUG_RULE_CHAIN',
  'DEBUG_CALCULATED_FIELD',
];

/** Extract a one-line summary out of the per-type body blob. */
export function eventBodySummary(body: Record<string, unknown>): string {
  const preferred = ['message', 'error', 'event', 'status', 'method'];
  for (const key of preferred) {
    const value = body[key];
    if (typeof value === 'string' && value) {
      return value;
    }
  }
  const first = Object.values(body).find(
    (value) => typeof value === 'string' && value,
  );
  return typeof first === 'string' ? first : '';
}

export default function EventsPanel({
  deviceId,
  tenantId,
}: {
  deviceId: string;
  tenantId: string;
}) {
  const { formatMessage } = useIntl();
  const [eventType, setEventType] = useState<EventTypeId>('ERROR');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const entityId = useMemo(
    () => ({ entityType: EntityType.DEVICE, id: deviceId }),
    [deviceId],
  );

  const eventsQuery = useQuery({
    queryKey: ['events', deviceId, eventType, page, pageSize],
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
        id: 'pages.devices.detail.eventCreatedTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 180,
      render: (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.eventType',
        defaultMessage: 'Type',
      }),
      dataIndex: 'type',
      width: 130,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.eventMessage',
        defaultMessage: 'Message',
      }),
      key: 'summary',
      ellipsis: true,
      render: (_: unknown, record: { body: Record<string, unknown> }) =>
        eventBodySummary(record.body) || '-',
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
            label: formatMessage({
              id: `pages.devices.detail.eventTypeOption.${type}`,
              defaultMessage: type,
            }),
          }))}
        />
      </Space>

      {eventsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.eventLoadFailed',
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
                id: 'pages.devices.detail.eventEmpty',
                defaultMessage: 'No events',
              })}
            </Typography.Text>
          ),
        }}
      />
    </div>
  );
}
