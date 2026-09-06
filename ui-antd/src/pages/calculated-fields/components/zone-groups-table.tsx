/**
 * Geofencing zone-groups table + edit panel (M14 wave-5, spec 6.1-15; ui-ngx
 * calculated-field-geofencing-zone-groups-table/panel parity — NO map, a
 * zone references a perimeter attribute key on some entity).
 *
 * Zone panel: name (required/unique/forbidden/pattern), the referenced
 * entity (CURRENT/DEVICE/ASSET/CUSTOMER/TENANT/CURRENT_OWNER/
 * RELATION_QUERY — ngx ArgumentEntityType), RELATION_QUERY opens the
 * relation-levels path editor (each level = direction + relationType; the
 * path length is capped at CF_LIMITS.maxRelationLevelPerCfArgument = 2 and
 * reordered with move up/down instead of ngx cdkDrag), perimeterKeyName
 * (required + pattern), reportStrategy (3 values) and
 * createRelationsWithMatchedZones (unlocks direction + relationType).
 */
import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Checkbox,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type {
  CalculatedFieldGeofencingZoneGroup,
  EntitySearchDirection,
  GeofencingReportStrategy,
  RelationPathLevel,
} from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import type { EntityId } from '@/types/tb/entity';
import { EntityType } from '@/types/tb/entity';
import { EntitySearchSelect } from './argument-panel';
import {
  CF_ARGUMENT_FORBIDDEN_NAMES,
  CF_ARGUMENT_NAME_PATTERN,
  CF_KEY_PATTERN,
  CF_MAX_RELATION_LEVELS,
  CF_RELATION_TYPES,
  CF_REPORT_STRATEGIES,
  type CfHostEntityType,
} from './data';

/** Zone source options (ngx ArgumentEntityType + the concrete entity types). */
export type ZoneEntityType =
  | 'CURRENT'
  | 'DEVICE'
  | 'ASSET'
  | 'CUSTOMER'
  | 'TENANT'
  | 'CURRENT_OWNER'
  | 'RELATION_QUERY';

const ZONE_SOURCE_OPTIONS: Array<ZoneEntityType> = [
  'CURRENT',
  'DEVICE',
  'ASSET',
  'CUSTOMER',
  'TENANT',
  'CURRENT_OWNER',
  'RELATION_QUERY',
];

const DIRECTION_LEVEL_OPTIONS: Array<EntitySearchDirection> = ['TO', 'FROM'];

export interface ZoneGroupsTableProps {
  value?: Record<string, CalculatedFieldGeofencingZoneGroup>;
  onChange?: (
    value: Record<string, CalculatedFieldGeofencingZoneGroup>,
  ) => void;
  hostEntityType: CfHostEntityType | undefined;
  tenantId: string;
  disabled?: boolean;
}

/** Stored wire shape → panel seed. */
function toPanelValues(zone: CalculatedFieldGeofencingZoneGroup): {
  source: ZoneEntityType;
  refEntityId?: EntityId;
  levels: Array<RelationPathLevel>;
} {
  if (zone.refDynamicSourceConfiguration?.type === 'RELATION_PATH_QUERY') {
    return {
      source: 'RELATION_QUERY',
      levels: zone.refDynamicSourceConfiguration.levels?.length
        ? zone.refDynamicSourceConfiguration.levels
        : [],
    };
  }
  if (zone.refDynamicSourceConfiguration?.type === 'CURRENT_OWNER') {
    return { source: 'CURRENT_OWNER', levels: [] };
  }
  const ref = zone.refEntityId;
  const type = ref?.entityType;
  if (ref && (type === 'DEVICE' || type === 'ASSET' || type === 'CUSTOMER')) {
    return {
      source: type,
      refEntityId: ref,
      levels: [],
    };
  }
  return { source: 'CURRENT', levels: [] };
}

export default function ZoneGroupsTable({
  value,
  onChange,
  hostEntityType,
  tenantId,
  disabled,
}: ZoneGroupsTableProps) {
  const { formatMessage } = useIntl();
  const [panel, setPanel] = useState<{
    editingName?: string;
    zone?: CalculatedFieldGeofencingZoneGroup;
  } | null>(null);

  const entries = useMemo(() => Object.entries(value ?? {}), [value]);

  const removeZone = (name: string) => {
    const next = { ...(value ?? {}) };
    delete next[name];
    onChange?.(next);
  };

  const applyPanel = (
    name: string,
    zone: CalculatedFieldGeofencingZoneGroup,
  ) => {
    const next = { ...(value ?? {}) };
    if (panel?.editingName && panel.editingName !== name) {
      delete next[panel.editingName];
    }
    next[name] = zone;
    onChange?.(next);
    setPanel(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <Space className="justify-between">
        <Typography.Text>
          {formatMessage({
            id: 'pages.calculatedFields.geofencing.zoneGroups',
            defaultMessage: 'Geofencing zone groups',
          })}
        </Typography.Text>
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={disabled || entries.length >= CF_LIMITS.maxArgumentsPerCF}
          onClick={() => setPanel({})}
        >
          {formatMessage({
            id: 'pages.calculatedFields.geofencing.addZone',
            defaultMessage: 'Add zone group',
          })}
        </Button>
      </Space>

      <Table<{ name: string; zone: CalculatedFieldGeofencingZoneGroup }>
        rowKey="name"
        size="small"
        dataSource={entries.map(([name, zone]) => ({ name, zone }))}
        pagination={false}
        locale={{
          emptyText: formatMessage({
            id: 'pages.calculatedFields.geofencing.zoneGroupsEmpty',
            defaultMessage: 'No zone groups yet — at least one is required',
          }),
        }}
        columns={[
          {
            title: formatMessage({
              id: 'pages.calculatedFields.name',
              defaultMessage: 'Name',
            }),
            dataIndex: 'name',
            width: '22%',
            ellipsis: true,
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.geofencing.zoneEntity',
              defaultMessage: 'Zone entity',
            }),
            key: 'entity',
            width: '22%',
            render: (_: unknown, row) => {
              if (
                row.zone.refDynamicSourceConfiguration?.type ===
                'RELATION_PATH_QUERY'
              ) {
                return formatMessage({
                  id: 'pages.calculatedFields.argument.source.relationQuery',
                  defaultMessage: 'Related entities',
                });
              }
              if (
                row.zone.refDynamicSourceConfiguration?.type === 'CURRENT_OWNER'
              ) {
                return formatMessage({
                  id: 'pages.calculatedFields.argument.source.CURRENT_OWNER',
                  defaultMessage: 'CURRENT_OWNER',
                });
              }
              const type = row.zone.refEntityId?.entityType;
              return type
                ? String(type)
                : formatMessage({
                    id: 'pages.calculatedFields.argument.source.CURRENT',
                    defaultMessage: 'CURRENT',
                  });
            },
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.geofencing.perimeterKeyName',
              defaultMessage: 'Perimeter key name',
            }),
            key: 'perimeter',
            ellipsis: true,
            render: (_: unknown, row) => row.zone.perimeterKeyName,
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.geofencing.reportStrategy',
              defaultMessage: 'Report strategy',
            }),
            key: 'strategy',
            width: '22%',
            render: (_: unknown, row) =>
              formatMessage({
                id: `pages.calculatedFields.geofencing.reportStrategy.${row.zone.reportStrategy}`,
                defaultMessage: row.zone.reportStrategy,
              }),
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.actions',
              defaultMessage: 'Actions',
            }),
            key: 'actions',
            width: 110,
            render: (_: unknown, row) => (
              <Space size={0}>
                <Button
                  type="text"
                  size="small"
                  disabled={disabled}
                  onClick={() =>
                    setPanel({ editingName: row.name, zone: row.zone })
                  }
                >
                  {formatMessage({
                    id: 'pages.calculatedFields.edit',
                    defaultMessage: 'Edit',
                  })}
                </Button>
                <Button
                  type="text"
                  size="small"
                  danger
                  disabled={disabled}
                  onClick={() => removeZone(row.name)}
                >
                  {formatMessage({
                    id: 'pages.calculatedFields.delete',
                    defaultMessage: 'Delete',
                  })}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      {panel && (
        <ZonePanel
          zoneName={panel.editingName}
          zone={panel.zone}
          usedNames={Object.keys(value ?? {}).filter(
            (name) => name !== panel.editingName,
          )}
          hostEntityType={hostEntityType}
          tenantId={tenantId}
          onCancel={() => setPanel(null)}
          onApply={applyPanel}
        />
      )}
    </div>
  );
}

interface ZonePanelFormValues {
  name: string;
  source: ZoneEntityType;
  refEntityId?: EntityId;
  levels: Array<{ direction: EntitySearchDirection; relationType: string }>;
  perimeterKeyName: string;
  reportStrategy: GeofencingReportStrategy;
  createRelations: boolean;
  createDirection: EntitySearchDirection;
  createRelationType: string;
}

interface ZonePanelProps {
  zoneName?: string;
  zone?: CalculatedFieldGeofencingZoneGroup;
  usedNames: Array<string>;
  hostEntityType: CfHostEntityType | undefined;
  tenantId: string;
  onCancel: () => void;
  onApply: (name: string, zone: CalculatedFieldGeofencingZoneGroup) => void;
}

function ZonePanel({
  zoneName,
  zone,
  usedNames,
  tenantId,
  onCancel,
  onApply,
}: ZonePanelProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<ZonePanelFormValues>();
  const source = Form.useWatch('source', form);
  const createRelations = Form.useWatch('createRelations', form);
  // Local rows carry a stable id for the reorder list (stripped on save).
  const [levels, setLevels] = useState<
    Array<RelationPathLevel & { rowId: number }>
  >([]);
  const nextRowId = useRef(1);
  const newLevel = (): RelationPathLevel & { rowId: number } => ({
    rowId: nextRowId.current++,
    direction: 'TO',
    relationType: '',
  });

  // Mount-only seed — the caller unmounts the panel between opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only form seeding from open-time props
  useEffect(() => {
    const seed = zone
      ? toPanelValues(zone)
      : { source: 'CURRENT' as const, levels: [] };
    setLevels(
      seed.levels.length
        ? seed.levels.map((level) => ({
            ...level,
            rowId: nextRowId.current++,
          }))
        : [newLevel()],
    );
    form.setFieldsValue({
      source: seed.source,
      refEntityId: seed.refEntityId,
      perimeterKeyName: zone?.perimeterKeyName ?? '',
      reportStrategy:
        zone?.reportStrategy ?? 'REPORT_TRANSITION_EVENTS_AND_PRESENCE_STATUS',
      createRelations: zone?.createRelationsWithMatchedZones === true,
      createDirection: zone?.direction ?? 'TO',
      createRelationType: zone?.relationType ?? '',
    });
  }, [form]);

  const apply = () => {
    void form
      .validateFields()
      .then((values) => {
        if (
          values.source === 'RELATION_QUERY' &&
          (levels.length === 0 ||
            levels.some((level) => !level.relationType.trim()))
        ) {
          void message.error(
            formatMessage({
              id: 'pages.calculatedFields.geofencing.levelsRequired',
              defaultMessage:
                'Every relation level needs a relation type — at least one level is required.',
            }),
          );
          return;
        }
        const built: CalculatedFieldGeofencingZoneGroup = {
          perimeterKeyName: values.perimeterKeyName.trim(),
          reportStrategy: values.reportStrategy,
          createRelationsWithMatchedZones: values.createRelations,
        };
        if (values.createRelations) {
          built.direction = values.createDirection;
          built.relationType = values.createRelationType.trim();
        }
        switch (values.source) {
          case 'RELATION_QUERY':
            built.refDynamicSourceConfiguration = {
              type: 'RELATION_PATH_QUERY',
              levels: levels.map(({ rowId: _rowId, ...level }) => level),
            };
            break;
          case 'CURRENT_OWNER':
            built.refDynamicSourceConfiguration = { type: 'CURRENT_OWNER' };
            break;
          case 'DEVICE':
          case 'ASSET':
          case 'CUSTOMER':
            if (values.refEntityId) {
              built.refEntityId = values.refEntityId;
            }
            break;
          case 'TENANT':
            // ngx saveZone: the tenant zone pins the current tenant id.
            built.refEntityId = { entityType: EntityType.TENANT, id: tenantId };
            break;
          default:
            // CURRENT — no reference fields on the wire.
            break;
        }
        // The zone name doubles as the map key (re-key handled upstream).
        onApply((values.name ?? '').trim(), built);
      })
      .catch(() => undefined);
  };

  return (
    <Drawer
      open
      onClose={onCancel}
      width={520}
      title={formatMessage({
        id: 'pages.calculatedFields.geofencing.zoneSettings',
        defaultMessage: 'Geofencing zone group settings',
      })}
      footer={
        <Space className="flex w-full justify-end">
          <Button onClick={onCancel}>
            {formatMessage({
              id: 'pages.calculatedFields.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button type="primary" onClick={apply}>
            {formatMessage({
              id: zoneName
                ? 'pages.calculatedFields.apply'
                : 'pages.calculatedFields.add',
              defaultMessage: zoneName ? 'Apply' : 'Add',
            })}
          </Button>
        </Space>
      }
    >
      <Form<ZonePanelFormValues> form={form} layout="vertical">
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'pages.calculatedFields.name',
            defaultMessage: 'Name',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.calculatedFields.geofencing.nameRequired',
                defaultMessage: 'Zone name is required.',
              }),
            },
            {
              pattern: CF_ARGUMENT_NAME_PATTERN,
              message: formatMessage({
                id: 'pages.calculatedFields.argument.namePattern',
                defaultMessage:
                  'Only letters, digits and underscores, starting with a letter or underscore.',
              }),
            },
            {
              max: 255,
              message: formatMessage({
                id: 'pages.calculatedFields.argument.nameMaxLength',
                defaultMessage: 'Zone name should be less than 256 characters.',
              }),
            },
            {
              validator: (_rule, value: string) => {
                const normalized = (value ?? '').trim().toLowerCase();
                if (
                  normalized &&
                  usedNames.some((name) => name.toLowerCase() === normalized)
                ) {
                  return Promise.reject(
                    new Error(
                      formatMessage({
                        id: 'pages.calculatedFields.geofencing.nameDuplicate',
                        defaultMessage: 'Zone name is already used.',
                      }),
                    ),
                  );
                }
                return Promise.resolve();
              },
            },
            {
              validator: (_rule, value: string) =>
                CF_ARGUMENT_FORBIDDEN_NAMES.includes((value ?? '').trim())
                  ? Promise.reject(
                      new Error(
                        formatMessage(
                          {
                            id: 'pages.calculatedFields.argument.nameForbidden',
                            defaultMessage:
                              "'{name}' is a reserved name and cannot be used.",
                          },
                          { name: (value ?? '').trim() },
                        ),
                      ),
                    )
                  : Promise.resolve(),
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="source"
          label={formatMessage({
            id: 'pages.calculatedFields.geofencing.zoneEntityType',
            defaultMessage: 'Zone entity type',
          })}
          tooltip={formatMessage({
            id: 'pages.calculatedFields.geofencing.zoneEntityHint',
            defaultMessage:
              'The entity holding the zone perimeter attribute: the target entity, a concrete entity, the tenant, the owner or the entities reached through relations.',
          })}
        >
          <Select
            options={ZONE_SOURCE_OPTIONS.map((option) => ({
              value: option,
              label: formatMessage({
                id: `pages.calculatedFields.argument.source.${option === 'RELATION_QUERY' ? 'relationQuery' : option}`,
                defaultMessage: option,
              }),
            }))}
          />
        </Form.Item>

        {(source === 'DEVICE' ||
          source === 'ASSET' ||
          source === 'CUSTOMER') && (
          <Form.Item
            name="refEntityId"
            label={formatMessage({
              id: 'pages.calculatedFields.argument.refEntity',
              defaultMessage: 'Entity',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.calculatedFields.argument.refEntityRequired',
                  defaultMessage: 'Entity is required.',
                }),
              },
            ]}
          >
            <EntitySearchSelect entityType={source} />
          </Form.Item>
        )}

        {source === 'TENANT' && (
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message={formatMessage({
              id: 'pages.calculatedFields.geofencing.tenantHint',
              defaultMessage:
                'The zone perimeter is read from the current tenant.',
            })}
          />
        )}
        {source === 'CURRENT_OWNER' && (
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message={formatMessage({
              id: 'pages.calculatedFields.geofencing.ownerHint',
              defaultMessage:
                'The zone perimeter is read from the entity owner (resolved at runtime).',
            })}
          />
        )}

        {source === 'RELATION_QUERY' && (
          <div className="mb-3 flex flex-col gap-2 rounded border border-solid border-neutral-200 p-3 dark:border-neutral-700">
            <Space className="justify-between">
              <Typography.Text strong>
                {formatMessage({
                  id: 'pages.calculatedFields.geofencing.relationPath',
                  defaultMessage: 'Path from entity to zones',
                })}
              </Typography.Text>
              <Button
                size="small"
                icon={<PlusOutlined />}
                disabled={levels.length >= CF_MAX_RELATION_LEVELS}
                onClick={() =>
                  setLevels((previous) => [...previous, newLevel()])
                }
              >
                {formatMessage({
                  id: 'pages.calculatedFields.geofencing.addLevel',
                  defaultMessage: 'Add level',
                })}
              </Button>
            </Space>
            <Typography.Text type="secondary">
              {formatMessage(
                {
                  id: 'pages.calculatedFields.geofencing.relationPathHint',
                  defaultMessage:
                    'Relation levels walked from the entity to the zone holders — up to {max} levels, order matters (drag equivalent: reorder with the arrows).',
                },
                { max: CF_MAX_RELATION_LEVELS },
              )}
            </Typography.Text>
            {levels.map((level, index) => (
              <Space.Compact key={level.rowId} className="w-full">
                <Button
                  disabled={index === 0}
                  onClick={() =>
                    setLevels((previous) => {
                      const next = [...previous];
                      const [item] = next.splice(index, 1);
                      next.splice(index - 1, 0, item);
                      return next;
                    })
                  }
                >
                  ↑
                </Button>
                <Button
                  disabled={index === levels.length - 1}
                  onClick={() =>
                    setLevels((previous) => {
                      const next = [...previous];
                      const [item] = next.splice(index, 1);
                      next.splice(index + 1, 0, item);
                      return next;
                    })
                  }
                >
                  ↓
                </Button>
                <Select
                  className="w-32"
                  value={level.direction}
                  options={DIRECTION_LEVEL_OPTIONS.map((direction) => ({
                    value: direction,
                    label: formatMessage({
                      id: `pages.calculatedFields.geofencing.levelDirection.${direction}`,
                      defaultMessage: direction,
                    }),
                  }))}
                  onChange={(direction) =>
                    setLevels((previous) =>
                      previous.map((item, i) =>
                        i === index ? { ...item, direction } : item,
                      ),
                    )
                  }
                />
                <AutoComplete
                  className="flex-1"
                  value={level.relationType}
                  options={CF_RELATION_TYPES.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  placeholder={formatMessage({
                    id: 'pages.calculatedFields.relationType',
                    defaultMessage: 'Relation type',
                  })}
                  onChange={(next) =>
                    setLevels((previous) =>
                      previous.map((item, i) =>
                        i === index ? { ...item, relationType: next } : item,
                      ),
                    )
                  }
                />
                <Button
                  danger
                  disabled={levels.length <= 1}
                  onClick={() =>
                    setLevels((previous) =>
                      previous.filter((_, i) => i !== index),
                    )
                  }
                >
                  {formatMessage({
                    id: 'pages.calculatedFields.delete',
                    defaultMessage: 'Delete',
                  })}
                </Button>
              </Space.Compact>
            ))}
          </div>
        )}

        <Form.Item
          name="perimeterKeyName"
          label={formatMessage({
            id: 'pages.calculatedFields.geofencing.perimeterKeyName',
            defaultMessage: 'Perimeter key name',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.calculatedFields.geofencing.perimeterKeyRequired',
                defaultMessage: 'Perimeter key name is required.',
              }),
            },
            {
              pattern: CF_KEY_PATTERN,
              message: formatMessage({
                id: 'pages.calculatedFields.argument.keyPattern',
                defaultMessage: 'Single spaces inside the key are allowed.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="reportStrategy"
          label={formatMessage({
            id: 'pages.calculatedFields.geofencing.reportStrategy',
            defaultMessage: 'Report strategy',
          })}
        >
          <Select
            options={CF_REPORT_STRATEGIES.map((strategy) => ({
              value: strategy,
              label: formatMessage({
                id: `pages.calculatedFields.geofencing.reportStrategy.${strategy}`,
                defaultMessage: strategy,
              }),
            }))}
          />
        </Form.Item>

        <Form.Item name="createRelations" valuePropName="checked">
          <Checkbox>
            {formatMessage({
              id: 'pages.calculatedFields.geofencing.createRelations',
              defaultMessage: 'Create relations with matched zones',
            })}
          </Checkbox>
        </Form.Item>
        {createRelations && (
          <Space wrap>
            <Form.Item
              name="createDirection"
              label={formatMessage({
                id: 'pages.calculatedFields.direction',
                defaultMessage: 'Relation direction',
              })}
              className="mb-0"
            >
              <Select
                className="w-44"
                options={DIRECTION_LEVEL_OPTIONS.map((direction) => ({
                  value: direction,
                  label: formatMessage({
                    id: `pages.calculatedFields.propagation.direction.${direction}`,
                    defaultMessage: direction,
                  }),
                }))}
              />
            </Form.Item>
            <Form.Item
              name="createRelationType"
              label={formatMessage({
                id: 'pages.calculatedFields.relationType',
                defaultMessage: 'Relation type',
              })}
              required
              className="mb-0"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: formatMessage({
                    id: 'pages.calculatedFields.relationTypeRequired',
                    defaultMessage: 'Relation type is required.',
                  }),
                },
              ]}
            >
              <AutoComplete
                className="w-44"
                options={CF_RELATION_TYPES.map((type) => ({
                  value: type,
                  label: type,
                }))}
              />
            </Form.Item>
          </Space>
        )}
      </Form>
    </Drawer>
  );
}
