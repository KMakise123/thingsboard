/**
 * system.analogue_gauges.radial_gauge — gauge representative (brief §6).
 *
 * No demo anchor uses a gauge; the spec keeps one representative to prove
 * the shape. Config contract follows the TB analogue-gauge family:
 * settings.minValue/maxValue/hideValue/showMinMax with widget-level
 * units/decimals, value bound to the first datasource dataKey (entity
 * datasources read latest telemetry, entityCount bindings read the live
 * count through the shared useWidgetValues channel).
 */

import type * as echarts from 'echarts';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { resolveSeriesColor } from '@/theme/charts';
import type { WidgetComponentProps } from './contract';
import {
  interpolateStateParams,
  resolveI18nMessage,
  useEcharts,
  useWidgetValues,
} from './hooks';

interface GaugeSettings {
  minValue?: number;
  maxValue?: number;
  hideValue?: boolean;
  showMinMax?: boolean;
  showUnitTitle?: boolean;
  unitTitle?: string;
}

export default function RadialGauge({ ctx, widget }: WidgetComponentProps) {
  const { locale } = useIntl();
  const settings = (widget.config.settings ?? {}) as GaugeSettings;
  const values = useWidgetValues(ctx.datasources);

  const firstKey = ctx.datasources[0]?.dataKeys?.[0];
  const binding = firstKey ? (firstKey.label ?? firstKey.name) : '';
  const rawValue = values[binding];
  const value = Number(rawValue);

  const decimals = firstKey?.decimals ?? widget.config.decimals;
  const units = firstKey?.units ?? widget.config.units;
  const color = resolveSeriesColor(0, firstKey?.color);

  const title = interpolateStateParams(
    resolveI18nMessage(widget.config.title, locale),
    ctx.states.currentStateParams,
  );
  const showTitle = widget.config.showTitle !== false && title.length > 0;

  const { setNode, node: chartNode, paint, clear } = useEcharts(locale);

  const seriesName = useMemo(
    () =>
      interpolateStateParams(title || binding, ctx.states.currentStateParams),
    [title, binding, ctx.states.currentStateParams],
  );

  useEffect(() => {
    if (!Number.isFinite(value)) {
      clear();
      return;
    }
    const min = settings.minValue ?? 0;
    const max = settings.maxValue ?? 100;
    paint({
      series: [
        {
          type: 'gauge',
          name: seriesName,
          min,
          max,
          startAngle: 210,
          endAngle: -30,
          progress: {
            show: true,
            width: 12,
            itemStyle: { color },
          },
          axisLine: { lineStyle: { width: 12 } },
          axisTick: { show: settings.showMinMax === true, distance: -14 },
          splitLine: {
            show: settings.showMinMax === true,
            distance: -18,
            length: 8,
          },
          axisLabel: {
            show: settings.showMinMax === true,
            distance: 22,
            formatter: (part: number) => String(part),
          },
          pointer: { show: settings.hideValue !== true, itemStyle: { color } },
          anchor: { show: settings.hideValue !== true, itemStyle: { color } },
          title: { show: false },
          detail: {
            show: settings.hideValue !== true,
            valueAnimation: false,
            formatter: (part: number) =>
              units
                ? `${part.toFixed(decimals ?? 0)} ${units}`
                : part.toFixed(decimals ?? 0),
            color,
            fontSize: 20,
            offsetCenter: [0, '70%'],
          },
          data: [{ value, name: seriesName }],
        },
      ],
    } satisfies echarts.EChartsOption);
  }, [
    value,
    settings.minValue,
    settings.maxValue,
    settings.hideValue,
    settings.showMinMax,
    seriesName,
    color,
    decimals,
    units,
    paint,
    clear,
  ]);

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      data-widget="system.analogue_gauges.radial_gauge"
    >
      {showTitle ? <div style={{ padding: '4px 8px 0' }}>{title}</div> : null}
      <div ref={setNode} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
