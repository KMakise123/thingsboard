/**
 * FormPropertyForm — the unified FormProperty[] renderer (ADR 0004 §3 bullet 1
 * + §4: settingsForm reuses upstream FormProperty[] key names verbatim).
 *
 * Deliberately dumb and fully controlled: value in → onChange out, no antd
 * Form instance (undo/focus ownership belongs to the EditorSession layer).
 *
 * Per-property resolution order:
 *   ① custom registry hit (hint.customComponent id, else property id; the
 *     per-instance override map wins over the global registry)
 *   ② uiHints widget override (incl. uiHints.jsonSource → JSON source mode)
 *   ③ the property's declared upstream FormPropertyType
 *   ④ value-shape inference from the current value (property.default when the
 *     key is absent): boolean→Switch, number→InputNumber, string(+options)→
 *     Select, string→Input, primitive array→tags Select, everything else →
 *     JsonFieldFallback
 * Declared-but-unsupported types (color/font/datetime/javascript/… ) fall
 * back to JSON source mode for M7 — the spec's fallback semantics; custom
 * registry entries and M8 uiHints take them over later.
 *
 * Value fidelity is a hard requirement: every edit spreads the previous
 * value, so keys not covered by `properties` and untouched nested shapes
 * round-trip unchanged (same references) through edits of other fields.
 */
import { CodeOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Input,
  InputNumber,
  Radio,
  Select,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import type { ComponentType } from 'react';
import { Fragment, useState } from 'react';

import { JsonFieldFallback } from './JsonFieldFallback';
import {
  type CustomComponentRegistry,
  type CustomFieldProps,
  resolveCustomComponent,
} from './registry';
import {
  type FormProperty,
  FormPropertyType,
  type FormSelectItem,
} from './types';
import {
  groupProperties,
  resolveEnumOptions,
  resolveFieldLabel,
  resolveUiHint,
  type UiHint,
  type UiHints,
  type UiWidgetKind,
} from './ui-hints';

export interface FormPropertyFormProps {
  properties: FormProperty[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Static UI metadata map keyed by property id. */
  uiHints?: UiHints;
  /** Per-instance custom-component override; wins over the global registry. */
  customComponents?: CustomComponentRegistry;
  /**
   * Show the per-field "JSON source" toggle (spec §4.5). Defaults to true;
   * the JsonFieldFallback control for complex/unknown values is always
   * available regardless of this flag.
   */
  jsonFallbackEnabled?: boolean;
}

export type ResolvedFieldControl =
  | { kind: 'custom'; component: ComponentType<CustomFieldProps> }
  | { kind: 'input' }
  | { kind: 'password' }
  | { kind: 'textarea' }
  | { kind: 'number' }
  | { kind: 'switch' }
  | {
      kind: 'select';
      options: FormSelectItem[];
      mode?: 'multiple' | 'tags';
    }
  | { kind: 'radios'; options: FormSelectItem[] }
  | { kind: 'fieldset' }
  | { kind: 'json' }
  /** htmlSection is display-only upstream; M7 renders nothing for it. */
  | { kind: 'skip' };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isPrimitive(x: unknown): boolean {
  return ['string', 'number', 'boolean'].includes(typeof x);
}

function hintControl(
  widget: UiWidgetKind,
  property: FormProperty,
  hint: UiHint,
): ResolvedFieldControl {
  switch (widget) {
    case 'input':
      return { kind: 'input' };
    case 'password':
      return { kind: 'password' };
    case 'textarea':
      return { kind: 'textarea' };
    case 'number':
      return { kind: 'number' };
    case 'switch':
      return { kind: 'switch' };
    case 'select':
      return {
        kind: 'select',
        options: resolveEnumOptions(property, hint) ?? [],
        mode: property.multiple ? 'multiple' : undefined,
      };
    case 'json':
      return { kind: 'json' };
  }
}

function arrayControl(property: FormProperty): ResolvedFieldControl {
  if (property.arrayItemType === FormPropertyType.select) {
    return { kind: 'select', options: property.items ?? [], mode: 'multiple' };
  }
  if (
    property.arrayItemType === FormPropertyType.text ||
    property.arrayItemType === FormPropertyType.number
  ) {
    return { kind: 'select', options: [], mode: 'tags' };
  }
  return { kind: 'json' };
}

function declaredControl(property: FormProperty): ResolvedFieldControl {
  switch (property.type) {
    case FormPropertyType.text:
      return { kind: 'input' };
    case FormPropertyType.password:
      return { kind: 'password' };
    case FormPropertyType.textarea:
      return { kind: 'textarea' };
    case FormPropertyType.number:
      return { kind: 'number' };
    case FormPropertyType.switch:
      return { kind: 'switch' };
    case FormPropertyType.select:
      return {
        kind: 'select',
        options: property.items ?? [],
        mode: property.multiple ? 'multiple' : undefined,
      };
    case FormPropertyType.radios:
      return { kind: 'radios', options: property.items ?? [] };
    case FormPropertyType.json:
      return { kind: 'json' };
    case FormPropertyType.array:
      return arrayControl(property);
    case FormPropertyType.fieldset:
      return property.properties?.length
        ? { kind: 'fieldset' }
        : { kind: 'json' };
    default:
      // color/color_settings/datetime/font/units/icon/image/javascript/html/
      // css/markdown (+ runtime-missing types fall through inference below)
      return { kind: 'json' };
  }
}

function inferredControl(
  property: FormProperty,
  hint: UiHint | undefined,
  fieldValue: unknown,
): ResolvedFieldControl {
  if (typeof fieldValue === 'boolean') {
    return { kind: 'switch' };
  }
  if (typeof fieldValue === 'number') {
    return { kind: 'number' };
  }
  if (typeof fieldValue === 'string') {
    const options = resolveEnumOptions(property, hint);
    if (options?.length) {
      return { kind: 'select', options };
    }
    return { kind: 'input' };
  }
  if (Array.isArray(fieldValue)) {
    if (fieldValue.every(isPrimitive)) {
      return {
        kind: 'select',
        options: resolveEnumOptions(property, hint) ?? [],
        mode: 'tags',
      };
    }
    return { kind: 'json' };
  }
  return { kind: 'json' };
}

/** Resolution steps ①–④ from the module doc. Exported for tests. */
export function resolveFieldControl(
  property: FormProperty,
  hint: UiHint | undefined,
  fieldValue: unknown,
  customComponents?: CustomComponentRegistry,
): ResolvedFieldControl {
  if (property.type === FormPropertyType.htmlSection) {
    return { kind: 'skip' };
  }
  const custom = resolveCustomComponent(property, hint, customComponents);
  if (custom) {
    return { kind: 'custom', component: custom };
  }
  if (hint?.widget) {
    return hintControl(hint.widget, property, hint);
  }
  if (hint?.jsonSource) {
    return { kind: 'json' };
  }
  if (property.type) {
    return declaredControl(property);
  }
  return inferredControl(property, hint, fieldValue);
}

export function FormPropertyForm({
  properties,
  value,
  onChange,
  uiHints,
  customComponents,
  jsonFallbackEnabled = true,
}: FormPropertyFormProps) {
  // Per-field JSON source mode is view state (like panel open/close) — it
  // intentionally lives outside the undo draft (ADR 0004 §2).
  const [jsonMode, setJsonMode] = useState<Record<string, boolean>>({});

  if (!properties || properties.length === 0) {
    return null;
  }
  const safeValue = isRecord(value) ? value : {};

  const setField = (id: string, fieldValue: unknown) => {
    onChange({ ...safeValue, [id]: fieldValue });
  };

  const toggleJsonMode = (modeKey: string) => {
    setJsonMode((prev) => ({ ...prev, [modeKey]: !prev[modeKey] }));
  };

  const renderControl = (
    property: FormProperty,
    hint: UiHint | undefined,
    fieldValue: unknown,
    setValue: (next: unknown) => void,
    modeKey: string,
    control: ResolvedFieldControl,
  ) => {
    switch (control.kind) {
      case 'skip':
        return null;
      case 'custom': {
        const Custom = control.component;
        return (
          <Custom
            property={property}
            hint={hint}
            value={fieldValue}
            onChange={setValue}
            disabled={property.disabled}
          />
        );
      }
      case 'input':
        return (
          <Input
            value={fieldValue == null ? '' : String(fieldValue)}
            placeholder={hint?.placeholder}
            disabled={property.disabled}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      case 'password':
        return (
          <Input.Password
            value={fieldValue == null ? '' : String(fieldValue)}
            placeholder={hint?.placeholder}
            disabled={property.disabled}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            rows={hint?.rows ?? property.rows ?? 4}
            value={fieldValue == null ? '' : String(fieldValue)}
            placeholder={hint?.placeholder}
            disabled={property.disabled}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      case 'number':
        return (
          <InputNumber
            value={typeof fieldValue === 'number' ? fieldValue : undefined}
            min={property.min}
            max={property.max}
            step={property.step}
            placeholder={hint?.placeholder}
            disabled={property.disabled}
            style={{ width: '100%' }}
            onChange={(next) =>
              setValue(typeof next === 'number' ? next : null)
            }
          />
        );
      case 'switch':
        return (
          <Switch
            checked={fieldValue === true}
            disabled={property.disabled}
            onChange={(checked) => setValue(checked)}
          />
        );
      case 'select':
        return (
          <Select
            value={
              control.mode
                ? Array.isArray(fieldValue)
                  ? fieldValue
                  : []
                : (fieldValue ?? undefined)
            }
            mode={control.mode}
            options={control.options.map((option) => ({
              label: option.label,
              value: option.value as string,
            }))}
            allowClear={property.allowEmptyOption === true}
            placeholder={hint?.placeholder}
            disabled={property.disabled}
            style={{ width: '100%' }}
            onChange={(next) => setValue(next)}
          />
        );
      case 'radios':
        return (
          <Radio.Group
            value={fieldValue as string}
            disabled={property.disabled}
            options={control.options.map((option) => ({
              label: option.label,
              value: option.value as string,
            }))}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      case 'json':
        return (
          <JsonFieldFallback
            value={fieldValue}
            onChange={setValue}
            testIdPrefix={modeKey}
          />
        );
      case 'fieldset':
        return null; // handled by renderField (needs recursion)
    }
  };

  const renderField = (
    property: FormProperty,
    hint: UiHint | undefined,
    setValue: (next: unknown) => void,
    modeKey: string,
  ) => {
    const fieldValue =
      safeValue[property.id] !== undefined
        ? safeValue[property.id]
        : property.default;
    const control = resolveFieldControl(
      property,
      hint,
      fieldValue,
      customComponents,
    );

    if (control.kind === 'skip') {
      return null;
    }

    if (control.kind === 'fieldset') {
      const nested = isRecord(fieldValue) ? fieldValue : {};
      return (
        <div data-testid={`form-property-${property.id}`}>
          <Typography.Text strong>
            {resolveFieldLabel(property, hint)}
          </Typography.Text>
          <div style={{ paddingLeft: 16 }}>
            {(property.properties ?? []).map((child) => (
              <Fragment key={child.id}>
                {renderField(
                  child,
                  resolveUiHint(uiHints, child),
                  (childValue) => {
                    setValue({ ...nested, [child.id]: childValue });
                  },
                  `${modeKey}.${child.id}`,
                )}
              </Fragment>
            ))}
          </div>
        </div>
      );
    }

    const forceJson = jsonMode[modeKey] === true;
    const showToggle =
      jsonFallbackEnabled && !forceJson && control.kind !== 'json';

    return (
      <div data-testid={`form-property-${property.id}`}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 4,
          }}
        >
          <Typography.Text>
            {resolveFieldLabel(property, hint)}
            {property.required ? ' *' : ''}
          </Typography.Text>
          {property.subLabel && (
            <Typography.Text type="secondary">
              {property.subLabel}
            </Typography.Text>
          )}
          {property.hint && (
            <Tooltip title={property.hint}>
              <QuestionCircleOutlined aria-label={`Hint for ${property.id}`} />
            </Tooltip>
          )}
          <span style={{ flex: 1 }} />
          {showToggle && (
            <Button
              type="text"
              size="small"
              icon={<CodeOutlined />}
              aria-label="Toggle JSON source"
              data-testid={`json-toggle-${modeKey}`}
              onClick={() => toggleJsonMode(modeKey)}
            />
          )}
        </div>
        {forceJson ? (
          <JsonFieldFallback
            value={fieldValue}
            onChange={setValue}
            testIdPrefix={modeKey}
          />
        ) : (
          renderControl(property, hint, fieldValue, setValue, modeKey, control)
        )}
      </div>
    );
  };

  return (
    <div data-testid="form-property-form">
      {groupProperties(properties, uiHints).map((group, groupIndex) => (
        <div key={group.title ?? `untitled-${groupIndex}`}>
          {group.title && (
            <Typography.Title level={5}>{group.title}</Typography.Title>
          )}
          {group.members.map(({ property, hint }) => (
            <Fragment key={property.id}>
              {renderField(
                property,
                hint,
                (next) => setField(property.id, next),
                property.id,
              )}
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
