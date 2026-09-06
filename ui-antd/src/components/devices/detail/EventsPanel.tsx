/**
 * Events tab panel (spec 3.3 `events`): event-type filter (default ERROR)
 * + server-side pagination via the typed events endpoint. The body blob
 * renders as an expandable row — per-type column sets collapse into key
 * fields + raw JSON.
 *
 * Entity-agnostic since M13 (R04): the caller passes the polymorphic
 * `entityId`, so devices and edges share the panel. `eventTypes` narrows
 * the filter options — default keeps the full device set (incl. debug
 * families); the Edge page passes its real ERROR/LC_EVENT/STATS trio
 * (ui-ngx edge-tabs passes no disabledEventTypes, the backend serves
 * exactly these three).
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { type EventTypeId, getEvents } from '@/services/tb/events';
import type { EntityId } from '@/types/tb';

/** Full device set (incl. debug families) — the default when eventTypes is omitted. */
export const DEFAULT_EVENT_TYPES: Array<EventTypeId> = [
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
  entityId,
  tenantId,
  eventTypes = DEFAULT_EVENT_TYPES,
  defaultEventType = 'ERROR',
}: {
  /** Polymorphic entity reference (DEVICE / EDGE / ...). */
  entityId: EntityId;
  tenantId: string;
  /** Filter options; omit for the full device set. */
  eventTypes?: Array<EventTypeId>;
  /** Initial filter; the CF standalone page passes DEBUG_CALCULATED_FIELD. */
  defaultEventType?: EventTypeId;
}) {
  const { formatMessage } = useIntl();
  const [eventType, setEventType] = useState<EventTypeId>(defaultEventType);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const eventsQuery = useQuery({
    queryKey: [
      'events',
      entityId.entityType,
      entityId.id,
      eventType,
      page,
      pageSize,
    ],
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
          options={eventTypes.map((type) => ({
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
