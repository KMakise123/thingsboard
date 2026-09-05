/**
 * Notification rules list page — M12 wave 3-B, spec §4.5; ui-ngx
 * rule-table-config parity: createdTime/name/templateName/triggerType/
 * description columns, row click edits, inline enable toggle (saves the whole
 * rule, optimistic + rollback), copy action (name + " (copy)"), single +
 * batch delete, default sort createdTime DESC.
 */
import {
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
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
  Input,
  Space,
  Switch,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
import {
  deleteNotificationRule,
  getNotificationRules,
  saveNotificationRule,
} from '@/services/tb/notification';
import type { NotificationRuleInfo } from '@/types/tb/notification';
import { NotificationRuleTriggerType } from '@/types/tb/notification';
import { triggerNameKey } from './rule-meta';
import RuleWizard from './rule-wizard';
import { toPageLink, useRulesUrlState } from './url-state';

export const RULES_QUERY_KEY = ['notifications', 'rules'] as const;

/** Table column key -> sortable server property. */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
};

const SEARCH_DEBOUNCE_MS = 400;

const TRIGGER_TAG_COLORS: Partial<Record<NotificationRuleTriggerType, string>> =
  {
    [NotificationRuleTriggerType.ALARM]: 'red',
    [NotificationRuleTriggerType.DEVICE_ACTIVITY]: 'blue',
    [NotificationRuleTriggerType.ENTITY_ACTION]: 'cyan',
    [NotificationRuleTriggerType.ALARM_COMMENT]: 'orange',
    [NotificationRuleTriggerType.ALARM_ASSIGNMENT]: 'gold',
    [NotificationRuleTriggerType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT]:
      'purple',
    [NotificationRuleTriggerType.EDGE_CONNECTION]: 'geekblue',
    [NotificationRuleTriggerType.EDGE_COMMUNICATION_FAILURE]: 'geekblue',
    [NotificationRuleTriggerType.ENTITIES_LIMIT]: 'volcano',
    [NotificationRuleTriggerType.API_USAGE_LIMIT]: 'volcano',
    [NotificationRuleTriggerType.RATE_LIMITS]: 'magenta',
    [NotificationRuleTriggerType.RESOURCES_SHORTAGE]: 'magenta',
    [NotificationRuleTriggerType.NEW_PLATFORM_VERSION]: 'green',
    [NotificationRuleTriggerType.TASK_PROCESSING_FAILURE]: 'green',
  };

export default function RulesPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useRulesUrlState();

  // ---- text search (server-side, debounced; URL carries the committed value)
  const [searchInput, setSearchInput] = useState(urlState.textSearch);
  useEffect(() => {
    setSearchInput(urlState.textSearch);
  }, [urlState.textSearch]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== urlState.textSearch) {
        patch({ textSearch: next, page: 1 });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput, patch, urlState.textSearch]);

  // ---- the list itself
  const listQueryKey = [
    ...RULES_QUERY_KEY,
    urlState.page,
    urlState.pageSize,
    urlState.sortProperty,
    urlState.sortDirection,
    urlState.textSearch,
  ] as const;
  const rulesQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => getNotificationRules(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const rules: Array<NotificationRuleInfo> = rulesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });

  // ---- inline enable toggle: optimistic update, rollback on failure
  const toggleMutation = useMutation({
    mutationFn: (rule: NotificationRuleInfo) => saveNotificationRule(rule),
    onMutate: async (rule) => {
      await queryClient.cancelQueries({ queryKey: RULES_QUERY_KEY });
      const previous = queryClient.getQueryData(listQueryKey);
      queryClient.setQueryData(listQueryKey, (old: typeof rulesQuery.data) =>
        old
          ? {
              ...old,
              data: old.data.map((row) =>
                row.id.id === rule.id.id
                  ? { ...row, enabled: rule.enabled }
                  : row,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (error, _rule, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listQueryKey, context.previous);
      }
      void message.error(
        serverErrorText(error) ||
          formatMessage({
            id: 'pages.notifications.rules.toggleFailed',
            defaultMessage: 'Failed to update the rule',
          }),
      );
    },
    onSettled: () => {
      void invalidate();
    },
  });

  // ---- selection & wizard state
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedRules = rules.filter((rule) =>
    selectedRowKeys.includes(rule.id.id),
  );

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSource, setWizardSource] = useState<NotificationRuleInfo | null>(
    null,
  );
  const [wizardCopy, setWizardCopy] = useState(false);

  const openWizard = (source: NotificationRuleInfo | null, isCopy = false) => {
    setWizardSource(source);
    setWizardCopy(isCopy);
    setWizardOpen(true);
  };

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  const triggerTypeName = (type: NotificationRuleTriggerType): string =>
    formatMessage({ id: triggerNameKey(type), defaultMessage: type });

  // ---- delete flows (single + batch)
  const runBatchDelete = async (items: Array<NotificationRuleInfo>) => {
    setBatchOpen(true);
    const summary = await batch.run(
      items,
      (item) => item.name || item.id.id,
      (item) => deleteNotificationRule(item.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage(
        {
          id: 'pages.notifications.rules.batchResult',
          defaultMessage: '{ok} succeeded, {fail} failed.',
        },
        { ok: summary.ok, fail: summary.failed },
      ),
    );
  };

  const confirmDeleteOne = (rule: NotificationRuleInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.notifications.rules.deleteOneTitle',
          defaultMessage: "Delete the notification rule '{name}'?",
        },
        { name: rule.name || rule.id.id },
      ),
      content: formatMessage({
        id: 'pages.notifications.rules.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the notification rule will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.notifications.rules.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.notifications.rules.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        try {
          await deleteNotificationRule(rule.id.id);
          setSelectedRowKeys((keys) =>
            keys.filter((key) => key !== rule.id.id),
          );
          void invalidate();
          void message.success(
            formatMessage({
              id: 'pages.notifications.rules.toastDeleted',
              defaultMessage: 'Notification rule deleted.',
            }),
          );
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      },
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedRules.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.notifications.rules.deleteManyTitle',
          defaultMessage:
            'Delete {count, plural, =1 {1 notification rule} other {# notification rules}}?',
        },
        { count: selectedRules.length },
      ),
      content: formatMessage({
        id: 'pages.notifications.rules.deleteManyText',
        defaultMessage: 'This cannot be undone.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.notifications.rules.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.notifications.rules.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => runBatchDelete(selectedRules),
    });
  };

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design
  const columns: ProColumns<NotificationRuleInfo>[] = useMemo(() => {
    const cols: ProColumns<NotificationRuleInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.notifications.rules.createdTime',
          defaultMessage: 'Created time',
        }),
        dataIndex: 'createdTime',
        width: 170,
        sorter: true,
        sortOrder: sortOrderFor('createdTime'),
        render: (_, record) =>
          dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: formatMessage({
          id: 'pages.notifications.rules.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
      },
      {
        title: formatMessage({
          id: 'pages.notifications.rules.templateName',
          defaultMessage: 'Template',
        }),
        dataIndex: 'templateName',
        render: (_, record) => record.templateName || '-',
      },
      {
        title: formatMessage({
          id: 'pages.notifications.rules.triggerType',
          defaultMessage: 'Trigger',
        }),
        dataIndex: 'triggerType',
        width: 200,
        render: (_, record) => (
          <Tag
            color={TRIGGER_TAG_COLORS[record.triggerType] ?? 'default'}
            data-testid={`trigger-tag-${record.triggerType}`}
          >
            {triggerTypeName(record.triggerType)}
          </Tag>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.notifications.rules.description',
          defaultMessage: 'Description',
        }),
        dataIndex: 'additionalConfig.description',
        ellipsis: true,
        render: (_, record) => record.additionalConfig?.description || '-',
      },
    ];
    cols.push({
      valueType: 'option',
      width: 170,
      fixed: 'right',
      render: (_, record) => [
        <Switch
          key="enabled"
          size="small"
          checked={record.enabled}
          title={formatMessage({
            id: record.enabled
              ? 'pages.notifications.rules.disableRule'
              : 'pages.notifications.rules.enableRule',
            defaultMessage: record.enabled ? 'Disable rule' : 'Enable rule',
          })}
          onClick={(_checked, event) => {
            event.stopPropagation();
            toggleMutation.mutate({ ...record, enabled: !record.enabled });
          }}
          data-testid={`rule-toggle-${record.id.id}`}
        />,
        <Button
          key="copy"
          type="text"
          size="small"
          icon={<CopyOutlined />}
          title={formatMessage({
            id: 'pages.notifications.rules.copyRule',
            defaultMessage: 'Copy rule',
          })}
          onClick={(event) => {
            event.stopPropagation();
            openWizard(record, true);
          }}
        />,
        <Button
          key="delete"
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          title={formatMessage({
            id: 'pages.notifications.rules.delete',
            defaultMessage: 'Delete',
          })}
          onClick={(event) => {
            event.stopPropagation();
            confirmDeleteOne(record);
          }}
        />,
      ],
    });
    return cols;
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  const onTableChange: TableProps<NotificationRuleInfo>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    const property = sort?.field
      ? SORTABLE_COLUMNS[sort.field as string]
      : undefined;
    if (property && sort.order) {
      patch({
        sortProperty: property,
        sortDirection: sort.order === 'ascend' ? 'ASC' : 'DESC',
        page: 1,
      });
    } else if (!sort?.order) {
      patch({ sortProperty: 'createdTime', sortDirection: 'DESC', page: 1 });
    }
    if (
      pagination.current &&
      pagination.pageSize &&
      (pagination.current !== urlState.page ||
        pagination.pageSize !== urlState.pageSize)
    ) {
      patch({ page: pagination.current, pageSize: pagination.pageSize });
    }
  };

  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.notifications.rules',
        defaultMessage: 'Rules',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.notifications.rules.search',
              defaultMessage: 'Search rules',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void rulesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.notifications.rules.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {selectedRules.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.notifications.rules.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedRules.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.notifications.rules.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openWizard(null)}
              data-testid="rules-add"
            >
              {formatMessage({
                id: 'pages.notifications.rules.add',
                defaultMessage: 'Add rule',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {rulesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.notifications.rules.loadFailed',
            defaultMessage: 'Failed to load notification rules',
          })}
          description={serverErrorText(rulesQuery.error)}
        />
      )}

      <ProTable<NotificationRuleInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={rules}
        loading={rulesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({
          onClick: () => openWizard(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: rulesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.notifications.rules.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.notifications.rules.empty',
            defaultMessage: 'No notification rules',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <RuleWizard
        open={wizardOpen}
        source={wizardSource}
        copy={wizardCopy}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setWizardOpen(false);
          void invalidate();
        }}
      />

      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => {
          setBatchOpen(false);
          batch.reset();
        }}
      />
    </PageContainer>
  );
}
