/**
 * ENTITY_AGGREGATION configurator (M14 wave-5, spec 6.1-14; ui-ngx
 * tb-entity-aggregation-component "time-series-data-aggregation" parity):
 * arguments pinned to CURRENT TS_LATEST keys without defaultValue (ngx
 * entity-aggregation table), the shared metrics table in simpleMode, the
 * aggregation interval (8 calendar values + tz; CUSTOM unlocks durationSec
 * with the server minimum as the floor), the optional offset (static hint —
 * the ngx moment "next intervals" preview is a registered enhancement),
 * the watermark toggle+duration and produceIntermediateResult, gated by
 * CF_LIMITS.intermediateAggregationIntervalInSecForCF (300s).
 *
 * Output: simpleMode + hideName + disableType (ngx output props).
 */
import { Checkbox, Form, InputNumber, Select, Space, Typography } from 'antd';
import { useIntl } from 'react-intl';
import type {
  AggInterval,
  AggIntervalType,
  CalculatedFieldArgument,
  CalculatedFieldConfiguration,
} from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import ArgumentsTable from './arguments-table';
import {
  type CfHostEntityType,
  intervalDurationSec,
  listTimezones,
  maxOffsetSec,
} from './data';
import MetricsTable from './metrics-table';
import OutputSection from './output-section';

export interface EntityAggregationConfigurationProps {
  value?: CalculatedFieldConfiguration;
  onChange?: (value: CalculatedFieldConfiguration) => void;
  hostEntityType: CfHostEntityType | undefined;
  tenantId: string;
  disabled?: boolean;
}

const AGG_INTERVAL_TYPES: Array<AggIntervalType> = [
  'HOUR',
  'DAY',
  'WEEK',
  'WEEK_SUN_SAT',
  'MONTH',
  'QUARTER',
  'YEAR',
  'CUSTOM',
];

const TIMEZONES = listTimezones();

export default function EntityAggregationConfiguration({
  value,
  onChange,
  hostEntityType,
  tenantId,
  disabled,
}: EntityAggregationConfigurationProps) {
  const { formatMessage } = useIntl();
  const isEntityAgg = value?.type === 'ENTITY_AGGREGATION';
  const argumentsMap: Record<string, CalculatedFieldArgument> = isEntityAgg
    ? (value.arguments ?? {})
    : {};
  const argumentNames = Object.keys(argumentsMap);
  const interval = isEntityAgg ? value.interval : undefined;
  const metrics = isEntityAgg ? value.metrics : {};
  const output = value && 'output' in value ? value.output : undefined;
  const watermark = isEntityAgg ? value.watermark : undefined;
  const produceIntermediateResult =
    isEntityAgg && value.produceIntermediateResult === true;

  const intervalType = interval?.type ?? 'HOUR';
  const tz = interval?.tz ?? '';
  const offsetSec = interval?.offsetSec;
  const durationSec = interval?.type === 'CUSTOM' ? interval.durationSec : 0;
  const currentInterval: AggInterval =
    intervalType === 'CUSTOM'
      ? { type: 'CUSTOM', tz, durationSec: durationSec ?? 0 }
      : { type: intervalType, tz };
  const intermediateAllowed =
    intervalDurationSec(currentInterval) >
    CF_LIMITS.intermediateAggregationIntervalInSecForCF;

  const patch = (next: Record<string, unknown>) => {
    if (!isEntityAgg) {
      return;
    }
    onChange?.({ ...value, ...next } as CalculatedFieldConfiguration);
  };

  const patchInterval = (next: {
    type?: AggIntervalType;
    tz?: string;
    durationSec?: number;
    offsetSec?: number | null;
  }) => {
    if (!interval) {
      return;
    }
    const merged: Record<string, unknown> = {
      type: next.type ?? interval.type,
      tz: next.tz ?? interval.tz,
      ...(next.durationSec !== undefined
        ? { durationSec: next.durationSec }
        : {}),
    };
    if (next.offsetSec !== undefined) {
      if (next.offsetSec === null) {
        delete merged.offsetSec;
      } else {
        merged.offsetSec = next.offsetSec;
      }
    } else if (interval.offsetSec !== undefined) {
      merged.offsetSec = interval.offsetSec;
    }
    patch({ interval: merged });
  };

  return (
    <div className="flex flex-col gap-4">
      <Form.Item
        label={formatMessage({
          id: 'pages.calculatedFields.arguments',
          defaultMessage: 'Arguments',
        })}
        className="mb-0"
        required
        tooltip={formatMessage({
          id: 'pages.calculatedFields.entityAggregation.argumentsHint',
          defaultMessage:
            'Each argument reads a latest-telemetry key of the target entity; the aggregation folds them over the interval.',
        })}
      >
        <ArgumentsTable
          value={argumentsMap}
          onChange={(next) => patch({ arguments: next })}
          isScript={false}
          hostEntityType={hostEntityType}
          tenantId={tenantId}
          disabled={disabled}
          hideDefaultValue
          hideKeyType
        />
      </Form.Item>

      <Form.Item
        label={formatMessage({
          id: 'pages.calculatedFields.metrics.title',
          defaultMessage: 'Metrics',
        })}
        className="mb-0"
        required
      >
        <MetricsTable
          value={metrics}
          onChange={(next) => patch({ metrics: next })}
          argumentNames={argumentNames}
          simpleMode
          hostEntityType={hostEntityType}
          disabled={disabled}
        />
      </Form.Item>

      <div className="flex flex-col gap-2">
        <Typography.Text strong>
          {formatMessage({
            id: 'pages.calculatedFields.entityAggregation.intervalTitle',
            defaultMessage: 'Aggregation interval',
          })}
        </Typography.Text>
        <Space wrap>
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.entityAggregation.intervalType',
              defaultMessage: 'Aggregate interval type',
            })}
            className="mb-0"
          >
            <Select
              value={intervalType}
              disabled={disabled}
              className="w-56"
              onChange={(type) => {
                // A type change invalidates the CUSTOM duration and the
                // offset that may exceed the new period.
                patch({
                  interval: {
                    type,
                    tz,
                    ...(type === 'CUSTOM'
                      ? {
                          durationSec: Math.max(
                            durationSec || 0,
                            CF_LIMITS.minAllowedAggregationIntervalInSecForCF,
                          ),
                        }
                      : {}),
                  },
                });
              }}
              options={AGG_INTERVAL_TYPES.map((type) => ({
                value: type,
                label: formatMessage({
                  id: `pages.calculatedFields.aggregatePeriod.${type}`,
                  defaultMessage: type,
                }),
              }))}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.entityAggregation.timezone',
              defaultMessage: 'Timezone',
            })}
            required
            className="mb-0"
            validateStatus={!tz.trim() ? 'error' : undefined}
            help={
              !tz.trim()
                ? formatMessage({
                    id: 'pages.calculatedFields.entityAggregation.tzRequired',
                    defaultMessage: 'Timezone is required.',
                  })
                : undefined
            }
          >
            <Select
              showSearch
              value={tz || undefined}
              disabled={disabled}
              className="w-64"
              options={TIMEZONES.map((zone) => ({
                value: zone,
                label: zone,
              }))}
              onChange={(next) => patchInterval({ tz: next })}
              placeholder="UTC"
            />
          </Form.Item>
          {intervalType === 'CUSTOM' && (
            <Form.Item
              label={formatMessage({
                id: 'pages.calculatedFields.entityAggregation.intervalValue',
                defaultMessage: 'Aggregate interval value (seconds)',
              })}
              required
              className="mb-0"
              validateStatus={
                (durationSec ?? 0) <
                CF_LIMITS.minAllowedAggregationIntervalInSecForCF
                  ? 'error'
                  : undefined
              }
              help={
                (durationSec ?? 0) <
                CF_LIMITS.minAllowedAggregationIntervalInSecForCF
                  ? formatMessage(
                      {
                        id: 'pages.calculatedFields.entityAggregation.intervalMin',
                        defaultMessage:
                          'Aggregate interval value should be at least {sec} seconds.',
                      },
                      {
                        sec: CF_LIMITS.minAllowedAggregationIntervalInSecForCF,
                      },
                    )
                  : undefined
              }
            >
              <InputNumber
                min={CF_LIMITS.minAllowedAggregationIntervalInSecForCF}
                precision={0}
                value={durationSec}
                disabled={disabled}
                className="w-44"
                onChange={(next) =>
                  patchInterval({
                    durationSec:
                      next ?? CF_LIMITS.minAllowedAggregationIntervalInSecForCF,
                  })
                }
              />
            </Form.Item>
          )}
        </Space>

        <div className="flex flex-col gap-2 rounded border border-solid border-neutral-200 p-3 dark:border-neutral-700">
          <Checkbox
            checked={offsetSec !== undefined}
            disabled={disabled}
            onChange={(event) =>
              patchInterval({ offsetSec: event.target.checked ? 0 : null })
            }
          >
            {formatMessage({
              id: 'pages.calculatedFields.entityAggregation.applyOffset',
              defaultMessage: 'Apply offset to interval boundaries',
            })}
          </Checkbox>
          {offsetSec !== undefined && (
            <>
              <Space wrap>
                <Typography.Text>
                  {formatMessage({
                    id: 'pages.calculatedFields.entityAggregation.offsetValue',
                    defaultMessage: 'Offset (seconds)',
                  })}
                </Typography.Text>
                <InputNumber
                  min={0}
                  max={maxOffsetSec(currentInterval)}
                  precision={0}
                  value={offsetSec}
                  disabled={disabled}
                  onChange={(next) => patchInterval({ offsetSec: next ?? 0 })}
                />
              </Space>
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.calculatedFields.entityAggregation.offsetHint',
                  defaultMessage:
                    'The offset shifts every interval boundary — e.g. an HOUR interval with a 900s offset aggregates 00:15–01:15, 01:15–02:15 and so on (shifted by the timezone).',
                })}
              </Typography.Text>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded border border-solid border-neutral-200 p-3 dark:border-neutral-700">
          <Checkbox
            checked={watermark !== undefined}
            disabled={disabled}
            onChange={(event) =>
              patch({
                watermark: event.target.checked
                  ? { duration: 3600 }
                  : undefined,
              })
            }
          >
            {formatMessage({
              id: 'pages.calculatedFields.entityAggregation.waitDelay',
              defaultMessage: 'Wait delay (watermark)',
            })}
          </Checkbox>
          {watermark !== undefined && (
            <Space wrap>
              <Typography.Text>
                {formatMessage({
                  id: 'pages.calculatedFields.entityAggregation.duration',
                  defaultMessage: 'Duration (seconds)',
                })}
              </Typography.Text>
              <InputNumber
                min={60}
                precision={0}
                value={watermark.duration}
                disabled={disabled}
                onChange={(next) =>
                  patch({ watermark: { duration: next ?? 60 } })
                }
              />
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.calculatedFields.entityAggregation.durationHint',
                  defaultMessage:
                    'Late data arriving within this delay is still counted into the current interval.',
                })}
              </Typography.Text>
            </Space>
          )}
        </div>

        <Checkbox
          checked={produceIntermediateResult}
          disabled={disabled || !intermediateAllowed}
          onChange={(event) =>
            patch({ produceIntermediateResult: event.target.checked })
          }
        >
          {formatMessage({
            id: 'pages.calculatedFields.entityAggregation.produceIntermediateResult',
            defaultMessage: 'Produce intermediate results',
          })}
          {!intermediateAllowed && (
            <Typography.Text type="secondary" className="ml-2">
              {formatMessage(
                {
                  id: 'pages.calculatedFields.entityAggregation.intermediateThreshold',
                  defaultMessage:
                    '(only for intervals longer than {sec} seconds)',
                },
                { sec: CF_LIMITS.intermediateAggregationIntervalInSecForCF },
              )}
            </Typography.Text>
          )}
        </Checkbox>
      </div>

      <OutputSection
        value={output}
        onChange={(next) => patch({ output: next })}
        simpleMode
        hideName
        disableType
        hostEntityType={hostEntityType}
        disabled={disabled}
      />
    </div>
  );
}
