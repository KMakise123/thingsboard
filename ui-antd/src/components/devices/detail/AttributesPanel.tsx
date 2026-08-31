/**
 * Attributes tab panel (spec 3.3 `attributes`): CLIENT / SERVER / SHARED
 * scope switch with live updates.
 *
 * Data channel: REST snapshot seeds the table (getAttributes), then the
 * core/ws attributes subscription streams every change for the scope — the
 * REST seed is one-way (never written back from WS data). SERVER and SHARED
 * scopes get add/edit/delete for TENANT_ADMIN (CLIENT is device-side data:
 * read-only, matching ui-ngx). Deletes confirm first; every mutation also
 * invalidates the seed query so the next resubscribe starts consistent.
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Input,
  Popconfirm,
  Segmented,
  Space,
  Table,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/devices/server-error-text';
import { useAttributeSubscription } from '@/core/ws/hooks';
import {
  deleteEntityAttributes,
  getAttributes,
  saveEntityAttributes,
} from '@/services/tb/attributes';
import { type AttributeData, AttributeScope, EntityType } from '@/types/tb';
import AttributeValueModal from './AttributeValueModal';
import {
  filterAttributeRows,
  formatAttributeValue,
  isNumericValue,
} from './attribute-value';

const SCOPE_OPTIONS = [
  AttributeScope.CLIENT_SCOPE,
  AttributeScope.SERVER_SCOPE,
  AttributeScope.SHARED_SCOPE,
];

export function buildAttributesSeedKey(entityId: {
  entityType: EntityType;
  id: string;
}) {
  return ['attributes', entityId.entityType, entityId.id];
}

export default function AttributesPanel({
  deviceId,
  readOnly,
}: {
  deviceId: string;
  /** CU reads only (button gating, spec 3.11). */
  readOnly: boolean;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const entityId = useMemo(
    () => ({ entityType: EntityType.DEVICE, id: deviceId }),
    [deviceId],
  );
  const [scope, setScope] = useState<AttributeScope>(
    AttributeScope.CLIENT_SCOPE,
  );
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{
    key: string;
    value: unknown;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const seedKey = buildAttributesSeedKey(entityId);
  // REST snapshot: one-way seed for the subscription (never fed from WS).
  const seedQuery = useQuery({
    queryKey: [...seedKey, scope],
    queryFn: () => getAttributes(entityId, scope),
  });
  const seed = seedQuery.data;

  const { data: rows, status } = useAttributeSubscription({
    entityId,
    scope,
    seed,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: seedKey });

  const saveMutation = useMutation({
    mutationFn: (payload: { key: string; value: unknown }) =>
      saveEntityAttributes(entityId, scope, [
        { key: payload.key, value: payload.value },
      ]),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.attrSaved',
          defaultMessage: 'Attribute saved.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (keys: Array<string>) =>
      deleteEntityAttributes(entityId, scope, keys),
    onSuccess: (_result, keys) => {
      void message.success(
        formatMessage(
          {
            id: 'pages.devices.detail.attrDeleted',
            defaultMessage:
              '{count, plural, =1 {Attribute deleted.} other {# attributes deleted.}}',
          },
          { count: keys.length },
        ),
      );
      setSelectedKeys([]);
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const clientScope = scope === AttributeScope.CLIENT_SCOPE;
  const editable = !readOnly && !clientScope;
  const visibleRows = filterAttributeRows(rows, search);

  const columns: TableProps<AttributeData>['columns'] = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.lastUpdate',
        defaultMessage: 'Last update',
      }),
      dataIndex: 'lastUpdateTs',
      width: 180,
      render: (ts?: number) =>
        ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.key',
        defaultMessage: 'Key',
      }),
      dataIndex: 'key',
      render: (key: string) => <Typography.Text code>{key}</Typography.Text>,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.value',
        defaultMessage: 'Value',
      }),
      dataIndex: 'value',
      render: (value: unknown) => (
        <span className={isNumericValue(value) ? 'tabular-nums' : undefined}>
          {formatAttributeValue(value)}
        </span>
      ),
    },
    ...(editable
      ? [
          {
            title: formatMessage({
              id: 'pages.devices.detail.actions',
              defaultMessage: 'Actions',
            }),
            key: 'actions',
            width: 110,
            render: (_: unknown, record: AttributeData) => (
              <Space size={0}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  title={formatMessage({
                    id: 'pages.devices.detail.edit',
                    defaultMessage: 'Edit',
                  })}
                  onClick={() => {
                    setEditing({ key: record.key, value: record.value });
                    setModalOpen(true);
                  }}
                />
                <Popconfirm
                  title={formatMessage(
                    {
                      id: 'pages.devices.detail.attrDeleteTitle',
                      defaultMessage: "Delete attribute '{key}'?",
                    },
                    { key: record.key },
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
                  onConfirm={() => deleteMutation.mutate([record.key])}
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
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <Segmented
          value={scope}
          onChange={(next) => {
            setScope(next as AttributeScope);
            setSelectedKeys([]);
          }}
          options={SCOPE_OPTIONS.map((option) => ({
            value: option,
            label: formatMessage({
              id: `pages.devices.detail.scope.${option}`,
              defaultMessage: option,
            }),
          }))}
        />
        <Input.Search
          allowClear
          className="w-56"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={formatMessage({
            id: 'pages.devices.detail.searchKeys',
            defaultMessage: 'Search keys',
          })}
        />
        <Tag color={status === 'open' ? 'processing' : 'warning'}>
          {formatMessage({
            id: 'pages.devices.detail.wsStatus',
            defaultMessage: 'Live updates',
          })}
          : {status}
        </Tag>
        <div className="flex-1" />
        {editable && (
          <>
            {selectedKeys.length > 0 && (
              <Popconfirm
                title={formatMessage(
                  {
                    id: 'pages.devices.detail.attrDeleteManyTitle',
                    defaultMessage:
                      'Delete {count, plural, =1 {1 attribute} other {# attributes}}?',
                  },
                  { count: selectedKeys.length },
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
                onConfirm={() => deleteMutation.mutate(selectedKeys)}
              >
                <Button danger icon={<DeleteOutlined />}>
                  {formatMessage({
                    id: 'pages.devices.detail.deleteSelected',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </Popconfirm>
            )}
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              {formatMessage({
                id: 'pages.devices.detail.attrAdd',
                defaultMessage: 'Add attribute',
              })}
            </Button>
          </>
        )}
      </Space>

      {clientScope && (
        <Alert
          type="info"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.clientScopeReadonly',
            defaultMessage:
              'Client attributes are reported by the device and are read-only here.',
          })}
        />
      )}
      {seedQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.attrLoadFailed',
            defaultMessage: 'Failed to load attributes',
          })}
          description={serverErrorText(seedQuery.error)}
        />
      )}

      <Table<AttributeData>
        rowKey="key"
        size="small"
        columns={columns}
        dataSource={visibleRows}
        loading={seedQuery.isPending && rows.length === 0}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowSelection={
          editable
            ? {
                selectedRowKeys: selectedKeys,
                onChange: (keys) => setSelectedKeys(keys as string[]),
              }
            : undefined
        }
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.detail.attrEmpty',
            defaultMessage: 'No attributes',
          }),
        }}
      />

      <AttributeValueModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onCommit={async (key, value) => {
          await saveMutation.mutateAsync({ key, value });
        }}
      />
    </div>
  );
}
