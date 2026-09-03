/**
 * DatasourcesEditor — the §3.4 Data datasource list (M7 wave K).
 *
 * Rows are TB Datasource objects edited value-by-value: type select
 * (entity / device / function), entity rows bind an alias (select + inline
 * create/edit via the single-alias dialog trigger), device/function rows
 * carry a display name. Each row embeds its dataKeys editor and — for
 * timeseries-style rows — the latestDataKeys section.
 *
 * Reordering: native HTML5 drag with an ↑/↓ keyboard fallback (spec:
 * no drag-sort dependency). All edits are controlled array replacements —
 * the caller writes them through the coalesced config recipe.
 */
import { Button, Select, Space, Typography } from 'antd';
import { useIntl } from 'react-intl';

import type { EntityAlias } from '@/types/tb/dashboard';
import type { Datasource, DatasourceType } from '@/types/tb/widget';
import { DataKeysEditor } from './data-keys-editor';
import { DragSortButtons, DragSortHandle, useDragSort } from './drag-sort';
import { UndoSafeInput } from './panel-fields';

/** Datasource types the panel editor offers (alarmSource is separate). */
const DATASOURCE_TYPES: DatasourceType[] = ['entity', 'device', 'function'];

/** Alias-dialog trigger seam — the panel wires it to useEditorDialogs. */
export interface AliasDialogTrigger {
  /** Opens the single-alias dialog in create mode; onSaved applies it. */
  createAlias: (apply: (aliasId: string) => void) => void;
  /** Opens the single-alias dialog for an existing alias id. */
  editAlias: (aliasId: string) => void;
}

export interface DatasourcesEditorProps {
  datasources: Datasource[];
  onChange: (next: Datasource[]) => void;
  entityAliases: Record<string, EntityAlias>;
  aliasTrigger: AliasDialogTrigger;
  /** alarmSource row: type locked to 'alarm', no latest keys. */
  alarmMode?: boolean;
  testIdPrefix: string;
}

export function DatasourcesEditor({
  datasources,
  onChange,
  entityAliases,
  aliasTrigger,
  alarmMode = false,
  testIdPrefix,
}: DatasourcesEditorProps) {
  const { formatMessage } = useIntl();

  const api = useDragSort((from, to) => {
    if (from === to) {
      return;
    }
    const next = [...datasources];
    const [moved] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(to, next.length - 1)), 0, moved);
    onChange(next);
  });

  const addDatasource = () => {
    const row: Datasource = alarmMode
      ? { type: 'alarm', dataKeys: [] }
      : { type: 'entity', dataKeys: [] };
    onChange([...datasources, row]);
  };

  const patchRow = (index: number, patch: Partial<Datasource>) => {
    onChange(
      datasources.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (index: number) => {
    onChange(datasources.filter((_, i) => i !== index));
  };

  const aliasOptions = Object.values(entityAliases).map((alias) => ({
    value: alias.id,
    label: alias.alias,
  }));

  return (
    <div data-testid={testIdPrefix} style={{ marginBottom: 8 }}>
      <Typography.Text strong style={{ fontSize: 12 }}>
        {alarmMode
          ? formatMessage({
              id: 'editor.dashboard.panel.data.alarmSource',
              defaultMessage: 'Alarm source',
            })
          : formatMessage({
              id: 'editor.dashboard.panel.data.datasources',
              defaultMessage: 'Datasources',
            })}
      </Typography.Text>
      {datasources.map((row, index) => {
        const rowPrefix = `${testIdPrefix}-${index}`;
        return (
          <div
            key={`${rowPrefix}-${row.entityAliasId ?? row.name ?? ''}`}
            {...api.rowProps(index)}
            style={{
              border: '1px solid rgba(128,128,128,0.25)',
              borderRadius: 6,
              padding: 6,
              marginTop: 6,
            }}
            data-testid={rowPrefix}
          >
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <DragSortHandle api={api} index={index} testIdPrefix={rowPrefix} />
              <Select<DatasourceType>
                size="small"
                style={{ minWidth: 88 }}
                value={row.type ?? 'entity'}
                disabled={alarmMode}
                options={(alarmMode ? (['alarm'] as DatasourceType[]) : DATASOURCE_TYPES).map(
                  (type) => ({ value: type, label: type }),
                )}
                data-testid={`${rowPrefix}-type`}
                onChange={(next) => {
                  if (next === 'entity') {
                    patchRow(index, {
                      type: next,
                      name: undefined,
                      entityAliasId: row.entityAliasId,
                    });
                  } else {
                    patchRow(index, {
                      type: next,
                      entityAliasId: undefined,
                      name: row.name ?? '',
                    });
                  }
                }}
              />
              {(row.type ?? 'entity') === 'entity' ? (
                <Space size={2} style={{ flex: 1, minWidth: 0 }}>
                  <Select
                    size="small"
                    style={{ flex: 1, minWidth: 0 }}
                    value={row.entityAliasId}
                    allowClear
                    placeholder={formatMessage({
                      id: 'editor.dashboard.panel.data.aliasPlaceholder',
                      defaultMessage: 'Entity alias',
                    })}
                    options={aliasOptions}
                    data-testid={`${rowPrefix}-alias`}
                    onChange={(next) =>
                      patchRow(index, { entityAliasId: next, name: undefined })
                    }
                  />
                  <Button
                    size="small"
                    type="text"
                    icon="＋"
                    title={formatMessage({
                      id: 'editor.dashboard.panel.data.newAlias',
                      defaultMessage: 'New alias',
                    })}
                    data-testid={`${rowPrefix}-alias-new`}
                    onClick={() =>
                      aliasTrigger.createAlias((aliasId) =>
                        patchRow(index, { entityAliasId: aliasId, name: undefined }),
                      )
                    }
                  />
                  {row.entityAliasId ? (
                    <Button
                      size="small"
                      type="text"
                      icon="✎"
                      title={formatMessage({
                        id: 'editor.dashboard.panel.data.editAlias',
                        defaultMessage: 'Edit alias',
                      })}
                      data-testid={`${rowPrefix}-alias-edit`}
                      onClick={() => aliasTrigger.editAlias(row.entityAliasId as string)}
                    />
                  ) : null}
                </Space>
              ) : (
                <UndoSafeInput
                  value={row.name ?? ''}
                  onEdit={(next) => patchRow(index, { name: next })}
                  testId={`${rowPrefix}-name`}
                  placeholder={
                    row.type === 'device'
                      ? formatMessage({
                          id: 'editor.dashboard.panel.data.deviceName',
                          defaultMessage: 'Device name',
                        })
                      : formatMessage({
                          id: 'editor.dashboard.panel.data.functionName',
                          defaultMessage: 'Display name',
                        })
                  }
                />
              )}
              <Space size={2}>
                <DragSortButtons
                  api={api}
                  index={index}
                  count={datasources.length}
                  testIdPrefix={rowPrefix}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon="✕"
                  aria-label="Remove datasource"
                  data-testid={`${rowPrefix}-remove`}
                  onClick={() => removeRow(index)}
                />
              </Space>
            </div>
            <DataKeysEditor
              label={formatMessage({
                id: 'editor.dashboard.panel.data.dataKeys',
                defaultMessage: 'Data keys',
              })}
              keys={row.dataKeys ?? []}
              onChange={(next) => patchRow(index, { dataKeys: next })}
              paletteGroups={datasources.map((source) => source.dataKeys ?? [])}
              testIdPrefix={`${rowPrefix}-keys`}
            />
            {!alarmMode ? (
              <DataKeysEditor
                label={formatMessage({
                  id: 'editor.dashboard.panel.data.latestKeys',
                  defaultMessage: 'Latest keys',
                })}
                keys={row.latestDataKeys ?? []}
                onChange={(next) => patchRow(index, { latestDataKeys: next })}
                paletteGroups={datasources.map((source) => [
                  ...(source.dataKeys ?? []),
                  ...(source.latestDataKeys ?? []),
                ])}
                testIdPrefix={`${rowPrefix}-latest-keys`}
              />
            ) : null}
          </div>
        );
      })}
      <Button
        size="small"
        type="dashed"
        block
        data-testid={`${testIdPrefix}-add`}
        onClick={addDatasource}
      >
        {formatMessage({
          id: 'editor.dashboard.panel.data.addDatasource',
          defaultMessage: 'Add datasource',
        })}
      </Button>
    </div>
  );
}
