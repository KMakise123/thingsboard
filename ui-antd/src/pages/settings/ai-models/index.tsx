/**
 * System settings → AI models list (M14 wave-3, R27, spec 6.3-9..11,
 * TENANT only by route access, ui-ngx ai-model-table parity).
 *
 * Four columns (createdTime/name/provider/modelId); row click opens the
 * EDIT dialog directly (ngx detailsPanelEnabled=false → dialog
 * convergence, no detail page); delete single + batch with the
 * "already gone" false-answer treated as a no-op success (contract #24);
 * no export/import (ngx has none). Default sort createdTime DESC.
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
import {
  Alert,
  App,
  Button,
  Input,
  Space,
  type TableProps,
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
  deleteAiModel,
  getAiModels,
  saveAiModel,
} from '@/services/tb/ai-model';
import type { AiModel } from '@/types/tb/ai-model';
import AiModelDialog from './ai-model-dialog';
import { AI_PROVIDER_LABEL_KEYS } from './data';

const AI_MODELS_QUERY_KEY = ['ai-models'] as const;

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

export default function SettingsAiModelsPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

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

  const modelsQuery = useQuery({
    queryKey: [
      ...AI_MODELS_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.textSearch,
    ],
    queryFn: () =>
      getAiModels({
        pageSize: urlState.pageSize,
        page: urlState.page - 1,
        textSearch: urlState.textSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const models: Array<AiModel> = modelsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: AI_MODELS_QUERY_KEY });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedModels = models.filter((model) =>
    selectedRowKeys.includes(model.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  // ---- add/edit dialog (row click = edit, ngx dialog convergence)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AiModel | null>(null);

  const deleteOne = async (model: AiModel) => {
    try {
      const deleted = await deleteAiModel(model.id.id);
      if (!deleted) {
        // 200 `false` = the row was already gone (NOT a 404 error).
        void message.info(
          formatMessage({
            id: 'pages.aiModels.toastAlreadyDeleted',
            defaultMessage: 'The model no longer exists.',
          }),
        );
      } else {
        void message.success(
          formatMessage({
            id: 'pages.aiModels.toastDeleted',
            defaultMessage: 'AI model deleted.',
          }),
        );
      }
      setSelectedRowKeys((keys) => keys.filter((key) => key !== model.id.id));
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const confirmDeleteOne = (model: AiModel) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.aiModels.deleteOneTitle',
          defaultMessage: "Are you sure you want to delete the model '{name}'?",
        },
        { name: model.name },
      ),
      content: formatMessage({
        id: 'pages.aiModels.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the model and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.aiModels.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOne(model),
    });
  };

  const saveMutation = useMutation({
    mutationFn: (model: AiModel) => saveAiModel(model),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.aiModels.toastSaved',
          defaultMessage: 'AI model saved.',
        }),
      );
      void invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });
  void saveMutation; // the dialog owns the save call

  const runBatchDelete = async () => {
    const targets = [...selectedModels];
    setBatchOpen(true);
    const summary = await batch.run(
      targets,
      (model) => model.name,
      (model) => deleteAiModel(model.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage(
        {
          id: 'pages.aiModels.batchResult',
          defaultMessage: '{ok} succeeded, {fail} failed.',
        },
        { ok: summary.ok, fail: summary.failed },
      ),
    );
  };

  const confirmDeleteSelected = () => {
    if (selectedModels.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.aiModels.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 model} other {# models}}?',
        },
        { count: selectedModels.length },
      ),
      content: formatMessage({
        id: 'pages.aiModels.deleteManyText',
        defaultMessage:
          'Be careful, after the confirmation all selected models will be removed and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.aiModels.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => runBatchDelete(),
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers take the row as an argument and read no reactive state (same suppression as the OTA list precedent)
  const columns: ProColumns<AiModel>[] = useMemo(
    () => [
      {
        title: formatMessage({
          id: 'pages.aiModels.createdTime',
          defaultMessage: 'Created time',
        }),
        dataIndex: 'createdTime',
        width: 170,
        render: (_, record) =>
          dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: formatMessage({
          id: 'pages.aiModels.fields.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            className="px-0"
            onClick={() => {
              setEditing(record);
              setDialogOpen(true);
            }}
          >
            {record.name}
          </Button>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.aiModels.fields.providerColumn',
          defaultMessage: 'Provider',
        }),
        dataIndex: 'provider',
        render: (_, record) =>
          record.configuration?.provider
            ? formatMessage({
                id: AI_PROVIDER_LABEL_KEYS[record.configuration.provider],
                defaultMessage: record.configuration.provider,
              })
            : '-',
      },
      {
        title: formatMessage({
          id: 'pages.aiModels.fields.modelIdColumn',
          defaultMessage: 'Model ID',
        }),
        dataIndex: 'modelId',
        render: (_, record) => record.configuration?.modelId ?? '-',
      },
      {
        valueType: 'option',
        width: 60,
        render: (_, record) => [
          <Button
            key="delete"
            danger
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            aria-label={formatMessage({
              id: 'pages.aiModels.delete',
              defaultMessage: 'Delete',
            })}
            title={formatMessage({
              id: 'pages.aiModels.delete',
              defaultMessage: 'Delete',
            })}
            onClick={() => confirmDeleteOne(record)}
          />,
        ],
      },
    ],
    [formatMessage],
  );

  const onTableChange: TableProps<AiModel>['onChange'] = (pagination) => {
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
        id: 'menu.settings.aiModels',
        defaultMessage: 'AI models',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.aiModels.search',
              defaultMessage: 'Search models',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void modelsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.aiModels.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {selectedModels.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.aiModels.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedModels.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.aiModels.deleteSelected',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              {formatMessage({
                id: 'pages.aiModels.addModel',
                defaultMessage: 'Add model',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {modelsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.aiModels.loadFailed',
            defaultMessage: 'Failed to load models',
          })}
          description={serverErrorText(modelsQuery.error)}
        />
      )}
      <ProTable<AiModel>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={models}
        loading={modelsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        onRow={(record) => ({
          // Row click = edit dialog (ngx row-open parity).
          onClick: (event) => {
            if ((event.target as HTMLElement).closest('button')) {
              return;
            }
            setEditing(record);
            setDialogOpen(true);
          },
        })}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: modelsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZES,
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.aiModels.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.aiModels.empty',
            defaultMessage: 'No models found.',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <AiModelDialog
        open={dialogOpen}
        model={editing}
        onClose={() => setDialogOpen(false)}
      />

      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => setBatchOpen(false)}
      />
    </PageContainer>
  );
}
