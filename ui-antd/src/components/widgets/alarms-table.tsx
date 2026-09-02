/**
 * system.alarm_widgets.alarms_table — alarms table widget (brief §6).
 *
 * Anchor reality (thermostats ×1, gateways ×1): rows come from
 * config.alarmSource (alarmSource entityAliasId + alarm-typed dataKeys:
 * createdTime/originator/type/severity/status/assignee); config
 * .alarmFilterConfig is the inline form {statusList, severityList, typeList,
 * searchPropagatedAlarms}. Settings drive search/pagination/pageSize/sort
 * (defaultSortOrder '-createdTime') and the alarmsTitle; mutation
 * affordances (ack/clear/assign/details) are read-only v1 omissions.
 *
 * Data channel: subscribeAlarmData — AlarmDataQuery with the alias
 * entityList filter, alarm-timewindow startTs, alarmFields for the columns
 * and the filter config riding pageLink (server: AlarmDataPageLink).
 */

import { SearchOutlined } from '@ant-design/icons';
import { Input, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { ExpandedDatasource } from '@/core/dashboard/datasources';
import { resolveTimewindow } from '@/core/dashboard/timewindow';
import { getDefaultWsManager } from '@/core/ws';
import type { AlarmData } from '@/types/tb';
import type { DataKey } from '@/types/tb/widget';
import type { WidgetComponentProps } from './contract';
import { entityKeyTypeOfDataKey } from './hooks/entity-filter';
import {
  interpolateStateParams,
  resolveI18nMessage,
} from './hooks/widget-text';

interface AlarmsTableSettings {
  enableSearch?: boolean;
  displayPagination?: boolean;
  defaultPageSize?: number;
  defaultSortOrder?: string;
  alarmsTitle?: string;
}

interface AlarmFilterConfig {
  statusList?: Array<string>;
  severityList?: Array<string>;
  typeList?: Array<string>;
  searchPropagatedAlarms?: boolean;
}

/** ui-ngx alarm severity color presets (named antd colors, no inline hex). */
const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'red',
  MAJOR: 'orange',
  MINOR: 'yellow',
  WARNING: 'gold',
  INDETERMINATE: 'default',
};

function alarmFieldValue(alarm: AlarmData, key: DataKey): unknown {
  const wire = alarm.latest?.ALARM_FIELD?.[key.name]?.value;
  if (wire !== undefined && wire !== null && wire !== '') {
    return wire;
  }
  switch (key.name) {
    case 'createdTime':
      return alarm.createdTime;
    case 'type':
      return alarm.type;
    case 'severity':
      return alarm.severity;
    case 'status':
      return alarm.status;
    case 'originator':
      return alarm.originatorName ?? alarm.originator?.id;
    case 'assignee':
      return undefined;
    default:
      return undefined;
  }
}

export default function AlarmsTable({ ctx, widget }: WidgetComponentProps) {
  const { formatMessage, locale } = useIntl();
  const settings = (widget.config.settings ?? {}) as AlarmsTableSettings;
  const alarmSource: ExpandedDatasource | undefined = ctx.datasources.find(
    (datasource) => datasource.alarmSource,
  );

  const manager = getDefaultWsManager();
  const [alarms, setAlarms] = useState<Array<AlarmData>>([]);
  const alarmSignature = JSON.stringify({
    entities: alarmSource?.entities.map((entity) => entity.id) ?? [],
    keys: alarmSource?.dataKeys.map((key) => key.name) ?? [],
    filter: alarmSource?.alarmFilter ?? null,
    keyFilters: alarmSource?.filter?.keyFilters ?? null,
    timewindow: ctx.effectiveTimewindow,
  });

  useEffect(() => {
    if (!alarmSource || alarmSource.entities.length === 0) {
      setAlarms([]);
      return;
    }
    const resolved = resolveTimewindow(ctx.effectiveTimewindow);
    const filterConfig = (alarmSource.alarmFilter ?? {}) as AlarmFilterConfig;
    const pageLink: Record<string, unknown> = {
      pageSize: 512,
      page: 0,
      sortOrder: {
        key: { type: 'ALARM_FIELD', key: 'createdTime' },
        direction:
          settings.defaultSortOrder === '-createdTime' ? 'DESC' : 'ASC',
      },
      startTs: resolved.startTs,
      ...(resolved.tab === 'HISTORY' ? { endTs: resolved.endTs } : {}),
      statusList: filterConfig.statusList ?? [],
      severityList: filterConfig.severityList ?? [],
      typeList: filterConfig.typeList ?? [],
      searchPropagatedAlarms: filterConfig.searchPropagatedAlarms ?? true,
    };
    const subscription = manager.subscribeAlarmData({
      query: {
        entityFilter: {
          type: 'entityList',
          entityType: alarmSource.entities[0]?.entityType,
          entityIds: alarmSource.entities.map((entity) => entity.id),
        },
        pageLink,
        alarmFields: alarmSource.dataKeys.map((key) => ({
          type: entityKeyTypeOfDataKey(key.type),
          key: key.name,
        })),
        ...(Array.isArray(alarmSource.filter?.keyFilters) &&
        alarmSource.filter.keyFilters.length > 0
          ? { keyFilters: alarmSource.filter.keyFilters }
          : {}),
      },
    });
    const dispose = subscription.subscribe(() => {
      setAlarms(subscription.getSnapshot());
    });
    return () => {
      dispose();
      subscription.unsubscribe();
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: alarmSignature covers every field the query reads
  }, [manager, alarmSignature]);

  const title = interpolateStateParams(
    resolveI18nMessage(widget.config.title ?? settings.alarmsTitle, locale),
    ctx.states.currentStateParams,
  );
  const showTitle = widget.config.showTitle !== false && title.length > 0;

  const [search, setSearch] = useState('');

  const records = useMemo(() => {
    const rows = alarms.map((alarm) => ({
      key: alarm.id?.id ?? `${alarm.createdTime}`,
      alarm,
    }));
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter(({ alarm }) => {
      const datasource = alarmSource;
      return (datasource?.dataKeys ?? []).some((key) =>
        String(alarmFieldValue(alarm, key) ?? '')
          .toLowerCase()
          .includes(needle),
      );
    });
  }, [alarms, search, alarmSource]);

  const columns = useMemo<
    ColumnsType<{ key: string; alarm: AlarmData }>
  >(() => {
    const result: ColumnsType<{ key: string; alarm: AlarmData }> = [];
    for (const key of alarmSource?.dataKeys ?? []) {
      result.push({
        title: key.label ?? key.name,
        key: key.name,
        ellipsis: true,
        render: (_, { alarm }) => {
          const value = alarmFieldValue(alarm, key);
          if (value === undefined || value === null || value === '') {
            return key.name === 'assignee'
              ? formatMessage({
                  id: 'dashboards.widget.alarms.assignee',
                  defaultMessage: 'Unassigned',
                })
              : null;
          }
          if (key.name === 'createdTime') {
            const ts = Number(value);
            return Number.isFinite(ts)
              ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss')
              : String(value);
          }
          if (key.name === 'severity') {
            return (
              <Tag color={SEVERITY_COLOR[String(value)] ?? 'default'}>
                {String(value)}
              </Tag>
            );
          }
          return String(value);
        },
      });
    }
    return result;
  }, [alarmSource, formatMessage]);

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
      data-widget="system.alarm_widgets.alarms_table"
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
        <Table
          size="small"
          columns={columns}
          dataSource={records}
          rowKey="key"
          locale={{
            emptyText: formatMessage({
              id: 'dashboards.widget.alarms.empty',
              defaultMessage: 'No alarms in the selected window',
            }),
          }}
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
