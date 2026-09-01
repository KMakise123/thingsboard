/**
 * Calculated-fields tab panel (spec 3.3 `calculated-fields`, TA only).
 *
 * List + basic editing against /api/calculatedField: create supports the
 * SIMPLE family (one device telemetry/attribute argument + expression, the
 * result lands in timeseries); edit covers name / debugMode / expression;
 * delete confirms. The heavyweight editors (SCRIPT / GEOFENCING /
 * aggregations) stay v2 — editing beyond the basics is not offered rather
 * than shipping half-valid configurations.
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  type CalculatedField,
  type CalculatedFieldType,
  deleteCalculatedField,
  getCalculatedFieldsByEntityId,
  saveCalculatedField,
} from '@/services/tb/calculated-fields';
import type { EntityId } from '@/types/tb';
import { useEntityKeys } from './use-entity-keys';

const CF_TYPE_TAG: Record<CalculatedFieldType, string> = {
  SIMPLE: 'blue',
  SCRIPT: 'purple',
  GEOFENCING: 'cyan',
  ALARM: 'orange',
  PROPAGATION: 'geekblue',
  RELATED_ENTITIES_AGGREGATION: 'gold',
  ENTITY_AGGREGATION: 'gold',
};

interface CfFormValues {
  name: string;
  debugMode: boolean;
  /** Create-only: the device key feeding the `a` argument. */
  argumentKey?: string;
  expression?: string;
}

/**
 * SIMPLE configuration: one argument `a` bound to a device key (telemetry
 * keys ride TS_LATEST, attribute keys ride ATTRIBUTE/SERVER_SCOPE — ui-ngx
 * ArgumentType values) and an expression over it.
 */
function simpleConfiguration(
  entityId: EntityId,
  key: string,
  keyType: 'TS_LATEST' | 'ATTRIBUTE',
  expression: string,
  name: string,
) {
  return {
    type: 'SIMPLE',
    arguments: {
      a: {
        refEntityId: entityId,
        refEntityKey:
          keyType === 'TS_LATEST'
            ? { type: keyType, key }
            : { type: keyType, key, scope: 'SERVER_SCOPE' },
      },
    },
    expression,
    output: { type: 'TIME_SERIES', name },
  };
}

export default function CalculatedFieldsPanel({
  entityId,
}: {
  entityId: EntityId;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CalculatedField | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CfFormValues>();

  const fieldsQuery = useQuery({
    queryKey: ['calculated-fields', entityId.id],
    queryFn: () =>
      getCalculatedFieldsByEntityId(entityId, {
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
  });

  const keysInventory = useEntityKeys(entityId);
  const keyOptions = [
    ...(keysInventory.data?.telemetry ?? []).map((key) => ({
      value: key,
      label: `${key} (${formatMessage({ id: 'pages.devices.detail.cfArgTelemetry', defaultMessage: 'telemetry' })})`,
    })),
    ...(keysInventory.data?.attributes ?? []).map((key) => ({
      value: key,
      label: `${key} (${formatMessage({ id: 'pages.devices.detail.cfArgAttribute', defaultMessage: 'attribute' })})`,
    })),
  ];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['calculated-fields'] });

  const saveMutation = useMutation({
    mutationFn: (field: CalculatedField) => saveCalculatedField(field),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.cfSaved',
          defaultMessage: 'Calculated field saved.',
        }),
      );
      setModalOpen(false);
      void invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ debugMode: false });
    setModalOpen(true);
  };

  const openEdit = (field: CalculatedField) => {
    setEditing(field);
    form.resetFields();
    form.setFieldsValue({
      name: field.name,
      debugMode: field.debugMode ?? false,
      expression:
        field.type === 'SIMPLE'
          ? String(field.configuration?.expression ?? '')
          : undefined,
    });
    setModalOpen(true);
  };

  const submit = (values: CfFormValues) => {
    if (editing) {
      saveMutation.mutate({
        ...editing,
        name: values.name,
        debugMode: values.debugMode,
        configuration:
          editing.type === 'SIMPLE' && values.expression !== undefined
            ? { ...editing.configuration, expression: values.expression }
            : editing.configuration,
      });
      return;
    }
    const argumentKey = values.argumentKey as string;
    saveMutation.mutate({
      entityId: entityId,
      type: 'SIMPLE',
      name: values.name,
      debugMode: values.debugMode,
      configuration: simpleConfiguration(
        entityId,
        argumentKey,
        keysInventory.data?.telemetry.includes(argumentKey)
          ? 'TS_LATEST'
          : 'ATTRIBUTE',
        values.expression ?? '',
        values.name,
      ),
    } as unknown as CalculatedField);
  };

  const columns = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.cfCreatedTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 170,
      render: (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.cfName',
        defaultMessage: 'Name',
      }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.cfType',
        defaultMessage: 'Type',
      }),
      dataIndex: 'type',
      width: 150,
      render: (type: CalculatedFieldType) => (
        <Tag color={CF_TYPE_TAG[type]}>
          {formatMessage({
            id: `pages.devices.detail.cfType.${type}`,
            defaultMessage: type,
          })}
        </Tag>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.actions',
        defaultMessage: 'Actions',
      }),
      key: 'actions',
      width: 110,
      render: (_: unknown, field: CalculatedField) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title={formatMessage({
              id: 'pages.devices.detail.edit',
              defaultMessage: 'Edit',
            })}
            onClick={() => openEdit(field)}
          />
          <Popconfirm
            title={formatMessage(
              {
                id: 'pages.devices.detail.cfDeleteTitle',
                defaultMessage: "Delete calculated field '{name}'?",
              },
              { name: field.name },
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
            onConfirm={() =>
              deleteCalculatedField(field.id.id)
                .then(() => {
                  void message.success(
                    formatMessage({
                      id: 'pages.devices.detail.cfDeleted',
                      defaultMessage: 'Calculated field deleted.',
                    }),
                  );
                  void invalidate();
                })
                .catch((error) => void message.error(serverErrorText(error)))
            }
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
  ];

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <div className="flex-1" />
        <Button icon={<PlusOutlined />} onClick={openCreate}>
          {formatMessage({
            id: 'pages.devices.detail.cfAdd',
            defaultMessage: 'Add calculated field',
          })}
        </Button>
      </Space>

      {fieldsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.cfLoadFailed',
            defaultMessage: 'Failed to load calculated fields',
          })}
          description={serverErrorText(fieldsQuery.error)}
        />
      )}

      <Table<CalculatedField>
        rowKey={(record) => record.id.id}
        size="small"
        columns={columns}
        dataSource={fieldsQuery.data?.data ?? []}
        loading={fieldsQuery.isPending}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.detail.cfEmpty',
            defaultMessage: 'No calculated fields',
          }),
        }}
      />

      <Modal
        open={modalOpen}
        title={
          editing
            ? formatMessage(
                {
                  id: 'pages.devices.detail.cfEditTitle',
                  defaultMessage: 'Edit calculated field: {name}',
                },
                { name: editing.name },
              )
            : formatMessage({
                id: 'pages.devices.detail.cfAddTitle',
                defaultMessage: 'Add calculated field',
              })
        }
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saveMutation.isPending}
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
        <Form<CfFormValues>
          form={form}
          layout="vertical"
          className="pt-2"
          onFinish={submit}
        >
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'pages.devices.detail.cfName',
              defaultMessage: 'Name',
            })}
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage({
                  id: 'pages.devices.detail.cfNameRequired',
                  defaultMessage: 'Name is required.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="debugMode"
            label={formatMessage({
              id: 'pages.devices.detail.cfDebugMode',
              defaultMessage: 'Debug mode',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          {!editing && (
            <>
              <Form.Item
                name="argumentKey"
                label={formatMessage({
                  id: 'pages.devices.detail.cfArgument',
                  defaultMessage: 'Argument key (used as `a`)',
                })}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.devices.detail.cfArgumentRequired',
                      defaultMessage: 'Argument key is required.',
                    }),
                  },
                ]}
              >
                <Select
                  showSearch
                  options={keyOptions}
                  notFoundContent={formatMessage({
                    id: 'pages.devices.detail.cfNoKeys',
                    defaultMessage: 'No keys found on this device yet',
                  })}
                />
              </Form.Item>
              <Form.Item
                name="expression"
                label={formatMessage({
                  id: 'pages.devices.detail.cfExpression',
                  defaultMessage: 'Expression (e.g. a * 2)',
                })}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: formatMessage({
                      id: 'pages.devices.detail.cfExpressionRequired',
                      defaultMessage: 'Expression is required.',
                    }),
                  },
                ]}
              >
                <Input placeholder="a * 2" />
              </Form.Item>
            </>
          )}
          {editing?.type === 'SIMPLE' && (
            <Form.Item
              name="expression"
              label={formatMessage({
                id: 'pages.devices.detail.cfExpression',
                defaultMessage: 'Expression (e.g. a * 2)',
              })}
            >
              <Input />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
