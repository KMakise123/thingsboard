/**
 * Edge-scope rule chains page (M13 wave-5b, spec §5.3; ui-ngx edge-scope
 * rulechain table parity): rows are the EDGE-type rule chains already
 * assigned to this edge. TENANT_ADMIN only — the route narrows with
 * `canTenantAdmin` and the page re-checks the JWT authority, bouncing any
 * other role back to the instances list (CU gets no entry and no URL
 * access). No create/delete here (pinned): the write surface is the
 * assign-existing dialog (EDGE-type candidates from the rule-chain domain
 * list), inline Set root (confirm → POST /api/edge/{edgeId}/{ruleChainId}/root)
 * and inline/batch unassign (the root row is disabled for both). On entry
 * the page asks GET /api/edge/missingToRelatedRuleChains/{edgeId}; any
 * missing related chains render as a closable Alert — the antd replacement
 * for ngx's blocking alert — and the page stays usable after dismissal.
 */

import {
  MoreOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Dropdown,
  Input,
  type TableProps,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useAuthority } from '@/components/shared/use-authority';
import { useBatchRun } from '@/components/shared/use-batch-run';
import { createListUrlState } from '@/pages/customers/list-url-state';
import {
  assignEdgeRuleChain,
  getEdgeRuleChains,
  getMissingToRelatedRuleChains,
  setEdgeRootRuleChain,
  unassignEdgeRuleChain,
} from '@/services/tb/edge';
import { getRuleChains } from '@/services/tb/rule-chain';
import type { PageLink } from '@/types/tb';
import type { RuleChain } from '@/types/tb/rule-chain';
import {
  AssignEntitiesDialog,
  type AssignEntitiesOption,
} from '../assign-entities-dialog';
import { EdgeScopePageShell, useEdgeScopeName } from '../detail/scope-shell';
import {
  EDGE_SCOPE_UNASSIGN_TEXTS,
  useEdgeUnassign,
} from '../use-edge-unassign';

const SCOPE_RULE_CHAINS_KEY = ['edges', 'ruleChains', 'scope'] as const;
const MISSING_KEY = ['edges', 'ruleChains', 'missing'] as const;

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

/**
 * The endpoint answers a JSON object text — `{ "assigned chain name":
 * ["missing chain name", ...] }` (EdgeServiceImpl serialises names, not
 * ids). Anything else parses to "no findings" rather than a crash.
 */
export function parseMissingRuleChains(
  raw: string | undefined,
): Array<{ chain: string; missing: Array<string> }> {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, unknown>).flatMap(
        ([chain, value]) => {
          const missing = Array.isArray(value)
            ? value.filter(
                (entry): entry is string => typeof entry === 'string',
              )
            : [];
          return missing.length > 0 ? [{ chain, missing }] : [];
        },
      );
    }
  } catch {
    // Not JSON: no findings to report.
  }
  return [];
}

export default function EdgeRuleChainsPage() {
  const { id } = useParams<{ id: string }>();
  const edgeId = id;
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { authority } = useAuthority();
  const { state: urlState, patch } = listUrlState.useListUrlState();
  const nameQuery = useEdgeScopeName(edgeId);

  // TENANT_ADMIN only: the route guard blocks the URL, this in-page guard
  // bounces the role back if the page ever mounts outside it.
  useEffect(() => {
    if (authority !== 'TENANT_ADMIN') {
      history.replace('/edges/instances');
    }
  }, [authority]);

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

  const chainsQuery = useQuery({
    queryKey: [
      ...SCOPE_RULE_CHAINS_KEY,
      edgeId,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () =>
      getEdgeRuleChains(edgeId as string, listUrlState.toPageLink(urlState)),
    enabled: !!edgeId && authority === 'TENANT_ADMIN',
    placeholderData: keepPreviousData,
  });
  const chains: Array<RuleChain> = chainsQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SCOPE_RULE_CHAINS_KEY });

  // ---- entry missing-related-chains check (the ngx blocking alert, antd-ized)
  const missingQuery = useQuery({
    queryKey: [...MISSING_KEY, edgeId],
    queryFn: () => getMissingToRelatedRuleChains(edgeId as string),
    enabled: !!edgeId && authority === 'TENANT_ADMIN',
    retry: false,
  });
  const [missingDismissed, setMissingDismissed] = useState(false);
  const missingChains = parseMissingRuleChains(missingQuery.data);

  // ---- selection + batch
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedChains = chains.filter((chain) =>
    selectedRowKeys.includes(chain.id.id),
  );
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const confirmUnassign = useEdgeUnassign<RuleChain>({
    batch,
    openBatch: () => setBatchOpen(true),
    clearSelection: () => setSelectedRowKeys([]),
    invalidate,
    texts: EDGE_SCOPE_UNASSIGN_TEXTS,
    labelOf: (chain) => chain.name,
    unassignOne: (chain) =>
      unassignEdgeRuleChain(edgeId as string, chain.id.id),
  });

  const runAssign = async (selected: Array<AssignEntitiesOption>) => {
    setAssignOpen(false);
    setBatchOpen(true);
    const summary = await batch.run(
      selected,
      (entry) => entry.label,
      (entry) => assignEdgeRuleChain(edgeId as string, entry.id),
    );
    void invalidate();
    void message.success(
      formatMessage({
        id: 'pages.edge.scope.toastAssigned',
        defaultMessage: 'Entities assigned to the edge.',
      }),
    );
    if (summary.failed > 0) {
      void message.warning(
        formatMessage(
          {
            id: 'pages.edge.batchResult',
            defaultMessage: '{ok} succeeded, {fail} failed.',
          },
          { ok: summary.ok, fail: summary.failed },
        ),
      );
    }
  };

  const confirmSetRoot = (chain: RuleChain) => {
    modal.confirm({
      title: formatMessage({
        id: 'pages.edge.rc.setRootTitle',
        defaultMessage: 'Set as root rule chain?',
      }),
      content: formatMessage({
        id: 'pages.edge.rc.setRootText',
        defaultMessage:
          'After the confirmation the rule chain becomes the root chain of this edge (the current root chain is replaced).',
      }),
      okText: formatMessage({
        id: 'pages.edge.rc.actionSetRoot',
        defaultMessage: 'Set as root',
      }),
      cancelText: formatMessage({
        id: 'pages.edge.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        try {
          await setEdgeRootRuleChain(edgeId as string, chain.id.id);
          void message.success(
            formatMessage({
              id: 'pages.edge.rc.toastSetRoot',
              defaultMessage:
                'The rule chain is now the root chain of this edge.',
            }),
          );
          void invalidate();
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      },
    });
  };

  // Candidate pool: the tenant's EDGE-type chains only (the only type the
  // backend accepts on this edge), via the rule-chain domain list.
  const loadRuleChainCandidates = (pageLink: PageLink) =>
    getRuleChains(pageLink, 'EDGE').then((page) => ({
      ...page,
      data: page.data.map<AssignEntitiesOption>((chain) => ({
        id: chain.id.id,
        label: chain.name,
      })),
    }));

  // biome-ignore lint/correctness/useExhaustiveDependencies: excluded row-action handlers take the row as an argument and read no reactive state (stable setters / batch runner only); the listed deps cover every value that shapes the rendered columns, edgeId included so unassign never binds a stale route param
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
      },
      {
        title: formatMessage({
          id: 'pages.edge.scope.columnRoot',
          defaultMessage: 'Root',
        }),
        dataIndex: 'root',
        width: 90,
        sorter: true,
        sortOrder: sortOrderFor('root'),
        render: (_, record) =>
          record.root === true ? (
            <Checkbox
              checked
              disabled
              data-testid={`rc-root-${record.id.id}`}
              aria-label={formatMessage({
                id: 'pages.edge.scope.columnRoot',
                defaultMessage: 'Root',
              })}
            />
          ) : (
            <Tag data-testid={`rc-root-${record.id.id}`}>-</Tag>
          ),
      },
      {
        valueType: 'option',
        width: 80,
        fixed: 'right',
        render: (_, record) => {
          const isRoot = record.root === true;
          return [
            <Dropdown
              key="more"
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'set-root',
                    // 根链禁再设根 (guard)
                    disabled: isRoot,
                    label: formatMessage({
                      id: 'pages.edge.rc.actionSetRoot',
                      defaultMessage: 'Set as root',
                    }),
                    onClick: () => confirmSetRoot(record),
                  },
                  {
                    key: 'unassign',
                    // 根链禁 unassign (guard)
                    disabled: isRoot,
                    danger: true,
                    label: formatMessage({
                      id: 'pages.edge.scope.actionUnassign',
                      defaultMessage: 'Unassign from edge',
                    }),
                    onClick: () => confirmUnassign([record]),
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
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection, edgeId]);

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

  if (authority !== 'TENANT_ADMIN') {
    return null;
  }

  return (
    <EdgeScopePageShell
      edgeId={edgeId}
      edgeName={nameQuery.data?.name}
      loadError={nameQuery.isError ? nameQuery.error : undefined}
      title={formatMessage({
        id: 'pages.edge.scope.ruleChainsTitle',
        defaultMessage: 'Rule chains',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.edge.scope.ruleChainsSearch',
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
          {selectedChains.length > 0 && (
            <>
              <Typography.Text type="secondary">
                {formatMessage(
                  {
                    id: 'pages.edge.selectedCount',
                    defaultMessage: '{count} selected',
                  },
                  { count: selectedChains.length },
                )}
              </Typography.Text>
              <Button onClick={() => confirmUnassign(selectedChains)}>
                {formatMessage({
                  id: 'pages.edge.scope.batchUnassign',
                  defaultMessage: 'Unassign selected',
                })}
              </Button>
            </>
          )}
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setAssignOpen(true)}
          >
            {formatMessage({
              id: 'pages.edge.scope.assignRuleChains',
              defaultMessage: 'Assign existing rule chains',
            })}
          </Button>
        </div>
      }
    >
      {missingChains.length > 0 && !missingDismissed && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          closable
          onClose={() => setMissingDismissed(true)}
          data-testid="rc-missing-alert"
          title={formatMessage({
            id: 'pages.edge.rc.missingAlertTitle',
            defaultMessage:
              'Some assigned rule chains reference rule chains that are not assigned to this edge',
          })}
          description={
            <ul className="m-0 list-disc pl-5">
              {missingChains.map((entry) => (
                <li key={entry.chain}>
                  {formatMessage(
                    {
                      id: 'pages.edge.rc.missingAlertItem',
                      defaultMessage: '"{chain}" is missing: {missing}',
                    },
                    {
                      chain: entry.chain,
                      missing: entry.missing.join(', '),
                    },
                  )}
                </li>
              ))}
            </ul>
          }
        />
      )}

      {chainsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.edge.scope.ruleChainsLoadFailed',
            defaultMessage: 'Failed to load rule chains',
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
                id: 'pages.edge.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.edge.scope.ruleChainsEmpty',
            defaultMessage: 'No rule chains on this edge',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          // 根链行禁批量 unassign：直接不可勾选
          getCheckboxProps: (record) => ({
            disabled: record.root === true,
          }),
        }}
      />

      <AssignEntitiesDialog
        open={assignOpen}
        title={formatMessage({
          id: 'pages.edge.scope.assignRuleChains',
          defaultMessage: 'Assign existing rule chains',
        })}
        loadCandidates={loadRuleChainCandidates}
        onClose={() => setAssignOpen(false)}
        onConfirm={(selected) => void runAssign(selected)}
      />
      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => {
          setBatchOpen(false);
          batch.reset();
        }}
      />
    </EdgeScopePageShell>
  );
}
