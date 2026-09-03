/**
 * AliasDialog — the single-alias editor (spec §3.5, ui-ngx
 * entity-alias-dialog): alias name (required + unique), resolveMultiple,
 * and the entity filter with per-type fields (v2 covers the anchor-verified
 * EntityAliasFilter union: singleEntity / entityType / stateEntity /
 * deviceType / relationsQuery / apiUsageState).
 *
 * Frozen payload contract (K wave calls this from the panel):
 * `{aliasId?, onSaved?}` — no aliasId = create mode; onSaved receives the
 * persisted alias after the ONE upsert transaction group (create mode only
 * hands the id back; edit mode has no listener).
 */
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useIntl } from 'react-intl';

import { upsertEntityAlias, writeDraft } from '@/core/editor/dashboard-draft';
import type {
  EntityAlias,
  EntityAliasFilter,
  EntityAliasFilterType,
  SingleEntityFilter,
} from '@/types/tb/dashboard';
import { EntityType } from '@/types/tb/entity';

import type { EditorDialogProps } from './host';
import { useDialogSession } from './use-dialog-session';

export interface AliasPayload {
  aliasId?: string;
  onSaved?: (saved?: unknown) => void;
}

const FILTER_TYPES: EntityAliasFilterType[] = [
  'singleEntity',
  'entityType',
  'stateEntity',
  'deviceType',
  'relationsQuery',
  'apiUsageState',
];

/** Anchor-verified selectable entity types (TB alias editor subset). */
const ENTITY_TYPES: Array<{ value: EntityType; label: string }> = [
  { value: EntityType.DEVICE, label: 'DEVICE' },
  { value: EntityType.ASSET, label: 'ASSET' },
  { value: EntityType.CUSTOMER, label: 'CUSTOMER' },
  { value: EntityType.ENTITY_VIEW, label: 'ENTITY_VIEW' },
  { value: EntityType.USER, label: 'USER' },
  { value: EntityType.TENANT, label: 'TENANT' },
  { value: EntityType.DASHBOARD, label: 'DASHBOARD' },
];

interface AliasFormValues {
  alias: string;
  resolveMultiple: boolean;
  filterType: EntityAliasFilterType;
  singleEntityType: EntityType;
  singleEntityId: string;
  entityFilterType: EntityType;
  stateEntityParamName: string;
  deviceTypes: string[];
  deviceNameFilter: string;
  direction: 'FROM' | 'TO';
  maxLevel: number;
  rootStateEntity: boolean;
}

export function AliasDialog({ open, payload, onClose }: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const session = useDialogSession();
  const [form] = Form.useForm<AliasFormValues>();
  const filterTypeWatch: EntityAliasFilterType =
    Form.useWatch('filterType', form) ?? 'singleEntity';

  const scope = (payload ?? null) as AliasPayload | null;
  const existing = scope?.aliasId
    ? session.current.entityAliases[scope.aliasId]
    : undefined;
  const filter = existing?.filter as EntityAliasFilter | undefined;
  const singleEntity =
    filter?.type === 'singleEntity'
      ? (filter as SingleEntityFilter)
      : undefined;
  const entityTypeFilter = filter?.type === 'entityType' ? filter : undefined;
  const stateEntityFilter = filter?.type === 'stateEntity' ? filter : undefined;
  const deviceTypeFilter = filter?.type === 'deviceType' ? filter : undefined;
  const relationsFilter =
    filter?.type === 'relationsQuery' ? filter : undefined;

  const aliasRows = Object.values(session.current.entityAliases);

  const onOk = (): void => {
    void form
      .validateFields()
      .then((values) => {
        const id = existing?.id ?? globalThis.crypto.randomUUID();
        let entityFilter: EntityAliasFilter;
        switch (values.filterType) {
          case 'entityType':
            entityFilter = {
              type: 'entityType',
              entityType: values.entityFilterType,
            };
            break;
          case 'stateEntity':
            entityFilter = {
              type: 'stateEntity',
              stateEntityParamName: values.stateEntityParamName || null,
            };
            break;
          case 'deviceType':
            entityFilter = {
              type: 'deviceType',
              deviceTypes: values.deviceTypes ?? [],
              deviceNameFilter: values.deviceNameFilter || '',
            };
            break;
          case 'relationsQuery':
            entityFilter = {
              type: 'relationsQuery',
              direction: values.direction,
              maxLevel: values.maxLevel,
              rootStateEntity: values.rootStateEntity,
              filters: [],
            };
            break;
          case 'apiUsageState':
            entityFilter = { type: 'apiUsageState' };
            break;
          default:
            entityFilter = {
              type: 'singleEntity',
              singleEntity: {
                entityType: values.singleEntityType,
                id: values.singleEntityId,
              },
            };
            break;
        }
        // ui-ngx EntityFilter carries resolveMultiple at the filter level
        // for every filter type — keep it on the shared spread.
        const alias: EntityAlias = {
          id,
          alias: values.alias.trim(),
          filter: {
            ...entityFilter,
            resolveMultiple: values.resolveMultiple,
          },
        };
        writeDraft(session, upsertEntityAlias(alias));
        scope?.onSaved?.(alias);
        onClose();
      })
      .catch(() => undefined);
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.dialogs.alias.title',
        defaultMessage: 'Entity alias',
      })}
      okText={formatMessage({
        id: 'editor.common.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{ 'data-testid': 'alias-ok' }}
      cancelButtonProps={{ 'data-testid': 'alias-cancel' }}
      onOk={onOk}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="alias-dialog"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          alias: existing?.alias ?? '',
          resolveMultiple: filter?.resolveMultiple ?? false,
          filterType: (filter?.type as EntityAliasFilterType) ?? 'singleEntity',
          singleEntityType:
            (singleEntity?.singleEntity?.entityType as
              | EntityType
              | undefined) ?? EntityType.DEVICE,
          singleEntityId: singleEntity?.singleEntity?.id ?? '',
          entityFilterType:
            (entityTypeFilter as { entityType?: EntityType } | undefined)
              ?.entityType ?? EntityType.DEVICE,
          stateEntityParamName:
            stateEntityFilter?.stateEntityParamName ?? 'entityId',
          deviceTypes: deviceTypeFilter?.deviceTypes ?? [],
          deviceNameFilter: deviceTypeFilter?.deviceNameFilter ?? '',
          direction: relationsFilter?.direction ?? 'FROM',
          maxLevel: relationsFilter?.maxLevel ?? 1,
          rootStateEntity: relationsFilter?.rootStateEntity ?? true,
        }}
      >
        <Form.Item
          name="alias"
          label={formatMessage({
            id: 'editor.dashboard.dialogs.alias.name',
            defaultMessage: 'Name',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'editor.dashboard.dialogs.alias.nameRequired',
                defaultMessage: 'Alias name is required.',
              }),
            },
            {
              validator: (_rule, value: string) => {
                const name = (value ?? '').trim();
                const duplicate = aliasRows.some(
                  (row) => row.alias === name && row.id !== existing?.id,
                );
                return duplicate
                  ? Promise.reject(
                      new Error(
                        formatMessage({
                          id: 'editor.dashboard.dialogs.alias.nameExists',
                          defaultMessage: 'Alias name already exists.',
                        }),
                      ),
                    )
                  : Promise.resolve();
              },
            },
          ]}
        >
          <Input data-testid="alias-name" />
        </Form.Item>
        <Form.Item
          name="filterType"
          label={formatMessage({
            id: 'editor.dashboard.dialogs.alias.filterType',
            defaultMessage: 'Filter type',
          })}
          rules={[{ required: true }]}
        >
          <Select
            options={FILTER_TYPES.map((type) => ({
              value: type,
              label: type,
            }))}
          />
        </Form.Item>
        {filterTypeWatch === 'singleEntity' ? (
          <>
            <Form.Item
              name="singleEntityType"
              label={formatMessage({
                id: 'editor.dashboard.dialogs.alias.entityType',
                defaultMessage: 'Entity type',
              })}
              rules={[{ required: true }]}
            >
              <Select options={ENTITY_TYPES} />
            </Form.Item>
            <Form.Item
              name="singleEntityId"
              label={formatMessage({
                id: 'editor.dashboard.dialogs.alias.entityId',
                defaultMessage: 'Entity id',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'editor.dashboard.dialogs.alias.entityIdRequired',
                    defaultMessage: 'Entity id is required.',
                  }),
                },
              ]}
            >
              <Input data-testid="alias-single-entity-id" />
            </Form.Item>
          </>
        ) : null}
        {filterTypeWatch === 'entityType' ? (
          <Form.Item
            name="entityFilterType"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.alias.entityType',
              defaultMessage: 'Entity type',
            })}
            rules={[{ required: true }]}
          >
            <Select options={ENTITY_TYPES} />
          </Form.Item>
        ) : null}
        {filterTypeWatch === 'stateEntity' ? (
          <Form.Item
            name="stateEntityParamName"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.alias.stateEntityParamName',
              defaultMessage: 'State entity parameter name',
            })}
          >
            <Input />
          </Form.Item>
        ) : null}
        {filterTypeWatch === 'deviceType' ? (
          <>
            <Form.Item
              name="deviceTypes"
              label={formatMessage({
                id: 'editor.dashboard.dialogs.alias.deviceTypes',
                defaultMessage: 'Device types',
              })}
              rules={[{ required: true }]}
            >
              <Select mode="tags" open={false} tokenSeparators={[',']} />
            </Form.Item>
            <Form.Item
              name="deviceNameFilter"
              label={formatMessage({
                id: 'editor.dashboard.dialogs.alias.deviceNameFilter',
                defaultMessage: 'Device name filter',
              })}
            >
              <Input />
            </Form.Item>
          </>
        ) : null}
        {filterTypeWatch === 'relationsQuery' ? (
          <>
            <Form.Item
              name="direction"
              label={formatMessage({
                id: 'editor.dashboard.dialogs.alias.direction',
                defaultMessage: 'Direction',
              })}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'FROM', label: 'FROM' },
                  { value: 'TO', label: 'TO' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="maxLevel"
              label={formatMessage({
                id: 'editor.dashboard.dialogs.alias.maxLevel',
                defaultMessage: 'Max relation level',
              })}
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="rootStateEntity"
              label={formatMessage({
                id: 'editor.dashboard.dialogs.alias.rootStateEntity',
                defaultMessage: 'Take root entity from the dashboard state',
              })}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </>
        ) : null}
        <Form.Item
          name="resolveMultiple"
          label={formatMessage({
            id: 'editor.dashboard.dialogs.alias.resolveMultiple',
            defaultMessage: 'Resolve multiple entities',
          })}
          valuePropName="checked"
        >
          <Switch data-testid="alias-resolve-multiple" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
