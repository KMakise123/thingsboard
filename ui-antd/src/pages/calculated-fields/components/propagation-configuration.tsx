/**
 * PROPAGATION configurator (M14 wave-5, spec 6.1-12; ui-ngx
 * tb-propagation-configuration parity): the relation path to related
 * entities (direction default TO "up to parent", relationType from the
 * hardcoded ['Contains','Manages'] family — ngx string-autocomplete keeps
 * free input, mirrored with AutoComplete), the data-to-propagate switch
 * (arguments only vs expression result) and — only with the expression —
 * the TBEL script (default script + Test button) whose save runs the
 * testScript precheck (wave-4 gap closed: propagation precheck now wired).
 *
 * Without the expression every argument is a CURRENT-entity passthrough
 * (the argument name IS the output key; entity references and rolling keys
 * are rejected — ngx propagate-arguments-table).
 */
import { PlayCircleOutlined } from '@ant-design/icons';
import { autocompletion } from '@codemirror/autocomplete';
import {
  AutoComplete,
  Button,
  Form,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { CodeEditor } from '@/components/code-editor';
import { tbelCompletionSource } from '@/components/code-editor/tbel';
import type {
  CalculatedFieldArgument,
  CalculatedFieldConfiguration,
  EntitySearchDirection,
} from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import ArgumentsTable from './arguments-table';
import {
  CALCULATED_FIELD_DEFAULT_SCRIPT,
  CF_PROPAGATION_FORBIDDEN_NAMES,
  CF_RELATION_TYPES,
  type CfHostEntityType,
  configurationExpression,
} from './data';
import OutputSection from './output-section';

export interface PropagationConfigurationProps {
  value?: CalculatedFieldConfiguration;
  onChange?: (value: CalculatedFieldConfiguration) => void;
  hostEntityType: CfHostEntityType | undefined;
  tenantId: string;
  disabled?: boolean;
  /** Opens the expression test dialog (prechecked at save as well). */
  onTest?: (expression: string) => void;
}

const DIRECTION_OPTIONS: Array<EntitySearchDirection> = ['TO', 'FROM'];

export default function PropagationConfiguration({
  value,
  onChange,
  hostEntityType,
  tenantId,
  disabled,
  onTest,
}: PropagationConfigurationProps) {
  const { formatMessage } = useIntl();
  const config = value;
  const isPropagation = config?.type === 'PROPAGATION';
  const applyExpression =
    isPropagation && config.applyExpressionToResolvedArguments === true;
  const argumentsMap: Record<string, CalculatedFieldArgument> = isPropagation
    ? (config.arguments ?? {})
    : {};
  const argumentNames = Object.keys(argumentsMap);
  const relation = isPropagation ? config.relation : undefined;
  const expression =
    (isPropagation ? configurationExpression(config) : '') ||
    CALCULATED_FIELD_DEFAULT_SCRIPT;
  const output = config && 'output' in config ? config.output : undefined;

  const patch = (next: Record<string, unknown>) => {
    onChange?.({ ...config, ...next } as CalculatedFieldConfiguration);
  };

  // Recomputed only when the argument-name list actually changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: argumentNames.join(' ') is the true dependency identity
  const completionExtensions = useMemo(
    () => [
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Typography.Text strong>
          {formatMessage({
            id: 'pages.calculatedFields.propagation.relationTitle',
            defaultMessage: 'Propagation path to related entities',
          })}
        </Typography.Text>
        <Typography.Text type="secondary">
          {formatMessage(
            {
              id: 'pages.calculatedFields.propagation.relationHint',
              defaultMessage:
                'The calculated values propagate along this relation path (up to {max} related entities per argument).',
            },
            { max: CF_LIMITS.maxRelatedEntitiesToReturnPerCfArgument },
          )}
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
              value={relation?.direction ?? 'TO'}
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
                    ...(relation ?? { direction: 'TO' }),
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
          id: 'pages.calculatedFields.propagation.dataToPropagate',
          defaultMessage: 'Data to propagate',
        })}
        className="mb-0"
        required
      >
        <Space wrap align="start" className="w-full">
          <Segmented
            value={applyExpression ? 'expression' : 'arguments'}
            disabled={disabled}
            onChange={(next) => {
              // Arguments-only propagation has NO wire expression; the
              // default script rides along disabled for the expression mode.
              const apply = next === 'expression';
              if (apply) {
                patch({
                  applyExpressionToResolvedArguments: true,
                  expression: expression || CALCULATED_FIELD_DEFAULT_SCRIPT,
                });
              } else {
                patch({ applyExpressionToResolvedArguments: false });
              }
            }}
            options={[
              {
                value: 'arguments',
                label: formatMessage({
                  id: 'pages.calculatedFields.propagation.argumentsOnly',
                  defaultMessage: 'Arguments only',
                }),
              },
              {
                value: 'expression',
                label: formatMessage({
                  id: 'pages.calculatedFields.propagation.expressionResult',
                  defaultMessage: 'Expression result',
                }),
              },
            ]}
          />
        </Space>
        <div className="mt-2">
          <ArgumentsTable
            value={argumentsMap}
            onChange={(next) => patch({ arguments: next })}
            isScript={applyExpression}
            hostEntityType={hostEntityType}
            tenantId={tenantId}
            disabled={disabled}
            currentOnly={!applyExpression}
            requireCurrentArgument={applyExpression}
            extraForbiddenNames={
              applyExpression
                ? undefined
                : CF_PROPAGATION_FORBIDDEN_NAMES.slice(3)
            }
            nameLabelKey={
              applyExpression
                ? undefined
                : 'pages.calculatedFields.propagation.outputKey'
            }
          />
        </div>
      </Form.Item>

      {applyExpression && (
        <Form.Item
          label={formatMessage({
            id: 'pages.calculatedFields.script',
            defaultMessage: 'Script',
          })}
          required
          className="mb-0"
        >
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
                disabled={disabled || argumentNames.length === 0 || !onTest}
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
              data-testid="cf-propagation-editor"
            />
          </div>
        </Form.Item>
      )}

      <OutputSection
        value={output}
        onChange={(next) => patch({ output: next })}
        simpleMode={false}
        hostEntityType={hostEntityType}
        disabled={disabled}
      />
    </div>
  );
}
