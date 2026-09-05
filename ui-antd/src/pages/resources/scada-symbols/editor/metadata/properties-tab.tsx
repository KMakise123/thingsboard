/**
 * Properties tab (M11 wave-2D) — simplified FormProperty[] CRUD
 * (id/name/type/default/required + ordering; ui-ngx drives the full
 * dynamic-form-properties editor, the fork ships a flat row editor —
 * registered delta in the M11 report). Default values of primitive types
 * get plain inputs; anything complex falls to the shared JSON editor.
 */
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  Select,
  Space,
} from 'antd';
import { useIntl } from 'react-intl';

import { JsonFieldFallback } from '@/components/form-property/JsonFieldFallback';
import {
  type FormProperty,
  FormPropertyType,
  formPropertyTypes,
} from '@/components/form-property/types';
import type { ScadaSymbolMetadata } from '@/core/scada/symbol-metadata';

export interface PropertiesTabProps {
  metadata: ScadaSymbolMetadata;
  onChange: (part: Partial<ScadaSymbolMetadata>) => void;
  disabled: boolean;
}

/** Types whose default value can be a plain single-line input. */
const PRIMITIVE_TYPES = new Set<string>([
  FormPropertyType.text,
  FormPropertyType.number,
  FormPropertyType.password,
  FormPropertyType.switch,
  FormPropertyType.select,
  FormPropertyType.radios,
]);

export function PropertiesTab({
  metadata,
  onChange,
  disabled,
}: PropertiesTabProps) {
  const { formatMessage } = useIntl();
  const properties = metadata.properties ?? [];

  const addProperty = () =>
    onChange({
      properties: [
        ...properties,
        {
          id: `property_${properties.length + 1}`,
          name: '',
          type: FormPropertyType.text,
          default: '',
        } satisfies FormProperty,
      ],
    });

  const patchProperty = (index: number, part: Partial<FormProperty>) =>
    onChange({
      properties: properties.map((p, i) =>
        i === index ? { ...p, ...part } : p,
      ),
    });

  const removeProperty = (index: number) =>
    onChange({ properties: properties.filter((_, i) => i !== index) });

  const moveProperty = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= properties.length) {
      return;
    }
    const next = [...properties];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ properties: next });
  };

  return (
    <div
      data-testid="scada-properties-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {!disabled ? (
        <Button
          icon={<PlusOutlined />}
          onClick={addProperty}
          style={{ alignSelf: 'flex-start' }}
          data-testid="scada-properties-add"
        >
          {formatMessage({
            id: 'pages.resources.scadaSymbolEditor.properties.add',
            defaultMessage: 'Add property',
          })}
        </Button>
      ) : null}
      {properties.length === 0 ? (
        <Empty
          description={formatMessage({
            id: 'pages.resources.scadaSymbolEditor.properties.empty',
            defaultMessage: 'No properties yet.',
          })}
        />
      ) : (
        properties.map((property, index) => (
          <Card
            key={`${property.id}-${index}`}
            size="small"
            title={property.id}
            extra={
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={disabled || index === 0}
                  onClick={() => moveProperty(index, -1)}
                  aria-label={formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.properties.moveUp',
                    defaultMessage: 'Move up',
                  })}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={disabled || index === properties.length - 1}
                  onClick={() => moveProperty(index, 1)}
                  aria-label={formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.properties.moveDown',
                    defaultMessage: 'Move down',
                  })}
                />
                {!disabled ? (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeProperty(index)}
                    data-testid={`scada-properties-delete-${property.id}`}
                    aria-label={formatMessage({
                      id: 'pages.resources.scadaSymbolEditor.properties.delete',
                      defaultMessage: 'Delete property',
                    })}
                  />
                ) : null}
              </Space>
            }
          >
            <Form layout="vertical" disabled={disabled}>
              <Space wrap style={{ display: 'flex' }}>
                <Form.Item
                  label={formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.properties.id',
                    defaultMessage: 'ID',
                  })}
                  style={{ minWidth: 160 }}
                >
                  <Input
                    value={property.id}
                    data-testid={`scada-properties-id-${property.id}`}
                    onChange={(e) =>
                      patchProperty(index, { id: e.target.value })
                    }
                  />
                </Form.Item>
                <Form.Item
                  label={formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.properties.name',
                    defaultMessage: 'Name',
                  })}
                  style={{ minWidth: 160 }}
                >
                  <Input
                    value={property.name}
                    onChange={(e) =>
                      patchProperty(index, { name: e.target.value })
                    }
                  />
                </Form.Item>
                <Form.Item
                  label={formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.properties.type',
                    defaultMessage: 'Type',
                  })}
                  style={{ minWidth: 160 }}
                >
                  <Select
                    value={property.type}
                    options={formPropertyTypes.map((type) => ({
                      value: type,
                      label: type,
                    }))}
                    onChange={(type) => patchProperty(index, { type })}
                    data-testid={`scada-properties-type-${property.id}`}
                  />
                </Form.Item>
                <Form.Item
                  label={formatMessage({
                    id: 'pages.resources.scadaSymbolEditor.properties.required',
                    defaultMessage: 'Required',
                  })}
                >
                  <Checkbox
                    checked={property.required}
                    onChange={(e) =>
                      patchProperty(index, { required: e.target.checked })
                    }
                  />
                </Form.Item>
              </Space>
              <Form.Item
                label={formatMessage({
                  id: 'pages.resources.scadaSymbolEditor.properties.default',
                  defaultMessage: 'Default value',
                })}
              >
                {PRIMITIVE_TYPES.has(property.type) ? (
                  <Input
                    value={
                      property.default === undefined ||
                      property.default === null
                        ? ''
                        : String(property.default)
                    }
                    data-testid={`scada-properties-default-${property.id}`}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const value =
                        property.type === FormPropertyType.number
                          ? raw === ''
                            ? 0
                            : Number(raw)
                          : property.type === FormPropertyType.switch
                            ? raw === 'true'
                            : raw;
                      patchProperty(index, { default: value });
                    }}
                  />
                ) : (
                  <JsonFieldFallback
                    value={property.default}
                    onChange={(next) => patchProperty(index, { default: next })}
                    height="100px"
                    readOnly={disabled}
                    testIdPrefix={`scada-properties-default-${property.id}`}
                  />
                )}
              </Form.Item>
            </Form>
          </Card>
        ))
      )}
    </div>
  );
}

export default PropertiesTab;
