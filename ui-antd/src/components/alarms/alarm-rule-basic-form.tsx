/**
 * Shared alarm-rule form core (spec 3.3 entity tab + 3.6 global page).
 *
 * The basic single-threshold rule shape agreed in M1 (one severity + one
 * numeric condition over one entity key) — both the entity-scoped
 * AlarmRulesPanel and the global alarm-rules dialog build the same
 * ALARM-configuration through these helpers. The full condition-tree /
 * SCRIPT editors stay with the v2 editor wave; the backend model carries no
 * schedule field (the old ui-ngx schedule UI belongs to the deprecated
 * device-profile alarms track), so none is offered.
 */
import { Form, InputNumber, Select } from 'antd';
import { useIntl } from 'react-intl';
import type { EntityId } from '@/types/tb';
import { AlarmSeverity } from '@/types/tb';

export type NumericOperation =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'GREATER'
  | 'LESS'
  | 'GREATER_OR_EQUAL'
  | 'LESS_OR_EQUAL';

export const NUMERIC_OPERATIONS: Array<NumericOperation> = [
  'GREATER',
  'GREATER_OR_EQUAL',
  'LESS',
  'LESS_OR_EQUAL',
  'EQUAL',
  'NOT_EQUAL',
];

/** Minimal valid ALARM configuration for the create dialog. */
export function basicAlarmConfiguration(
  entityId: EntityId,
  severity: AlarmSeverity,
  argumentKey: string,
  keyType: 'TS_LATEST' | 'ATTRIBUTE',
  operation: NumericOperation,
  threshold: number,
) {
  return {
    type: 'ALARM',
    arguments: {
      a: {
        refEntityId: entityId,
        refEntityKey:
          keyType === 'TS_LATEST'
            ? { type: keyType, key: argumentKey }
            : { type: keyType, key: argumentKey, scope: 'SERVER_SCOPE' },
      },
    },
    createRules: {
      [severity]: {
        condition: {
          type: 'SIMPLE',
          expression: {
            type: 'SIMPLE',
            filters: [
              {
                argument: 'a',
                valueType: 'NUMERIC',
                operation: 'AND',
                predicates: [
                  {
                    type: 'NUMERIC',
                    operation,
                    value: { staticValue: threshold },
                  },
                ],
              },
            ],
          },
        },
      },
    },
  };
}

export interface AlarmRuleKeyOption {
  value: string;
  label: string;
}

/**
 * The create-only condition inputs (severity / key / operation / threshold),
 * identical for both consumers. Rendered inside a Form instance owned by
 * the caller (names are flat form field names).
 */
export function AlarmRuleConditionFields({
  keyOptions,
  noKeysText,
}: {
  keyOptions: Array<AlarmRuleKeyOption>;
  noKeysText: string;
}) {
  const { formatMessage } = useIntl();
  return (
    <>
      <Form.Item
        name="severity"
        label={formatMessage({
          id: 'pages.devices.detail.alarmSeverity',
          defaultMessage: 'Severity',
        })}
        rules={[
          {
            required: true,
            message: formatMessage({
              id: 'pages.devices.detail.ruleSeverityRequired',
              defaultMessage: 'Severity is required.',
            }),
          },
        ]}
      >
        <Select
          options={(
            [
              AlarmSeverity.CRITICAL,
              AlarmSeverity.MAJOR,
              AlarmSeverity.MINOR,
              AlarmSeverity.WARNING,
              AlarmSeverity.INDETERMINATE,
            ] as Array<AlarmSeverity>
          ).map((severity) => ({
            value: severity,
            label: formatMessage({
              id: `pages.devices.detail.alarmSeverity.${severity}`,
              defaultMessage: severity,
            }),
          }))}
        />
      </Form.Item>
      <Form.Item
        name="argumentKey"
        label={formatMessage({
          id: 'pages.devices.detail.ruleArgument',
          defaultMessage: 'Key to watch',
        })}
        rules={[
          {
            required: true,
            message: formatMessage({
              id: 'pages.devices.detail.cfArgumentRequired',
              defaultMessage: 'Argument key is required.',
            }),
          },
        ]}
      >
        <Select showSearch options={keyOptions} notFoundContent={noKeysText} />
      </Form.Item>
      <div className="flex w-full gap-4">
        <Form.Item
          name="operation"
          className="flex-1"
          label={formatMessage({
            id: 'pages.devices.detail.ruleOperation',
            defaultMessage: 'Condition',
          })}
        >
          <Select
            options={NUMERIC_OPERATIONS.map((operation) => ({
              value: operation,
              label: formatMessage({
                id: `pages.devices.detail.ruleOp.${operation}`,
                defaultMessage: operation,
              }),
            }))}
          />
        </Form.Item>
        <Form.Item
          name="threshold"
          label={formatMessage({
            id: 'pages.devices.detail.ruleThreshold',
            defaultMessage: 'Threshold',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.devices.detail.ruleThresholdRequired',
                defaultMessage: 'Threshold is required.',
              }),
            },
          ]}
        >
          <InputNumber className="w-32" />
        </Form.Item>
      </div>
    </>
  );
}
