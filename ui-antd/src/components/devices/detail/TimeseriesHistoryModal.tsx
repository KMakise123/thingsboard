/**
 * Telemetry history dialog (spec 3.3 latest telemetry): click a key in the
 * latest-telemetry table to open a line chart of that key's history.
 *
 * Timewindow = ui-ngx "last X" presets + custom range; aggregation (with the
 * auto interval heuristic from ./timewindow) rides the same getTimeseries
 * read. Chart chrome comes from the registered tb-light echarts theme and
 * the series color from the first chart-palette slot — no inline hex
 * (ADR 0007); the echarts locale follows the app locale.
 */
import { useQuery } from '@tanstack/react-query';
import { DatePicker, Empty, Modal, Segmented, Select, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import * as echarts from 'echarts';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { getTimeseries } from '@/services/tb/attributes';
import {
  buildEChartsTheme,
  CHART_THEME_NAME,
  getEChartsLocale,
} from '@/theme/charts';
import { AggregationType, EntityType } from '@/types/tb';
import {
  CUSTOM_TIMEWINDOW_ID,
  computeAggregationInterval,
  presetRange,
  TIMEWINDOW_PRESETS,
} from './timewindow';

// Register once per module load; re-registering the same name is a no-op.
echarts.registerTheme(CHART_THEME_NAME, buildEChartsTheme('light'));

const AGG_OPTIONS = [
  AggregationType.NONE,
  AggregationType.AVG,
  AggregationType.MIN,
  AggregationType.MAX,
  AggregationType.SUM,
  AggregationType.COUNT,
];

export default function TimeseriesHistoryModal({
  open,
  deviceId,
  telemetryKey,
  onClose,
}: {
  open: boolean;
  deviceId: string;
  telemetryKey: string | null;
  onClose: () => void;
}) {
  const { formatMessage, locale } = useIntl();
  const [presetId, setPresetId] = useState('15m');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [agg, setAgg] = useState<AggregationType>(AggregationType.NONE);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  const range: [number, number] | null =
    presetId === CUSTOM_TIMEWINDOW_ID && customRange
      ? [customRange[0].valueOf(), customRange[1].valueOf()]
      : presetRange(presetId);

  const historyQuery = useQuery({
    queryKey: [
      'timeseries-history',
      deviceId,
      telemetryKey,
      range?.[0],
      range?.[1],
      agg,
    ],
    queryFn: async () => {
      const [startTs, endTs] = range as [number, number];
      const windowMs = endTs - startTs;
      return getTimeseries(
        { entityType: EntityType.DEVICE, id: deviceId },
        {
          keys: [telemetryKey as string],
          startTs,
          endTs,
          orderBy: 'ASC',
          limit: 10_000,
          agg,
          interval:
            agg === AggregationType.NONE
              ? undefined
              : computeAggregationInterval(windowMs),
        },
      );
    },
    enabled: open && !!telemetryKey && !!range,
  });

  // Chart lifecycle: (re)init on open, resize with the container, dispose
  // on close/unmount.
  useEffect(() => {
    if (!open || !chartRef.current) {
      return;
    }
    if (!chart.current) {
      chart.current = echarts.init(chartRef.current, CHART_THEME_NAME, {
        locale: getEChartsLocale(locale),
        renderer: 'canvas',
      });
    }
    const observer = new ResizeObserver(() => chart.current?.resize());
    observer.observe(chartRef.current);
    return () => {
      observer.disconnect();
    };
  }, [open, locale]);

  useEffect(
    () => () => {
      chart.current?.dispose();
      chart.current = null;
    },
    [],
  );

  const points = (
    (telemetryKey ?? '') === ''
      ? []
      : (historyQuery.data?.[telemetryKey as string] ?? [])
  )
    .map((point) => ({
      ts: point.ts,
      value: Number(point.value),
    }))
    .filter((point) => Number.isFinite(point.value));

  useEffect(() => {
    if (!open || !chart.current) {
      return;
    }
    if (points.length === 0) {
      chart.current.clear();
      return;
    }
    chart.current.setOption({
      animation: false,
      grid: { left: 56, right: 24, top: 32, bottom: 48 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'time',
        axisLabel: {
          hideOverlap: true,
          formatter: (value: number) =>
            dayjs(value).format(presetShortFormat(presetId)),
        },
      },
      yAxis: { type: 'value', scale: true },
      series: [
        {
          name: telemetryKey ?? '',
          type: 'line',
          showSymbol: points.length < 200,
          data: points.map((point) => [point.ts, point.value]),
        },
      ],
    });
  }, [open, points, telemetryKey, presetId]);

  return (
    <Modal
      open={open}
      title={
        telemetryKey
          ? formatMessage(
              {
                id: 'pages.devices.detail.historyTitle',
                defaultMessage: 'Telemetry history: {key}',
              },
              { key: telemetryKey },
            )
          : ''
      }
      onCancel={onClose}
      footer={null}
      width={880}
      destroyOnHidden
    >
      <Space wrap className="mb-3">
        <Segmented
          value={presetId}
          onChange={(next) => setPresetId(next as string)}
          options={[
            ...TIMEWINDOW_PRESETS.map((preset) => ({
              value: preset.id,
              label: formatMessage({
                id: preset.labelKey,
                defaultMessage: preset.defaultMessage,
              }),
            })),
            {
              value: CUSTOM_TIMEWINDOW_ID,
              label: formatMessage({
                id: 'pages.devices.detail.twCustom',
                defaultMessage: 'Custom',
              }),
            },
          ]}
        />
        <DatePicker.RangePicker
          showTime
          value={customRange}
          onChange={(values) => {
            if (values?.[0] && values[1]) {
              setCustomRange([values[0], values[1]]);
              setPresetId(CUSTOM_TIMEWINDOW_ID);
            }
          }}
        />
        <Select<AggregationType>
          className="w-28"
          value={agg}
          onChange={setAgg}
          options={AGG_OPTIONS.map((option) => ({
            value: option,
            label: formatMessage({
              id: `pages.devices.detail.agg.${option}`,
              defaultMessage: option,
            }),
          }))}
        />
      </Space>
      <div ref={chartRef} className="h-80 w-full" />
      {open && !historyQuery.isPending && points.length === 0 ? (
        <div className="py-6">
          <Empty
            description={formatMessage({
              id: 'pages.devices.detail.historyEmpty',
              defaultMessage: 'No numeric data points in this window',
            })}
          />
        </div>
      ) : null}
    </Modal>
  );
}

/** Denser x labels for short windows. */
function presetShortFormat(presetId: string): string {
  const dayScale = ['2d', '7d', '30d'];
  return dayScale.includes(presetId) ? 'MM-DD HH:mm' : 'HH:mm:ss';
}
