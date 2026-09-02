/**
 * Global alarm-rules tab (spec 3.6, TA only): tenant-wide list over
 * GET /api/alarm/rules (server-paginated/sorted: createdTime|name) with
 * create / edit / delete through the same /api/alarm/rule endpoints the
 * entity tab uses. The create dialog targets DEVICE / ASSET / CUSTOMER —
 * profile-scoped rules are created from the profile detail pages — and
 * builds the shared M1 single-threshold form core; the ui-ngx extras
 * (copy / export / events / debug, full condition tree) stay with v2.
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  AlarmRuleConditionFields,
  basicAlarmConfiguration,
  type NumericOperation,
} from '@/components/alarms/alarm-rule-basic-form';
import { ALARM_SEVERITY_TAG } from '@/components/entities/detail/alarm-format';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  type AlarmRuleDefinition,
  type AlarmRuleDefinitionInfo,
  alarmRuleSeverities,
  deleteAlarmRule,
  getAlarmRules,
  saveAlarmRule,
} from '@/services/tb/alarm-rules';
import { getTenantAssets } from '@/services/tb/asset';
import { getAttributes, getLatestTelemetry } from '@/services/tb/attributes';
import { getCustomers } from '@/services/tb/customer';
import { getTenantDevices } from '@/services/tb/device';
import {
  AlarmSeverity,
  type EntityId,
  EntityType,
  type PageData,
} from '@/types/tb';
import { ALARM_RULE_ENTITY_TYPES, type AlarmsPageUrlState } from './url-state';

interface RuleFormValues {
  entityType?: EntityType;
  entityId?: EntityId;
  name: string;
  debugMode: boolean;
  severity?: AlarmSeverity;
  argumentKey?: string;
  operation?: NumericOperation;
  threshold?: number;
}

const ENTITY_SEARCH_DEBOUNCE_MS = 300;

export default function AlarmRulesTab({
  state,
  patch,
}: {
  state: AlarmsPageUrlState;
  patch: (partial: Partial<AlarmsPageUrlState>) => void;
}) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  // ---- list state (server pagination; sort limited to createdTime|name) ----
  const [searchInput, setSearchInput] = useState(state.ruleTextSearch);
  useEffect(() => {
    setSearchInput(state.ruleTextSearch);
  }, [state.ruleTextSearch]);

  const rulesQuery = useQuery({
    queryKey: [
      'alarm-rules',
      'global',
      state.rulePage,
      state.rulePageSize,
      state.ruleSortProperty,
      state.ruleSortDirection,
      state.ruleTextSearch,
      state.ruleEntityType ?? '',
    ],
    queryFn: () =>
      getAlarmRules(
        {
          pageSize: state.rulePageSize,
          page: state.rulePage - 1,
          textSearch: state.ruleTextSearch || undefined,
          sortOrder: {
            property: state.ruleSortProperty,
            direction: state.ruleSortDirection,
          },
        },
        { entityType: state.ruleEntityType },
      ),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (alarmRuleId: string) => deleteAlarmRule(alarmRuleId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.ruleDeleted',
          defaultMessage: 'Alarm rule deleted.',
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['alarm-rules'] });
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const confirmDelete = (rule: AlarmRuleDefinition) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.alarms.ruleDeleteTitle',
          defaultMessage: "Delete alarm rule '{name}'?",
        },
        { name: rule.name },
      ),
      content: formatMessage({
        id: 'pages.alarms.ruleDeleteText',
        defaultMessage: 'The rule and its data will be unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.alarms.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.alarms.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteMutation.mutateAsync(rule.id.id),
    });
  };

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (state.ruleSortProperty !== property) {
      return undefined;
    }
    return state.ruleSortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const columns: ProColumns<AlarmRuleDefinition>[] = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.ruleCreatedTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 170,
      sorter: true,
      sortOrder: sortOrderFor('createdTime'),
      render: (_, rule) => (
        <span className="tabular-nums">
          {dayjs(rule.createdTime).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.ruleName',
        defaultMessage: 'Alarm type',
      }),
      dataIndex: 'name',
      sorter: true,
      sortOrder: sortOrderFor('name'),
      ellipsis: true,
    },
    {
      title: formatMessage({
        id: 'pages.alarms.ruleEntity',
        defaultMessage: 'Entity',
      }),
      key: 'entity',
      ellipsis: true,
      render: (_, rule) =>
        `${rule.entityId.entityType} ${
          (rule as AlarmRuleDefinitionInfo).entityName || rule.entityId.id
        }`,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.ruleSeverities',
        defaultMessage: 'Severities',
      }),
      key: 'severities',
      width: 220,
      render: (_, rule) => (
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
      align: 'center',
      render: (_, rule) => (
        <Checkbox checked={!!rule.configuration?.clearRule} disabled />
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.actions',
        defaultMessage: 'Actions',
      }),
      key: 'actions',
      width: 110,
      render: (_, rule) => (
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
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            title={formatMessage({
              id: 'pages.alarms.delete',
              defaultMessage: 'Delete',
            })}
            onClick={() => confirmDelete(rule)}
          />
        </Space>
      ),
    },
  ];

  // ---- create / edit dialog ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AlarmRuleDefinition | null>(null);
  const [form] = Form.useForm<RuleFormValues>();
  const [entitySearch, setEntitySearch] = useState('');
  const [debouncedEntitySearch, setDebouncedEntitySearch] = useState('');
  const entitySearchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const selectedEntityType = Form.useWatch('entityType', form);
  const selectedEntityId = Form.useWatch('entityId', form);

  useEffect(() => {
    clearTimeout(entitySearchTimer.current);
    entitySearchTimer.current = setTimeout(
      () => setDebouncedEntitySearch(entitySearch.trim()),
      ENTITY_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(entitySearchTimer.current);
  }, [entitySearch]);

  /** Minimal row shape the entity picker needs (name or title). */
  type RuleEntityRow = { id: EntityId; name?: string; title?: string };
  const entitiesQuery = useQuery({
    queryKey: [
      'alarm-rule-entities',
      selectedEntityType ?? '',
      debouncedEntitySearch,
    ],
    enabled: dialogOpen && !editing && !!selectedEntityType,
    queryFn: async (): Promise<PageData<RuleEntityRow>> => {
      const pageLink = {
        pageSize: 50,
        page: 0,
        textSearch: debouncedEntitySearch || undefined,
        sortOrder: {
          property: 'name' as const,
          direction: 'ASC' as const,
        },
      };
      switch (selectedEntityType) {
        case EntityType.DEVICE:
          return await getTenantDevices(pageLink);
        case EntityType.ASSET:
          return await getTenantAssets(pageLink);
        case EntityType.CUSTOMER:
          return await getCustomers(pageLink);
        default:
          return { data: [], totalElements: 0, totalPages: 0, hasNext: false };
      }
    },
  });

  const ruleEntity: EntityId | undefined =
    !editing && selectedEntityType && typeof selectedEntityId === 'string'
      ? { entityType: selectedEntityType, id: selectedEntityId }
      : undefined;
  // Same key inventory the entity-tab rule editor uses, but gated on an
  // entity actually being picked (no NULL_UUID probing while the dialog idles).
  const keysQuery = useQuery({
    queryKey: ['alarm-rule-keys', ruleEntity?.entityType, ruleEntity?.id],
    enabled: !!ruleEntity,
    staleTime: 60_000,
    queryFn: async () => {
      const [telemetry, attributes] = await Promise.all([
        getLatestTelemetry(ruleEntity as EntityId),
        getAttributes(ruleEntity as EntityId),
      ]);
      return {
        telemetry: Object.keys(telemetry ?? {}),
        attributes: (attributes ?? []).map((row) => row.key),
      };
    },
  });
  const keyOptions = [
    ...(keysQuery.data?.telemetry ?? []).map((key) => ({
      value: key,
      label: key,
    })),
    ...(keysQuery.data?.attributes ?? []).map((key) => ({
      value: key,
      label: key,
    })),
  ];

  const saveMutation = useMutation({
    mutationFn: (rule: AlarmRuleDefinition) => saveAlarmRule(rule),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.ruleSaved',
          defaultMessage: 'Alarm rule saved.',
        }),
      );
      setDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['alarm-rules'] });
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      debugMode: false,
      operation: 'GREATER',
      severity: AlarmSeverity.MAJOR,
      entityType: EntityType.DEVICE,
    });
    setDialogOpen(true);
  };

  const openEdit = (rule: AlarmRuleDefinition) => {
    setEditing(rule);
    form.resetFields();
    form.setFieldsValue({
      name: rule.name,
      debugMode: rule.debugMode ?? false,
    });
    setDialogOpen(true);
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
    if (!ruleEntity) {
      return;
    }
    const argumentKey = values.argumentKey as string;
    saveMutation.mutate({
      entityId: ruleEntity,
      type: 'ALARM',
      name: values.name,
      debugMode: values.debugMode,
      configuration: basicAlarmConfiguration(
        ruleEntity,
        values.severity as AlarmSeverity,
        argumentKey,
        keysQuery.data?.telemetry.includes(argumentKey)
          ? 'TS_LATEST'
          : 'ATTRIBUTE',
        (values.operation ?? 'GREATER') as NumericOperation,
        values.threshold as number,
      ),
    } as unknown as AlarmRuleDefinition);
  };

  const onTableChange: TableProps<AlarmRuleDefinition>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    if (
      sort?.order &&
      (sort.field === 'createdTime' || sort.field === 'name')
    ) {
      patch({
        ruleSortProperty: sort.field,
        ruleSortDirection: sort.order === 'ascend' ? 'ASC' : 'DESC',
        rulePage: 1,
      });
    } else if (!sort?.order) {
      patch({
        ruleSortProperty: 'createdTime',
        ruleSortDirection: 'DESC',
        rulePage: 1,
      });
    }
    if (
      pagination.current &&
      pagination.pageSize &&
      (pagination.current !== state.rulePage ||
        pagination.pageSize !== state.rulePageSize)
    ) {
      patch({
        rulePage: pagination.current,
        rulePageSize: pagination.pageSize,
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <div className="flex-1" />
        <Input.Search
          allowClear
          className="w-56"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) =>
            patch({ ruleTextSearch: value.trim(), rulePage: 1 })
          }
          placeholder={formatMessage({
            id: 'pages.alarms.ruleSearch',
            defaultMessage: 'Search alarm rules',
          })}
        />
        <Select
          allowClear
          className="w-40"
          value={state.ruleEntityType}
          placeholder={formatMessage({
            id: 'pages.alarms.ruleEntityType',
            defaultMessage: 'All entity types',
          })}
          options={ALARM_RULE_ENTITY_TYPES.map((entityType) => ({
            value: entityType,
            label: entityType,
          }))}
          onChange={(value) =>
            patch({ ruleEntityType: value || undefined, rulePage: 1 })
          }
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
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
            id: 'pages.alarms.ruleLoadFailed',
            defaultMessage: 'Failed to load alarm rules',
          })}
          description={serverErrorText(rulesQuery.error)}
        />
      )}

      <ProTable<AlarmRuleDefinition>
        rowKey={(rule) => rule.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={rulesQuery.data?.data ?? []}
        loading={rulesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: state.rulePage,
          pageSize: state.rulePageSize,
          total: rulesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              { id: 'pages.alarms.total', defaultMessage: '{count} total' },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.detail.ruleEmpty',
            defaultMessage: 'No alarm rules',
          }),
        }}
      />

      <Modal
        open={dialogOpen}
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
        onCancel={() => setDialogOpen(false)}
        confirmLoading={saveMutation.isPending}
        okText={formatMessage({
          id: 'pages.devices.detail.save',
          defaultMessage: 'Save',
        })}
        cancelText={formatMessage({
          id: 'pages.alarms.cancel',
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
          {!editing && (
            <Space.Compact className="w-full">
              <Form.Item
                name="entityType"
                className="w-40"
                label={formatMessage({
                  id: 'pages.alarms.ruleEntity',
                  defaultMessage: 'Entity',
                })}
                rules={[{ required: true }]}
              >
                <Select
                  options={ALARM_RULE_ENTITY_TYPES.map((entityType) => ({
                    value: entityType,
                    label: entityType,
                  }))}
                  onChange={() => form.setFieldValue('entityId', undefined)}
                />
              </Form.Item>
              <Form.Item
                name="entityId"
                className="flex-1"
                label={formatMessage({
                  id: 'pages.alarms.ruleEntityName',
                  defaultMessage: 'Target entity',
                })}
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  filterOption={false}
                  onSearch={setEntitySearch}
                  loading={entitiesQuery.isPending}
                  options={(entitiesQuery.data?.data ?? []).map((entity) => ({
                    value: entity.id.id,
                    label:
                      ('name' in entity ? entity.name : undefined) ||
                      ('title' in entity ? entity.title : undefined) ||
                      entity.id.id,
                  }))}
                  notFoundContent={
                    <Typography.Text type="secondary">
                      {formatMessage({
                        id: 'pages.alarms.ruleNoEntities',
                        defaultMessage: 'No entities found',
                      })}
                    </Typography.Text>
                  }
                />
              </Form.Item>
            </Space.Compact>
          )}
          <Form.Item
            name="debugMode"
            label={formatMessage({
              id: 'pages.devices.detail.cfDebugMode',
              defaultMessage: 'Debug mode',
            })}
            valuePropName="checked"
          >
            <Checkbox />
          </Form.Item>
          {!editing && (
            <AlarmRuleConditionFields
              keyOptions={keyOptions}
              noKeysText={formatMessage({
                id: 'pages.alarms.ruleNoKeys',
                defaultMessage: 'No keys found on this entity yet',
              })}
            />
          )}
        </Form>
      </Modal>
    </div>
  );
}
