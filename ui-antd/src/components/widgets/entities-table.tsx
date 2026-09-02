/**
 * system.cards.entities_table — entities table widget (brief §6).
 *
 * Anchor reality (firmware/software ×5+5, thermostats ×1, gateways ×19):
 * one entity datasource whose dataKeys mix attribute + timeseries columns
 * (both read as LATEST values), datasource-level filterId keyFilters
 * (fw_state queues), settings drive search/pagination/pageSize/sort and the
 * entity-name column; config.actions.headerButton openDashboardState actions
 * render as header buttons (thermostats "Edit location" → map state).
 * cellContentFunction cell scripts stay unevaluated (v1: raw values).
 *
 * Data channel: subscribeEntityData (latest values + entity fields) via
 * useEntityLatestData — one cmd per datasource/entityType group.
 */

import { SearchOutlined } from '@ant-design/icons';
import { Button, Input, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import type { EntityDataWire } from '@/core/ws';
import type { DataKey } from '@/types/tb/widget';
import type { WidgetComponentProps } from './contract';
import { useEntityLatestData } from './hooks';
import {
  formatWidgetValue,
  interpolateStateParams,
  resolveI18nMessage,
} from './hooks/widget-text';

interface EntitiesTableSettings {
  enableSearch?: boolean;
  displayPagination?: boolean;
  defaultPageSize?: number;
  defaultSortOrder?: string;
  displayEntityName?: boolean;
  displayEntityLabel?: boolean;
  displayEntityType?: boolean;
  entitiesTitle?: string;
  entityNameColumnTitle?: string;
}

interface HeaderButtonAction {
  name?: string;
  type?: string;
  targetDashboardStateId?: string;
  setEntityId?: boolean;
  [key: string]: unknown;
}

interface RowRecord {
  key: string;
  id: string;
  name: string;
  label: string;
  entityType: string;
  datasourceIndex: number;
  row: EntityDataWire;
}

function latestValueOf(
  row: EntityDataWire,
  key: DataKey,
): { value: unknown; ts?: number } | undefined {
  const keyType =
    key.type === 'timeseries'
      ? 'TIME_SERIES'
      : key.type === 'entityField'
        ? 'ENTITY_FIELD'
        : 'ATTRIBUTE';
  const entry = row.latest?.[keyType]?.[key.name];
  return entry ? { value: entry.value, ts: entry.ts } : undefined;
}

export default function EntitiesTable({ ctx, widget }: WidgetComponentProps) {
  const { formatMessage, locale } = useIntl();
  const settings = (widget.config.settings ?? {}) as EntitiesTableSettings;

  const { entries } = useEntityLatestData(ctx.datasources);

  const title = interpolateStateParams(
    resolveI18nMessage(widget.config.title, locale),
    ctx.states.currentStateParams,
  );
  const showTitle = widget.config.showTitle !== false && title.length > 0;

  // header buttons: only the declarative openDashboardState kind is v1-safe
  const headerButtons = useMemo(() => {
    const actions =
      (
        widget.config.actions as
          | { headerButton?: Array<HeaderButtonAction> }
          | undefined
      )?.headerButton ?? [];
    return actions.filter(
      (action) =>
        action.type === 'openDashboardState' && action.targetDashboardStateId,
    );
  }, [widget.config.actions]);

  const [search, setSearch] = useState('');

  const records = useMemo<Array<RowRecord>>(() => {
    const rows = entries.map(({ datasourceIndex, row }) => {
      const id =
        typeof row.entityId === 'string' ? row.entityId : row.entityId.id;
      const entityType =
        typeof row.entityId === 'string' ? '' : (row.entityId.entityType ?? '');
      const name =
        row.latest?.ENTITY_FIELD?.name?.value ??
        ctx.datasources[datasourceIndex]?.entities.find((e) => e.id === id)
          ?.name ??
        id;
      const label = row.latest?.ENTITY_FIELD?.label?.value ?? '';
      return {
        key: `${datasourceIndex}:${id}`,
        id,
        name,
        label,
        entityType,
        datasourceIndex,
        row,
      } satisfies RowRecord & { id: string };
    });
    if (settings.defaultSortOrder === '-entityName') {
      rows.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      // anchors default to entityName
      rows.sort((a, b) => a.name.localeCompare(b.name));
    }
    return rows;
  }, [entries, ctx.datasources, settings.defaultSortOrder]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return records;
    }
    return records.filter((record) => {
      if (record.name.toLowerCase().includes(needle)) {
        return true;
      }
      const datasource = ctx.datasources[record.datasourceIndex];
      return (datasource?.dataKeys ?? []).some((key) => {
        const entry = latestValueOf(record.row, key);
        return entry
          ? String(entry.value).toLowerCase().includes(needle)
          : false;
      });
    });
  }, [records, search, ctx.datasources]);

  const columns = useMemo<ColumnsType<RowRecord>>(() => {
    const result: ColumnsType<RowRecord> = [];
    if (settings.displayEntityName !== false) {
      const nameTitle =
        interpolateStateParams(
          resolveI18nMessage(settings.entityNameColumnTitle, locale),
          ctx.states.currentStateParams,
        ) ||
        resolveI18nMessage(settings.entitiesTitle, locale) ||
        formatMessage({
          id: 'dashboards.widget.table.entity',
          defaultMessage: 'Entity',
        });
      result.push({
        title: nameTitle,
        dataIndex: 'name',
        ellipsis: true,
        render: (name: string) => name,
      });
    }
    // union of the datasources' key columns (anchors carry one datasource)
    const seen = new Set<string>();
    for (const datasource of ctx.datasources) {
      for (const key of datasource.dataKeys) {
        const columnKey = `${key.type}:${key.name}`;
        if (seen.has(columnKey)) {
          continue;
        }
        seen.add(columnKey);
        result.push({
          title: (
            <Space size={4}>
              {key.color ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: key.color,
                  }}
                />
              ) : null}
              {key.label ?? key.name}
            </Space>
          ),
          key: columnKey,
          ellipsis: true,
          render: (_, record) => {
            const datasourceOfRecord = ctx.datasources[record.datasourceIndex];
            const recordKey = (datasourceOfRecord?.dataKeys ?? []).find(
              (candidate) =>
                `${candidate.type}:${candidate.name}` === columnKey,
            );
            if (!recordKey) {
              return null;
            }
            const entry = latestValueOf(record.row, recordKey);
            if (!entry) {
              return null;
            }
            return formatWidgetValue(
              entry.value,
              recordKey.decimals ?? widget.config.decimals,
              recordKey.units ?? widget.config.units,
            );
          },
        });
      }
    }
    return result;
  }, [
    ctx.datasources,
    ctx.states.currentStateParams,
    settings.displayEntityName,
    settings.entityNameColumnTitle,
    settings.entitiesTitle,
    locale,
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
      data-widget="system.cards.entities_table"
    >
      {(showTitle || showSearch || headerButtons.length > 0) && (
        <Space
          size={8}
          style={{ padding: '4px 8px 0', justifyContent: 'space-between' }}
        >
          <Space size={8}>
            {showTitle ? (
              <Typography.Text strong>{title}</Typography.Text>
            ) : null}
            {headerButtons.map((action) => (
              <Button
                key={action.name}
                size="small"
                onClick={() =>
                  ctx.states.openState(action.targetDashboardStateId as string)
                }
              >
                {resolveI18nMessage(action.name, locale)}
              </Button>
            ))}
          </Space>
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
        </Space>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: '0 8px 8px',
        }}
      >
        <Table<RowRecord>
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
