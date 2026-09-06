/**
 * Arguments table suite (M14 wave-4, R13; ui-ngx
 * calculated-field-arguments-table parity): a Form.Item-compatible
 * controlled component holding the `Record<argumentName, CalculatedFieldArgument>`
 * map, with per-row edit/delete and an add button gated by
 * CF_LIMITS.maxArgumentsPerCF. Editing opens the ArgumentPanel Drawer.
 * Group-level problems (Rolling in SIMPLE, unresolved entity) render as a
 * live inline hint AND reject through the parent Form.Item rules.
 */
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Space, Table, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { getTenantInfo } from '@/services/tb/tenant';
import type { CalculatedFieldArgument } from '@/types/tb/calculated-fields';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import { EntityType } from '@/types/tb/entity';
import { AttributeScope } from '@/types/tb/telemetry';
import ArgumentPanel, {
  type ArgumentPanelFormValues,
  type CfArgumentSource,
} from './argument-panel';
import { argumentTableError, type CfHostEntityType } from './data';

export interface ArgumentsTableProps {
  value?: Record<string, CalculatedFieldArgument>;
  onChange?: (value: Record<string, CalculatedFieldArgument>) => void;
  isScript: boolean;
  hostEntityType: CfHostEntityType | undefined;
  tenantId: string;
  disabled?: boolean;
}

interface PanelState {
  editingName?: string;
  initial: Partial<ArgumentPanelFormValues>;
}

/** Inverse of buildArgument: stored wire shape → panel seed. */
function toPanelValues(
  name: string,
  arg: CalculatedFieldArgument,
): ArgumentPanelFormValues {
  let source: CfArgumentSource = 'CURRENT';
  if (arg.refDynamicSourceConfiguration?.type === 'CURRENT_OWNER') {
    source = 'CURRENT_OWNER';
  } else if (arg.refEntityId?.entityType) {
    source = arg.refEntityId.entityType as CfArgumentSource;
  }
  return {
    name,
    source,
    refEntityId: arg.refEntityId,
    key: arg.refEntityKey?.key ?? '',
    keyType: arg.refEntityKey?.type ?? 'TS_LATEST',
    scope: arg.refEntityKey?.scope ?? AttributeScope.SERVER_SCOPE,
    defaultValue: arg.defaultValue,
    limit: arg.limit,
    timeWindow: arg.timeWindow,
  };
}

/** Panel values → stored wire shape (ngx saveArgument mapping). */
function buildArgument(
  values: Omit<ArgumentPanelFormValues, 'name'>,
  tenantId: string,
): CalculatedFieldArgument {
  const arg: CalculatedFieldArgument = {
    refEntityKey: {
      key: values.key.trim(),
      type: values.keyType,
      ...(values.keyType === 'ATTRIBUTE' ? { scope: values.scope } : {}),
    },
  };
  if (values.source === 'CURRENT_OWNER') {
    arg.refDynamicSourceConfiguration = { type: 'CURRENT_OWNER' };
  } else if (values.source === 'TENANT') {
    arg.refEntityId = { entityType: EntityType.TENANT, id: tenantId };
  } else if (values.source !== 'CURRENT' && values.refEntityId) {
    arg.refEntityId = values.refEntityId;
  }
  if (values.keyType === 'TS_ROLLING') {
    arg.limit = values.limit;
    arg.timeWindow = values.timeWindow;
  } else if (values.defaultValue?.trim()) {
    arg.defaultValue = values.defaultValue.trim();
  }
  return arg;
}

export default function ArgumentsTable({
  value,
  onChange,
  isScript,
  hostEntityType,
  tenantId,
  disabled,
}: ArgumentsTableProps) {
  const { formatMessage } = useIntl();
  const [panel, setPanel] = useState<PanelState | null>(null);

  const entries = useMemo(() => Object.entries(value ?? {}), [value]);
  const groupError = argumentTableError(value ?? {}, isScript);

  const tenantQuery = useQuery({
    queryKey: ['cf-argument-tenant', tenantId],
    queryFn: () => getTenantInfo(tenantId),
    enabled: !!tenantId,
    select: (tenant) => ({ id: tenant.id.id, name: tenant.title }),
  });
  // Row display keeps the TENANT reference readable (the panel stores the
  // id either way).
  const tenantName = tenantQuery.data?.name;

  const persist = (next: Record<string, CalculatedFieldArgument>) => {
    onChange?.(next);
  };

  const applyPanel = (
    name: string,
    values: Omit<ArgumentPanelFormValues, 'name'>,
  ) => {
    const next = { ...(value ?? {}) };
    // Re-key when the name changed so the map key stays the argument name.
    if (panel?.editingName && panel.editingName !== name) {
      delete next[panel.editingName];
    }
    next[name] = buildArgument(values, tenantId);
    persist(next);
    setPanel(null);
  };

  const removeArgument = (name: string) => {
    const next = { ...(value ?? {}) };
    delete next[name];
    persist(next);
  };

  const openPanel = (name?: string) => {
    if (name && value?.[name]) {
      setPanel({
        editingName: name,
        initial: toPanelValues(name, value[name]),
      });
      return;
    }
    setPanel({ initial: { keyType: 'TS_LATEST', source: 'CURRENT' } });
  };

  return (
    <div className="flex flex-col gap-2">
      <Space className="justify-between">
        <Typography.Text>
          {formatMessage({
            id: 'pages.calculatedFields.arguments',
            defaultMessage: 'Arguments',
          })}
        </Typography.Text>
        <Button
          size="small"
          icon={<PlusOutlined />}
          disabled={disabled || entries.length >= CF_LIMITS.maxArgumentsPerCF}
          onClick={() => openPanel()}
        >
          {formatMessage({
            id: 'pages.calculatedFields.argument.addTitle',
            defaultMessage: 'Add argument',
          })}
        </Button>
      </Space>

      <Table<{ name: string; argument: CalculatedFieldArgument }>
        rowKey="name"
        size="small"
        dataSource={entries.map(([name, argument]) => ({ name, argument }))}
        pagination={false}
        locale={{
          emptyText: formatMessage({
            id: 'pages.calculatedFields.argumentsEmpty',
            defaultMessage: 'No arguments yet',
          }),
        }}
        columns={[
          {
            title: formatMessage({
              id: 'pages.calculatedFields.argument.name',
              defaultMessage: 'Name',
            }),
            dataIndex: 'name',
            width: '22%',
            ellipsis: true,
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.argument.source',
              defaultMessage: 'Source entity',
            }),
            key: 'source',
            width: '22%',
            render: (_: unknown, row) => {
              if (
                row.argument.refDynamicSourceConfiguration?.type ===
                'CURRENT_OWNER'
              ) {
                return formatMessage({
                  id: 'pages.calculatedFields.argument.source.CURRENT_OWNER',
                  defaultMessage: 'CURRENT_OWNER',
                });
              }
              const type = row.argument.refEntityId?.entityType;
              if (!type) {
                return formatMessage({
                  id: 'pages.calculatedFields.argument.source.CURRENT',
                  defaultMessage: 'CURRENT',
                });
              }
              if (type === 'TENANT') {
                return tenantName
                  ? `${formatMessage({
                      id: 'pages.calculatedFields.argument.source.TENANT',
                      defaultMessage: 'TENANT',
                    })} (${tenantName})`
                  : formatMessage({
                      id: 'pages.calculatedFields.argument.source.TENANT',
                      defaultMessage: 'TENANT',
                    });
              }
              return type;
            },
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.argument.keyType',
              defaultMessage: 'Data type',
            }),
            key: 'keyType',
            width: '18%',
            render: (_: unknown, row) =>
              formatMessage({
                id: `pages.calculatedFields.argument.keyType.${row.argument.refEntityKey?.type ?? 'TS_LATEST'}`,
                defaultMessage: row.argument.refEntityKey?.type ?? 'TS_LATEST',
              }),
          },
          {
            title: formatMessage({
              id: 'pages.calculatedFields.argument.key',
              defaultMessage: 'Key',
            }),
            key: 'key',
            ellipsis: true,
            render: (_: unknown, row) =>
              row.argument.refEntityKey?.scope
                ? `${row.argument.refEntityKey.key} (${row.argument.refEntityKey.scope})`
                : row.argument.refEntityKey?.key,
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
                  onClick={() => openPanel(row.name)}
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
                  onClick={() => removeArgument(row.name)}
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

      {groupError === 'rolling-in-simple' && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.calculatedFields.argumentsRollingInSimple',
            defaultMessage:
              'SIMPLE calculated fields do not support rolling arguments. Switch the field type to SCRIPT or use latest-telemetry arguments.',
          })}
        />
      )}
      {groupError === 'entity-not-found' && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.calculatedFields.argumentsEntityNotFound',
            defaultMessage:
              'Some arguments reference an entity that cannot be found. Fix or remove them before saving.',
          })}
        />
      )}

      {panel && (
        <ArgumentPanel
          argumentName={panel.editingName}
          initial={panel.initial}
          usedNames={Object.keys(value ?? {}).filter(
            (name) => name !== panel.editingName,
          )}
          isScript={isScript}
          hostEntityType={hostEntityType}
          onCancel={() => setPanel(null)}
          onApply={applyPanel}
        />
      )}
    </div>
  );
}
