/**
 * Output suite (M14 wave-4, R13; ui-ngx tb-calculate-field-output parity):
 * a Form.Item-compatible controlled component holding the wire `Output`.
 *
 * - output type TIME_SERIES (default) / ATTRIBUTES;
 * - simpleMode (SIMPLE fields only) adds the output key name + decimalsByDefault;
 * - scope select only for ATTRIBUTES on the Device family (SERVER/SHARED);
 * - strategy IMMEDIATE (per-type parameter switches + useCustomTtl) /
 *   RULE_CHAIN (parameters locked); stored rows without a strategy are
 *   normalized to RULE_CHAIN at load (prepareConfiguration, ngx prepareConfig).
 */
import {
  Alert,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd';
import { useIntl } from 'react-intl';
import type {
  AttributesImmediateOutputStrategy,
  AttributesOutput,
  AttributesOutputStrategy,
  Output,
  TimeSeriesImmediateOutputStrategy,
  TimeSeriesOutput,
} from '@/types/tb/calculated-fields';
import {
  attributeScopeEnabled,
  CF_KEY_PATTERN,
  type CfHostEntityType,
} from './data';

export interface OutputSectionProps {
  value?: Output;
  onChange?: (value: Output) => void;
  /** SIMPLE fields render the output key name + decimals inputs. */
  simpleMode: boolean;
  hostEntityType: CfHostEntityType | undefined;
  disabled?: boolean;
}

const OUTPUT_TYPE_OPTIONS = ['TIME_SERIES', 'ATTRIBUTES'] as const;

function defaultTimeSeriesStrategy(): TimeSeriesImmediateOutputStrategy {
  return {
    type: 'IMMEDIATE',
    ttl: 0,
    saveTimeSeries: true,
    saveLatest: true,
    sendWsUpdate: true,
    processCfs: true,
  };
}

function defaultAttributesStrategy(): AttributesImmediateOutputStrategy {
  return {
    type: 'IMMEDIATE',
    updateAttributesOnlyOnValueChange: true,
    sendAttributesUpdatedNotification: false,
    saveAttribute: true,
    sendWsUpdate: true,
    processCfs: true,
  };
}

export default function OutputSection({
  value,
  onChange,
  simpleMode,
  hostEntityType,
  disabled,
}: OutputSectionProps) {
  const { formatMessage } = useIntl();
  const output: Output =
    value ??
    ({
      type: 'TIME_SERIES',
      name: '',
      strategy: defaultTimeSeriesStrategy(),
    } satisfies Output);
  const isAttributes = output.type === 'ATTRIBUTES';
  const strategy = output.strategy;
  const immediate = strategy?.type === 'IMMEDIATE' ? strategy : undefined;
  const useCustomTtl =
    !isAttributes &&
    immediate !== undefined &&
    'ttl' in immediate &&
    immediate.ttl > 0;

  const patch = (next: Partial<Output>) => {
    onChange?.({ ...output, ...next } as Output);
  };

  const switchType = (nextType: 'TIME_SERIES' | 'ATTRIBUTES') => {
    if (nextType === output.type) {
      return;
    }
    const shared: Partial<Output> = { name: output.name };
    if (simpleMode) {
      shared.decimalsByDefault = (output as TimeSeriesOutput).decimalsByDefault;
    }
    onChange?.(
      nextType === 'ATTRIBUTES'
        ? ({
            type: 'ATTRIBUTES',
            scope: 'SERVER_SCOPE',
            strategy: defaultAttributesStrategy(),
            ...shared,
          } as AttributesOutput)
        : ({
            type: 'TIME_SERIES',
            strategy: defaultTimeSeriesStrategy(),
            ...shared,
          } as TimeSeriesOutput),
    );
  };

  const patchStrategy = (
    next: Partial<
      AttributesImmediateOutputStrategy & TimeSeriesImmediateOutputStrategy
    >,
  ) => {
    if (!immediate) {
      return;
    }
    patch({
      strategy: { ...immediate, ...next } as AttributesOutputStrategy & {
        type: 'IMMEDIATE';
      },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Typography.Text strong>
        {formatMessage({
          id: 'pages.calculatedFields.output.title',
          defaultMessage: 'Output',
        })}
      </Typography.Text>
      <Space wrap>
        <Form.Item
          label={formatMessage({
            id: 'pages.calculatedFields.output.type',
            defaultMessage: 'Output type',
          })}
          className="mb-0"
        >
          <Select
            value={output.type}
            disabled={disabled}
            className="w-44"
            onChange={(next) => switchType(next)}
            options={OUTPUT_TYPE_OPTIONS.map((type) => ({
              value: type,
              label: formatMessage({
                id: `pages.calculatedFields.output.type.${type}`,
                defaultMessage: type,
              }),
            }))}
          />
        </Form.Item>

        {isAttributes && (
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.output.scope',
              defaultMessage: 'Scope',
            })}
            className="mb-0"
            tooltip={formatMessage({
              id: 'pages.calculatedFields.output.scopeHint',
              defaultMessage:
                'Attribute scope is selectable for Device-family targets only.',
            })}
          >
            <Select
              value={(output as AttributesOutput).scope ?? 'SERVER_SCOPE'}
              disabled={disabled || !attributeScopeEnabled(hostEntityType)}
              className="w-44"
              onChange={(scope) => patch({ scope } as Partial<Output>)}
              options={['SERVER_SCOPE', 'SHARED_SCOPE'].map((scope) => ({
                value: scope,
                label: scope,
              }))}
            />
          </Form.Item>
        )}
      </Space>

      {simpleMode && (
        <Space wrap align="start">
          <Form.Item
            label={formatMessage({
              id: isAttributes
                ? 'pages.calculatedFields.output.attributeKey'
                : 'pages.calculatedFields.output.timeseriesKey',
              defaultMessage: 'Output key',
            })}
            required
            className="mb-0"
            validateStatus={!(output.name ?? '').trim() ? 'error' : undefined}
            help={
              !(output.name ?? '').trim()
                ? formatMessage({
                    id: 'pages.calculatedFields.output.keyRequired',
                    defaultMessage: 'Output key is required.',
                  })
                : undefined
            }
          >
            <Input
              value={output.name}
              disabled={disabled}
              className="w-64"
              maxLength={255}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.output.decimals',
              defaultMessage: 'Decimals',
            })}
            className="mb-0"
          >
            <InputNumber
              min={0}
              max={15}
              precision={0}
              value={(output as TimeSeriesOutput).decimalsByDefault ?? 0}
              disabled={disabled}
              onChange={(decimals) =>
                patch({ decimalsByDefault: decimals ?? 0 } as Partial<Output>)
              }
            />
          </Form.Item>
        </Space>
      )}
      {simpleMode && output.name && !CF_KEY_PATTERN.test(output.name) && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.calculatedFields.output.keyPattern',
            defaultMessage: 'Single spaces inside the key are allowed.',
          })}
        />
      )}

      <Form.Item
        label={formatMessage({
          id: 'pages.calculatedFields.output.strategy',
          defaultMessage: 'Output strategy',
        })}
        className="mb-0"
        tooltip={formatMessage({
          id: 'pages.calculatedFields.output.strategyHint',
          defaultMessage:
            'IMMEDIATE writes the calculated values to the database directly; RULE_CHAIN forwards them to the rule chain instead.',
        })}
      >
        <Segmented
          value={strategy?.type ?? 'IMMEDIATE'}
          disabled={disabled}
          onChange={(next) =>
            patch({
              strategy:
                next === 'RULE_CHAIN'
                  ? { type: 'RULE_CHAIN' }
                  : isAttributes
                    ? defaultAttributesStrategy()
                    : defaultTimeSeriesStrategy(),
            } as Partial<Output>)
          }
          options={[
            {
              value: 'IMMEDIATE',
              label: formatMessage({
                id: 'pages.calculatedFields.output.strategy.IMMEDIATE',
                defaultMessage: 'Save to database',
              }),
            },
            {
              value: 'RULE_CHAIN',
              label: formatMessage({
                id: 'pages.calculatedFields.output.strategy.RULE_CHAIN',
                defaultMessage: 'Send to rule chain',
              }),
            },
          ]}
        />
      </Form.Item>

      {immediate && (
        <div className="flex flex-col gap-2 rounded border border-solid border-neutral-200 p-3 dark:border-neutral-700">
          {isAttributes ? (
            <>
              <Checkbox
                checked={
                  (immediate as AttributesImmediateOutputStrategy).saveAttribute
                }
                disabled={disabled}
                onChange={(event) =>
                  patchStrategy({ saveAttribute: event.target.checked })
                }
              >
                {formatMessage({
                  id: 'pages.calculatedFields.output.saveAttribute',
                  defaultMessage: 'Save attributes',
                })}
              </Checkbox>
              <Checkbox
                checked={
                  (immediate as AttributesImmediateOutputStrategy)
                    .updateAttributesOnlyOnValueChange
                }
                disabled={disabled}
                onChange={(event) =>
                  patchStrategy({
                    updateAttributesOnlyOnValueChange: event.target.checked,
                  })
                }
              >
                {formatMessage({
                  id: 'pages.calculatedFields.output.updateOnlyOnChange',
                  defaultMessage: 'Update attributes only on value change',
                })}
              </Checkbox>
              <Checkbox
                checked={
                  (immediate as AttributesImmediateOutputStrategy)
                    .sendAttributesUpdatedNotification
                }
                disabled={disabled}
                onChange={(event) =>
                  patchStrategy({
                    sendAttributesUpdatedNotification: event.target.checked,
                  })
                }
              >
                {formatMessage({
                  id: 'pages.calculatedFields.output.sendAttributesUpdatedNotification',
                  defaultMessage: 'Send attributes updated notification',
                })}
              </Checkbox>
            </>
          ) : (
            <>
              <Checkbox
                checked={
                  (immediate as TimeSeriesImmediateOutputStrategy)
                    .saveTimeSeries
                }
                disabled={disabled}
                onChange={(event) =>
                  patchStrategy({ saveTimeSeries: event.target.checked })
                }
              >
                {formatMessage({
                  id: 'pages.calculatedFields.output.saveTimeSeries',
                  defaultMessage: 'Save time series',
                })}
              </Checkbox>
              <Checkbox
                checked={
                  (immediate as TimeSeriesImmediateOutputStrategy).saveLatest
                }
                disabled={disabled}
                onChange={(event) =>
                  patchStrategy({ saveLatest: event.target.checked })
                }
              >
                {formatMessage({
                  id: 'pages.calculatedFields.output.saveLatest',
                  defaultMessage: 'Save to latest telemetry',
                })}
              </Checkbox>
            </>
          )}
          <Checkbox
            checked={immediate.sendWsUpdate}
            disabled={disabled}
            onChange={(event) =>
              patchStrategy({ sendWsUpdate: event.target.checked })
            }
          >
            {formatMessage({
              id: 'pages.calculatedFields.output.sendWsUpdate',
              defaultMessage: 'Send message over WebSocket',
            })}
          </Checkbox>
          <Checkbox
            checked={immediate.processCfs}
            disabled={disabled}
            onChange={(event) =>
              patchStrategy({ processCfs: event.target.checked })
            }
          >
            {formatMessage({
              id: 'pages.calculatedFields.output.processCfs',
              defaultMessage: 'Process other calculated fields',
            })}
          </Checkbox>
          {!isAttributes && (
            <>
              <Checkbox
                checked={useCustomTtl}
                disabled={disabled}
                onChange={(event) =>
                  patchStrategy({ ttl: event.target.checked ? 1 : 0 })
                }
              >
                {formatMessage({
                  id: 'pages.calculatedFields.output.useCustomTtl',
                  defaultMessage: 'Use custom TTL',
                })}
              </Checkbox>
              {useCustomTtl && (
                <Space>
                  <Typography.Text>
                    {formatMessage({
                      id: 'pages.calculatedFields.output.ttl',
                      defaultMessage: 'TTL (seconds)',
                    })}
                  </Typography.Text>
                  <InputNumber
                    min={0}
                    precision={0}
                    value={(immediate as TimeSeriesImmediateOutputStrategy).ttl}
                    disabled={disabled}
                    onChange={(ttl) => patchStrategy({ ttl: ttl ?? 0 })}
                  />
                </Space>
              )}
            </>
          )}
        </div>
      )}

      {strategy?.type === 'RULE_CHAIN' && (
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.calculatedFields.output.ruleChainHint',
            defaultMessage:
              'The calculated values are forwarded to the rule chain — the immediate-write parameters above are disabled.',
          })}
        </Typography.Text>
      )}
    </div>
  );
}
