/**
 * Entity-types panel of the complex create version modal (M14 wave-6, R20,
 * spec 6.2-4) — the ngx tb-entity-types-version-create equivalent:
 * one expandable panel per entity type, each with the type picker (deduped
 * against the other rows), a per-type sync strategy ("default" inherits the
 * request-level strategy), per-family export flags (credentials only for
 * DEVICE, attributes/relations hidden for the no-related-data types,
 * calculated fields for the CF-capable types) and the all-entities toggle
 * that swaps in a hand-picked entity multi-select.
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Collapse,
  Empty,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  entityDataName,
  findEntitiesByNameFilter,
} from '@/services/tb/relations';
import { EntityType } from '@/types/tb/entity';
import {
  allowedEntityTypes,
  ENTITY_TYPES_WITHOUT_RELATED_DATA,
  type EntityTypeCreateRow,
  entityTypeLabelKey,
  TYPES_WITH_CALCULATED_FIELDS,
} from './vc-data';

/** Hand-picked entity subset of one type (server prefix-search, ngx
 * tb-entity-list parity; value = the wire UUID strings). */
function EntitiesSelect({
  entityType,
  value,
  onChange,
}: {
  entityType: EntityType;
  value?: Array<string>;
  onChange?: (ids: Array<string>) => void;
}) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');
  const rowsQuery = useQuery({
    queryKey: ['vc-entities-pick', entityType, search],
    queryFn: async () => {
      const page = await findEntitiesByNameFilter(entityType, search || '', 50);
      return page;
    },
    placeholderData: (previous) => previous,
  });
  return (
    <Select
      mode="multiple"
      className="min-w-72 flex-1"
      maxTagCount={3}
      value={value ?? []}
      showSearch
      filterOption={false}
      onSearch={setSearch}
      loading={rowsQuery.isFetching}
      onChange={(next) => onChange?.(next)}
      options={(rowsQuery.data ?? []).map((row) => ({
        label: entityDataName(row),
        value: row.entityId.id,
      }))}
      placeholder={formatMessage({
        id: 'pages.versionControl.complexCreate.pickEntities',
        defaultMessage: 'Pick entities',
      })}
    />
  );
}

export default function EntityTypesCreateForm({
  rows,
  onChange,
}: {
  rows: Array<EntityTypeCreateRow>;
  onChange: (rows: Array<EntityTypeCreateRow>) => void;
}) {
  const { formatMessage } = useIntl();

  const patchRow = (index: number, patch: Partial<EntityTypeCreateRow>) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const patchConfig = (
    index: number,
    patch: Partial<EntityTypeCreateRow['config']>,
  ) => {
    const next = [...rows];
    next[index] = {
      ...next[index],
      config: { ...next[index].config, ...patch },
    };
    onChange(next);
  };

  const syncStrategyOptions = [
    {
      value: 'default',
      label: formatMessage({
        id: 'pages.versionControl.syncStrategyDefault',
        defaultMessage: 'Default',
      }),
    },
    {
      value: 'MERGE',
      label: formatMessage({
        id: 'pages.versionControl.syncStrategyMerge',
        defaultMessage: 'Merge',
      }),
    },
    {
      value: 'OVERWRITE',
      label: formatMessage({
        id: 'pages.versionControl.syncStrategyOverwrite',
        defaultMessage: 'Overwrite',
      }),
    },
  ];

  const items = rows.map((row, index) => {
    const entityType = row.entityType;
    const label = entityType
      ? formatMessage({
          id: entityTypeLabelKey(entityType),
          defaultMessage: entityType,
        })
      : formatMessage({
          id: 'pages.versionControl.entityTypeUndefined',
          defaultMessage: 'Undefined',
        });
    return {
      key: String(index),
      label: (
        <Typography.Text
          ellipsis
          className="mr-2 flex-1"
        >{`${label}${row.config.allEntities === false ? ` (${row.config.entityIds?.length ?? 0})` : ''}`}</Typography.Text>
      ),
      extra: (
        <Button
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          title={formatMessage({
            id: 'pages.versionControl.removeEntityType',
            defaultMessage: 'Remove',
          })}
          aria-label={formatMessage({
            id: 'pages.versionControl.removeEntityType',
            defaultMessage: 'Remove',
          })}
          onClick={(event) => {
            event.stopPropagation();
            onChange(rows.filter((_, itemIndex) => itemIndex !== index));
          }}
        />
      ),
      children: (
        <div className="flex flex-col gap-3">
          <Space wrap align="start" size={24}>
            <div className="min-w-52">
              <Typography.Text type="secondary" className="text-xs">
                {formatMessage({
                  id: 'pages.versionControl.entityType',
                  defaultMessage: 'Entity type',
                })}
              </Typography.Text>
              <Select<EntityType>
                className="mt-1 w-full"
                value={entityType}
                options={allowedEntityTypes(rows, entityType).map((type) => ({
                  value: type,
                  label: formatMessage({
                    id: entityTypeLabelKey(type),
                    defaultMessage: type,
                  }),
                }))}
                onChange={(value) => patchRow(index, { entityType: value })}
              />
            </div>
            <div className="min-w-52">
              <Typography.Text type="secondary" className="text-xs">
                {formatMessage({
                  id: 'pages.versionControl.syncStrategy',
                  defaultMessage: 'Sync strategy',
                })}
              </Typography.Text>
              <Select
                className="mt-1 w-full"
                value={row.config.syncStrategy ?? 'default'}
                options={syncStrategyOptions}
                onChange={(value) =>
                  patchConfig(index, {
                    syncStrategy: value as 'default' | 'MERGE' | 'OVERWRITE',
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1 pt-5">
              {entityType === EntityType.DEVICE && (
                <Checkbox
                  checked={row.config.saveCredentials}
                  onChange={(event) =>
                    patchConfig(index, {
                      saveCredentials: event.target.checked,
                    })
                  }
                >
                  {formatMessage({
                    id: 'pages.versionControl.exportCredentials',
                    defaultMessage: 'Export credentials',
                  })}
                </Checkbox>
              )}
              {entityType &&
                !ENTITY_TYPES_WITHOUT_RELATED_DATA.has(entityType) && (
                  <>
                    <Checkbox
                      checked={row.config.saveAttributes}
                      onChange={(event) =>
                        patchConfig(index, {
                          saveAttributes: event.target.checked,
                        })
                      }
                    >
                      {formatMessage({
                        id: 'pages.versionControl.exportAttributes',
                        defaultMessage: 'Export attributes',
                      })}
                    </Checkbox>
                    <Checkbox
                      checked={row.config.saveRelations}
                      onChange={(event) =>
                        patchConfig(index, {
                          saveRelations: event.target.checked,
                        })
                      }
                    >
                      {formatMessage({
                        id: 'pages.versionControl.exportRelations',
                        defaultMessage: 'Export relations',
                      })}
                    </Checkbox>
                  </>
                )}
              {entityType && TYPES_WITH_CALCULATED_FIELDS.has(entityType) && (
                <Checkbox
                  checked={row.config.saveCalculatedFields}
                  onChange={(event) =>
                    patchConfig(index, {
                      saveCalculatedFields: event.target.checked,
                    })
                  }
                >
                  {formatMessage({
                    id: 'pages.versionControl.exportCalculatedFields',
                    defaultMessage: 'Export calculated fields and alarm rules',
                  })}
                </Checkbox>
              )}
            </div>
          </Space>
          <Space wrap align="center" size={16}>
            <span>
              <Switch
                checked={row.config.allEntities !== false}
                onChange={(checked) =>
                  patchConfig(index, { allEntities: checked })
                }
              />{' '}
              {formatMessage({
                id: 'pages.versionControl.allEntities',
                defaultMessage: 'All entities',
              })}
            </span>
            {entityType && row.config.allEntities === false && (
              <EntitiesSelect
                entityType={entityType}
                value={row.config.entityIds}
                onChange={(ids) => patchConfig(index, { entityIds: ids })}
              />
            )}
          </Space>
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col">
      <Typography.Title level={5} className="!mb-2">
        {formatMessage({
          id: 'pages.versionControl.complexCreate.entitiesToExport',
          defaultMessage: 'Entities to export',
        })}
      </Typography.Title>
      {items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={formatMessage({
            id: 'pages.versionControl.complexCreate.noEntitiesToExport',
            defaultMessage: 'Please specify entities to export',
          })}
        />
      ) : (
        <Collapse items={items} defaultActiveKey={['0']} />
      )}
      <Space className="pt-3">
        <Button
          icon={<PlusOutlined />}
          disabled={allowedEntityTypes(rows).length === 0}
          onClick={() =>
            onChange([
              ...rows,
              {
                entityType: allowedEntityTypes(rows)[0],
                config: {
                  syncStrategy: 'default',
                  saveAttributes: true,
                  saveRelations: true,
                  saveCredentials: true,
                  saveCalculatedFields: true,
                  allEntities: true,
                  entityIds: [],
                },
              },
            ])
          }
        >
          {formatMessage({
            id: 'pages.versionControl.addEntityType',
            defaultMessage: 'Add entity type',
          })}
        </Button>
        <Button disabled={rows.length === 0} onClick={() => onChange([])}>
          {formatMessage({
            id: 'pages.versionControl.removeAll',
            defaultMessage: 'Remove all',
          })}
        </Button>
      </Space>
    </div>
  );
}
