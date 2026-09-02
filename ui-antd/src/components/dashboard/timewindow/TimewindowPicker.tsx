/**
 * TimewindowPicker — the dashboard global timewindow control (brief §1.6).
 *
 * Panel layout mirrors ui-ngx's timewindow-panel for the v1 subset:
 * realtime/history tabs, the 25 "last X" realtime presets, a custom history
 * range (RangePicker) and the aggregation type with the auto-computed
 * interval (~200 buckets). v1 non-goals: timezone, quick-interval calendar
 * presets, save-as-default (registered omissions).
 *
 * Realtime = WS streaming subscriptions, so there is no auto-refresh preset.
 *
 * Fully controlled: `value` is the Timewindow JSON from
 * `configuration.timewindow`, changes flow up through `onChange` and the
 * page persists them in the URL + query layer.
 */
import { ClockCircleOutlined } from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Popover,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useIntl } from 'react-intl';
import {
  presetIdForWindow,
  resolveTimewindow,
  TIMEWINDOW_PRESETS,
} from '@/core/dashboard/timewindow';
import { AggregationType } from '@/types/tb/telemetry';
import type { Timewindow } from '@/types/tb/timewindow';

const AGG_TYPES: AggregationType[] = [
  AggregationType.NONE,
  AggregationType.MIN,
  AggregationType.MAX,
  AggregationType.AVG,
  AggregationType.SUM,
  AggregationType.COUNT,
];

function formatInterval(ms: number): string {
  if (ms % 86400000 === 0) {
    return `${ms / 86400000}d`;
  }
  if (ms % 3600000 === 0) {
    return `${ms / 3600000}h`;
  }
  if (ms % 60000 === 0) {
    return `${ms / 60000}m`;
  }
  if (ms % 1000 === 0) {
    return `${ms / 1000}s`;
  }
  return `${ms}ms`;
}

export interface TimewindowPickerProps {
  value: Timewindow;
  onChange: (next: Timewindow) => void;
  /** hide the control when settings.showDashboardTimewindow is false. */
  disabled?: boolean;
}

export function TimewindowPicker({
  value,
  onChange,
  disabled,
}: TimewindowPickerProps) {
  const { formatMessage } = useIntl();
  const resolved = resolveTimewindow(value);
  const tab = resolved.tab;

  const presetId =
    tab === 'REALTIME'
      ? presetIdForWindow(value.realtime?.timewindowMs)
      : 'custom';

  const customRange: [Dayjs, Dayjs] | null =
    tab === 'HISTORY' && value.history?.fixedTimewindow
      ? [
          dayjs(value.history.fixedTimewindow.startTimeMs),
          dayjs(value.history.fixedTimewindow.endTimeMs),
        ]
      : null;

  const triggerLabel = customRange
    ? `${customRange[0].format('YYYY-MM-DD HH:mm')} ~ ${customRange[1].format('MM-DD HH:mm')}`
    : formatMessage({
        id:
          TIMEWINDOW_PRESETS.find(
            (preset) =>
              preset.id ===
              presetIdForWindow(resolved.endTs - resolved.startTs),
          )?.labelKey ?? 'dashboards.tw.custom',
        defaultMessage:
          TIMEWINDOW_PRESETS.find(
            (preset) =>
              preset.id ===
              presetIdForWindow(resolved.endTs - resolved.startTs),
          )?.defaultMessage ?? 'Custom',
      });

  const applyPreset = (id: string) => {
    const preset = TIMEWINDOW_PRESETS.find((entry) => entry.id === id);
    if (!preset) {
      return;
    }
    onChange({
      ...value,
      selectedTab: 'REALTIME',
      realtime: { realtimeType: 0, timewindowMs: preset.ms },
    });
  };

  const applyCustomRange = (values: [Dayjs | null, Dayjs | null] | null) => {
    if (!values?.[0] || !values[1]) {
      return;
    }
    onChange({
      ...value,
      selectedTab: 'HISTORY',
      history: {
        historyType: 1,
        fixedTimewindow: {
          startTimeMs: values[0].valueOf(),
          endTimeMs: values[1].valueOf(),
        },
      },
    });
  };

  const setAggType = (type: AggregationType) => {
    const aggregation = { ...(value.aggregation ?? {}), type };
    delete (aggregation as { interval?: number }).interval;
    onChange({ ...value, aggregation });
  };

  const panel = (
    <Space orientation="vertical" size={8} style={{ minWidth: 320 }}>
      <Segmented
        block
        value={tab}
        onChange={(next) => {
          if (next === 'HISTORY') {
            // seed the history window from the resolved realtime bounds
            onChange({
              ...value,
              selectedTab: 'HISTORY',
              history: {
                historyType: 1,
                fixedTimewindow: {
                  startTimeMs: resolved.startTs,
                  endTimeMs: resolved.endTs,
                },
              },
            });
          } else {
            onChange({
              ...value,
              selectedTab: 'REALTIME',
              realtime: {
                realtimeType: 0,
                timewindowMs: resolved.endTs - resolved.startTs,
              },
            });
          }
        }}
        options={[
          {
            value: 'REALTIME',
            label: formatMessage({
              id: 'dashboards.tw.tabRealtime',
              defaultMessage: 'Realtime',
            }),
          },
          {
            value: 'HISTORY',
            label: formatMessage({
              id: 'dashboards.tw.tabHistory',
              defaultMessage: 'History',
            }),
          },
        ]}
      />

      {tab === 'REALTIME' ? (
        <Select<string>
          style={{ width: '100%' }}
          value={presetId}
          onChange={applyPreset}
          options={TIMEWINDOW_PRESETS.map((preset) => ({
            value: preset.id,
            label: formatMessage({
              id: preset.labelKey,
              defaultMessage: preset.defaultMessage,
            }),
          }))}
        />
      ) : (
        <DatePicker.RangePicker
          showTime
          style={{ width: '100%' }}
          value={customRange}
          onChange={applyCustomRange}
        />
      )}

      <Space wrap size={4}>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'dashboards.tw.aggregation',
            defaultMessage: 'Aggregation',
          })}
          :
        </Typography.Text>
        <Select<AggregationType>
          style={{ width: 92 }}
          value={resolved.aggType}
          onChange={setAggType}
          options={AGG_TYPES.map((type) => ({
            value: type,
            label: type,
          }))}
        />
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'dashboards.tw.aggInterval',
            defaultMessage: 'Aggregation interval',
          })}
          :{' '}
          {resolved.aggIntervalMs
            ? formatInterval(resolved.aggIntervalMs)
            : formatMessage({
                id: 'dashboards.tw.auto',
                defaultMessage: 'auto',
              })}
        </Typography.Text>
      </Space>
    </Space>
  );

  return (
    <Popover
      content={panel}
      trigger="click"
      placement="bottomRight"
      arrow={false}
    >
      <Button icon={<ClockCircleOutlined />} disabled={disabled}>
        <span data-testid="tw-picker-label">{triggerLabel}</span>
      </Button>
    </Popover>
  );
}
