/**
 * KvMapEditor — string→string mapping editor (ui-ngx tb-kv-map-config
 * equivalent) for the rename-keys mapping (Record<string,string>). Row draft
 * state keeps half-typed keys editable; the value object is re-emitted on
 * every edit with empty keys filtered out (a half-typed key row never
 * corrupts the draft). External value changes (undo/redo) re-sync the rows —
 * reference identity is the change signal (JsonFieldFallback pattern).
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Space, Typography } from 'antd';
import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';

interface KvRow {
  uid: number;
  key: string;
  value: string;
}

let rowSeq = 0;

function nextRowUid(): number {
  rowSeq += 1;
  return rowSeq;
}

function toRows(value: unknown): KvRow[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).map(
    ([key, entryValue]) => ({
      uid: nextRowUid(),
      key,
      value: typeof entryValue === 'string' ? entryValue : String(entryValue),
    }),
  );
}

export function KvMapEditor({
  value,
  onChange,
  disabled = false,
  testIdPrefix = 'kv-map',
}: {
  value: unknown;
  onChange(next: Record<string, string>): void;
  disabled?: boolean;
  testIdPrefix?: string;
}) {
  const intl = useIntl();
  const [rows, setRows] = useState<KvRow[]>(() => toRows(value));
  const lastSeen = useRef<unknown>(value);

  if (value !== lastSeen.current) {
    lastSeen.current = value;
    setRows(toRows(value));
  }

  const commit = (nextRows: KvRow[]) => {
    setRows(nextRows);
    const next: Record<string, string> = {};
    for (const row of nextRows) {
      if (row.key !== '') {
        next[row.key] = row.value;
      }
    }
    onChange(next);
  };

  return (
    <div data-testid={testIdPrefix}>
      {rows.map((row, index) => (
        <Space
          key={row.uid}
          style={{ display: 'flex', marginBottom: 4 }}
          data-testid={`${testIdPrefix}-row-${index}`}
        >
          <Input
            value={row.key}
            disabled={disabled}
            placeholder={intl.formatMessage({
              id: 'editor.ruleNode.rename.currentKey',
            })}
            data-testid={`${testIdPrefix}-key-${index}`}
            onChange={(e) =>
              commit(
                rows.map((r) =>
                  r.uid === row.uid ? { ...r, key: e.target.value } : r,
                ),
              )
            }
          />
          <Input
            value={row.value}
            disabled={disabled}
            placeholder={intl.formatMessage({
              id: 'editor.ruleNode.rename.newKey',
            })}
            data-testid={`${testIdPrefix}-value-${index}`}
            onChange={(e) =>
              commit(
                rows.map((r) =>
                  r.uid === row.uid ? { ...r, value: e.target.value } : r,
                ),
              )
            }
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            aria-label="Remove mapping entry"
            disabled={disabled}
            data-testid={`${testIdPrefix}-remove-${index}`}
            onClick={() => commit(rows.filter((r) => r.uid !== row.uid))}
          />
        </Space>
      ))}
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        disabled={disabled}
        data-testid={`${testIdPrefix}-add`}
        onClick={() =>
          commit([...rows, { uid: nextRowUid(), key: '', value: '' }])
        }
      >
        {intl.formatMessage({ id: 'editor.ruleNode.rename.add' })}
      </Button>
      {rows.length === 0 && (
        <Typography.Text type="secondary">
          {intl.formatMessage({ id: 'editor.ruleNode.rename.mapping' })}
        </Typography.Text>
      )}
    </div>
  );
}
