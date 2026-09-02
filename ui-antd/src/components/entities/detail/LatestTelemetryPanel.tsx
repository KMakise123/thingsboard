/**
 * Latest telemetry tab panel (spec 3.3 `latest telemetry`): live table via
 * the core/ws latest-telemetry subscription seeded from the REST snapshot
 * (getLatestTelemetry). Clicking a key opens the history line-chart dialog.
 * Telemetry is device-written data: no add/edit surface here.
 *
 * Entity-agnostic since M2 (assets / entity views / customers reuse it with
 * their own EntityId). `disableAddTelemetry` is the ui-ngx entity-view seam
 * (latest tab): reserved for the day an add-telemetry surface exists — the
 * panel has none today, so the flag is accepted and documented only.
 */
import { LineChartOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Input, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { useLatestTelemetrySubscription } from '@/core/ws/hooks';
import { getLatestTelemetry } from '@/services/tb/attributes';
import type { AttributeData, EntityId } from '@/types/tb';
import {
  filterAttributeRows,
  formatAttributeValue,
  isNumericValue,
} from './attribute-value';
import TimeseriesHistoryModal from './TimeseriesHistoryModal';

/** Seed snapshot rows from TimeseriesData (key → points). */
export function latestTelemetrySeed(
  data: Record<string, Array<{ ts: number; value: string }>>,
): AttributeData[] {
  return Object.entries(data).map(([key, points]) => ({
    key,
    value: points.length > 0 ? points[points.length - 1].value : undefined,
    lastUpdateTs: points.length > 0 ? points[points.length - 1].ts : undefined,
  }));
}

export default function LatestTelemetryPanel({
  entityId,
  disableAddTelemetry: _disableAddTelemetry,
}: {
  /** Polymorphic entity reference (DEVICE / ASSET / ENTITY_VIEW / ...). */
  entityId: EntityId;
  /**
   * ui-ngx entity-view seam. No add-telemetry surface exists in v1 yet, so
   * the flag is currently a no-op kept for parity when one lands.
   */
  disableAddTelemetry?: boolean;
}) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  const seedQuery = useQuery({
    queryKey: ['latest-telemetry', entityId.entityType, entityId.id],
    queryFn: () => getLatestTelemetry(entityId),
  });
  const seed = useMemo(
    () => (seedQuery.data ? latestTelemetrySeed(seedQuery.data) : undefined),
    [seedQuery.data],
  );

  const { data: rows, status } = useLatestTelemetrySubscription({
    entityId,
    seed,
  });
  const visibleRows = filterAttributeRows(rows, search);

  const columns = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.lastUpdate',
        defaultMessage: 'Last update',
      }),
      dataIndex: 'lastUpdateTs',
      width: 180,
      render: (ts?: number) =>
        ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.key',
        defaultMessage: 'Key',
      }),
      dataIndex: 'key',
      render: (key: string) => (
        <Button
          type="link"
          size="small"
          className="!px-0"
          onClick={() => setHistoryKey(key)}
        >
          {key}
        </Button>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.value',
        defaultMessage: 'Value',
      }),
      dataIndex: 'value',
      render: (value: unknown) => (
        <span className={isNumericValue(value) ? 'tabular-nums' : undefined}>
          {formatAttributeValue(value)}
        </span>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.actions',
        defaultMessage: 'Actions',
      }),
      key: 'history',
      width: 90,
      render: (_: unknown, record: AttributeData) => (
        <Button
          type="text"
          size="small"
          icon={<LineChartOutlined />}
          title={formatMessage({
            id: 'pages.devices.detail.historyAction',
            defaultMessage: 'Show history',
          })}
          onClick={() => setHistoryKey(record.key)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <Input.Search
          allowClear
          className="w-56"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={formatMessage({
            id: 'pages.devices.detail.searchKeys',
            defaultMessage: 'Search keys',
          })}
        />
        <Tag color={status === 'open' ? 'processing' : 'warning'}>
          {formatMessage({
            id: 'pages.devices.detail.wsStatus',
            defaultMessage: 'Live updates',
          })}
          : {status}
        </Tag>
      </Space>

      {seedQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.telemetryLoadFailed',
            defaultMessage: 'Failed to load telemetry',
          })}
          description={serverErrorText(seedQuery.error)}
        />
      )}

      <Table<AttributeData>
        rowKey="key"
        size="small"
        columns={columns}
        dataSource={visibleRows}
        loading={seedQuery.isPending && rows.length === 0}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{
          emptyText: (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.devices.detail.telemetryEmpty',
                defaultMessage: 'No telemetry yet',
              })}
            </Typography.Text>
          ),
        }}
      />

      <TimeseriesHistoryModal
        open={!!historyKey}
        entityId={entityId}
        telemetryKey={historyKey}
        onClose={() => setHistoryKey(null)}
      />
    </div>
  );
}
