/**
 * Notification templates list page — M12 wave 3-C, spec §4.6; ui-ngx
 * template-table-config parity: createdTime/notificationType/name columns,
 * row click edits, inline copy (name + " (copy)" through the wizard), single
 * + batch delete, default sort createdTime DESC. The toolbar carries the
 * reusable SendNotificationButton (this route is SYS/TENANT only).
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
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Input,
  Space,
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
import { SendNotificationButton } from '@/pages/notifications/sent/send-button';
import {
  deleteNotificationTemplate,
  getNotificationTemplates,
} from '@/services/tb/notification';
import type {
  NotificationTemplate,
  NotificationType,
} from '@/types/tb/notification';

import TemplateWizard from './template-wizard';
import {
  TEMPLATES_QUERY_KEY,
  toPageLink,
  useTemplatesUrlState,
} from './url-state';

/** Table column key -> sortable server property (ngx: all three sortable). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  notificationType: 'notificationType',
  name: 'name',
};

const SEARCH_DEBOUNCE_MS = 400;

const typeNameKey = (type: NotificationType) =>
  `pages.notifications.templates.type.${type}` as const;

export default function TemplatesPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useTemplatesUrlState();

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
  const templatesQuery = useQuery({
    queryKey: [
      ...TEMPLATES_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getNotificationTemplates(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const templates: Array<NotificationTemplate> =
    templatesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });

  // ---- selection & wizard
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedTemplates = templates.filter((template) =>
    selectedRowKeys.includes(template.id.id),
  );

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSource, setWizardSource] = useState<NotificationTemplate | null>(
    null,
  );
  const [wizardCopy, setWizardCopy] = useState(false);

  const openWizard = (source: NotificationTemplate | null, copy = false) => {
    setWizardSource(source);
    setWizardCopy(copy);
    setWizardOpen(true);
  };

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  // ---- delete flows (single + batch)
  const runBatchDelete = async (items: Array<NotificationTemplate>) => {
    setBatchOpen(true);
    const summary = await batch.run(
      items,
      (item) => item.name || item.id.id,
      (item) => deleteNotificationTemplate(item.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage(
        {
          id: 'pages.notifications.templates.batchResult',
          defaultMessage: '{ok} succeeded, {fail} failed.',
        },
        { ok: summary.ok, fail: summary.failed },
      ),
    );
  };

  const confirmDeleteOne = (template: NotificationTemplate) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.notifications.templates.deleteOneTitle',
          defaultMessage:
            "Are you sure you want to delete the notification template '{name}'?",
        },
        { name: template.name || template.id.id },
      ),
      content: formatMessage({
        id: 'pages.notifications.templates.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the template will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.notifications.templates.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.notifications.templates.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        try {
          await deleteNotificationTemplate(template.id.id);
          setSelectedRowKeys((keys) =>
            keys.filter((key) => key !== template.id.id),
          );
          void invalidate();
          void message.success(
            formatMessage({
              id: 'pages.notifications.templates.toastDeleted',
              defaultMessage: 'Template deleted.',
            }),
          );
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      },
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedTemplates.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.notifications.templates.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 template} other {# templates}}?',
        },
        { count: selectedTemplates.length },
      ),
      content: formatMessage({
        id: 'pages.notifications.templates.deleteManyText',
        defaultMessage:
          'Be careful, after the confirmation the templates will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.notifications.templates.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.notifications.templates.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => runBatchDelete(selectedTemplates),
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
  const columns: ProColumns<NotificationTemplate>[] = useMemo(() => {
    const cols: ProColumns<NotificationTemplate>[] = [
      {
        title: formatMessage({
          id: 'pages.notifications.templates.createdTime',
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
          id: 'pages.notifications.templates.notificationType',
          defaultMessage: 'Type',
        }),
        dataIndex: 'notificationType',
        width: '20%',
        sorter: true,
        sortOrder: sortOrderFor('notificationType'),
        render: (_, record) => (
          <Tag data-testid={`template-type-${record.notificationType}`}>
            {formatMessage({
              id: typeNameKey(record.notificationType),
              defaultMessage: record.notificationType,
            })}
          </Tag>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.notifications.templates.name',
          defaultMessage: 'Template',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
      },
    ];
    cols.push({
      valueType: 'option',
      width: 110,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="copy"
          type="text"
          size="small"
          icon={<CopyOutlined />}
          title={formatMessage({
            id: 'pages.notifications.templates.copy',
            defaultMessage: 'Copy template',
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
            id: 'pages.notifications.templates.delete',
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

  const onTableChange: TableProps<NotificationTemplate>['onChange'] = (
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
        id: 'menu.notifications.templates',
        defaultMessage: 'Templates',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.notifications.templates.search',
              defaultMessage: 'Search templates',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void templatesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.notifications.templates.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {selectedTemplates.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.notifications.templates.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedTemplates.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.notifications.templates.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <SendNotificationButton />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openWizard(null)}
            >
              {formatMessage({
                id: 'pages.notifications.templates.add',
                defaultMessage: 'Add template',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {templatesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.notifications.templates.loadFailed',
            defaultMessage: 'Failed to load templates',
          })}
          description={serverErrorText(templatesQuery.error)}
        />
      )}

      <ProTable<NotificationTemplate>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={templates}
        loading={templatesQuery.isPending}
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
          total: templatesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.notifications.templates.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.notifications.templates.empty',
            defaultMessage: 'No templates',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <TemplateWizard
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
