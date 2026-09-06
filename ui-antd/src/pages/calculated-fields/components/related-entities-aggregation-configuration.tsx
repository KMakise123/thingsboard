/**
 * RELATED_ENTITIES_AGGREGATION configurator (M14 wave-5, spec 6.1-13;
 * ui-ngx tb-related-entities-aggregation-component parity): relation
 * (direction default FROM), the variant arguments table (source pinned to
 * the CURRENT entity, defaultValue REQUIRED — the ngx panel additionally
 * filters the key autocomplete by the relation path; antd keeps the free
 * key input established in wave-4, so the relation filter surfaces as the
 * hint text), the shared metrics table, the deduplication interval
 * (default/bottom = CF_LIMITS.minAllowedDeduplicationIntervalInSecForCF)
 * and useLatestTs with a TIME_SERIES output. scheduledUpdateInterval is
 * hard-stamped to the server minimum on every change (ngx updatedModel).
 */
import {
  AutoComplete,
  Checkbox,
  Form,
  InputNumber,
  Select,
  Space,
  Typography,
} from 'antd';
import { useIntl } from 'react-intl';
import type {
  CalculatedFieldArgument,
  CalculatedFieldConfiguration,
  EntitySearchDirection,
} from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import ArgumentsTable from './arguments-table';
import { CF_RELATION_TYPES, type CfHostEntityType } from './data';
import MetricsTable from './metrics-table';
import OutputSection from './output-section';

export interface RelatedAggregationConfigurationProps {
  value?: CalculatedFieldConfiguration;
  onChange?: (value: CalculatedFieldConfiguration) => void;
  hostEntityType: CfHostEntityType | undefined;
  tenantId: string;
  disabled?: boolean;
}

const DIRECTION_OPTIONS: Array<EntitySearchDirection> = ['FROM', 'TO'];

export default function RelatedAggregationConfiguration({
  value,
  onChange,
  hostEntityType,
  tenantId,
  disabled,
}: RelatedAggregationConfigurationProps) {
  const { formatMessage } = useIntl();
  const isRelated = value?.type === 'RELATED_ENTITIES_AGGREGATION';
  const argumentsMap: Record<string, CalculatedFieldArgument> = isRelated
    ? (value.arguments ?? {})
    : {};
  const argumentNames = Object.keys(argumentsMap);
  const relation = isRelated ? value.relation : undefined;
  const output = value && 'output' in value ? value.output : undefined;
  const useLatestTs = isRelated && value.useLatestTs === true;

  const patch = (next: Record<string, unknown>) => {
    if (!isRelated) {
      return;
    }
    onChange?.({
      ...value,
      ...next,
      // ngx updatedModel hard-stamps the scheduled update interval to the
      // server minimum for this type.
      scheduledUpdateInterval:
        CF_LIMITS.minAllowedScheduledUpdateIntervalInSecForCF,
    } as CalculatedFieldConfiguration);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Typography.Text strong>
          {formatMessage({
            id: 'pages.calculatedFields.relatedAggregation.relationTitle',
            defaultMessage: 'Related entities relation',
          })}
        </Typography.Text>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.calculatedFields.relatedAggregation.relationHint',
            defaultMessage:
              'Aggregation runs over the entities reached through this relation; argument keys are read from the current entity and a default value is required.',
          })}
        </Typography.Text>
        <Space wrap>
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.direction',
              defaultMessage: 'Relation direction',
            })}
            className="mb-0"
          >
            <Select
              value={relation?.direction ?? 'FROM'}
              disabled={disabled}
              className="w-52"
              onChange={(direction) =>
                patch({
                  relation: {
                    ...(relation ?? { relationType: 'Contains' }),
                    direction,
                  },
                })
              }
              options={DIRECTION_OPTIONS.map((direction) => ({
                value: direction,
                label: formatMessage({
                  id: `pages.calculatedFields.propagation.direction.${direction}`,
                  defaultMessage: direction,
                }),
              }))}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.relationType',
              defaultMessage: 'Relation type',
            })}
            required
            className="mb-0"
          >
            <AutoComplete
              value={relation?.relationType ?? 'Contains'}
              disabled={disabled}
              className="w-52"
              options={CF_RELATION_TYPES.map((type) => ({
                value: type,
                label: type,
              }))}
              filterOption={(input, option) =>
                (option?.value ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(next) =>
                patch({
                  relation: {
                    ...(relation ?? { direction: 'FROM' }),
                    relationType: next,
                  },
                })
              }
            />
          </Form.Item>
        </Space>
      </div>

      <Form.Item
        label={formatMessage({
          id: 'pages.calculatedFields.arguments',
          defaultMessage: 'Arguments',
        })}
        className="mb-0"
        required
        tooltip={formatMessage({
          id: 'pages.calculatedFields.relatedAggregation.argumentsHint',
          defaultMessage:
            'Each argument reads a key of the current entity and must carry a default value for entities without data yet.',
        })}
      >
        <ArgumentsTable
          value={argumentsMap}
          onChange={(next) => patch({ arguments: next })}
          isScript={false}
          hostEntityType={hostEntityType}
          tenantId={tenantId}
          disabled={disabled}
          defaultValueRequired
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
          value={isRelated ? value.metrics : {}}
          onChange={(next) => patch({ metrics: next })}
          argumentNames={argumentNames}
          hostEntityType={hostEntityType}
          disabled={disabled}
        />
      </Form.Item>

      <Form.Item
        label={formatMessage({
          id: 'pages.calculatedFields.relatedAggregation.deduplicationInterval',
          defaultMessage: 'Deduplication interval (seconds)',
        })}
        required
        className="mb-0"
        tooltip={formatMessage({
          id: 'pages.calculatedFields.relatedAggregation.deduplicationHint',
          defaultMessage: 'Minimum time between telemetry aggregations.',
        })}
      >
        <Space>
          <InputNumber
            value={
              isRelated
                ? value.deduplicationIntervalInSec
                : CF_LIMITS.minAllowedDeduplicationIntervalInSecForCF
            }
            min={CF_LIMITS.minAllowedDeduplicationIntervalInSecForCF}
            precision={0}
            disabled={disabled}
            className="w-32"
            onChange={(deduplicationIntervalInSec) =>
              patch({
                deduplicationIntervalInSec:
                  deduplicationIntervalInSec ??
                  CF_LIMITS.minAllowedDeduplicationIntervalInSecForCF,
              })
            }
          />
          <Typography.Text type="secondary">
            {formatMessage(
              {
                id: 'pages.calculatedFields.relatedAggregation.deduplicationMin',
                defaultMessage: 'At least {sec} seconds.',
              },
              { sec: CF_LIMITS.minAllowedDeduplicationIntervalInSecForCF },
            )}
          </Typography.Text>
        </Space>
      </Form.Item>

      <Checkbox
        checked={useLatestTs}
        disabled={disabled || output?.type !== 'TIME_SERIES'}
        onChange={(event) => patch({ useLatestTs: event.target.checked })}
      >
        {formatMessage({
          id: 'pages.calculatedFields.useLatestTs',
          defaultMessage: 'Use latest telemetry for calculations',
        })}
        {output?.type !== 'TIME_SERIES' && (
          <Typography.Text type="secondary" className="ml-2">
            {formatMessage({
              id: 'pages.calculatedFields.useLatestTsTimeseriesOnly',
              defaultMessage: '(time series output only)',
            })}
          </Typography.Text>
        )}
      </Checkbox>

      <OutputSection
        value={output}
        onChange={(next) => patch({ output: next })}
        simpleMode
        hideName
        hostEntityType={hostEntityType}
        disabled={disabled}
      />
    </div>
  );
}
