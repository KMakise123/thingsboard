/**
 * Metrics table + edit panel (M14 wave-5, spec 6.1-13/14; ui-ngx
 * calculated-field-metrics-table/panel parity): a Form.Item-compatible
 * controlled component holding the `Record<metricName, CalculatedFieldAggMetric>`
 * map shared by the two aggregation configurators.
 *
 * simpleMode (ENTITY_AGGREGATION, ngx `simpleMode`): COUNT_UNIQUE is
 * dropped, the filter and value-source inputs disappear (input is always a
 * key) and a defaultValue input appears. The non-simple mode
 * (RELATED_ENTITIES_AGGREGATION) offers the TBEL filter script and the
 * key/function value-source split. Metric test buttons are a registered
 * enhancement (spec 6.6) — not delivered.
 */
import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { CodeEditor } from '@/components/code-editor';
import type { CalculatedFieldAggMetric } from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import {
  CF_AGG_FUNCTIONS,
  CF_ARGUMENT_FORBIDDEN_NAMES,
  CF_ARGUMENT_NAME_PATTERN,
  CF_KEY_PATTERN,
  CF_METRIC_FILTER_DEFAULT_SCRIPT,
  CF_METRIC_MAP_DEFAULT_SCRIPT,
  type CfHostEntityType,
} from './data';

/**
 * ngx metrics table caps metrics at maxArgumentsPerCF - 2 (the aggregation
 * also spends argument slots).
 */
const MAX_METRICS = Math.max(0, CF_LIMITS.maxArgumentsPerCF - 2);

export interface MetricsTableProps {
  value?: Record<string, CalculatedFieldAggMetric>;
  onChange?: (value: Record<string, CalculatedFieldAggMetric>) => void;
  /** Argument names the metric input key can read. */
  argumentNames: Array<string>;
  /** ENTITY_AGGREGATION mode (ngx simpleMode). */
  simpleMode?: boolean;
  hostEntityType: CfHostEntityType | undefined;
  disabled?: boolean;
}

interface MetricFormValues {
  name: string;
  function: string;
  allowFilter: boolean;
  filter: string;
  inputType: 'key' | 'function';
  inputKey?: string;
  inputFunction: string;
  defaultValue?: number;
}

interface PanelState {
  editingName?: string;
  initial: Partial<MetricFormValues>;
}

/** Stored wire shape → panel seed. */
function toPanelValues(
  metric: CalculatedFieldAggMetric,
): Partial<MetricFormValues> {
  return {
    function: metric.function,
    allowFilter: Boolean(metric.filter),
    filter: metric.filter || CF_METRIC_FILTER_DEFAULT_SCRIPT,
    inputType: metric.input?.type ?? 'key',
    inputKey: metric.input?.type === 'key' ? metric.input.key : undefined,
    inputFunction:
      metric.input?.type === 'function'
        ? metric.input.function
        : CF_METRIC_MAP_DEFAULT_SCRIPT,
    defaultValue: metric.defaultValue,
  };
}

/** Panel values → stored wire shape. */
function buildMetric(values: MetricFormValues): CalculatedFieldAggMetric {
  const metric: CalculatedFieldAggMetric = {
    function: values.function as CalculatedFieldAggMetric['function'],
    input:
      values.inputType === 'function'
        ? { type: 'function', function: values.inputFunction }
        : { type: 'key', key: (values.inputKey ?? '').trim() },
  };
  if (values.allowFilter && values.filter.trim()) {
    metric.filter = values.filter;
  }
  if (values.defaultValue !== undefined && values.defaultValue !== null) {
    metric.defaultValue = values.defaultValue;
  }
  return metric;
}

export default function MetricsTable({
  value,
  onChange,
  argumentNames,
  simpleMode,
  hostEntityType,
  disabled,
}: MetricsTableProps) {
  const { formatMessage } = useIntl();
  const [panel, setPanel] = useState<PanelState | null>(null);

  const entries = useMemo(() => Object.entries(value ?? {}), [value]);

  const applyPanel = (name: string, values: MetricFormValues) => {
    const next = { ...(value ?? {}) };
    if (panel?.editingName && panel.editingName !== name) {
      delete next[panel.editingName];
    }
    next[name] = buildMetric(values);
    onChange?.(next);
    setPanel(null);
  };

  const removeMetric = (name: string) => {
    const next = { ...(value ?? {}) };
    delete next[name];
    onChange?.(next);
  };

  const openPanel = (name?: string) => {
    if (name && value?.[name]) {
      setPanel({
        editingName: name,
        initial: toPanelValues(value[name]),
      });
      return;
    }
    setPanel({
      initial: {
        function: 'AVG',
        allowFilter: false,
        filter: CF_METRIC_FILTER_DEFAULT_SCRIPT,
        inputType: 'key',
        inputFunction: CF_METRIC_MAP_DEFAULT_SCRIPT,
      },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Space className="justify-between">
        <Typography.Text>
          {formatMessage({
            id: 'pages.calculatedFields.metrics.title',
            defaultMessage: 'Metrics',
          })}
        </Typography.Text>
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={disabled || entries.length >= MAX_METRICS}
          onClick={() => openPanel()}
        >
          {formatMessage({
            id: 'pages.calculatedFields.metrics.addMetric',
            defaultMessage: 'Add metric',
          })}
        </Button>
      </Space>

      <Table<{ name: string; metric: CalculatedFieldAggMetric }>
        rowKey="name"
        size="small"
        dataSource={entries.map(([name, metric]) => ({ name, metric }))}
        pagination={false}
        locale={{
          emptyText: formatMessage({
            id: 'pages.calculatedFields.metrics.empty',
            defaultMessage: 'No metrics yet — at least one is required',
          }),
        }}
        columns={[
          {
            title: formatMessage({
              id: 'pages.calculatedFields.metrics.metricName',
              defaultMessage: 'Metric name',
            }),
            dataIndex: 'name',
            width: '25%',
            ellipsis: true,
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.metrics.aggregation',
              defaultMessage: 'Aggregation',
            }),
            key: 'function',
            width: '15%',
            render: (_: unknown, row) => row.metric.function,
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.metrics.argumentName',
              defaultMessage: 'Argument name',
            }),
            key: 'input',
            ellipsis: true,
            render: (_: unknown, row) => {
              const input = row.metric.input;
              if (input?.type === 'function') {
                return formatMessage({
                  id: 'pages.calculatedFields.metrics.valueSourceType.function',
                  defaultMessage: 'Function',
                });
              }
              return input?.type === 'key' ? input.key : '';
            },
          },
          ...(simpleMode
            ? []
            : [
                {
                  title: formatMessage({
                    id: 'pages.calculatedFields.metrics.filtered',
                    defaultMessage: 'Filtered',
                  }),
                  key: 'filtered',
                  width: '12%',
                  render: (
                    _: unknown,
                    row: { metric: CalculatedFieldAggMetric },
                  ) => (row.metric.filter ? '✓' : ''),
                },
              ]),
          {
            title: formatMessage({
              id: 'pages.calculatedFields.actions',
              defaultMessage: 'Actions',
            }),
            key: 'actions',
            width: 110,
            render: (_: unknown, row) => (
              <Space size={0}>
                <Button
                  type="text"
                  size="small"
                  disabled={disabled}
                  onClick={() => openPanel(row.name)}
                >
                  {formatMessage({
                    id: 'pages.calculatedFields.edit',
                    defaultMessage: 'Edit',
                  })}
                </Button>
                <Button
                  type="text"
                  size="small"
                  danger
                  disabled={disabled}
                  onClick={() => removeMetric(row.name)}
                >
                  {formatMessage({
                    id: 'pages.calculatedFields.delete',
                    defaultMessage: 'Delete',
                  })}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      {panel && (
        <MetricPanel
          metricName={panel.editingName}
          initial={panel.initial}
          argumentNames={argumentNames}
          usedNames={Object.keys(value ?? {}).filter(
            (name) => name !== panel.editingName,
          )}
          simpleMode={simpleMode}
          hostEntityType={hostEntityType}
          onCancel={() => setPanel(null)}
          onApply={applyPanel}
        />
      )}
    </div>
  );
}

interface MetricPanelProps {
  metricName?: string;
  initial: Partial<MetricFormValues>;
  usedNames: Array<string>;
  argumentNames: Array<string>;
  simpleMode?: boolean;
  hostEntityType: CfHostEntityType | undefined;
  onCancel: () => void;
  onApply: (name: string, values: MetricFormValues) => void;
}

function MetricPanel({
  metricName,
  initial,
  usedNames,
  argumentNames,
  simpleMode,
  onCancel,
  onApply,
}: MetricPanelProps) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<MetricFormValues>();
  const inputType = Form.useWatch('inputType', form);
  const allowFilter = Form.useWatch('allowFilter', form);

  // Mount-only seed — the caller unmounts the panel between opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only form seeding from open-time props
  useEffect(() => {
    form.setFieldsValue({
      name: metricName ?? '',
      function: initial.function ?? 'AVG',
      allowFilter: initial.allowFilter ?? false,
      filter: initial.filter ?? CF_METRIC_FILTER_DEFAULT_SCRIPT,
      inputType: initial.inputType ?? 'key',
      inputKey: initial.inputKey,
      inputFunction: initial.inputFunction ?? CF_METRIC_MAP_DEFAULT_SCRIPT,
      defaultValue: initial.defaultValue,
    });
  }, [form]);

  const apply = () => {
    void form
      .validateFields()
      .then((values) => {
        onApply(values.name.trim(), values);
      })
      .catch(() => undefined);
  };

  return (
    <Drawer
      open
      onClose={onCancel}
      width={520}
      title={formatMessage({
        id: 'pages.calculatedFields.metrics.metricSettings',
        defaultMessage: 'Metric settings',
      })}
      footer={
        <Space className="flex w-full justify-end">
          <Button onClick={onCancel}>
            {formatMessage({
              id: 'pages.calculatedFields.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button type="primary" onClick={apply}>
            {formatMessage({
              id: metricName
                ? 'pages.calculatedFields.apply'
                : 'pages.calculatedFields.add',
              defaultMessage: metricName ? 'Apply' : 'Add',
            })}
          </Button>
        </Space>
      }
    >
      <Form<MetricFormValues> form={form} layout="vertical">
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'pages.calculatedFields.metrics.metricName',
            defaultMessage: 'Metric name',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.calculatedFields.metrics.metricNameRequired',
                defaultMessage: 'Metric name is required.',
              }),
            },
            {
              pattern: CF_ARGUMENT_NAME_PATTERN,
              message: formatMessage({
                id: 'pages.calculatedFields.argument.namePattern',
                defaultMessage:
                  'Only letters, digits and underscores, starting with a letter or underscore.',
              }),
            },
            {
              max: 255,
              message: formatMessage({
                id: 'pages.calculatedFields.metrics.metricNameMaxLength',
                defaultMessage:
                  'Metric name should be less than 256 characters.',
              }),
            },
            {
              validator: (_rule, value: string) => {
                const normalized = (value ?? '').trim().toLowerCase();
                if (
                  normalized &&
                  usedNames.some((name) => name.toLowerCase() === normalized)
                ) {
                  return Promise.reject(
                    new Error(
                      formatMessage({
                        id: 'pages.calculatedFields.metrics.metricNameDuplicate',
                        defaultMessage: 'Metric with such name already exists.',
                      }),
                    ),
                  );
                }
                return Promise.resolve();
              },
            },
            {
              validator: (_rule, value: string) =>
                CF_ARGUMENT_FORBIDDEN_NAMES.includes((value ?? '').trim())
                  ? Promise.reject(
                      new Error(
                        formatMessage(
                          {
                            id: 'pages.calculatedFields.argument.nameForbidden',
                            defaultMessage:
                              "'{name}' is a reserved name and cannot be used.",
                          },
                          { name: (value ?? '').trim() },
                        ),
                      ),
                    )
                  : Promise.resolve(),
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="function"
          label={formatMessage({
            id: 'pages.calculatedFields.metrics.aggregation',
            defaultMessage: 'Aggregation',
          })}
        >
          <Select
            options={CF_AGG_FUNCTIONS.filter(
              (fn) => !simpleMode || fn !== 'COUNT_UNIQUE',
            ).map((fn) => ({
              value: fn,
              label: formatMessage({
                id: `pages.calculatedFields.metrics.agg.${fn}`,
                defaultMessage: fn,
              }),
            }))}
          />
        </Form.Item>

        {!simpleMode && (
          <>
            <Form.Item
              name="allowFilter"
              valuePropName="checked"
              tooltip={formatMessage({
                id: 'pages.calculatedFields.metrics.filterHint',
                defaultMessage:
                  'Enables filtering of entities during aggregation. The filter function must return a boolean value and can use all configured arguments.',
              })}
            >
              <Checkbox>
                {formatMessage({
                  id: 'pages.calculatedFields.metrics.filter',
                  defaultMessage: 'Filter',
                })}
              </Checkbox>
            </Form.Item>
            {allowFilter && (
              <Form.Item
                name="filter"
                label={formatMessage({
                  id: 'pages.calculatedFields.metrics.filter',
                  defaultMessage: 'Filter',
                })}
                required
              >
                {/* Form.Item injects value/onChange over the seed value at
                    runtime (rc-field-form cloneElement wins). */}
                <CodeEditor
                  language="tbel"
                  height="140px"
                  value={CF_METRIC_FILTER_DEFAULT_SCRIPT}
                  onChange={() => undefined}
                />
              </Form.Item>
            )}
          </>
        )}

        <Form.Item
          name="inputType"
          label={formatMessage({
            id: 'pages.calculatedFields.metrics.valueSource',
            defaultMessage: 'Value source',
          })}
          hidden={simpleMode}
        >
          <Select
            disabled={simpleMode}
            options={[
              {
                value: 'key',
                label: formatMessage({
                  id: 'pages.calculatedFields.metrics.valueSourceType.key',
                  defaultMessage: 'Key',
                }),
              },
              ...(simpleMode
                ? []
                : [
                    {
                      value: 'function',
                      label: formatMessage({
                        id: 'pages.calculatedFields.metrics.valueSourceType.function',
                        defaultMessage: 'Function',
                      }),
                    },
                  ]),
            ]}
          />
        </Form.Item>

        {inputType === 'function' ? (
          <Form.Item
            name="inputFunction"
            label={formatMessage({
              id: 'pages.calculatedFields.metrics.mapFunction',
              defaultMessage: 'Map function',
            })}
            required
          >
            <CodeEditor
              language="tbel"
              height="140px"
              value={CF_METRIC_MAP_DEFAULT_SCRIPT}
              onChange={() => undefined}
            />
          </Form.Item>
        ) : (
          <Form.Item
            name="inputKey"
            label={formatMessage({
              id: 'pages.calculatedFields.metrics.argumentName',
              defaultMessage: 'Argument name',
            })}
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage({
                  id: 'pages.calculatedFields.metrics.argumentNameRequired',
                  defaultMessage: 'Argument name is required.',
                }),
              },
              {
                pattern: CF_KEY_PATTERN,
                message: formatMessage({
                  id: 'pages.calculatedFields.argument.keyPattern',
                  defaultMessage: 'Single spaces inside the key are allowed.',
                }),
              },
            ]}
          >
            <Select
              showSearch
              options={argumentNames.map((name) => ({
                value: name,
                label: name,
              }))}
              placeholder={formatMessage({
                id: 'pages.calculatedFields.metrics.argumentName',
                defaultMessage: 'Argument name',
              })}
            />
          </Form.Item>
        )}

        {simpleMode && (
          <Form.Item
            name="defaultValue"
            label={formatMessage({
              id: 'pages.calculatedFields.metrics.defaultValue',
              defaultMessage: 'Default value',
            })}
          >
            <InputNumber className="w-full" />
          </Form.Item>
        )}
      </Form>
      {argumentNames.length === 0 && (
        <Alert
          type="warning"
          showIcon
          message={formatMessage({
            id: 'pages.calculatedFields.metrics.noArguments',
            defaultMessage:
              'Add at least one argument — a metric reads its value from an argument key.',
          })}
        />
      )}
    </Drawer>
  );
}
