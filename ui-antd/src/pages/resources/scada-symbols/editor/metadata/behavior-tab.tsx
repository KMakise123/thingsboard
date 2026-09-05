/**
 * Behavior tab (M11 wave-2D) — value/action/widgetAction behavior rows
 * (ui-ngx scada-symbol-behavior panels parity, simplified: the default
 * settings objects are edited as JSON source via the shared
 * JsonFieldFallback, with one-click reset to the ported upstream
 * factories). The wire shape of the settings is upstream-exact.
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
} from 'antd';
import { useIntl } from 'react-intl';

import { JsonFieldFallback } from '@/components/form-property/JsonFieldFallback';
import {
  defaultGetValueSettings,
  defaultSetValueSettings,
  defaultWidgetActionSettings,
  type ScadaSymbolBehavior,
  ScadaSymbolBehaviorType,
  type ScadaSymbolMetadata,
  scadaSymbolBehaviorTypes,
  updateBehaviorDefaultSettings,
  ValueType,
} from '@/core/scada/symbol-metadata';

export interface BehaviorTabProps {
  metadata: ScadaSymbolMetadata;
  onChange: (part: Partial<ScadaSymbolMetadata>) => void;
  disabled: boolean;
}

const VALUE_TYPE_OPTIONS = [
  ValueType.STRING,
  ValueType.INTEGER,
  ValueType.DOUBLE,
  ValueType.BOOLEAN,
  ValueType.JSON,
];

const typeLabelKey: Record<string, string> = {
  [ScadaSymbolBehaviorType.value]:
    'pages.resources.scadaSymbolEditor.behavior.typeValue',
  [ScadaSymbolBehaviorType.action]:
    'pages.resources.scadaSymbolEditor.behavior.typeAction',
  [ScadaSymbolBehaviorType.widgetAction]:
    'pages.resources.scadaSymbolEditor.behavior.typeWidgetAction',
};

const valueTypeLabelKey: Record<string, string> = {
  [ValueType.STRING]:
    'pages.resources.scadaSymbolEditor.behavior.valueTypeString',
  [ValueType.INTEGER]:
    'pages.resources.scadaSymbolEditor.behavior.valueTypeInteger',
  [ValueType.DOUBLE]:
    'pages.resources.scadaSymbolEditor.behavior.valueTypeDouble',
  [ValueType.BOOLEAN]:
    'pages.resources.scadaSymbolEditor.behavior.valueTypeBoolean',
  [ValueType.JSON]: 'pages.resources.scadaSymbolEditor.behavior.valueTypeJson',
};

const newBehaviorId = (): string => {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return uuid.replaceAll('-', '');
};

export function BehaviorTab({
  metadata,
  onChange,
  disabled,
}: BehaviorTabProps) {
  const { formatMessage } = useIntl();
  const behavior = metadata.behavior ?? [];

  const addBehavior = () => {
    const id = newBehaviorId();
    const next: ScadaSymbolBehavior = updateBehaviorDefaultSettings({
      id,
      name: '',
      type: ScadaSymbolBehaviorType.value,
      valueType: ValueType.BOOLEAN,
    });
    onChange({ behavior: [...behavior, next] });
  };

  const patchBehavior = (index: number, part: Partial<ScadaSymbolBehavior>) =>
    onChange({
      behavior: behavior.map((b, i) => {
        if (i !== index) {
          return b;
        }
        return updateBehaviorDefaultSettings({ ...b, ...part });
      }),
    });

  const removeBehavior = (index: number) =>
    onChange({ behavior: behavior.filter((_, i) => i !== index) });

  const resetSettings = (index: number) => {
    const row = behavior[index];
    if (row.type === ScadaSymbolBehaviorType.value) {
      patchBehavior(index, {
        defaultGetValueSettings: defaultGetValueSettings(row.valueType),
      });
    } else if (row.type === ScadaSymbolBehaviorType.action) {
      patchBehavior(index, {
        defaultSetValueSettings: defaultSetValueSettings(row.valueType),
      });
    } else {
      patchBehavior(index, {
        defaultWidgetActionSettings: { ...defaultWidgetActionSettings },
      });
    }
  };

  return (
    <div
      data-testid="scada-behavior-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {!disabled ? (
        <Button
          icon={<PlusOutlined />}
          onClick={addBehavior}
          style={{ alignSelf: 'flex-start' }}
          data-testid="scada-behavior-add"
        >
          {formatMessage({
            id: 'pages.resources.scadaSymbolEditor.behavior.add',
            defaultMessage: 'Add behavior',
          })}
        </Button>
      ) : null}
      {behavior.length === 0 ? (
        <Empty
          description={formatMessage({
            id: 'pages.resources.scadaSymbolEditor.behavior.empty',
            defaultMessage: 'No behaviors yet.',
          })}
        />
      ) : (
        behavior.map((row, index) => (
          <Card
            key={row.id}
            size="small"
            extra={
              !disabled ? (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeBehavior(index)}
                  data-testid={`scada-behavior-delete-${row.id}`}
                  aria-label={formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.behavior.delete',
                    defaultMessage: 'Delete behavior',
                  })}
                />
              ) : null
            }
            title={row.name || row.id}
          >
            <Form layout="vertical" disabled={disabled}>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item
                    label={formatMessage({
                      id: 'pages.resources.scadaSymbolEditor.behavior.name',
                      defaultMessage: 'Name',
                    })}
                  >
                    <Input
                      value={row.name}
                      data-testid={`scada-behavior-name-${row.id}`}
                      onChange={(e) =>
                        patchBehavior(index, { name: e.target.value })
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label={formatMessage({
                      id: 'pages.resources.scadaSymbolEditor.behavior.type',
                      defaultMessage: 'Type',
                    })}
                  >
                    <Select
                      value={row.type}
                      options={scadaSymbolBehaviorTypes.map((type) => ({
                        value: type,
                        label: formatMessage({
                          id:
                            typeLabelKey[type] ??
                            'pages.resources.scadaSymbolEditor.behavior.type',
                          defaultMessage: type,
                        }),
                      }))}
                      data-testid={`scada-behavior-type-${row.id}`}
                      onChange={(type) =>
                        patchBehavior(index, {
                          type,
                        })
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label={formatMessage({
                      id: 'pages.resources.scadaSymbolEditor.behavior.valueType',
                      defaultMessage: 'Value type',
                    })}
                  >
                    <Select
                      value={row.valueType}
                      disabled={
                        row.type === ScadaSymbolBehaviorType.widgetAction
                      }
                      options={VALUE_TYPE_OPTIONS.map((type) => ({
                        value: type,
                        label: formatMessage({
                          id: valueTypeLabelKey[type],
                          defaultMessage: type,
                        }),
                      }))}
                      data-testid={`scada-behavior-value-type-${row.id}`}
                      onChange={(valueType) =>
                        patchBehavior(index, {
                          valueType,
                          // Type switch re-seeds the defaults via
                          // updateBehaviorDefaultSettings only when absent;
                          // dropping forces the re-seed.
                          defaultGetValueSettings: undefined,
                          defaultSetValueSettings: undefined,
                        })
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
              {row.type === ScadaSymbolBehaviorType.value ? (
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item
                      label={formatMessage({
                        id: 'pages.resources.scadaSymbolEditor.behavior.trueLabel',
                        defaultMessage: 'True label',
                      })}
                    >
                      <Input
                        value={row.trueLabel}
                        onChange={(e) =>
                          patchBehavior(index, { trueLabel: e.target.value })
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label={formatMessage({
                        id: 'pages.resources.scadaSymbolEditor.behavior.falseLabel',
                        defaultMessage: 'False label',
                      })}
                    >
                      <Input
                        value={row.falseLabel}
                        onChange={(e) =>
                          patchBehavior(index, { falseLabel: e.target.value })
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label={formatMessage({
                        id: 'pages.resources.scadaSymbolEditor.behavior.stateLabel',
                        defaultMessage: 'State label',
                      })}
                    >
                      <Input
                        value={row.stateLabel}
                        onChange={(e) =>
                          patchBehavior(index, { stateLabel: e.target.value })
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ) : null}
              <Form.Item
                label={
                  <Space>
                    {formatMessage({
                      id: 'pages.resources.scadaSymbolEditor.behavior.defaultSettings',
                      defaultMessage: 'Default settings (JSON)',
                    })}
                    <Button
                      size="small"
                      onClick={() => resetSettings(index)}
                      data-testid={`scada-behavior-reset-${row.id}`}
                    >
                      {formatMessage({
                        id: 'pages.resources.scadaSymbolEditor.behavior.resetDefault',
                        defaultMessage: 'Reset to defaults',
                      })}
                    </Button>
                  </Space>
                }
              >
                <JsonFieldFallback
                  value={
                    row.type === ScadaSymbolBehaviorType.value
                      ? row.defaultGetValueSettings
                      : row.type === ScadaSymbolBehaviorType.action
                        ? row.defaultSetValueSettings
                        : row.defaultWidgetActionSettings
                  }
                  onChange={(next) => {
                    if (row.type === ScadaSymbolBehaviorType.value) {
                      patchBehavior(index, {
                        defaultGetValueSettings:
                          next as ScadaSymbolBehavior['defaultGetValueSettings'],
                      });
                    } else if (row.type === ScadaSymbolBehaviorType.action) {
                      patchBehavior(index, {
                        defaultSetValueSettings:
                          next as ScadaSymbolBehavior['defaultSetValueSettings'],
                      });
                    } else {
                      patchBehavior(index, {
                        defaultWidgetActionSettings:
                          next as ScadaSymbolBehavior['defaultWidgetActionSettings'],
                      });
                    }
                  }}
                  height="140px"
                  readOnly={disabled}
                  testIdPrefix={`scada-behavior-settings-${row.id}`}
                />
              </Form.Item>
            </Form>
          </Card>
        ))
      )}
    </div>
  );
}

export default BehaviorTab;
