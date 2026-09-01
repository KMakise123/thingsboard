/**
 * Alarm-rules tab panel (spec 3.3 `alarm-rules`, TA only).
 *
 * List + basic editing against /api/alarm/rule (alarm rules are ALARM-type
 * calculated fields on this backend). Create covers the common shape —
 * alarm type + one severity with a numeric threshold condition over one
 * device key; edit covers rename / debug-mode; delete confirms. The full
 * condition-tree / schedule editors stay with the v2 rule work.
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
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
import { serverErrorText } from '@/components/devices/server-error-text';
import {
  type AlarmRuleDefinition,
  alarmRuleSeverities,
  deleteAlarmRule,
  getAlarmRulesByEntityId,
  saveAlarmRule,
} from '@/services/tb/alarm-rules';
import { AlarmSeverity, type EntityId } from '@/types/tb';
import { ALARM_SEVERITY_TAG } from './alarm-format';
import { useEntityKeys } from './use-entity-keys';

type NumericOperation =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'GREATER'
  | 'LESS'
  | 'GREATER_OR_EQUAL'
  | 'LESS_OR_EQUAL';

interface RuleFormValues {
  name: string;
  debugMode: boolean;
  /** Create-only basic condition inputs. */
  severity?: AlarmSeverity;
  argumentKey?: string;
  operation?: NumericOperation;
  threshold?: number;
}

/** Minimal valid ALARM configuration for the create dialog. */
function basicAlarmConfiguration(
  entityId: EntityId,
  severity: AlarmSeverity,
  argumentKey: string,
  keyType: 'TS_LATEST' | 'ATTRIBUTE',
  operation: NumericOperation,
  threshold: number,
) {
  return {
    type: 'ALARM',
    arguments: {
      a: {
        refEntityId: entityId,
        refEntityKey:
          keyType === 'TS_LATEST'
            ? { type: keyType, key: argumentKey }
            : { type: keyType, key: argumentKey, scope: 'SERVER_SCOPE' },
      },
    },
    createRules: {
      [severity]: {
        condition: {
          type: 'SIMPLE',
          expression: {
            type: 'SIMPLE',
            filters: [
              {
                argument: 'a',
                valueType: 'NUMERIC',
                operation: 'AND',
                predicates: [
                  {
                    type: 'NUMERIC',
                    operation,
                    value: { staticValue: threshold },
                  },
                ],
              },
            ],
          },
        },
      },
    },
  };
}

export default function AlarmRulesPanel({
  deviceEntityId,
}: {
  deviceEntityId: EntityId;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AlarmRuleDefinition | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<RuleFormValues>();

  const rulesQuery = useQuery({
    queryKey: ['alarm-rules', deviceEntityId.id],
    queryFn: () =>
      getAlarmRulesByEntityId(deviceEntityId, {
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
  });

  const keysInventory = useEntityKeys(deviceEntityId);
  const keyOptions = [
    ...(keysInventory.data?.telemetry ?? []).map((key) => ({
      value: key,
      label: key,
    })),
    ...(keysInventory.data?.attributes ?? []).map((key) => ({
      value: key,
      label: key,
    })),
  ];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['alarm-rules'] });

  const saveMutation = useMutation({
    mutationFn: (rule: AlarmRuleDefinition) => saveAlarmRule(rule),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.ruleSaved',
          defaultMessage: 'Alarm rule saved.',
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
    form.setFieldsValue({
      debugMode: false,
      severity: AlarmSeverity.MAJOR,
      operation: 'GREATER',
    });
    setModalOpen(true);
  };

  const openEdit = (rule: AlarmRuleDefinition) => {
    setEditing(rule);
    form.resetFields();
    form.setFieldsValue({
      name: rule.name,
      debugMode: rule.debugMode ?? false,
    });
    setModalOpen(true);
  };

  const submit = (values: RuleFormValues) => {
    if (editing) {
      saveMutation.mutate({
        ...editing,
        name: values.name,
        debugMode: values.debugMode,
      });
      return;
    }
    const argumentKey = values.argumentKey as string;
    saveMutation.mutate({
      entityId: deviceEntityId,
      type: 'ALARM',
      name: values.name,
      debugMode: values.debugMode,
      configuration: basicAlarmConfiguration(
        deviceEntityId,
        values.severity as AlarmSeverity,
        argumentKey,
        keysInventory.data?.telemetry.includes(argumentKey)
          ? 'TS_LATEST'
          : 'ATTRIBUTE',
        (values.operation ?? 'GREATER') as NumericOperation,
        values.threshold as number,
      ),
    } as unknown as AlarmRuleDefinition);
  };

  const columns = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.ruleCreatedTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 170,
      render: (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.ruleName',
        defaultMessage: 'Alarm type',
      }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.ruleSeverities',
        defaultMessage: 'Severities',
      }),
      key: 'severities',
      width: 200,
      render: (_: unknown, rule: AlarmRuleDefinition) => (
        <Space size={4} wrap>
          {alarmRuleSeverities(rule).map((severity) => (
            <Tag
              key={severity}
              color={ALARM_SEVERITY_TAG[severity as AlarmSeverity]}
            >
              {formatMessage({
                id: `pages.devices.detail.alarmSeverity.${severity}`,
                defaultMessage: severity,
              })}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.ruleClearRule',
        defaultMessage: 'Clear rule',
      }),
      key: 'clearRule',
      width: 100,
      render: (_: unknown, rule: AlarmRuleDefinition) =>
        rule.configuration?.clearRule ? (
          <Tag color="green">
            {formatMessage({
              id: 'pages.devices.detail.yes',
              defaultMessage: 'Yes',
            })}
          </Tag>
        ) : (
          <Tag>
            {formatMessage({
              id: 'pages.devices.detail.no',
              defaultMessage: 'No',
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
      render: (_: unknown, rule: AlarmRuleDefinition) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title={formatMessage({
              id: 'pages.devices.detail.edit',
              defaultMessage: 'Edit',
            })}
            onClick={() => openEdit(rule)}
          />
          <Popconfirm
            title={formatMessage(
              {
                id: 'pages.devices.detail.ruleDeleteTitle',
                defaultMessage: "Delete alarm rule '{name}'?",
              },
              { name: rule.name },
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
              deleteAlarmRule(rule.id.id)
                .then(() => {
                  void message.success(
                    formatMessage({
                      id: 'pages.devices.detail.ruleDeleted',
                      defaultMessage: 'Alarm rule deleted.',
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
            id: 'pages.devices.detail.ruleAdd',
            defaultMessage: 'Add alarm rule',
          })}
        </Button>
      </Space>

      {rulesQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.ruleLoadFailed',
            defaultMessage: 'Failed to load alarm rules',
          })}
          description={serverErrorText(rulesQuery.error)}
        />
      )}

      <Table<AlarmRuleDefinition>
        rowKey={(record) => record.id.id}
        size="small"
        columns={columns}
        dataSource={rulesQuery.data?.data ?? []}
        loading={rulesQuery.isPending}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.detail.ruleEmpty',
            defaultMessage: 'No alarm rules',
          }),
        }}
      />

      <Modal
        open={modalOpen}
        title={
          editing
            ? formatMessage(
                {
                  id: 'pages.devices.detail.ruleEditTitle',
                  defaultMessage: 'Edit alarm rule: {name}',
                },
                { name: editing.name },
              )
            : formatMessage({
                id: 'pages.devices.detail.ruleAddTitle',
                defaultMessage: 'Add alarm rule',
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
        <Form<RuleFormValues>
          form={form}
          layout="vertical"
          className="pt-2"
          onFinish={submit}
        >
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'pages.devices.detail.ruleName',
              defaultMessage: 'Alarm type',
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
                name="severity"
                label={formatMessage({
                  id: 'pages.devices.detail.alarmSeverity',
                  defaultMessage: 'Severity',
                })}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.devices.detail.ruleSeverityRequired',
                      defaultMessage: 'Severity is required.',
                    }),
                  },
                ]}
              >
                <Select
                  options={(
                    [
                      AlarmSeverity.CRITICAL,
                      AlarmSeverity.MAJOR,
                      AlarmSeverity.MINOR,
                      AlarmSeverity.WARNING,
                      AlarmSeverity.INDETERMINATE,
                    ] as Array<AlarmSeverity>
                  ).map((severity) => ({
                    value: severity,
                    label: formatMessage({
                      id: `pages.devices.detail.alarmSeverity.${severity}`,
                      defaultMessage: severity,
                    }),
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="argumentKey"
                label={formatMessage({
                  id: 'pages.devices.detail.ruleArgument',
                  defaultMessage: 'Key to watch',
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
              <Space size={16} className="w-full">
                <Form.Item
                  name="operation"
                  className="!flex-1"
                  label={formatMessage({
                    id: 'pages.devices.detail.ruleOperation',
                    defaultMessage: 'Condition',
                  })}
                >
                  <Select
                    options={(
                      [
                        'GREATER',
                        'GREATER_OR_EQUAL',
                        'LESS',
                        'LESS_OR_EQUAL',
                        'EQUAL',
                        'NOT_EQUAL',
                      ] as Array<NumericOperation>
                    ).map((operation) => ({
                      value: operation,
                      label: formatMessage({
                        id: `pages.devices.detail.ruleOp.${operation}`,
                        defaultMessage: operation,
                      }),
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="threshold"
                  label={formatMessage({
                    id: 'pages.devices.detail.ruleThreshold',
                    defaultMessage: 'Threshold',
                  })}
                  rules={[
                    {
                      required: true,
                      message: formatMessage({
                        id: 'pages.devices.detail.ruleThresholdRequired',
                        defaultMessage: 'Threshold is required.',
                      }),
                    },
                  ]}
                >
                  <InputNumber className="w-32" />
                </Form.Item>
              </Space>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
