/**
 * system.time_series_chart — echarts line/bar widget (brief §6).
 *
 * Anchor reality (rule_engine ×2, thermostats ×2, api_usage ×29): series per
 * datasource-dataKey-entity; per-key settings carry the series shape
 * (settings.type line|bar, lineSettings.smooth/lineWidth/fillAreaSettings),
 * legend stats + latestKey thresholds + dataZoom ride config.settings.
 * Titles/labels may carry {i18n:} placeholders (rule_engine anchor).
 *
 * Data channel: ENTITY_DATA tsCmd/historyCmd via useEntityTimeseries —
 * realtime windows stream, history windows read once; dashboard/widget
 * aggregation (interval buckets) applies server-side.
 */
import { Empty, Typography } from 'antd';
import dayjs from 'dayjs';
import type * as echarts from 'echarts';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { ResolvedEntity } from '@/core/dashboard/alias-resolver';
import type { ExpandedDatasource } from '@/core/dashboard/datasources';
import type { ResolvedTimewindow } from '@/core/dashboard/timewindow';
import { resolveSeriesColor } from '@/theme/charts';
import type { TsValue } from '@/types/tb';
import type { DataKey } from '@/types/tb/widget';
import type { WidgetComponentProps } from './contract';
import {
  formatWidgetValue,
  interpolateStateParams,
  type LatestKeyRef,
  resolveI18nMessage,
  useEcharts,
  useEntityTimeseries,
} from './hooks';

/** Per-key series shape (anchor dataKey.settings). */
interface SeriesKeySettings {
  type?: 'line' | 'bar';
  showInLegend?: boolean;
  dataHiddenByDefault?: boolean;
  lineSettings?: {
    showLine?: boolean;
    smooth?: boolean;
    step?: boolean;
    lineWidth?: number;
    lineType?: string;
    showPoints?: boolean;
    pointSize?: number;
    fillAreaSettings?: { type?: string; opacity?: number };
  };
  barSettings?: {
    showBorder?: boolean;
    borderWidth?: number;
    borderRadius?: number;
  };
}

interface ChartThreshold {
  type?: string;
  lineColor?: string;
  lineType?: string;
  lineWidth?: number;
  showLabel?: boolean;
  labelColor?: string;
  units?: string | null;
  decimals?: number | null;
  latestKey?: string;
  latestKeyType?: string;
  value?: number;
}

interface LegendStatConfig {
  showMin?: boolean;
  showMax?: boolean;
  showAvg?: boolean;
  showTotal?: boolean;
  showLatest?: boolean;
  position?: string;
  direction?: string;
}

interface ChartSettings {
  showLegend?: boolean;
  legendConfig?: LegendStatConfig;
  thresholds?: Array<ChartThreshold>;
  dataZoom?: boolean;
  stack?: boolean;
  yAxes?: Record<
    string,
    {
      min?: number | null;
      max?: number | null;
      units?: string | null;
      decimals?: number | null;
    }
  >;
}

interface WidgetUnits {
  units?: string;
  decimals?: number;
}

/** Numeric points of one wire series, clipped to the resolved window. */
function numericPoints(
  points: Array<TsValue> | undefined,
  window: ResolvedTimewindow,
): Array<{ ts: number; value: number }> {
  return (points ?? [])
    .map((point) => ({ ts: point.ts, value: Number(point.value) }))
    .filter(
      (point) =>
        Number.isFinite(point.value) &&
        point.ts >= window.startTs &&
        point.ts <= window.endTs,
    );
}

function collectLatestKeys(
  datasources: Array<ExpandedDatasource>,
): Array<LatestKeyRef> {
  const out = new Map<string, LatestKeyRef>();
  for (const datasource of datasources) {
    for (const key of datasource.latestDataKeys ?? []) {
      out.set(`${key.type}:${key.name}`, {
        type: entityKeyTypeOf(key.type),
        key: key.name,
      });
    }
  }
  return [...out.values()];
}

/** DataKeyType → EntityKeyType for latestCmd refs. */
function entityKeyTypeOf(type: string): string {
  switch (type) {
    case 'timeseries':
      return 'TIME_SERIES';
    case 'entityField':
      return 'ENTITY_FIELD';
    case 'alarm':
      return 'ALARM_FIELD';
    default:
      return 'ATTRIBUTE';
  }
}

export default function TimeSeriesChart({ ctx, widget }: WidgetComponentProps) {
  const { formatMessage, locale } = useIntl();
  const settings = (widget.config.settings ?? {}) as ChartSettings;
  const widgetUnits: WidgetUnits = {
    units: widget.config.units,
    decimals: widget.config.decimals,
  };

  const entities = useMemo(
    () => ctx.datasources.flatMap((datasource) => datasource.entities),
    [ctx.datasources],
  );
  const timeseriesKeys = useMemo(() => {
    const names: Array<string> = [];
    for (const datasource of ctx.datasources) {
      for (const key of datasource.dataKeys) {
        if (key.type === 'timeseries' && !names.includes(key.name)) {
          names.push(key.name);
        }
      }
    }
    return names;
  }, [ctx.datasources]);
  const latestKeys = useMemo(
    () => collectLatestKeys(ctx.datasources),
    [ctx.datasources],
  );

  const { rows, window: resolvedWindow } = useEntityTimeseries({
    entities,
    timeseriesKeys,
    latestKeys,
    effectiveTimewindow: ctx.effectiveTimewindow,
  });

  const title = interpolateStateParams(
    resolveI18nMessage(widget.config.title, locale),
    ctx.states.currentStateParams,
  );
  const showTitle = widget.config.showTitle !== false && title.length > 0;

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
      data-widget="system.time_series_chart"
    >
      {showTitle ? (
        <Typography.Text strong ellipsis style={{ padding: '4px 8px 0' }}>
          {title}
        </Typography.Text>
      ) : null}
      <ChartBody
        ctx={ctx}
        settings={settings}
        widgetUnits={widgetUnits}
        rows={rows}
        resolvedWindow={resolvedWindow}
        timeseriesKeys={timeseriesKeys}
        entities={entities}
        formatMessage={formatMessage}
        locale={locale}
        showLegend={settings.showLegend !== false}
      />
    </div>
  );
}

/** Internal: builds series and owns the echarts lifecycle. */
function ChartBody({
  ctx,
  settings,
  widgetUnits,
  rows,
  resolvedWindow,
  timeseriesKeys,
  entities,
  formatMessage,
  locale,
  showLegend,
}: {
  ctx: WidgetComponentProps['ctx'];
  settings: ChartSettings;
  widgetUnits: WidgetUnits;
  rows: ReturnType<typeof useEntityTimeseries>['rows'];
  resolvedWindow: ResolvedTimewindow;
  timeseriesKeys: Array<string>;
  entities: Array<ResolvedEntity>;
  formatMessage: ReturnType<typeof useIntl>['formatMessage'];
  locale: string;
  showLegend: boolean;
}) {
  const { setNode, node: chartNode, paint, clear } = useEcharts(locale);

  const seriesSpecs = useMemo(() => {
    const specs: Array<{
      name: string;
      color: string;
      key: DataKey;
      points: Array<{ ts: number; value: number }>;
    }> = [];
    const labelCounts = new Map<string, number>();
    const entityNameById = new Map(
      entities.map((entity) => [entity.id, entity.name ?? entity.label ?? '']),
    );
    for (const datasource of ctx.datasources) {
      for (const key of datasource.dataKeys) {
        if (key.type !== 'timeseries') {
          continue;
        }
        const label = key.label ?? key.name;
        labelCounts.set(
          label,
          (labelCounts.get(label) ?? 0) + datasource.entities.length,
        );
      }
    }
    for (const datasource of ctx.datasources) {
      for (const key of datasource.dataKeys) {
        if (key.type !== 'timeseries') {
          continue;
        }
        for (const entity of datasource.entities) {
          const row = rows.find(
            (candidate) =>
              (typeof candidate.entityId === 'string'
                ? candidate.entityId
                : candidate.entityId.id) === entity.id,
          );
          const label = key.label ?? key.name;
          const disambiguated = (labelCounts.get(label) ?? 0) > 1;
          const entityName = entity.name ?? entityNameById.get(entity.id) ?? '';
          const points = numericPoints(
            row?.timeseries?.[key.name],
            resolvedWindow,
          );
          if (points.length === 0) {
            continue;
          }
          specs.push({
            name:
              disambiguated && entityName ? `${entityName} ${label}` : label,
            color: resolveSeriesColor(specs.length, key.color),
            key,
            points,
          });
        }
      }
    }
    return specs;
  }, [ctx.datasources, rows, resolvedWindow, entities]);

  const hasData = seriesSpecs.length > 0;

  // Repaint on data/settings changes (TimeseriesHistoryModal template).
  // biome-ignore lint/correctness/useExhaustiveDependencies: chartNode is a mount-timing dependency — the chart div mounts only once data arrives (empty state), and without it in the deps the first paint never runs (TimeseriesHistoryModal chartNode rationale)
  useEffect(() => {
    if (!hasData) {
      clear();
      return;
    }
    const span = resolvedWindow.endTs - resolvedWindow.startTs;
    const timeFormat = span >= 2 * 24 * 3_600_000 ? 'MM-DD HH:mm' : 'HH:mm:ss';

    const stats = new Map(
      seriesSpecs.map((spec) => {
        const values = spec.points.map((point) => point.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg =
          values.reduce((sum, value) => sum + value, 0) / values.length;
        const parts: Array<string> = [];
        if (settings.legendConfig?.showMin) {
          parts.push(
            `${formatMessage({ id: 'dashboards.widget.legend.min', defaultMessage: 'min' })} ${formatWidgetValue(min, spec.key.decimals ?? widgetUnits.decimals)}`,
          );
        }
        if (settings.legendConfig?.showMax) {
          parts.push(
            `${formatMessage({ id: 'dashboards.widget.legend.max', defaultMessage: 'max' })} ${formatWidgetValue(max, spec.key.decimals ?? widgetUnits.decimals)}`,
          );
        }
        if (settings.legendConfig?.showAvg) {
          parts.push(
            `${formatMessage({ id: 'dashboards.widget.legend.avg', defaultMessage: 'avg' })} ${formatWidgetValue(avg, spec.key.decimals ?? widgetUnits.decimals)}`,
          );
        }
        if (settings.legendConfig?.showTotal) {
          const total = values.reduce((sum, value) => sum + value, 0);
          parts.push(
            `${formatMessage({ id: 'dashboards.widget.legend.total', defaultMessage: 'total' })} ${formatWidgetValue(total, spec.key.decimals ?? widgetUnits.decimals)}`,
          );
        }
        if (settings.legendConfig?.showLatest) {
          parts.push(
            `${formatMessage({ id: 'dashboards.widget.legend.latest', defaultMessage: 'latest' })} ${formatWidgetValue(values[values.length - 1], spec.key.decimals ?? widgetUnits.decimals)}`,
          );
        }
        return [
          spec.name,
          parts.length ? `${spec.name} ${parts.join(' · ')}` : spec.name,
        ] as const;
      }),
    );

    const legendAt =
      settings.legendConfig?.position === 'left'
        ? 'left'
        : settings.legendConfig?.position === 'right'
          ? 'right'
          : settings.legendConfig?.position === 'top'
            ? 'top'
            : 'bottom';
    const legendVertical =
      (legendAt === 'left' || legendAt === 'right') &&
      settings.legendConfig?.direction !== 'row';

    const series = seriesSpecs.map((spec, index) => {
      const keySettings = (spec.key.settings ?? {}) as SeriesKeySettings;
      const isBar = keySettings.type === 'bar';
      const decimals = spec.key.decimals ?? widgetUnits.decimals;
      const units = spec.key.units ?? widgetUnits.units;
      const base: echarts.SeriesOption = {
        name: spec.name,
        type: isBar ? 'bar' : 'line',
        color: spec.color,
        barMaxWidth: isBar ? 40 : undefined,
        stack: isBar && settings.stack ? 'total' : undefined,
        emphasis: { focus: 'series' },
        tooltip: {
          valueFormatter: (value) => formatWidgetValue(value, decimals, units),
        },
      };
      if (isBar) {
        const bar = keySettings.barSettings;
        return {
          ...base,
          itemStyle: {
            color: spec.color,
            borderColor: bar?.showBorder ? spec.color : 'transparent',
            borderWidth: bar?.showBorder ? (bar.borderWidth ?? 2) : 0,
            borderRadius: bar?.borderRadius ?? 0,
          },
        } satisfies echarts.SeriesOption;
      }
      const line = keySettings.lineSettings;
      const fillType = line?.fillAreaSettings?.type ?? 'none';
      const showArea = fillType !== 'none' && fillType !== '';
      return {
        ...base,
        lineStyle: {
          // echarts LineStyle has no `show`; hide via opacity
          opacity: line?.showLine === false ? 0 : 1,
          width: line?.lineWidth ?? 2.5,
          type: line?.lineType === 'dashed' ? 'dashed' : 'solid',
        },
        smooth: line?.smooth === true,
        step: line?.step === true ? ('start' as const) : false,
        showSymbol: line?.showPoints === true,
        symbolSize: line?.pointSize ?? 8,
        areaStyle: showArea
          ? { opacity: line?.fillAreaSettings?.opacity ?? 0.4 }
          : undefined,
        // the latestKey threshold rides the first series' markLine
        ...(index === 0 ? { markLine: buildMarkLine(settings, rows) } : {}),
      } satisfies echarts.SeriesOption;
    });

    paint({
      animation: false,
      grid: {
        left: 56,
        right: 24,
        top: 32,
        bottom: settings.dataZoom ? 56 : legendAt === 'bottom' ? 56 : 40,
      },
      tooltip: { trigger: 'axis' },
      legend: showLegend
        ? {
            type: 'scroll',
            ...(legendVertical
              ? { orient: 'vertical' as const }
              : { orient: 'horizontal' as const }),
            [legendAt]: 8,
            formatter: (name: string) => stats.get(name) ?? name,
            selected: Object.fromEntries(
              seriesSpecs.map((spec) => [
                spec.name,
                !(spec.key.settings as SeriesKeySettings | undefined)
                  ?.dataHiddenByDefault,
              ]),
            ),
          }
        : undefined,
      xAxis: {
        type: 'time',
        axisLabel: {
          hideOverlap: true,
          formatter: (value: number) => dayjs(value).format(timeFormat),
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        min: settings.yAxes?.default?.min ?? undefined,
        max: settings.yAxes?.default?.max ?? undefined,
      },
      dataZoom: settings.dataZoom
        ? [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 8 }]
        : undefined,
      series,
    });
  }, [
    seriesSpecs,
    settings,
    widgetUnits,
    resolvedWindow,
    showLegend,
    formatMessage,
    paint,
    clear,
    rows,
    chartNode,
    hasData,
  ]);

  if (!hasData) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        {timeseriesKeys.length === 0 ? null : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={formatMessage({
              id: 'dashboards.widget.chart.noData',
              defaultMessage: 'No numeric data in this window',
            })}
          />
        )}
      </div>
    );
  }
  return <div ref={setNode} style={{ flex: 1, minHeight: 0 }} />;
}

/**
 * latestKey thresholds resolve against the subscription's latest values
 * (anchor: temperatureAlarmThreshold attribute riding latestDataKeys).
 */
function buildMarkLine(
  settings: ChartSettings,
  rows: ReturnType<typeof useEntityTimeseries>['rows'],
): echarts.SeriesOption['markLine'] {
  const threshold = (settings.thresholds ?? []).find(
    (candidate) => candidate.type === 'latestKey' && candidate.latestKey,
  );
  if (!threshold) {
    return undefined;
  }
  const keyType = (threshold.latestKeyType ?? 'attribute').toUpperCase();
  let raw: unknown = threshold.value;
  for (const row of rows) {
    const value = row.latest?.[keyType]?.[threshold.latestKey as string]?.value;
    if (value !== undefined && value !== null) {
      raw = value;
      break;
    }
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return {
    silent: true,
    symbol: 'none',
    lineStyle: {
      color: threshold.lineColor,
      width: threshold.lineWidth ?? 2,
      type: threshold.lineType === 'dashed' ? 'dashed' : 'solid',
    },
    label: {
      show: threshold.showLabel !== false,
      position: 'insideEndTop',
      formatter: formatWidgetValue(
        numeric,
        threshold.decimals,
        threshold.units,
      ),
      color: threshold.labelColor,
    },
    data: [{ yAxis: numeric }],
  };
}
