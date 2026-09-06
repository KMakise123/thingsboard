/**
 * System settings → Queues list (M14 wave-3, R26, spec 6.3-1, ui-ngx
 * queues-table-config parity, SYS only by route access).
 *
 * Four columns (name/partitions/submitStrategy/processingStrategy — the
 * strategy cells show the translated strategy label), server search +
 * paging, explicit createdTime DESC default (backend default is id ASC),
 * serviceType pinned to TB_RULE_ENGINE inside the service. The Main system
 * queue is front-end protected in BOTH places: no selection checkbox and
 * no delete action (the backend has no name-based delete guard —
 * registered boundary). Row click opens the route detail page (the ngx
 * drawer's antd convergence).
 */
import {
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
import { history } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Space,
  type TableProps,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useBatchRun } from '@/components/shared/use-batch-run';
import { deleteQueue, getQueues, saveQueue } from '@/services/tb/queue';
import type { Queue } from '@/types/tb/queue';
import {
  defaultQueueFormValues,
  isMainQueue,
  processingStrategyLabelKey,
  type QueueFormValues,
  submitStrategyLabelKey,
  toQueuePayload,
} from './data';
import QueueForm from './queue-form';

const QUEUES_QUERY_KEY = ['queues', 'rule-engine'] as const;

const SEARCH_DEBOUNCE_MS = 400;

const PAGE_SIZES = [10, 20, 30, 50, 100];

function parseUrlState(search: string) {
  const params = new URLSearchParams(search);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const rawPageSize = Number(params.get('pageSize')) || 10;
  return {
    page,
    pageSize: PAGE_SIZES.includes(rawPageSize) ? rawPageSize : 10,
    textSearch: params.get('textSearch') ?? '',
  };
}

export default function SettingsQueuesPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  // ---- url state: page/pageSize/textSearch (sort pinned to createdTime DESC)
  const [urlState, setUrlState] = useState(() =>
    parseUrlState(window.location.search),
  );
  useEffect(() => {
    const onPopState = () => setUrlState(parseUrlState(window.location.search));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const patch = (partial: Partial<ReturnType<typeof parseUrlState>>) => {
    setUrlState((previous) => {
      const next = { ...previous, ...partial };
      const params = new URLSearchParams();
      if (next.page !== 1) {
        params.set('page', String(next.page));
      }
      if (next.pageSize !== 10) {
        params.set('pageSize', String(next.pageSize));
      }
      if (next.textSearch) {
        params.set('textSearch', next.textSearch);
      }
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
      return next;
    });
  };

  // ---- server-side search (debounced)
  const [searchInput, setSearchInput] = useState(urlState.textSearch);
  useEffect(() => {
    setSearchInput(urlState.textSearch);
  }, [urlState.textSearch]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: the debounced write goes through patch (a stable writer); urlState.textSearch re-syncs the input each commit
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== urlState.textSearch) {
        patch({ textSearch: next, page: 1 });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  // ---- the list itself
  const queuesQuery = useQuery({
    queryKey: [
      ...QUEUES_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.textSearch,
    ],
    queryFn: () =>
      getQueues({
        pageSize: urlState.pageSize,
        page: urlState.page - 1,
        textSearch: urlState.textSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const queues: Array<Queue> = queuesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUEUES_QUERY_KEY });

  // ---- selection (Main rows are unselectable) + batch
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedQueues = queues.filter((queue) =>
    selectedRowKeys.includes(queue.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  // ---- create dialog
  const [form] = Form.useForm<QueueFormValues>();
  const [createOpen, setCreateOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: (values: QueueFormValues) =>
      saveQueue(toQueuePayload(undefined, values)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.queues.toastSaved',
          defaultMessage: 'Queue saved.',
        }),
      );
      setCreateOpen(false);
      form.resetFields();
      void invalidate();
    },
    // Referenced-by-device-profile deletes 400 on the backend — the same
    // verbatim passthrough applies to any save validation failure.
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const deleteOne = async (queue: Queue) => {
    try {
      await deleteQueue(queue.id.id);
      setSelectedRowKeys((keys) => keys.filter((key) => key !== queue.id.id));
      void message.success(
        formatMessage({
          id: 'pages.settings.queues.toastDeleted',
          defaultMessage: 'Queue deleted.',
        }),
      );
      void invalidate();
    } catch (error) {
      // Backend 400 when device profiles reference the queue — verbatim.
      void message.error(serverErrorText(error));
    }
  };

  const confirmDeleteOne = (queue: Queue) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.settings.queues.deleteOneTitle',
          defaultMessage: "Are you sure you want to delete the queue '{name}'?",
        },
        { name: queue.name },
      ),
      content: formatMessage({
        id: 'pages.settings.queues.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the queue and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.settings.queues.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOne(queue),
    });
  };

  const runBatchDelete = async () => {
    const targets = [...selectedQueues];
    setBatchOpen(true);
    const summary = await batch.run(
      targets,
      (queue) => queue.name,
      (queue) => deleteQueue(queue.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage(
        {
          id: 'pages.settings.queues.batchResult',
          defaultMessage: '{ok} succeeded, {fail} failed.',
        },
        { ok: summary.ok, fail: summary.failed },
      ),
    );
  };

  const confirmDeleteSelected = () => {
    if (selectedQueues.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.settings.queues.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 queue} other {# queues}}?',
        },
        { count: selectedQueues.length },
      ),
      content: formatMessage({
        id: 'pages.settings.queues.deleteManyText',
        defaultMessage:
          "After the confirmation all selected queues will be deleted and won't be accessible.",
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.settings.queues.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => runBatchDelete(),
    });
  };

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers take the row as an argument and read no reactive state (same suppression as the OTA list precedent)
  const columns: ProColumns<Queue>[] = useMemo(
    () => [
      {
        title: formatMessage({
          id: 'pages.settings.queues.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            className="px-0"
            onClick={() => history.push(`/settings/queues/${record.id.id}`)}
          >
            {record.name}
          </Button>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.settings.queues.partitions',
          defaultMessage: 'Partitions',
        }),
        dataIndex: 'partitions',
      },
      {
        title: formatMessage({
          id: 'pages.settings.queues.submitStrategyColumn',
          defaultMessage: 'Submit strategy',
        }),
        dataIndex: 'submitStrategy',
        render: (_, record) =>
          record.submitStrategy?.type
            ? formatMessage({
                id: submitStrategyLabelKey(record.submitStrategy.type),
                defaultMessage: record.submitStrategy.type,
              })
            : '-',
      },
      {
        title: formatMessage({
          id: 'pages.settings.queues.processingStrategyColumn',
          defaultMessage: 'Processing strategy',
        }),
        dataIndex: 'processingStrategy',
        render: (_, record) =>
          record.processingStrategy?.type
            ? formatMessage({
                id: processingStrategyLabelKey(record.processingStrategy.type),
                defaultMessage: record.processingStrategy.type,
              })
            : '-',
      },
      {
        valueType: 'option',
        width: 60,
        render: (_, record) =>
          isMainQueue(record)
            ? []
            : [
                <Button
                  key="delete"
                  danger
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  aria-label={formatMessage({
                    id: 'pages.settings.queues.delete',
                    defaultMessage: 'Delete',
                  })}
                  title={formatMessage({
                    id: 'pages.settings.queues.delete',
                    defaultMessage: 'Delete',
                  })}
                  onClick={() => confirmDeleteOne(record)}
                />,
              ],
      },
    ],
    [formatMessage],
  );

  const onTableChange: TableProps<Queue>['onChange'] = (pagination) => {
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
        id: 'menu.settings.queues',
        defaultMessage: 'Queues',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.settings.queues.search',
              defaultMessage: 'Search queues',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void queuesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.settings.queues.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {selectedQueues.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.settings.queues.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedQueues.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.settings.queues.deleteSelected',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.setFieldsValue(defaultQueueFormValues());
                setCreateOpen(true);
              }}
            >
              {formatMessage({
                id: 'pages.settings.queues.addQueue',
                defaultMessage: 'Add queue',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {queuesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.settings.queues.loadFailed',
            defaultMessage: 'Failed to load queues',
          })}
          description={serverErrorText(queuesQuery.error)}
        />
      )}{' '}
      <ProTable<Queue>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={queues}
        loading={queuesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({
          onClick: (event) => {
            // Let the row-action buttons handle their own clicks.
            if ((event.target as HTMLElement).closest('button')) {
              return;
            }
            history.push(`/settings/queues/${record.id.id}`);
          },
        })}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: queuesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZES,
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.settings.queues.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.settings.queues.empty',
            defaultMessage: 'No queues found',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          // Main has NO backend delete guard: unselectable in the UI.
          getCheckboxProps: (record) => ({
            disabled: isMainQueue(record),
          }),
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />
      <Modal
        open={createOpen}
        title={formatMessage({
          id: 'pages.settings.queues.addQueue',
          defaultMessage: 'Add queue',
        })}
        width={860}
        okText={formatMessage({
          id: 'pages.settings.queues.addQueue',
          defaultMessage: 'Add queue',
        })}
        cancelText={formatMessage({
          id: 'pages.common.cancel',
          defaultMessage: 'Cancel',
        })}
        confirmLoading={createMutation.isPending}
        onOk={() => {
          void form
            .validateFields()
            .then((values) => createMutation.mutate(values))
            .catch(() => {
              // Field errors render on the inputs themselves.
            });
        }}
        onCancel={() => setCreateOpen(false)}
        destroyOnHidden
      >
        <QueueForm form={form} editMode={false} />
      </Modal>
      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => setBatchOpen(false)}
      />
    </PageContainer>
  );
}
