/**
 * DataKeysEditor — one datasource's key list (M7 wave K, spec §3.4 Data):
 * add / remove / reorder (native drag + ↑/↓ keyboard fallback) and per-key
 * edits of label / name / type / color / units / decimals. Fully controlled:
 * `keys` in, whole-array `onChange` out — the caller folds it into the
 * widget config (coalesced updateWidgetConfig path).
 */
import { Button, Input, Select, Space, Typography } from 'antd';
import { useId, useState } from 'react';
import { useIntl } from 'react-intl';

import type { DataKey, DataKeyType } from '@/types/tb/widget';
import { DragSortButtons, DragSortHandle, useDragSort } from './drag-sort';
import { PanelColor, PanelNumber, UndoSafeInput } from './panel-fields';

/** TB DataKeyType subset a plain datasource key may carry. The "latest"
 * designation is the ARRAY the key lives in (latestDataKeys), not a type
 * value — wire-shape fidelity over the brief's shorthand. */
export const DATA_KEY_TYPES: DataKeyType[] = [
  'timeseries',
  'attribute',
  'function',
  'entityField',
];

/** Widget-local series palette (wire data, ui-ngx material-color parity). */
const KEY_PALETTE = [
  '#2196f3',
  '#4caf50',
  '#f44336',
  '#ff9800',
  '#9c27b0',
  '#00bcd4',
  '#ffc107',
  '#795548',
  '#607d8b',
  '#e91e63',
];

/** Next series color: counts every key already declared on the widget. */
export function nextDataKeyColor(keyGroups: DataKey[][]): string {
  let count = 0;
  for (const group of keyGroups) {
    count += group?.length ?? 0;
  }
  return KEY_PALETTE[count % KEY_PALETTE.length];
}

export interface DataKeysEditorProps {
  label: string;
  keys: DataKey[];
  onChange: (next: DataKey[]) => void;
  /** Available groups for the palette cursor (dataKeys + latestDataKeys). */
  paletteGroups?: DataKey[][];
  testIdPrefix: string;
}

export function DataKeysEditor({
  label,
  keys,
  onChange,
  paletteGroups,
  testIdPrefix,
}: DataKeysEditorProps) {
  const { formatMessage } = useIntl();
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<DataKeyType>('timeseries');
  const baseId = useId();

  const api = useDragSort((from, to) => {
    if (from === to) {
      return;
    }
    const next = [...keys];
    const [moved] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(to, next.length - 1)), 0, moved);
    onChange(next);
  });

  const addKey = () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    const key: DataKey = {
      name,
      type: newType,
      label: name,
      color: nextDataKeyColor(paletteGroups ?? [keys]),
    };
    onChange([...keys, key]);
    setNewName('');
  };

  const patchKey = (index: number, patch: Partial<DataKey>) => {
    onChange(
      keys.map((key, i) => (i === index ? { ...key, ...patch } : key)),
    );
  };

  const removeKey = (index: number) => {
    onChange(keys.filter((_, i) => i !== index));
  };

  return (
    <div data-testid={testIdPrefix} style={{ marginBottom: 8 }}>
      <Typography.Text strong style={{ fontSize: 12 }}>
        {label}
      </Typography.Text>
      {keys.map((key, index) => (
        <div
          key={`${baseId}-${index}`}
          {...api.rowProps(index)}
          style={{
            border: '1px solid rgba(128,128,128,0.25)',
            borderRadius: 6,
            padding: 6,
            marginTop: 6,
          }}
          data-testid={`${testIdPrefix}-key-${index}`}
        >
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <DragSortHandle api={api} index={index} testIdPrefix={`${testIdPrefix}-key-${index}`} />
            <UndoSafeInput
              value={key.label ?? key.name ?? ''}
              onEdit={(next) =>
                patchKey(index, { label: next === '' ? undefined : next })
              }
              testId={`${testIdPrefix}-key-${index}-label`}
              placeholder={formatMessage({
                id: 'editor.dashboard.panel.dataKey.label',
                defaultMessage: 'Label',
              })}
            />
            <UndoSafeInput
              value={key.name ?? ''}
              onEdit={(next) => patchKey(index, { name: next })}
              testId={`${testIdPrefix}-key-${index}-name`}
              placeholder={formatMessage({
                id: 'editor.dashboard.panel.dataKey.name',
                defaultMessage: 'Name',
              })}
            />
            <Select<DataKeyType>
              size="small"
              style={{ minWidth: 96, flex: '0 0 auto' }}
              value={key.type ?? 'timeseries'}
              options={DATA_KEY_TYPES.map((type) => ({ value: type, label: type }))}
              data-testid={`${testIdPrefix}-key-${index}-type`}
              onChange={(next) => patchKey(index, { type: next })}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
            <PanelColor
              value={key.color}
              onEdit={(next) => patchKey(index, { color: next })}
              testId={`${testIdPrefix}-key-${index}-color`}
            />
            <UndoSafeInput
              value={key.units ?? ''}
              onEdit={(next) =>
                patchKey(index, { units: next === '' ? undefined : next })
              }
              testId={`${testIdPrefix}-key-${index}-units`}
              placeholder={formatMessage({
                id: 'editor.dashboard.panel.dataKey.units',
                defaultMessage: 'Units',
              })}
            />
            <PanelNumber
              value={key.decimals}
              min={0}
              max={15}
              onEdit={(next) => patchKey(index, { decimals: next ?? undefined })}
              testId={`${testIdPrefix}-key-${index}-decimals`}
            />
            <Space size={2} style={{ marginLeft: 'auto' }}>
              <DragSortButtons
                api={api}
                index={index}
                count={keys.length}
                testIdPrefix={`${testIdPrefix}-key-${index}`}
              />
              <Button
                size="small"
                type="text"
                danger
                icon="✕"
                aria-label="Remove key"
                data-testid={`${testIdPrefix}-key-${index}-remove`}
                onClick={() => removeKey(index)}
              />
            </Space>
          </div>
        </div>
      ))}
      <Space.Compact style={{ marginTop: 6, width: '100%' }}>
        <Input
          size="small"
          value={newName}
          placeholder={formatMessage({
            id: 'editor.dashboard.panel.dataKey.addPlaceholder',
            defaultMessage: 'Key name',
          })}
          data-testid={`${testIdPrefix}-add-name`}
          onChange={(event) => setNewName(event.target.value)}
          onPressEnter={addKey}
        />
        <Select<DataKeyType>
          size="small"
          style={{ minWidth: 96 }}
          value={newType}
          options={DATA_KEY_TYPES.map((type) => ({ value: type, label: type }))}
          data-testid={`${testIdPrefix}-add-type`}
          onChange={setNewType}
        />
        <Button
          size="small"
          type="primary"
          ghost
          data-testid={`${testIdPrefix}-add`}
          onClick={addKey}
        >
          {formatMessage({
            id: 'editor.dashboard.panel.add',
            defaultMessage: 'Add',
          })}
        </Button>
      </Space.Compact>
    </div>
  );
}
