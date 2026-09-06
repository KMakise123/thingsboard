/**
 * Single-argument edit panel (M14 wave-4, R13 参数套件; ui-ngx
 * calculated-field-argument-panel parity as a Drawer — R13 allows
 * "popover/抽屉参数面板" and a Drawer hosts forms more robustly than an
 * anchored Popover; the caller unmounts the panel when closed so the form
 * re-seeds per open).
 *
 * Validation matrix (scout-cf §5): name required / pattern / ≤255 / unique
 * inside the group / forbidden ['ctx','e','pi']; Rolling only when SCRIPT
 * (isScript); attribute scope select only for the Device family; rolling
 * limit 1..CF_LIMITS.maxDataPointsPerRollingArg; the name follows the key
 * while it stays untouched (watchKeyChange).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { getAssetInfoById, getTenantAssets } from '@/services/tb/asset';
import {
  getAssetProfileById,
  getAssetProfileList,
} from '@/services/tb/asset-profile';
import { getCustomerById, getCustomers } from '@/services/tb/customer';
import { getDeviceById, getTenantDevices } from '@/services/tb/device';
import {
  getDeviceProfileById,
  getDeviceProfileList,
} from '@/services/tb/device-profile';
import { CF_LIMITS } from '@/types/tb/calculated-fields';
import type { EntityId } from '@/types/tb/entity';
import { EntityType } from '@/types/tb/entity';
import type { PageData } from '@/types/tb/page';
import { AttributeScope } from '@/types/tb/telemetry';
import {
  ATTRIBUTE_SCOPE_OPTIONS,
  attributeScopeEnabled,
  CF_ARGUMENT_FORBIDDEN_NAMES,
  CF_ARGUMENT_NAME_PATTERN,
  CF_KEY_PATTERN,
  type CfHostEntityType,
} from './data';

/** Where an argument reads its value from (ngx ArgumentEntityType minus RELATION_QUERY). */
export type CfArgumentSource =
  | 'CURRENT'
  | 'DEVICE'
  | 'ASSET'
  | 'CUSTOMER'
  | 'TENANT'
  | 'CURRENT_OWNER';

const SOURCE_OPTIONS: Array<CfArgumentSource> = [
  'CURRENT',
  'DEVICE',
  'ASSET',
  'CUSTOMER',
  'TENANT',
  'CURRENT_OWNER',
];

const KEY_TYPE_OPTIONS = ['TS_LATEST', 'ATTRIBUTE', 'TS_ROLLING'] as const;

const DEFAULT_TIME_WINDOW_MS = 15 * 60 * 1000;
const SEARCH_PAGE_SIZE = 50;

export interface ArgumentPanelFormValues {
  name: string;
  source: CfArgumentSource;
  refEntityId?: EntityId;
  key: string;
  keyType: 'TS_LATEST' | 'ATTRIBUTE' | 'TS_ROLLING';
  scope: AttributeScope;
  defaultValue?: string;
  limit?: number;
  timeWindow?: number;
}

export interface ArgumentPanelProps {
  argumentName?: string;
  initial?: Partial<ArgumentPanelFormValues>;
  usedNames: Array<string>;
  isScript: boolean;
  hostEntityType: CfHostEntityType | undefined;
  onCancel: () => void;
  onApply: (
    name: string,
    values: Omit<ArgumentPanelFormValues, 'name'>,
  ) => void;
}

interface EntityOption {
  label: string;
  value: string;
}

/**
 * Entity types with a tenant-scoped search endpoint — the argument sources
 * plus the two profile types (profiles are argument sources only via the
 * CF host itself, but the dialog's target-entity picker reuses this select
 * for all four host types).
 */
export type SearchableCfEntityType =
  | 'DEVICE'
  | 'ASSET'
  | 'CUSTOMER'
  | 'DEVICE_PROFILE'
  | 'ASSET_PROFILE';

/** Display projection used by every picker row. */
interface PickerEntity {
  id: string;
  name: string;
}

const SEARCH_PARAMS = (textSearch?: string) => ({
  pageSize: SEARCH_PAGE_SIZE,
  page: 0,
  textSearch,
});

/** SERVER-search page fetchers per searchable entity type. */
const ENTITY_PAGE_FETCHERS: Record<
  SearchableCfEntityType,
  (textSearch: string) => Promise<PageData<PickerEntity>>
> = {
  DEVICE: async (textSearch) => {
    const page = await getTenantDevices(SEARCH_PARAMS(textSearch || undefined));
    return {
      ...page,
      data: page.data.map((row) => ({ id: row.id.id, name: row.name })),
    };
  },
  ASSET: async (textSearch) => {
    const page = await getTenantAssets(SEARCH_PARAMS(textSearch || undefined));
    return {
      ...page,
      data: page.data.map((row) => ({ id: row.id.id, name: row.name })),
    };
  },
  CUSTOMER: async (textSearch) => {
    const page = await getCustomers(SEARCH_PARAMS(textSearch || undefined));
    return {
      ...page,
      data: page.data.map((row) => ({ id: row.id.id, name: row.title })),
    };
  },
  DEVICE_PROFILE: async (textSearch) => {
    const page = await getDeviceProfileList(
      SEARCH_PARAMS(textSearch || undefined),
    );
    return {
      ...page,
      data: page.data.map((row) => ({ id: row.id.id, name: row.name })),
    };
  },
  ASSET_PROFILE: async (textSearch) => {
    const page = await getAssetProfileList(
      SEARCH_PARAMS(textSearch || undefined),
    );
    return {
      ...page,
      data: page.data.map((row) => ({ id: row.id.id, name: row.name })),
    };
  },
};

/** By-id resolvers so a stored entity id keeps its label (edit prefill). */
const ENTITY_BY_ID_FETCHERS: Record<
  SearchableCfEntityType,
  (id: string) => Promise<PickerEntity>
> = {
  DEVICE: async (id) => {
    const row = await getDeviceById(id);
    return { id: row.id.id, name: row.name };
  },
  ASSET: async (id) => {
    const row = await getAssetInfoById(id);
    return { id: row.id.id, name: row.name };
  },
  CUSTOMER: async (id) => {
    const row = await getCustomerById(id);
    return { id: row.id.id, name: row.title };
  },
  DEVICE_PROFILE: async (id) => {
    const row = await getDeviceProfileById(id);
    return { id: row.id.id, name: row.name };
  },
  ASSET_PROFILE: async (id) => {
    const row = await getAssetProfileById(id);
    return { id: row.id.id, name: row.name };
  },
};

/**
 * Server-search entity picker shared by the argument panel (sources) and
 * the edit dialog (target entity).
 */
export function EntitySearchSelect({
  entityType,
  value,
  onChange,
  disabled,
}: {
  entityType: SearchableCfEntityType;
  value?: EntityId;
  onChange?: (value: EntityId | undefined) => void;
  disabled?: boolean;
}) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');
  const pageQuery = useQuery({
    queryKey: ['cf-argument-entities', entityType, search],
    queryFn: () => ENTITY_PAGE_FETCHERS[entityType](search),
    placeholderData: keepPreviousData,
  });
  const options: Array<EntityOption> = (pageQuery.data?.data ?? []).map(
    (row) => ({ label: row.name, value: row.id }),
  );
  const selected = value?.id;
  const known = new Set(options.map((option) => option.value));
  const resolveQuery = useQuery({
    queryKey: ['cf-argument-entities', 'resolve', entityType, selected],
    queryFn: () => ENTITY_BY_ID_FETCHERS[entityType](selected ?? ''),
    enabled: !!selected && !known.has(selected),
  });
  if (selected && !known.has(selected)) {
    options.push({
      label: resolveQuery.data?.name ?? selected,
      value: selected,
    });
  }
  return (
    <Select
      showSearch
      filterOption={false}
      value={selected}
      options={options}
      disabled={disabled}
      onSearch={setSearch}
      onChange={(next) =>
        onChange?.(
          next ? { entityType: EntityType[entityType], id: next } : undefined,
        )
      }
      allowClear
      loading={pageQuery.isFetching}
      placeholder={formatMessage({
        id: 'pages.calculatedFields.argument.entityPlaceholder',
        defaultMessage: 'Search entity',
      })}
      optionFilterProp="label"
    />
  );
}

export default function ArgumentPanel({
  argumentName,
  initial,
  usedNames,
  isScript,
  hostEntityType,
  onCancel,
  onApply,
}: ArgumentPanelProps) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<ArgumentPanelFormValues>();
  const nameTouched = useRef(Boolean(argumentName));
  const keyType = Form.useWatch('keyType', form);
  const source = Form.useWatch('source', form);

  // Mount-only seed: the caller unmounts the panel between opens, so prop
  // identity at mount time is the seed (re-seeding on prop changes would
  // wipe in-progress edits).
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only form seeding from open-time props
  useEffect(() => {
    form.setFieldsValue({
      name: argumentName ?? '',
      source: initial?.source ?? 'CURRENT',
      refEntityId: initial?.refEntityId,
      key: initial?.key ?? '',
      keyType: initial?.keyType ?? 'TS_LATEST',
      scope: initial?.scope ?? AttributeScope.SERVER_SCOPE,
      defaultValue: initial?.defaultValue,
      limit:
        initial?.limit ?? Math.floor(CF_LIMITS.maxDataPointsPerRollingArg / 10),
      timeWindow: initial?.timeWindow ?? DEFAULT_TIME_WINDOW_MS,
    });
  }, [form]);

  const scopeSelectable =
    source === 'DEVICE' ||
    (source === 'CURRENT' && attributeScopeEnabled(hostEntityType));

  const apply = () => {
    void form
      .validateFields()
      .then((values) => {
        const { name: nextName, ...rest } = values;
        onApply(nextName.trim(), rest);
      })
      .catch(() => undefined);
  };

  return (
    <Drawer
      open
      onClose={onCancel}
      width={440}
      title={formatMessage({
        id: argumentName
          ? 'pages.calculatedFields.argument.editTitle'
          : 'pages.calculatedFields.argument.addTitle',
        defaultMessage: argumentName ? 'Edit argument' : 'Add argument',
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
              id: argumentName
                ? 'pages.calculatedFields.apply'
                : 'pages.calculatedFields.add',
              defaultMessage: argumentName ? 'Apply' : 'Add',
            })}
          </Button>
        </Space>
      }
    >
      <Form<ArgumentPanelFormValues>
        form={form}
        layout="vertical"
        onValuesChange={(changed) => {
          if (changed.name !== undefined) {
            nameTouched.current = true;
            return;
          }
          // watchKeyChange: the name follows the key until it is edited by hand.
          if (changed.key !== undefined && !nameTouched.current) {
            form.setFieldValue('name', String(changed.key ?? ''));
          }
        }}
      >
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'pages.calculatedFields.argument.name',
            defaultMessage: 'Name',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.calculatedFields.argument.nameRequired',
                defaultMessage: 'Argument name is required.',
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
                defaultMessage:
                  'Argument name should be less than 256 characters.',
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
                        id: 'pages.calculatedFields.argument.nameDuplicate',
                        defaultMessage:
                          'Argument name is already used in this field.',
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
            id: 'pages.calculatedFields.argument.source',
            defaultMessage: 'Source entity',
          })}
          tooltip={formatMessage({
            id: 'pages.calculatedFields.argument.sourceHint',
            defaultMessage:
              'Where the argument reads its value from: the target entity itself, a concrete entity, the tenant or the owner.',
          })}
        >
          <Select
            options={SOURCE_OPTIONS.map((option) => ({
              value: option,
              label: formatMessage({
                id: `pages.calculatedFields.argument.source.${option}`,
                defaultMessage: option,
              }),
            }))}
          />
        </Form.Item>

        {source === 'DEVICE' || source === 'ASSET' || source === 'CUSTOMER' ? (
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
        ) : null}

        {source === 'TENANT' && (
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.calculatedFields.argument.tenantHint',
              defaultMessage: 'Reads tenant-level data of the current tenant.',
            })}
          </Typography.Text>
        )}
        {source === 'CURRENT_OWNER' && (
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.calculatedFields.argument.ownerHint',
              defaultMessage:
                'Reads data of the entity owner (resolved at runtime).',
            })}
          </Typography.Text>
        )}

        <Form.Item
          name="key"
          label={formatMessage({
            id: 'pages.calculatedFields.argument.key',
            defaultMessage: 'Key',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.calculatedFields.argument.keyRequired',
                defaultMessage: 'Key is required.',
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
          name="keyType"
          label={formatMessage({
            id: 'pages.calculatedFields.argument.keyType',
            defaultMessage: 'Data type',
          })}
        >
          <Select
            options={KEY_TYPE_OPTIONS.filter(
              (option) => isScript || option !== 'TS_ROLLING',
            ).map((option) => ({
              value: option,
              label: formatMessage({
                id: `pages.calculatedFields.argument.keyType.${option}`,
                defaultMessage: option,
              }),
            }))}
          />
        </Form.Item>

        {keyType === 'ATTRIBUTE' && (
          <Form.Item
            name="scope"
            label={formatMessage({
              id: 'pages.calculatedFields.argument.scope',
              defaultMessage: 'Attribute scope',
            })}
            hidden={!scopeSelectable}
          >
            <Select
              disabled={!scopeSelectable}
              options={ATTRIBUTE_SCOPE_OPTIONS.map((scope) => ({
                value: scope,
                label: scope,
              }))}
            />
          </Form.Item>
        )}

        {keyType === 'TS_ROLLING' && (
          <>
            <Form.Item
              name="limit"
              label={formatMessage(
                {
                  id: 'pages.calculatedFields.argument.limit',
                  defaultMessage: 'Limit (max {max} data points)',
                },
                { max: CF_LIMITS.maxDataPointsPerRollingArg },
              )}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.calculatedFields.argument.limitRequired',
                    defaultMessage: 'Limit is required.',
                  }),
                },
              ]}
            >
              <InputNumber
                min={1}
                max={CF_LIMITS.maxDataPointsPerRollingArg}
                className="w-full"
              />
            </Form.Item>
            <Form.Item
              name="timeWindow"
              label={formatMessage({
                id: 'pages.calculatedFields.argument.timeWindow',
                defaultMessage: 'Time window (ms)',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.calculatedFields.argument.timeWindowRequired',
                    defaultMessage: 'Time window is required.',
                  }),
                },
              ]}
            >
              <InputNumber min={1} className="w-full" />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="defaultValue"
          label={formatMessage({
            id: 'pages.calculatedFields.argument.defaultValue',
            defaultMessage: 'Default value',
          })}
          hidden={keyType === 'TS_ROLLING'}
          rules={[
            {
              pattern: CF_KEY_PATTERN,
              message: formatMessage({
                id: 'pages.calculatedFields.argument.defaultValuePattern',
                defaultMessage: 'Single spaces inside the value are allowed.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
