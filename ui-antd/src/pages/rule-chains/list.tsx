/**
 * ruleChains list page (`/ruleChains`, M8 brief §3 wave-3 D; ui-ngx
 * rulechains-table-config parity). Tenant-admin scope (route canTenantAdmin):
 * search (textSearch) / paging / sort (createdTime|name|root), and the row
 * operation set — open (editor), details dialog, set-root (root rows
 * disabled; POST .../root), edit (name + description → POST /api/ruleChain),
 * export (ui-ngx prepareRuleChain strip rules), delete (root/referenced
 * chains are rejected server-side and the error is surfaced verbatim) —
 * plus the header 新建 (create → straight into the editor) and 导入 flows.
 *
 * Page / pageSize / sort / search restore from the URL (createListUrlState).
 * Import/export adapters live in editor/contract (brief §2 contract/ 导入导出
 * 适配); the import dialog reports legacy migrations before creating.
 */

import {
  DownloadOutlined,
  MoreOutlined,
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
  Dropdown,
  Form,
  Input,
  Modal,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { createListUrlState } from '@/pages/customers/list-url-state';
import {
  deleteRuleChain,
  getRuleChainById,
  getRuleChainMetaData,
  getRuleChains,
  saveRuleChain,
  setRootRuleChain,
} from '@/services/tb/rule-chain';
import type { RuleChain } from '@/types/tb/rule-chain';
import { RuleChainDetailsDialog } from './details-dialog';
import {
  downloadRuleChainJson,
  exportRuleChainData,
} from './editor/contract/export-draft';
import { ImportRuleChainDialog } from './editor/contract/import-dialog';

const RULE_CHAINS_QUERY_KEY = ['ruleChains', 'list'] as const;

/** Table column key -> sortable server property (backend allowable set). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  root: 'root',
};

const SEARCH_DEBOUNCE_MS = 400;

/** Shared url-state factory: createdTime DESC default (dashboards parity). */
const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

interface ChainFormValues {
  name: string;
  description?: string;
}

export default function RuleChainsListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = listUrlState.useListUrlState();

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

  // ---- the list
  const chainsQuery = useQuery({
    queryKey: [
      ...RULE_CHAINS_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getRuleChains(listUrlState.toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const chains: Array<RuleChain> = chainsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: RULE_CHAINS_QUERY_KEY });

  // ---- row mutations
  const setRootMutation = useMutation({
    mutationFn: (id: string) => setRootRuleChain(id),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'ruleChains.list.setRootSuccess',
          defaultMessage: 'The rule chain is now the root chain.',
        }),
      );
      void invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRuleChain(id),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'ruleChains.list.toastDeleted',
          defaultMessage: 'Rule chain deleted.',
        }),
      );
      void invalidate();
    },
    // root / referenced chains: the backend error surfaces verbatim
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const saveMutation = useMutation({
    mutationFn: (chain: RuleChain) => saveRuleChain(chain),
    onSuccess: (saved, chain) => {
      void message.success(
        formatMessage(
          {
            id: chain.id
              ? 'ruleChains.list.toastSaved'
              : 'ruleChains.list.toastCreated',
            defaultMessage: chain.id
              ? 'Rule chain saved.'
              : "Rule chain '{name}' has been created.",
          },
          { name: saved.name },
        ),
      );
      void invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  // ---- create / edit dialog (name + additionalInfo.description)
  const [editTarget, setEditTarget] = useState<
    { mode: 'create' } | { mode: 'edit'; chain: RuleChain } | null
  >(null);

  const submitChainForm = async (values: ChainFormValues) => {
    const target = editTarget;
    if (!target) {
      return;
    }
    if (target.mode === 'edit') {
      const description = values.description?.trim();
      const additionalInfo = {
        ...(target.chain.additionalInfo ?? {}),
        ...(description ? { description } : {}),
      };
      if (!description) {
        delete additionalInfo.description;
      }
      saveMutation.mutate({
        ...target.chain,
        name: values.name.trim(),
        additionalInfo,
      });
    } else {
      const description = values.description?.trim();
      // create: no id — the backend mints one (POST /api/ruleChain upsert)
      saveMutation.mutate({
        name: values.name.trim(),
        type: 'CORE',
        ...(description ? { additionalInfo: { description } } : {}),
      } as RuleChain);
    }
    setEditTarget(null);
  };

  // ---- export (ui-ngx strip rules, GET truth)
  const exportOne = async (chain: RuleChain) => {
    try {
      const [chainFull, metadata] = await Promise.all([
        getRuleChainById(chain.id.id),
        getRuleChainMetaData(chain.id.id),
      ]);
      downloadRuleChainJson(
        exportRuleChainData(chainFull, metadata),
        chainFull.name,
      );
    } catch (error) {
      void message.error(
        formatMessage(
          {
            id: 'ruleChains.list.exportFailed',
            defaultMessage: 'Failed to export the rule chain: {error}',
          },
          { error: serverErrorText(error) },
        ),
      );
    }
  };

  const confirmSetRoot = (chain: RuleChain) => {
    modal.confirm({
      title: formatMessage({
        id: 'ruleChains.list.setRootTitle',
        defaultMessage: 'Set as root rule chain?',
      }),
      content: formatMessage({
        id: 'ruleChains.list.setRootText',
        defaultMessage:
          'After the confirmation all entity messages are processed by this chain by default (the current root chain is replaced).',
      }),
      okText: formatMessage({
        id: 'ruleChains.list.actionSetRoot',
        defaultMessage: 'Set as root',
      }),
      cancelText: formatMessage({
        id: 'ruleChains.list.cancel',
        defaultMessage: 'Cancel',
      }),
      // errors surface through the toast; the catch keeps antd's confirm
      // promise from turning the rejection into an unhandled event
      onOk: () =>
        setRootMutation.mutateAsync(chain.id.id).catch(() => undefined),
    });
  };

  const confirmDelete = (chain: RuleChain) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'ruleChains.list.deleteTitle',
          defaultMessage:
            "Are you sure you want to delete the rule chain '{name}'?",
        },
        { name: chain.name },
      ),
      content: formatMessage({
        id: 'ruleChains.list.deleteText',
        defaultMessage:
          'Be careful, the chain becomes unrecoverable; the root chain and chains referenced by other chains cannot be deleted.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'ruleChains.list.actionDelete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'ruleChains.list.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () =>
        deleteMutation.mutateAsync(chain.id.id).catch(() => undefined),
    });
  };

  // ---- import
  const [importOpen, setImportOpen] = useState(false);

  // ---- details dialog
  const [detailsChain, setDetailsChain] = useState<RuleChain | null>(null);

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<RuleChain>['onChange'] = (
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design
  const columns: ProColumns<RuleChain>[] = useMemo(() => {
    const cols: ProColumns<RuleChain>[] = [
      {
        title: formatMessage({
          id: 'ruleChains.list.createdTime',
          defaultMessage: 'Created time',
        }),
        dataIndex: 'createdTime',
        width: 170,
        sorter: true,
        sortOrder: sortOrderFor('createdTime'),
        render: (_, record) => (
          <span className="tabular-nums">
            {dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss')}
          </span>
        ),
      },
      {
        title: formatMessage({
          id: 'ruleChains.list.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        render: (_, record) => (
          <Typography.Link
            onClick={() => history.push(`/ruleChains/${record.id.id}`)}
          >
            {record.name}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'ruleChains.list.root',
          defaultMessage: 'Root',
        }),
        dataIndex: 'root',
        width: 90,
        sorter: true,
        sortOrder: sortOrderFor('root'),
        render: (_, record) =>
          record.root === true ? (
            <Tag color="success" data-testid={`rc-root-tag-${record.id.id}`}>
              {formatMessage({
                id: 'ruleChains.list.rootTag',
                defaultMessage: 'Root',
              })}
            </Tag>
          ) : (
            '-'
          ),
      },
      {
        valueType: 'option',
        width: 100,
        fixed: 'right',
        render: (_, record) => {
          const isRoot = record.root === true;
          return [
            <Button
              key="open"
              type="text"
              size="small"
              data-testid={`rc-open-${record.id.id}`}
              onClick={() => history.push(`/ruleChains/${record.id.id}`)}
            >
              {formatMessage({
                id: 'ruleChains.list.actionOpen',
                defaultMessage: 'Open',
              })}
            </Button>,
            <Dropdown
              key="more"
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'details',
                    label: formatMessage({
                      id: 'ruleChains.list.actionDetails',
                      defaultMessage: 'Details',
                    }),
                    onClick: () => setDetailsChain(record),
                  },
                  {
                    key: 'set-root',
                    // 根链禁设根 (guard)
                    disabled: isRoot,
                    label: formatMessage({
                      id: 'ruleChains.list.actionSetRoot',
                      defaultMessage: 'Set as root',
                    }),
                    onClick: () => confirmSetRoot(record),
                  },
                  {
                    key: 'edit',
                    label: formatMessage({
                      id: 'ruleChains.list.actionEdit',
                      defaultMessage: 'Edit',
                    }),
                    onClick: () =>
                      setEditTarget({ mode: 'edit', chain: record }),
                  },
                  {
                    key: 'export',
                    label: formatMessage({
                      id: 'ruleChains.list.actionExport',
                      defaultMessage: 'Export rule chain',
                    }),
                    onClick: () => void exportOne(record),
                  },
                  {
                    key: 'delete',
                    danger: true,
                    // 根链禁删 (guard) — referenced chains are rejected server-side
                    disabled: isRoot,
                    label: formatMessage({
                      id: 'ruleChains.list.actionDelete',
                      defaultMessage: 'Delete',
                    }),
                    onClick: () => confirmDelete(record),
                  },
                ],
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                data-testid={`rc-more-${record.id.id}`}
              />
            </Dropdown>,
          ];
        },
      },
    ];
    return cols;
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  return (
    <PageContainer
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'ruleChains.list.search',
              defaultMessage: 'Search rule chains',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void chainsQuery.refetch()}
          >
            {formatMessage({
              id: 'ruleChains.list.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            {formatMessage({
              id: 'ruleChains.list.actionImport',
              defaultMessage: 'Import rule chain',
            })}
          </Button>
          <Button
            type="primary"
            onClick={() => setEditTarget({ mode: 'create' })}
            data-testid="rc-new-chain"
          >
            {formatMessage({
              id: 'ruleChains.list.actionNew',
              defaultMessage: 'New rule chain',
            })}
          </Button>
        </div>
      }
    >
      {chainsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'ruleChains.list.loadFailed',
            defaultMessage: 'Failed to load rule chains',
          })}
          description={serverErrorText(chainsQuery.error)}
        />
      )}

      <ProTable<RuleChain>
        rowKey={(record) => record.id.id}
        columns={columns}
        dataSource={chains}
        loading={chainsQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: chainsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'ruleChains.list.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'ruleChains.list.empty',
            defaultMessage: 'No rule chains',
          }),
        }}
      />

      <ChainFormDialog
        mode={editTarget?.mode ?? null}
        chain={editTarget?.mode === 'edit' ? editTarget.chain : undefined}
        saving={saveMutation.isPending}
        onClose={() => setEditTarget(null)}
        onSubmit={(values) => void submitChainForm(values)}
      />

      <RuleChainDetailsDialog
        chain={detailsChain}
        onClose={() => setDetailsChain(null)}
      />

      <ImportRuleChainDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(chain) => {
          void invalidate();
          void message.success(
            formatMessage(
              {
                id: 'ruleChains.list.toastImported',
                defaultMessage: "Rule chain '{name}' has been imported.",
              },
              { name: chain.name },
            ),
          );
          // 导入跳转编辑器 (spec §4.9)
          history.push(`/ruleChains/${chain.id.id}`);
        }}
      />
    </PageContainer>
  );
}

/**
 * Create/edit dialog (ui-ngx rulechain.component parity: name required +
 * description in additionalInfo). Controlled antd Form; nothing auto-saves.
 */
function ChainFormDialog({
  mode,
  chain,
  saving,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit' | null;
  chain?: RuleChain;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: ChainFormValues) => void;
}) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<ChainFormValues>();

  useEffect(() => {
    if (mode) {
      form.setFieldsValue({
        name: mode === 'edit' ? chain?.name : '',
        description:
          (chain?.additionalInfo?.description as string | undefined) ?? '',
      });
    }
  }, [mode, chain, form]);

  return (
    <Modal
      open={mode !== null}
      title={formatMessage({
        id:
          mode === 'edit'
            ? 'ruleChains.list.editTitle'
            : 'ruleChains.list.newTitle',
        defaultMessage: mode === 'edit' ? 'Edit rule chain' : 'New rule chain',
      })}
      confirmLoading={saving}
      okText={formatMessage({ id: 'ruleChains.list.ok', defaultMessage: 'OK' })}
      cancelText={formatMessage({
        id: 'ruleChains.list.cancel',
        defaultMessage: 'Cancel',
      })}
      destroyOnHidden
      onOk={() => form.submit()}
      onCancel={onClose}
      data-testid="rc-chain-form-dialog"
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'ruleChains.list.name',
            defaultMessage: 'Name',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'ruleChains.list.nameRequired',
                defaultMessage: 'Name is required',
              }),
            },
          ]}
        >
          <Input data-testid="rc-chain-form-name" />
        </Form.Item>
        <Form.Item
          name="description"
          label={formatMessage({
            id: 'ruleChains.list.description',
            defaultMessage: 'Description',
          })}
        >
          <Input.TextArea rows={3} data-testid="rc-chain-form-description" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
