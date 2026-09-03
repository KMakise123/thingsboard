/**
 * Shared panel field chrome (M7 wave K): labeled rows + the P6 undo-safe
 * controlled inputs. Colors are data-only here (ColorPicker edits config
 * JSON values); all panel chrome itself is token/antd defaults.
 */
import { ColorPicker, Input, InputNumber, Switch } from 'antd';
import { useId } from 'react';

import { JsonFieldFallback } from '@/components/form-property/JsonFieldFallback';
import { useUndoSafeValue } from './undo-safe-value';

export function PanelRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label
        htmlFor={htmlFor}
        style={{ flex: '0 0 96px', minWidth: 96, color: 'inherit', opacity: 0.72 }}
      >
        {label}
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/** Labeled antd Switch row. */
export function PanelSwitch({
  label,
  checked,
  onEdit,
  testId,
  disabled,
}: {
  label: string;
  checked: boolean;
  onEdit: (next: boolean) => void;
  testId: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <PanelRow label={label} htmlFor={id}>
      <Switch
        id={id}
        size="small"
        checked={checked}
        disabled={disabled}
        data-testid={testId}
        onChange={onEdit}
      />
    </PanelRow>
  );
}

/**
 * Text input bound to the session through the P6 undo-safe mirror —
 * undo landing while focused adopts the reverted value without crashing
 * and without re-writing the DOM during ordinary typing.
 */
export function UndoSafeInput({
  value,
  onEdit,
  testId,
  placeholder,
  disabled,
}: {
  value: string;
  onEdit: (next: string) => void;
  testId: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const field = useUndoSafeValue(value ?? '', onEdit);
  return (
    <Input
      size="small"
      value={field.value}
      placeholder={placeholder}
      disabled={disabled}
      data-testid={testId}
      onChange={(event) => field.onChange(event.target.value)}
      onFocus={field.onFocus}
      onBlur={field.onBlur}
    />
  );
}

/** Multiline variant of UndoSafeInput. */
export function UndoSafeTextArea({
  value,
  onEdit,
  testId,
  rows = 3,
  placeholder,
}: {
  value: string;
  onEdit: (next: string) => void;
  testId: string;
  rows?: number;
  placeholder?: string;
}) {
  const field = useUndoSafeValue(value ?? '', onEdit);
  return (
    <Input.TextArea
      size="small"
      rows={rows}
      value={field.value}
      placeholder={placeholder}
      data-testid={testId}
      onChange={(event) => field.onChange(event.target.value)}
      onFocus={field.onFocus}
      onBlur={field.onBlur}
    />
  );
}

/** Number input; null clears the config key (caller decides undefined). */
export function PanelNumber({
  value,
  onEdit,
  testId,
  min,
  max,
  placeholder,
}: {
  value: number | null | undefined;
  onEdit: (next: number | null) => void;
  testId: string;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <InputNumber
      size="small"
      style={{ width: '100%' }}
      value={typeof value === 'number' ? value : null}
      min={min}
      max={max}
      placeholder={placeholder}
      data-testid={testId}
      onChange={(next) => onEdit(typeof next === 'number' ? next : null)}
    />
  );
}

/**
 * Config-color picker (antd v6 ColorPicker): edits a wire color string.
 * allowClear → undefined (key cleared downstream by the caller spreading).
 */
export function PanelColor({
  value,
  onEdit,
  testId,
  disabled,
}: {
  value: string | undefined;
  onEdit: (next: string | undefined) => void;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <ColorPicker
      size="small"
      value={value}
      allowClear
      showText
      disabledAlpha
      disabled={disabled}
      data-testid={testId}
      onChange={(_color, css) => onEdit(css)}
      onClear={() => onEdit(undefined)}
    />
  );
}

/** JSON object field backed by the shared JSON fallback editor. */
export function PanelJson({
  value,
  onEdit,
  testIdPrefix,
  height,
}: {
  value: unknown;
  onEdit: (next: unknown) => void;
  testIdPrefix: string;
  height?: string;
}) {
  return (
    <JsonFieldFallback
      value={value}
      onChange={onEdit}
      testIdPrefix={testIdPrefix}
      height={height ?? '96px'}
    />
  );
}
