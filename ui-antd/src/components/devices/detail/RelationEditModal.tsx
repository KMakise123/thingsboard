/**
 * Relation add dialog: pick the direction (this device as FROM or TO),
 * a free-form relation type, and the other end via the generic entity
 * picker (type + name prefix search through /api/entitiesQuery/find).
 */
import { useQuery } from '@tanstack/react-query';
import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  type EntityRelation,
  entityDataName,
  findEntitiesByNameFilter,
} from '@/services/tb/relations';
import { type EntityId, EntityType } from '@/types/tb';

/** Picker-relevant entity types (ui-ngx relation dialog default set). */
export const RELATION_ENTITY_TYPES: Array<EntityType> = [
  EntityType.DEVICE,
  EntityType.ASSET,
  EntityType.CUSTOMER,
  EntityType.DASHBOARD,
  EntityType.ENTITY_VIEW,
  EntityType.TENANT,
  EntityType.USER,
  EntityType.RULE_CHAIN,
];

export interface RelationDraft {
  direction: 'FROM' | 'TO';
  relationType: string;
  entityType: EntityType;
  entityId: string;
  /** Free-text prefix feeding the picker query (not submitted). */
  entitySearch?: string;
}

export default function RelationEditModal({
  open,
  deviceEntityId,
  onClose,
  onCommit,
  saving,
}: {
  open: boolean;
  deviceEntityId: EntityId;
  onClose: () => void;
  onCommit: (relation: EntityRelation) => Promise<void>;
  saving: boolean;
}) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<RelationDraft>();
  const entityType = Form.useWatch('entityType', form);
  const entitySearch = Form.useWatch('entitySearch', form);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        direction: 'FROM',
        relationType: 'Contains',
        entityType: EntityType.DEVICE,
      });
    }
  }, [open, form]);

  const optionsQuery = useQuery({
    queryKey: ['relation-picker', entityType, entitySearch ?? ''],
    queryFn: () =>
      findEntitiesByNameFilter(
        entityType as EntityType,
        (entitySearch ?? '').trim(),
      ),
    enabled: open && !!entityType,
  });

  const submit = async (draft: RelationDraft) => {
    const otherEnd: EntityId = {
      entityType: draft.entityType,
      id: draft.entityId,
    };
    const relation: EntityRelation = {
      type: draft.relationType.trim(),
      typeGroup: 'COMMON',
      from: draft.direction === 'FROM' ? deviceEntityId : otherEnd,
      to: draft.direction === 'FROM' ? otherEnd : deviceEntityId,
    };
    await onCommit(relation);
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.devices.detail.relationAddTitle',
        defaultMessage: 'Add relation',
      })}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={saving}
      okText={formatMessage({
        id: 'pages.devices.detail.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.devices.detail.cancel',
        defaultMessage: 'Cancel',
      })}
      destroyOnHidden
    >
      <Form<RelationDraft>
        form={form}
        layout="vertical"
        className="pt-2"
        onFinish={(values) => void submit(values)}
      >
        <Form.Item
          name="direction"
          label={formatMessage({
            id: 'pages.devices.detail.relationDirection',
            defaultMessage: 'Direction',
          })}
        >
          <Select
            options={[
              {
                value: 'FROM',
                label: formatMessage({
                  id: 'pages.devices.detail.relationFrom',
                  defaultMessage: 'From this device',
                }),
              },
              {
                value: 'TO',
                label: formatMessage({
                  id: 'pages.devices.detail.relationTo',
                  defaultMessage: 'To this device',
                }),
              },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="relationType"
          label={formatMessage({
            id: 'pages.devices.detail.relationType',
            defaultMessage: 'Relation type',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.devices.detail.relationTypeRequired',
                defaultMessage: 'Relation type is required.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="entityType"
          label={formatMessage({
            id: 'pages.devices.detail.relationEntityType',
            defaultMessage: 'Entity type',
          })}
        >
          <Select
            options={RELATION_ENTITY_TYPES.map((type) => ({
              value: type,
              label: formatMessage({
                id: `pages.devices.detail.entityType.${type}`,
                defaultMessage: type,
              }),
            }))}
          />
        </Form.Item>
        <Form.Item
          name="entitySearch"
          label={formatMessage({
            id: 'pages.devices.detail.relationEntitySearch',
            defaultMessage: 'Search entity by name',
          })}
        >
          <Input.Search allowClear />
        </Form.Item>
        <Form.Item
          name="entityId"
          label={formatMessage({
            id: 'pages.devices.detail.relationEntity',
            defaultMessage: 'Entity',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.devices.detail.relationEntityRequired',
                defaultMessage: 'Entity is required.',
              }),
            },
          ]}
        >
          <Select
            loading={optionsQuery.isPending}
            options={(optionsQuery.data ?? []).map((row) => ({
              value: row.entityId.id,
              label: entityDataName(row),
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
