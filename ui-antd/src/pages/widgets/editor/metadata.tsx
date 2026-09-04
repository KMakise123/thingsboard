/**
 * WidgetMetadataPanel — the metadata sidebar of the widget editor (M9 brief
 * §3 wave S item 7): name / fqn (read-only) / type / sizeX / sizeY /
 * typeParameters (JSON) / actionSources, antd controlled components writing
 * through the EditorSession (structural edits enter the undo stack; text
 * inputs coalesce per-field).
 *
 * Undo focus routing (spec §5.3): while focus is inside this sidebar
 * (INPUT/TEXTAREA/SELECT — the isTypingTarget form tags), ctrl+z belongs to
 * the EditorSession — the shell's hotkey handler preventDefaults the
 * browser's native input undo and calls session.undo(). The text fields
 * bind through useUndoSafeValue so an undo landing while focused never
 * fights the caret.
 */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import { useIntl } from 'react-intl';
import type { EditorSession } from '@/core/editor/session';
import type {
  WidgetActionSource,
  WidgetTypeKind,
} from '@/types/tb/widget-type';

import type { WidgetEditorDoc } from './draft-convert';
import { useUndoSafeValue } from './undo-safe-value';

export interface WidgetMetadataPanelProps {
  session: EditorSession<WidgetEditorDoc>;
  /** live draft snapshot (the caller re-renders on session changes). */
  draft: WidgetEditorDoc;
  testIdPrefix?: string;
}

const WIDGET_KINDS: Array<{
  kind: WidgetTypeKind;
  labelId: string;
  defaultMessage: string;
}> = [
  {
    kind: 'latest',
    labelId: 'editor.widget.editor.kind.latest',
    defaultMessage: 'Latest values',
  },
  {
    kind: 'timeseries',
    labelId: 'editor.widget.editor.kind.timeseries',
    defaultMessage: 'Timeseries',
  },
  {
    kind: 'rpc',
    labelId: 'editor.widget.editor.kind.rpc',
    defaultMessage: 'Control (RPC)',
  },
  {
    kind: 'alarm',
    labelId: 'editor.widget.editor.kind.alarm',
    defaultMessage: 'Alarm',
  },
  {
    kind: 'static',
    labelId: 'editor.widget.editor.kind.static',
    defaultMessage: 'Static',
  },
];

export function WidgetMetadataPanel({
  session,
  draft,
  testIdPrefix = 'we-metadata',
}: WidgetMetadataPanelProps) {
  const { formatMessage } = useIntl();

  const name = useUndoSafeValue(draft.name, (next) => {
    session.write(
      'meta.name',
      (doc) => {
        doc.name = next;
      },
      { coalesceKey: 'meta:name' },
    );
  });

  const typeParametersText = useUndoSafeValue(
    draft.meta.typeParameters === undefined
      ? ''
      : JSON.stringify(draft.meta.typeParameters, null, 2),
    (next) => {
      // only valid JSON (or an explicit clear) reaches the session; an
      // invalid intermediate stays field-local under the warning alert
      if (next.trim() === '') {
        session.write(
          'meta.typeParameters',
          (doc) => {
            doc.meta.typeParameters = undefined;
          },
          { coalesceKey: 'meta:typeParameters' },
        );
        return;
      }
      try {
        const parsed = JSON.parse(next) as Record<string, unknown>;
        session.write(
          'meta.typeParameters',
          (doc) => {
            doc.meta.typeParameters = parsed;
          },
          { coalesceKey: 'meta:typeParameters' },
        );
      } catch {
        // invalid JSON — keep it field-local
      }
    },
  );
  const typeParametersInvalid =
    typeParametersText.value.trim() !== '' &&
    draft.meta.typeParameters === undefined;

  const renameActionSource = (oldKey: string, nextKey: string) => {
    session.write(
      'meta.actionSources',
      (doc) => {
        const sources = { ...(doc.meta.actionSources ?? {}) };
        const value = sources[oldKey];
        delete sources[oldKey];
        if (nextKey) {
          sources[nextKey] = { ...value, value: nextKey };
        }
        doc.meta.actionSources = sources;
      },
      { coalesceKey: 'meta:actionSources' },
    );
  };

  const patchActionSource = (
    key: string,
    patch: Partial<WidgetActionSource>,
  ) => {
    session.write(
      'meta.actionSources',
      (doc) => {
        const sources = { ...(doc.meta.actionSources ?? {}) };
        sources[key] = { ...sources[key], ...patch };
        doc.meta.actionSources = sources;
      },
      { coalesceKey: 'meta:actionSources' },
    );
  };

  const removeActionSource = (key: string) => {
    session.write(
      'meta.actionSources',
      (doc) => {
        const sources = { ...(doc.meta.actionSources ?? {}) };
        delete sources[key];
        doc.meta.actionSources = sources;
      },
      { coalesceKey: 'meta:actionSources' },
    );
  };

  const addActionSource = () => {
    session.write(
      'meta.actionSources',
      (doc) => {
        const sources = { ...(doc.meta.actionSources ?? {}) };
        const base = 'headerButton';
        let key = base;
        let i = 2;
        while (sources[key]) {
          key = `${base}${i}`;
          i += 1;
        }
        sources[key] = { name: '', value: key, multiple: false };
        doc.meta.actionSources = sources;
      },
      { coalesceKey: 'meta:actionSources' },
    );
  };

  return (
    <div
      data-testid={testIdPrefix}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '8px 12px',
        overflow: 'auto',
        height: '100%',
      }}
    >
      <Typography.Text strong>
        {formatMessage({
          id: 'editor.widget.editor.metadata.title',
          defaultMessage: 'Metadata',
        })}
      </Typography.Text>

      <label>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'editor.widget.editor.metadata.fqn',
            defaultMessage: 'Identifier (fqn)',
          })}
        </Typography.Text>
        <Tooltip
          title={formatMessage({
            id: 'editor.widget.editor.metadata.fqnImmutable',
            defaultMessage: 'Fixed by the server after save',
          })}
        >
          <Input
            value={draft.fqn}
            readOnly
            disabled
            size="small"
            data-testid={`${testIdPrefix}-fqn`}
            placeholder="—"
          />
        </Tooltip>
      </label>

      <label>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'editor.widget.editor.metadata.name',
            defaultMessage: 'Name',
          })}
        </Typography.Text>
        <Input
          value={name.value}
          size="small"
          data-testid={`${testIdPrefix}-name`}
          onChange={(event) => name.onChange(event.target.value)}
          onFocus={name.onFocus}
          onBlur={name.onBlur}
        />
      </label>

      <label>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'editor.widget.editor.metadata.type',
            defaultMessage: 'Type',
          })}
        </Typography.Text>
        <Select<WidgetTypeKind>
          value={draft.meta.type}
          size="small"
          style={{ width: '100%', display: 'block' }}
          data-testid={`${testIdPrefix}-type`}
          onChange={(kind) =>
            session.write(
              'meta.type',
              (doc) => {
                doc.meta.type = kind;
              },
              { coalesceKey: 'meta:type' },
            )
          }
          options={WIDGET_KINDS.map((entry) => ({
            value: entry.kind,
            label: formatMessage({
              id: entry.labelId,
              defaultMessage: entry.defaultMessage,
            }),
          }))}
        />
      </label>

      <Space size={8}>
        <label>
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'editor.widget.editor.metadata.sizeX',
              defaultMessage: 'Width (cells)',
            })}
          </Typography.Text>
          <InputNumber
            value={draft.meta.sizeX}
            min={1}
            size="small"
            style={{ width: '100%' }}
            data-testid={`${testIdPrefix}-size-x`}
            onChange={(value) =>
              session.write(
                'meta.sizeX',
                (doc) => {
                  if (typeof value === 'number') {
                    doc.meta.sizeX = value;
                  }
                },
                { coalesceKey: 'meta:sizeX' },
              )
            }
          />
        </label>
        <label>
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'editor.widget.editor.metadata.sizeY',
              defaultMessage: 'Height (cells)',
            })}
          </Typography.Text>
          <InputNumber
            value={draft.meta.sizeY}
            min={1}
            size="small"
            style={{ width: '100%' }}
            data-testid={`${testIdPrefix}-size-y`}
            onChange={(value) =>
              session.write(
                'meta.sizeY',
                (doc) => {
                  if (typeof value === 'number') {
                    doc.meta.sizeY = value;
                  }
                },
                { coalesceKey: 'meta:sizeY' },
              )
            }
          />
        </label>
      </Space>

      <label>
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'editor.widget.editor.metadata.typeParameters',
            defaultMessage: 'Type parameters (JSON)',
          })}
        </Typography.Text>
        <Input.TextArea
          value={typeParametersText.value}
          rows={5}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
          data-testid={`${testIdPrefix}-type-parameters`}
          onChange={(event) => typeParametersText.onChange(event.target.value)}
          onFocus={typeParametersText.onFocus}
          onBlur={typeParametersText.onBlur}
        />
        {typeParametersInvalid ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 4 }}
            message={formatMessage({
              id: 'editor.widget.editor.metadata.typeParametersInvalid',
              defaultMessage: 'JSON parse failed; the last valid value is kept',
            })}
          />
        ) : null}
      </label>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'editor.widget.editor.metadata.actionSources',
              defaultMessage: 'Action sources',
            })}
          </Typography.Text>
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            data-testid={`${testIdPrefix}-action-add`}
            onClick={addActionSource}
          >
            {formatMessage({
              id: 'editor.widget.editor.metadata.actionSources.add',
              defaultMessage: 'Add action source',
            })}
          </Button>
        </div>
        {Object.entries(draft.meta.actionSources ?? {}).map(([key, source]) => (
          <div
            key={key}
            data-testid={`${testIdPrefix}-action-${key}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              border: '1px solid',
              borderRadius: 6,
              padding: 8,
              marginBottom: 8,
            }}
          >
            <Space size={4} style={{ justifyContent: 'space-between' }}>
              <Input
                value={key}
                size="small"
                data-testid={`${testIdPrefix}-action-key-${key}`}
                onChange={(event) =>
                  renameActionSource(key, event.target.value)
                }
              />
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                data-testid={`${testIdPrefix}-action-remove-${key}`}
                onClick={() => removeActionSource(key)}
              />
            </Space>
            <Input
              value={typeof source.name === 'string' ? source.name : ''}
              size="small"
              placeholder={formatMessage({
                id: 'editor.widget.editor.metadata.actionSources.name',
                defaultMessage: 'Display name',
              })}
              data-testid={`${testIdPrefix}-action-name-${key}`}
              onChange={(event) =>
                patchActionSource(key, { name: event.target.value })
              }
            />
            <Space size={16}>
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'editor.widget.editor.metadata.actionSources.multiple',
                  defaultMessage: 'Multiple actions',
                })}
              </Typography.Text>
              <Switch
                size="small"
                checked={source.multiple === true}
                data-testid={`${testIdPrefix}-action-multiple-${key}`}
                onChange={(checked) =>
                  patchActionSource(key, { multiple: checked })
                }
              />
            </Space>
          </div>
        ))}
      </div>
    </div>
  );
}
