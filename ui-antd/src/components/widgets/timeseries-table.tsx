/**
 * system.cards.timeseries_table — timeseries table widget (brief §6).
 *
 * Anchor reality (firmware/software ×1+1, rule_engine ×1, gateways ×2,
 * api_usage ×1): rows are timestamps, columns are datasource dataKeys
 * (timeseries), an entity-name column appears when several entities feed the
 * table, and showTimestamp toggles the formatted ts column. rule_engine
 * ships repeated key names with distinct labels + cellContentFunction
 * scripts (v1: raw values, scripts stay unevaluated).
 *
 * Data channel: the shared useEntityTimeseries hook (ENTITY_DATA
 * tsCmd/historyCmd) — realtime streams, history reads once.
 */

import { SearchOutlined } from '@ant-design/icons';
import { Input, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import type { ResolvedEntity } from '@/core/dashboard/alias-resolver';
import type { DataKey } from '@/types/tb/widget';
import type { WidgetComponentProps } from './contract';
import {
  interpolateStateParams,
  resolveI18nMessage,
  useEntityTimeseries,
} from './hooks';

interface TimeseriesTableSettings {
  showTimestamp?: boolean;
  displayPagination?: boolean;
  defaultPageSize?: number;
  enableSearch?: boolean;
}

interface TsRecord {
  key: string;
  ts: number;
  entityKey: string;
  entityName: string;
  /** column key (dataKey label) -> raw wire value at that ts. */
  cells: Record<string, string>;
}

/** One column descriptor: a dataKey of one datasource (label-deduped). */
interface ColumnSpec {
  columnKey: string;
  key: DataKey;
  datasourceIndex: number;
}

export default function TimeseriesTable({ ctx, widget }: WidgetComponentProps) {
  const { formatMessage, locale } = useIntl();
  const settings = (widget.config.settings ?? {}) as TimeseriesTableSettings;

  const entities = useMemo(
    () => ctx.datasources.flatMap((datasource) => datasource.entities),
    [ctx.datasources],
  );
  const columnSpecs = useMemo<Array<ColumnSpec>>(() => {
    const specs: Array<ColumnSpec> = [];
    const seen = new Set<string>();
    ctx.datasources.forEach((datasource, datasourceIndex) => {
      for (const key of datasource.dataKeys) {
        if (key.type !== 'timeseries') {
          continue;
        }
        const columnKey = key.label ?? key.name;
        if (seen.has(columnKey)) {
          continue;
        }
        seen.add(columnKey);
        specs.push({ columnKey, key, datasourceIndex });
      }
    });
    return specs;
  }, [ctx.datasources]);
  const timeseriesKeys = useMemo(
    () => [...new Set(columnSpecs.map((spec) => spec.key.name))],
    [columnSpecs],
  );

  const { rows } = useEntityTimeseries({
    entities,
    timeseriesKeys,
    effectiveTimewindow: ctx.effectiveTimewindow,
  });

  const title = interpolateStateParams(
    resolveI18nMessage(widget.config.title, locale),
    ctx.states.currentStateParams,
  );
  const showTitle = widget.config.showTitle !== false && title.length > 0;

  const multiEntity = entities.length > 1;

  const records = useMemo<Array<TsRecord>>(() => {
    const entityNameById = new Map(
      entities.map((entity: ResolvedEntity) => [
        entity.id,
        entity.name ?? entity.label ?? entity.id,
      ]),
    );
    const out: Array<TsRecord> = [];
    for (const row of rows) {
      const id =
        typeof row.entityId === 'string' ? row.entityId : row.entityId.id;
      const entityName = entityNameById.get(id) ?? id;
      // gather every ts present in any key for this entity
      const stamps = new Set<number>();
      for (const spec of columnSpecs) {
        for (const point of row.timeseries[spec.key.name] ?? []) {
          stamps.add(point.ts);
        }
      }
      for (const ts of stamps) {
        const cells: Record<string, string> = {};
        for (const spec of columnSpecs) {
          const point = (row.timeseries[spec.key.name] ?? []).find(
            (candidate) => candidate.ts === ts,
          );
          if (point !== undefined) {
            cells[spec.columnKey] = point.value;
          }
        }
        out.push({
          key: `${id}:${ts}`,
          ts,
          entityKey: id,
          entityName,
          cells,
        });
      }
    }
    out.sort((a, b) => b.ts - a.ts);
    return out;
  }, [rows, columnSpecs, entities]);

  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return records;
    }
    return records.filter(
      (record) =>
        record.entityName.toLowerCase().includes(needle) ||
        Object.values(record.cells).some((value) =>
          value.toLowerCase().includes(needle),
        ),
    );
  }, [records, search]);

  const columns = useMemo<ColumnsType<TsRecord>>(() => {
    const result: ColumnsType<TsRecord> = [];
    if (multiEntity) {
      result.push({
        title: formatMessage({
          id: 'dashboards.widget.table.entity',
          defaultMessage: 'Entity',
        }),
        dataIndex: 'entityName',
        ellipsis: true,
      });
    }
    if (settings.showTimestamp !== false) {
      result.push({
        title: formatMessage({
          id: 'dashboards.widget.table.timestamp',
          defaultMessage: 'Timestamp',
        }),
        dataIndex: 'ts',
        width: 170,
        render: (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
      });
    }
    for (const spec of columnSpecs) {
      const decimals = spec.key.decimals ?? widget.config.decimals;
      const units = spec.key.units ?? widget.config.units;
      result.push({
        title: (
          <span>
            {spec.key.color ? (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: spec.key.color,
                  marginRight: 6,
                }}
              />
            ) : null}
            {spec.columnKey}
          </span>
        ),
        key: spec.columnKey,
        ellipsis: true,
        render: (_, record) => {
          const raw = record.cells[spec.columnKey];
          if (raw === undefined || raw === '') {
            return null;
          }
          const numeric = Number(raw);
          if (!Number.isFinite(numeric)) {
            return raw;
          }
          const text =
            decimals === undefined || decimals === null
              ? raw
              : numeric.toFixed(decimals);
          return units ? `${text} ${units}` : text;
        },
      });
    }
    return result;
  }, [
    columnSpecs,
    multiEntity,
    settings.showTimestamp,
    formatMessage,
    widget.config.decimals,
    widget.config.units,
  ]);

  const showSearch = settings.enableSearch !== false;
  const showPagination = settings.displayPagination !== false;

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflow: 'hidden',
      }}
      data-widget="system.cards.timeseries_table"
    >
      {(showTitle || showSearch) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px 0',
            gap: 8,
          }}
        >
          {showTitle ? (
            <Typography.Text strong ellipsis>
              {title}
            </Typography.Text>
          ) : (
            <span />
          )}
          {showSearch ? (
            <Input
              size="small"
              allowClear
              prefix={<SearchOutlined />}
              placeholder={formatMessage({
                id: 'dashboards.widget.table.search',
                defaultMessage: 'Search',
              })}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ maxWidth: 180 }}
            />
          ) : null}
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: '0 8px 8px',
        }}
      >
        <Table<TsRecord>
          size="small"
          columns={columns}
          dataSource={filtered}
          rowKey="key"
          pagination={
            showPagination
              ? {
                  pageSize: settings.defaultPageSize ?? 10,
                  size: 'small',
                  showSizeChanger: false,
                }
              : false
          }
        />
      </div>
    </div>
  );
}
