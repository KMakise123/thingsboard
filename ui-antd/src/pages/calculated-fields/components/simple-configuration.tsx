/**
 * SIMPLE / SCRIPT configurator (M14 wave-4, spec 6.1-8/9; ui-ngx
 * tb-simple-configuration parity — one component, isScript branch).
 *
 * SIMPLE: arguments table (Rolling rejected), plain expression Input
 * (required, ≤255), useLatestTs only with a TIME_SERIES output.
 * SCRIPT: CodeEditor(language='tbel') with the argument-name completion
 * source (R14: tbelCompletionSource({contextVariables: ['ctx', ...names]})),
 * the `function calculate(...)` signature line, the ngx default script and
 * a Test button (disabled while the arguments are invalid).
 */

import { PlayCircleOutlined } from '@ant-design/icons';
import { autocompletion } from '@codemirror/autocomplete';
import { Alert, Button, Checkbox, Form, Input, Space, Typography } from 'antd';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { CodeEditor } from '@/components/code-editor';
import { tbelCompletionSource } from '@/components/code-editor/tbel';
import type {
  CalculatedFieldArgument,
  CalculatedFieldConfiguration,
} from '@/types/tb/calculated-fields';
import ArgumentsTable from './arguments-table';
import {
  CALCULATED_FIELD_DEFAULT_SCRIPT,
  CF_KEY_PATTERN,
  type CfHostEntityType,
  configurationExpression,
} from './data';
import OutputSection from './output-section';

export interface SimpleConfigurationProps {
  value?: CalculatedFieldConfiguration;
  onChange?: (value: CalculatedFieldConfiguration) => void;
  isScript: boolean;
  hostEntityType: CfHostEntityType | undefined;
  tenantId: string;
  disabled?: boolean;
  /** SCRIPT entry: opens the expression test dialog (R15). */
  onTest?: (expression: string) => void;
}

export default function SimpleConfiguration({
  value,
  onChange,
  isScript,
  hostEntityType,
  tenantId,
  disabled,
  onTest,
}: SimpleConfigurationProps) {
  const { formatMessage } = useIntl();
  const argumentsMap: Record<string, CalculatedFieldArgument> =
    value && 'arguments' in value ? (value.arguments ?? {}) : {};
  const argumentNames = Object.keys(argumentsMap);
  const expression =
    configurationExpression(value) ||
    (isScript ? CALCULATED_FIELD_DEFAULT_SCRIPT : '');
  const useLatestTs =
    !isScript && value?.type === 'SIMPLE' && value.useLatestTs === true;
  const output = value && 'output' in value ? value.output : undefined;

  const patch = (next: Partial<CalculatedFieldConfiguration>) => {
    onChange?.({ ...value, ...next } as CalculatedFieldConfiguration);
  };

  // Recomputed only when the argument-name list actually changes; the
  // joined string is the identity that matters (derived state).
  // biome-ignore lint/correctness/useExhaustiveDependencies: argumentNames.join(' ') is the true dependency identity
  const completionExtensions = useMemo(
    () => [
      // Override the language's default completion source with one bound to
      // this field's argument names (R14).
      autocompletion({
        override: [
          tbelCompletionSource({
            contextVariables: ['ctx', ...argumentNames],
          }),
        ],
      }),
    ],
    [argumentNames.join(' ')],
  );

  const expressionEmpty = !expression.trim();
  const expressionTooLong = !isScript && expression.length > 255;
  const testDisabled = argumentNames.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <Form.Item
        label={formatMessage({
          id: 'pages.calculatedFields.arguments',
          defaultMessage: 'Arguments',
        })}
        className="mb-0"
        required
      >
        <ArgumentsTable
          value={argumentsMap}
          onChange={(next) => patch({ arguments: next })}
          isScript={isScript}
          hostEntityType={hostEntityType}
          tenantId={tenantId}
          disabled={disabled}
        />
      </Form.Item>

      <Form.Item
        label={formatMessage({
          id: 'pages.calculatedFields.expression',
          defaultMessage: 'Expression',
        })}
        required
        className="mb-0"
        validateStatus={
          expressionEmpty || expressionTooLong ? 'error' : undefined
        }
        help={
          expressionEmpty
            ? formatMessage({
                id: 'pages.calculatedFields.expressionRequired',
                defaultMessage: 'Expression is required.',
              })
            : expressionTooLong
              ? formatMessage({
                  id: 'pages.calculatedFields.expressionMaxLength',
                  defaultMessage:
                    'Expression should be less than 256 characters.',
                })
              : undefined
        }
      >
        {isScript ? (
          <div className="flex flex-col gap-2">
            <Space wrap className="justify-between">
              <Typography.Text code>
                {formatMessage(
                  {
                    id: 'pages.calculatedFields.scriptSignature',
                    defaultMessage: 'function calculate({args})',
                  },
                  {
                    args: ['ctx', ...argumentNames].join(', '),
                  },
                )}
              </Typography.Text>
              <Button
                icon={<PlayCircleOutlined />}
                disabled={disabled || testDisabled || !onTest}
                onClick={() => onTest?.(expression)}
              >
                {formatMessage({
                  id: 'pages.calculatedFields.testScript',
                  defaultMessage: 'Test script',
                })}
              </Button>
            </Space>
            <CodeEditor
              value={expression}
              language="tbel"
              height="220px"
              readOnly={disabled}
              extensions={completionExtensions}
              onChange={(next) => patch({ expression: next })}
              data-testid="cf-script-editor"
            />
          </div>
        ) : (
          <Input
            value={expression}
            disabled={disabled}
            maxLength={300}
            placeholder="(temperature - 32) / 1.8"
            onChange={(event) => patch({ expression: event.target.value })}
          />
        )}
      </Form.Item>
      {expression && !isScript && !CF_KEY_PATTERN.test(expression) && (
        <Alert
          type="error"
          showIcon
          className="-mt-2"
          message={formatMessage({
            id: 'pages.calculatedFields.expressionPattern',
            defaultMessage: 'Single spaces inside the expression are allowed.',
          })}
        />
      )}

      {!isScript && (
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
      )}

      <OutputSection
        value={output}
        onChange={(next) => patch({ output: next })}
        simpleMode={!isScript}
        hostEntityType={hostEntityType}
        disabled={disabled}
      />
    </div>
  );
}
