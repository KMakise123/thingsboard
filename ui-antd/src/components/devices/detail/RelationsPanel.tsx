/**
 * Relations tab panel (spec 3.3 `relations`): FROM/TO direction switch,
 * entity-type filter over the loaded rows, add (relation dialog with the
 * generic entity picker) and delete (single + batch, confirm) — TA only.
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/devices/server-error-text';
import {
  deleteRelation,
  type EntityRelationInfo,
  findRelationInfosByFrom,
  findRelationInfosByTo,
  saveRelation,
} from '@/services/tb/relations';
import { type EntityId, EntityType } from '@/types/tb';
import RelationEditModal from './RelationEditModal';

type Direction = 'FROM' | 'TO';

/** Entity types worth offering as row filters (all loaded rows still show). */
const FILTER_ENTITY_TYPES: Array<EntityType> = [
  EntityType.DEVICE,
  EntityType.ASSET,
  EntityType.CUSTOMER,
  EntityType.DASHBOARD,
  EntityType.ENTITY_VIEW,
  EntityType.TENANT,
  EntityType.USER,
];

export default function RelationsPanel({
  deviceEntityId,
  readOnly,
}: {
  deviceEntityId: EntityId;
  readOnly: boolean;
}) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<Direction>('FROM');
  const [typeFilter, setTypeFilter] = useState<EntityType | undefined>();
  const [selectedKeys, setSelectedKeys] = useState<Array<string>>([]);
  const [addOpen, setAddOpen] = useState(false);

  const queryKey = ['relations', deviceEntityId.id, direction];
  const relationsQuery = useQuery({
    queryKey,
    queryFn: () =>
      direction === 'FROM'
        ? findRelationInfosByFrom(deviceEntityId)
        : findRelationInfosByTo(deviceEntityId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['relations', deviceEntityId.id],
    });

  const saveMutation = useMutation({
    mutationFn: (relation: Parameters<typeof saveRelation>[0]) =>
      saveRelation(relation),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.relationSaved',
          defaultMessage: 'Relation saved.',
        }),
      );
      void invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const runDeletes = async (relations: Array<EntityRelationInfo>) => {
    let failed = 0;
    for (const relation of relations) {
      try {
        await deleteRelation(relation);
      } catch {
        failed += 1;
      }
    }
    if (failed > 0) {
      void message.warning(
        formatMessage(
          {
            id: 'pages.devices.detail.alarmBatchPartial',
            defaultMessage: '{ok} succeeded, {fail} failed.',
          },
          { ok: relations.length - failed, fail: failed },
        ),
      );
    } else {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.relationDeleted',
          defaultMessage: 'Relation deleted.',
        }),
      );
    }
    setSelectedKeys([]);
    void invalidate();
  };

  const confirmDelete = (relations: Array<EntityRelationInfo>) => {
    if (relations.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.devices.detail.relationDeleteManyTitle',
          defaultMessage:
            'Delete {count, plural, =1 {1 relation} other {# relations}}?',
        },
        { count: relations.length },
      ),
      content: formatMessage({
        id: 'pages.devices.detail.relationDeleteText',
        defaultMessage:
          'After the confirmation the relation(s) will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.devices.detail.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.devices.detail.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => runDeletes(relations),
    });
  };

  const rows = useMemo(() => {
    const loaded = relationsQuery.data ?? [];
    if (!typeFilter) {
      return loaded;
    }
    return loaded.filter((relation) =>
      direction === 'FROM'
        ? relation.to.entityType === typeFilter
        : relation.from.entityType === typeFilter,
    );
  }, [relationsQuery.data, typeFilter, direction]);

  const rowKey = (relation: EntityRelationInfo) =>
    `${relation.from.entityType}:${relation.from.id}|${relation.type}|${relation.to.entityType}:${relation.to.id}`;

  const selectedRelations = rows.filter((relation) =>
    selectedKeys.includes(rowKey(relation)),
  );

  const columns = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.relationType',
        defaultMessage: 'Relation type',
      }),
      dataIndex: 'type',
      ellipsis: true,
    },
    {
      title: formatMessage({
        id:
          direction === 'FROM'
            ? 'pages.devices.detail.relationToEntityType'
            : 'pages.devices.detail.relationFromEntityType',
        defaultMessage:
          direction === 'FROM' ? 'To entity type' : 'From entity type',
      }),
      key: 'otherType',
      width: 140,
      render: (_: unknown, relation: EntityRelationInfo) => {
        const other = direction === 'FROM' ? relation.to : relation.from;
        return formatMessage({
          id: `pages.devices.detail.entityType.${other.entityType}`,
          defaultMessage: other.entityType,
        });
      },
    },
    {
      title: formatMessage({
        id:
          direction === 'FROM'
            ? 'pages.devices.detail.relationToEntityName'
            : 'pages.devices.detail.relationFromEntityName',
        defaultMessage: direction === 'FROM' ? 'To entity' : 'From entity',
      }),
      key: 'otherName',
      ellipsis: true,
      render: (_: unknown, relation: EntityRelationInfo) => {
        const name =
          direction === 'FROM'
            ? (relation.toName ?? relation.to.id)
            : (relation.fromName ?? relation.from.id);
        return <Typography.Text>{name}</Typography.Text>;
      },
    },
    ...(!readOnly
      ? [
          {
            title: formatMessage({
              id: 'pages.devices.detail.actions',
              defaultMessage: 'Actions',
            }),
            key: 'actions',
            width: 70,
            render: (_: unknown, relation: EntityRelationInfo) => (
              <Popconfirm
                title={formatMessage(
                  {
                    id: 'pages.devices.detail.relationDeleteTitle',
                    defaultMessage: "Delete relation '{type}'?",
                  },
                  { type: relation.type },
                )}
                okButtonProps={{ danger: true }}
                okText={formatMessage({
                  id: 'pages.devices.detail.delete',
                  defaultMessage: 'Delete',
                })}
                cancelText={formatMessage({
                  id: 'pages.devices.detail.cancel',
                  defaultMessage: 'Cancel',
                })}
                onConfirm={() => void runDeletes([relation])}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  title={formatMessage({
                    id: 'pages.devices.detail.delete',
                    defaultMessage: 'Delete',
                  })}
                />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <Segmented
          value={direction}
          onChange={(next) => {
            setDirection(next as Direction);
            setSelectedKeys([]);
          }}
          options={[
            {
              value: 'FROM',
              label: formatMessage({
                id: 'pages.devices.detail.relationFromRelations',
                defaultMessage: 'From relations',
              }),
            },
            {
              value: 'TO',
              label: formatMessage({
                id: 'pages.devices.detail.relationToRelations',
                defaultMessage: 'To relations',
              }),
            },
          ]}
        />
        <Select
          allowClear
          className="w-48"
          placeholder={formatMessage({
            id: 'pages.devices.detail.relationFilterPlaceholder',
            defaultMessage: 'All entity types',
          })}
          value={typeFilter}
          onChange={(next) => setTypeFilter(next)}
          options={FILTER_ENTITY_TYPES.map((type) => ({
            value: type,
            label: formatMessage({
              id: `pages.devices.detail.entityType.${type}`,
              defaultMessage: type,
            }),
          }))}
        />
        <div className="flex-1" />
        {!readOnly && selectedRelations.length > 0 && (
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => confirmDelete(selectedRelations)}
          >
            {formatMessage({
              id: 'pages.devices.detail.deleteSelected',
              defaultMessage: 'Delete selected',
            })}
          </Button>
        )}
        {!readOnly && (
          <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            {formatMessage({
              id: 'pages.devices.detail.relationAdd',
              defaultMessage: 'Add relation',
            })}
          </Button>
        )}
      </Space>

      {relationsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.relationLoadFailed',
            defaultMessage: 'Failed to load relations',
          })}
          description={serverErrorText(relationsQuery.error)}
        />
      )}

      <Table<EntityRelationInfo>
        rowKey={rowKey}
        size="small"
        columns={columns}
        dataSource={rows}
        loading={relationsQuery.isPending}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowSelection={
          readOnly
            ? undefined
            : {
                selectedRowKeys: selectedKeys,
                onChange: (keys) => setSelectedKeys(keys as Array<string>),
              }
        }
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.detail.relationEmpty',
            defaultMessage: 'No relations',
          }),
        }}
      />

      <RelationEditModal
        open={addOpen}
        deviceEntityId={deviceEntityId}
        saving={saveMutation.isPending}
        onClose={() => setAddOpen(false)}
        onCommit={async (relation) => {
          await saveMutation.mutateAsync(relation);
          setAddOpen(false);
        }}
      />
    </div>
  );
}
