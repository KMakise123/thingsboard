/**
 * Rule chain templates page (`/edges/rule-chains`, M13 wave-5b, spec §5.3;
 * ui-ngx rulechains-table-config 'edges' scope parity). The tenant's
 * EDGE-type chains are the templates stamped onto newly created edges. Rows
 * ride the same two-call merge ngx does: the auto-assign id set from
 * GET /api/ruleChain/autoAssignToEdgeRuleChains plus the paged EDGE list
 * GET /api/ruleChains?type=EDGE (rule-chain domain service). Columns carry
 * the Edge template root checkbox (checked = the chain the backend flags
 * `root`; confirming Set Edge template root calls
 * POST /api/ruleChain/{id}/edgeTemplateRoot) and the auto-assign checkbox
 * (toggling saves immediately via POST/DELETE /api/ruleChain/{id}/autoAssignToEdge).
 * The header keeps 新建 (EDGE type, straight into the canvas) and 导入 (the
 * shared import pipeline with the type forced to EDGE); the name link opens
 * the chain canvas (canvas itself stays a rule-chain-domain concern).
 * TENANT_ADMIN only (route access).
 */

import {
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { history } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  type TableProps,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { createListUrlState } from '@/pages/customers/list-url-state';
import {
  getAutoAssignToEdgeRuleChains,
  setAutoAssignToEdgeRuleChain,
  setEdgeTemplateRoot,
  unsetAutoAssignToEdgeRuleChain,
} from '@/services/tb/edge';
import { getRuleChains, saveRuleChain } from '@/services/tb/rule-chain';
import type { RuleChain } from '@/types/tb/rule-chain';
import { ImportEdgeChainDialog } from './import-dialog';

const CHAINS_KEY = ['edgeRuleChainTemplates', 'chains'] as const;
const AUTO_ASSIGN_KEY = ['edgeRuleChainTemplates', 'autoAssign'] as const;

/** Table column key -> sortable server property (endpoint schema). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
  root: 'root',
};

const SEARCH_DEBOUNCE_MS = 400;

const listUrlState = createListUrlState({
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
});

interface ChainFormValues {
  name: string;
  description?: string;
}

export default function RuleChainTemplatesPage() {
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

  // ---- the auto-assign id set (marks the assignToEdge checkbox column)
  const autoAssignQuery = useQuery({
    queryKey: [...AUTO_ASSIGN_KEY],
    queryFn: getAutoAssignToEdgeRuleChains,
  });
  const autoAssignIds = useMemo(() => {
    const rows = autoAssignQuery.data ?? [];
    return new Set(rows.map((chain) => chain.id.id));
  }, [autoAssignQuery.data]);

  // ---- the paged EDGE-type chain list (the table rows)
  const chainsQuery = useQuery({
    queryKey: [
      ...CHAINS_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getRuleChains(listUrlState.toPageLink(urlState), 'EDGE'),
    placeholderData: keepPreviousData,
  });
  const chains: Array<RuleChain> = chainsQuery.data?.data ?? [];
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: CHAINS_KEY });
    void queryClient.invalidateQueries({ queryKey: AUTO_ASSIGN_KEY });
  };

  // ---- Set Edge template root (confirm → POST .../edgeTemplateRoot)
  const confirmSetTemplateRoot = (chain: RuleChain) => {
    modal.confirm({
      title: formatMessage({
        id: 'pages.edge.templates.setTemplateRootTitle',
        defaultMessage: 'Set as Edge template root rule chain?',
      }),
      content: formatMessage({
        id: 'pages.edge.templates.setTemplateRootText',
        defaultMessage:
          'After the confirmation the rule chain becomes the root chain for newly created edges (existing edges keep their current root chain).',
      }),
      okText: formatMessage({
        id: 'pages.edge.templates.actionSetTemplateRoot',
        defaultMessage: 'Set as template root',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        try {
          await setEdgeTemplateRoot(chain.id.id);
          void message.success(
            formatMessage({
              id: 'pages.edge.templates.toastTemplateRoot',
              defaultMessage: 'The rule chain is now the Edge template root.',
            }),
          );
          void invalidateAll();
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      },
    });
  };

  // ---- auto-assign toggle (即改即存: the checkbox writes immediately)
  const [autoAssignPendingId, setAutoAssignPendingId] = useState<string>();
  const toggleAutoAssign = async (chain: RuleChain, checked: boolean) => {
    setAutoAssignPendingId(chain.id.id);
    try {
      if (checked) {
        await setAutoAssignToEdgeRuleChain(chain.id.id);
        void message.success(
          formatMessage({
            id: 'pages.edge.templates.autoAssignOn',
            defaultMessage: 'Auto-assign to edge enabled.',
          }),
        );
      } else {
        await unsetAutoAssignToEdgeRuleChain(chain.id.id);
        void message.success(
          formatMessage({
            id: 'pages.edge.templates.autoAssignOff',
            defaultMessage: 'Auto-assign to edge disabled.',
          }),
        );
      }
      void invalidateAll();
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setAutoAssignPendingId(undefined);
    }
  };

  // ---- create EDGE chain (name + description → straight into the canvas)
  const [form] = Form.useForm<ChainFormValues>();
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const submitCreate = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const description = values.description?.trim();
      const saved = await saveRuleChain({
        name: values.name.trim(),
        type: 'EDGE',
        ...(description ? { additionalInfo: { description } } : {}),
      } as RuleChain);
      setCreateOpen(false);
      void message.success(
        formatMessage(
          {
            id: 'pages.edge.templates.toastCreated',
            defaultMessage: 'Rule chain "{name}" has been created.',
          },
          { name: saved.name },
        ),
      );
      void queryClient.invalidateQueries({ queryKey: CHAINS_KEY });
      history.push(`/ruleChains/${saved.id.id}`);
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  // ---- import (EDGE type forced)
  const [importOpen, setImportOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: excluded row-action handlers take the row as an argument and read no reactive state (stable setters only); the listed deps (incl. the auto-assign state) cover every value that shapes the rendered columns
  const columns: ProColumns<RuleChain>[] = useMemo(() => {
    const cols: ProColumns<RuleChain>[] = [
      {
        title: formatMessage({
          id: 'pages.edge.createdTime',
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
          id: 'pages.edge.name',
          defaultMessage: 'Name',
        }),
        dataIndex: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
        // Canvas entry: EDGE chains open in the rule-chain canvas route.
        render: (_, record) => (
          <Typography.Link
            data-testid={`tpl-open-${record.id.id}`}
            onClick={() => history.push(`/ruleChains/${record.id.id}`)}
          >
            {record.name}
          </Typography.Link>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.edge.templates.columnTemplateRoot',
          defaultMessage: 'Edge template root',
        }),
        dataIndex: 'root',
        width: 140,
        sorter: true,
        sortOrder: sortOrderFor('root'),
        render: (_, record) => {
          const isTemplateRoot = record.root === true;
          return (
            <Checkbox
              checked={isTemplateRoot}
              disabled={isTemplateRoot}
              data-testid={`tpl-template-root-${record.id.id}`}
              aria-label={formatMessage({
                id: 'pages.edge.templates.columnTemplateRoot',
                defaultMessage: 'Edge template root',
              })}
              onChange={() => confirmSetTemplateRoot(record)}
            />
          );
        },
      },
      {
        title: formatMessage({
          id: 'pages.edge.templates.columnAssignToEdge',
          defaultMessage: 'Auto-assign to edge',
        }),
        dataIndex: 'assignToEdge',
        width: 160,
        render: (_, record) => {
          const isTemplateRoot = record.root === true;
          return (
            <Checkbox
              checked={autoAssignIds.has(record.id.id)}
              // ngx: the template root chain never toggles auto-assign;
              // the row disables while its toggle is in flight (no loading
              // prop on Checkbox — disabled covers the double-click window)
              disabled={isTemplateRoot || autoAssignPendingId === record.id.id}
              data-testid={`tpl-auto-assign-${record.id.id}`}
              aria-label={formatMessage({
                id: 'pages.edge.templates.columnAssignToEdge',
                defaultMessage: 'Auto-assign to edge',
              })}
              onChange={(event) =>
                void toggleAutoAssign(record, event.target.checked)
              }
            />
          );
        },
      },
    ];
    return cols;
  }, [
    formatMessage,
    urlState.sortProperty,
    urlState.sortDirection,
    autoAssignIds,
    autoAssignPendingId,
  ]);

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

  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.edge.ruleChainTemplates',
        defaultMessage: 'Rule chain templates',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.edge.templates.search',
              defaultMessage: 'Search rule chains',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void chainsQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.edge.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportOpen(true)}
            data-testid="tpl-import"
          >
            {formatMessage({
              id: 'pages.edge.templates.actionImport',
              defaultMessage: 'Import rule chain',
            })}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setCreateOpen(true);
            }}
            data-testid="tpl-new"
          >
            {formatMessage({
              id: 'pages.edge.templates.actionNew',
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
          title={formatMessage({
            id: 'pages.edge.templates.loadFailed',
            defaultMessage: 'Failed to load EDGE rule chains',
          })}
          description={serverErrorText(chainsQuery.error)}
        />
      )}

      <ProTable<RuleChain>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={chains}
        loading={chainsQuery.isPending || autoAssignQuery.isPending}
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
                id: 'pages.edge.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.edge.templates.empty',
            defaultMessage: 'No EDGE rule chains',
          }),
        }}
      />

      <Modal
        open={createOpen}
        title={formatMessage({
          id: 'pages.edge.templates.newTitle',
          defaultMessage: 'New EDGE rule chain',
        })}
        confirmLoading={saving}
        okText={formatMessage({
          id: 'pages.edge.templates.ok',
          defaultMessage: 'OK',
        })}
        cancelText={formatMessage({
          id: 'pages.edge.cancel',
          defaultMessage: 'Cancel',
        })}
        destroyOnHidden
        onOk={() => void submitCreate()}
        onCancel={() => setCreateOpen(false)}
        data-testid="tpl-create-dialog"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'pages.edge.name',
              defaultMessage: 'Name',
            })}
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage({
                  id: 'pages.edge.templates.nameRequired',
                  defaultMessage: 'Name is required',
                }),
              },
            ]}
          >
            <Input data-testid="tpl-create-name" />
          </Form.Item>
          <Form.Item
            name="description"
            label={formatMessage({
              id: 'pages.edge.templates.description',
              defaultMessage: 'Description',
            })}
          >
            <Input.TextArea rows={3} data-testid="tpl-create-description" />
          </Form.Item>
        </Form>
      </Modal>

      <ImportEdgeChainDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(chain) => {
          void queryClient.invalidateQueries({ queryKey: CHAINS_KEY });
          void message.success(
            formatMessage(
              {
                id: 'pages.edge.templates.toastImported',
                defaultMessage: 'Rule chain "{name}" has been imported.',
              },
              { name: chain.name },
            ),
          );
          history.push(`/ruleChains/${chain.id.id}`);
        }}
      />
    </PageContainer>
  );
}
