/**
 * DebugEventsTable — the shared DEBUG_RULE_NODE / DEBUG_RULE_CHAIN event
 * table (M8 wave-3 D). Column sets follow the ui-ngx event-table-config
 * DEBUG branches (L249+: time / server / direction(IN|OUT) / msgType /
 * relationType / data / metadata / error for nodes; time / server / message
 * / error for chains), the ui-ngx filter column sets
 * (msgDirectionType/msgType/relationType/dataSearch/metadataSearch/isError/
 * errorStr/server for nodes; message/isError/errorStr/server for chains),
 * and the two table actions: refresh + clear (POST /api/events/.../clear
 * with the CURRENT filter, then refetch from page 0).
 *
 * transport goes through services/tb/events.ts only (HTTP iron rule); error
 * rows render their error cell in the theme danger color (isError 标红).
 * `rowAction` lets a host inject a per-row action column (the node events
 * tab injects 用这条消息测试).
 */
import { ClearOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  App,
  Button,
  Checkbox,
  Input,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  clearEvents,
  type EventFilterBody,
  type EventInfo,
  getEventsByFilter,
} from '@/services/tb/events';
import type { EntityType } from '@/types/tb';

export type DebugEventType = 'DEBUG_RULE_NODE' | 'DEBUG_RULE_CHAIN';

/** Wire body fields the columns/filters/test action rely on. */
export interface DebugEventBody {
  /** Message direction IN|OUT (rule-node debug events, wire key `type`). */
  type?: string;
  msgId?: string;
  msgType?: string;
  relationType?: string;
  data?: string;
  dataType?: string;
  metadata?: string;
  error?: string;
  server?: string;
  /** Rule-chain debug events carry `message` instead. */
  message?: string;
  [key: string]: unknown;
}

export interface DebugEventFilterValues {
  server: string;
  isError: boolean;
  errorStr: string;
  msgDirectionType: string;
  msgType: string;
  relationType: string;
  dataSearch: string;
  metadataSearch: string;
  message: string;
}

export const EMPTY_DEBUG_FILTER: DebugEventFilterValues = {
  server: '',
  isError: false,
  errorStr: '',
  msgDirectionType: '',
  msgType: '',
  relationType: '',
  dataSearch: '',
  metadataSearch: '',
  message: '',
};

/** Whitespace-only filter values are dropped before POSTing. */
export function toEventFilterBody(
  eventType: DebugEventType,
  values: DebugEventFilterValues,
): EventFilterBody {
  const body: EventFilterBody = { eventType };
  const patch = body as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'boolean') {
      if (value) {
        patch[key] = value;
      }
      continue;
    }
    const text = value.trim();
    if (text) {
      patch[key] = text;
    }
  }
  return body;
}

export interface DebugEventsTableProps {
  entityId: { entityType: EntityType; id: string };
  tenantId: string;
  eventType: DebugEventType;
  /** Optional per-row action rendered as the last column (row body passed). */
  rowAction?: (body: DebugEventBody) => React.ReactNode;
  testIdPrefix?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function DebugEventsTable({
  entityId,
  tenantId,
  eventType,
  rowAction,
  testIdPrefix = 'debug-events',
}: DebugEventsTableProps) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const isNode = eventType === 'DEBUG_RULE_NODE';

  const [filter, setFilter] =
    useState<DebugEventFilterValues>(EMPTY_DEBUG_FILTER);
  const [appliedFilter, setAppliedFilter] =
    useState<DebugEventFilterValues>(EMPTY_DEBUG_FILTER);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const eventFilter = useMemo(
    () => toEventFilterBody(eventType, appliedFilter),
    [eventType, appliedFilter],
  );

  const eventsQuery = useQuery({
    queryKey: [
      'events',
      'debug',
      entityId.entityType,
      entityId.id,
      eventType,
      page,
      pageSize,
      appliedFilter,
    ],
    queryFn: () =>
      getEventsByFilter(entityId, tenantId, eventFilter, {
        pageSize,
        page: page - 1,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
    enabled: Boolean(tenantId),
    placeholderData: (previous) => previous,
  });

  const patchFilter = (patch: Partial<DebugEventFilterValues>) =>
    setFilter((current) => ({ ...current, ...patch }));

  const applyFilters = (next: DebugEventFilterValues = filter) => {
    setFilter(next);
    setAppliedFilter(next);
    setPage(1);
  };

  const confirmClear = () => {
    modal.confirm({
      title: formatMessage({
        id: 'editor.ruleChain.events.clearTitle',
        defaultMessage: 'Clear events?',
      }),
      content: formatMessage({
        id: 'editor.ruleChain.events.clearText',
        defaultMessage:
          'The debug events matching the current filter will be removed irreversibly.',
      }),
      okText: formatMessage({
        id: 'editor.ruleChain.events.clear',
        defaultMessage: 'Clear events',
      }),
      okButtonProps: { danger: true },
      cancelText: formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: async () => {
        try {
          await clearEvents(entityId, tenantId, eventFilter);
          setPage(1);
          await eventsQuery.refetch();
        } catch (error) {
          void message.error(
            `${formatMessage({
              id: 'editor.ruleChain.events.clearFailed',
              defaultMessage: 'Failed to clear events',
            })}: ${serverErrorText(error)}`,
          );
        }
      },
    });
  };

  const textColumn = (
    dataIndex: 'msgType' | 'relationType' | 'server',
    labelId: string,
    defaultMessage: string,
    width?: number,
  ) => ({
    title: formatMessage({ id: labelId, defaultMessage }),
    key: dataIndex,
    width,
    ellipsis: true,
    render: (_: unknown, record: EventInfo) =>
      (record.body as DebugEventBody)[dataIndex] || '-',
  });

  const contentButton = (
    key: 'data' | 'metadata' | 'error' | 'message',
    labelId: string,
    defaultMessage: string,
    danger = false,
  ) => ({
    title: formatMessage({ id: labelId, defaultMessage }),
    key,
    width: 90,
    render: (_: unknown, record: EventInfo) => {
      const content = (record.body as DebugEventBody)[key];
      if (typeof content !== 'string' || content.length === 0) {
        return '-';
      }
      return (
        <Typography.Text
          type={danger ? 'danger' : undefined}
          code={key !== 'error'}
          ellipsis
          style={{ maxWidth: 220 }}
          title={content}
        >
          {content}
        </Typography.Text>
      );
    },
  });

  const columns: ColumnsType<EventInfo> = [
    {
      title: formatMessage({
        id: 'editor.ruleChain.events.createdTime',
        defaultMessage: 'Event time',
      }),
      dataIndex: 'createdTime',
      width: 170,
      render: (ts: number) => (
        <span className="tabular-nums">
          {dayjs(ts).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    textColumn('server', 'editor.ruleChain.events.server', 'Server', 110),
    ...(isNode
      ? [
          {
            title: formatMessage({
              id: 'editor.ruleChain.events.direction',
              defaultMessage: 'Direction',
            }),
            key: 'direction',
            width: 80,
            render: (_: unknown, record: EventInfo) =>
              (record.body as DebugEventBody).type || '-',
          },
          textColumn(
            'msgType',
            'editor.ruleChain.events.msgType',
            'Message type',
            160,
          ),
          textColumn(
            'relationType',
            'editor.ruleChain.events.relationType',
            'Relation type',
            110,
          ),
          contentButton('data', 'editor.ruleChain.events.data', 'Data'),
          contentButton(
            'metadata',
            'editor.ruleChain.events.metadata',
            'Metadata',
          ),
          contentButton(
            'error',
            'editor.ruleChain.events.error',
            'Error',
            true,
          ),
        ]
      : [
          contentButton(
            'message',
            'editor.ruleChain.events.message',
            'Message',
          ),
          contentButton(
            'error',
            'editor.ruleChain.events.error',
            'Error',
            true,
          ),
        ]),
    ...(rowAction
      ? [
          {
            title: '',
            key: 'rowAction',
            width: 60,
            render: (_: unknown, record: { body: DebugEventBody }) =>
              rowAction(record.body as DebugEventBody),
          },
        ]
      : []),
  ];

  const filterInput = (
    key: keyof DebugEventFilterValues,
    labelId: string,
    defaultMessage: string,
    width = 150,
  ) => (
    <Input
      size="small"
      allowClear
      style={{ width }}
      placeholder={formatMessage({ id: labelId, defaultMessage })}
      value={filter[key] as string}
      onChange={(event) => patchFilter({ [key]: event.target.value })}
      onPressEnter={() => applyFilters()}
      data-testid={`${testIdPrefix}-filter-${key}`}
    />
  );

  return (
    <div className="flex flex-col gap-2">
      <Space wrap size={4} data-testid={`${testIdPrefix}-filters`}>
        {filterInput(
          'server',
          'editor.ruleChain.events.filter.server',
          'Server',
          120,
        )}
        {isNode && (
          <>
            <Select
              size="small"
              allowClear
              style={{ width: 110 }}
              placeholder={formatMessage({
                id: 'editor.ruleChain.events.filter.msgDirectionType',
                defaultMessage: 'Direction (IN/OUT)',
              })}
              value={
                (filter.msgDirectionType || undefined) as
                  | 'IN'
                  | 'OUT'
                  | undefined
              }
              options={[
                { value: 'IN', label: 'IN' },
                { value: 'OUT', label: 'OUT' },
              ]}
              onChange={(value) =>
                patchFilter({ msgDirectionType: value ?? '' })
              }
              data-testid={`${testIdPrefix}-filter-direction`}
            />
            {filterInput(
              'msgType',
              'editor.ruleChain.events.filter.msgType',
              'Message type',
            )}
            {filterInput(
              'relationType',
              'editor.ruleChain.events.filter.relationType',
              'Relation type',
              120,
            )}
            {filterInput(
              'dataSearch',
              'editor.ruleChain.events.filter.dataSearch',
              'Data',
            )}
            {filterInput(
              'metadataSearch',
              'editor.ruleChain.events.filter.metadataSearch',
              'Metadata',
            )}
          </>
        )}
        {!isNode &&
          filterInput(
            'message',
            'editor.ruleChain.events.filter.message',
            'Message',
          )}
        <Tooltip
          title={formatMessage({
            id: 'editor.ruleChain.events.filter.isError',
            defaultMessage: 'Errors only',
          })}
        >
          <Checkbox
            checked={filter.isError}
            onChange={(event) => patchFilter({ isError: event.target.checked })}
            data-testid={`${testIdPrefix}-filter-is-error`}
          >
            {formatMessage({
              id: 'editor.ruleChain.events.error',
              defaultMessage: 'Error',
            })}
          </Checkbox>
        </Tooltip>
        {filterInput(
          'errorStr',
          'editor.ruleChain.events.filter.errorStr',
          'Error',
          120,
        )}
        <Button
          size="small"
          type="primary"
          ghost
          onClick={() => applyFilters()}
          data-testid={`${testIdPrefix}-filters-apply`}
        >
          {formatMessage({
            id: 'editor.ruleChain.events.filters',
            defaultMessage: 'Filters',
          })}
        </Button>
        <Button
          size="small"
          onClick={() => applyFilters(EMPTY_DEBUG_FILTER)}
          data-testid={`${testIdPrefix}-filters-reset`}
        >
          {formatMessage({
            id: 'editor.ruleChain.events.filtersReset',
            defaultMessage: 'Reset',
          })}
        </Button>
      </Space>

      <Space wrap size={4}>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => void eventsQuery.refetch()}
          data-testid={`${testIdPrefix}-refresh`}
        >
          {formatMessage({
            id: 'editor.ruleChain.events.refresh',
            defaultMessage: 'Refresh',
          })}
        </Button>
        <Button
          size="small"
          danger
          icon={<ClearOutlined />}
          onClick={confirmClear}
          data-testid={`${testIdPrefix}-clear`}
        >
          {formatMessage({
            id: 'editor.ruleChain.events.clear',
            defaultMessage: 'Clear events',
          })}
        </Button>
      </Space>

      {eventsQuery.isError && (
        <Typography.Text type="danger" data-testid={`${testIdPrefix}-error`}>
          {formatMessage({
            id: 'editor.ruleChain.events.loadFailed',
            defaultMessage: 'Failed to load events',
          })}
          {': '}
          {serverErrorText(eventsQuery.error)}
        </Typography.Text>
      )}

      <Table
        rowKey={(record) => record.id.id}
        size="small"
        columns={columns}
        dataSource={eventsQuery.data?.data ?? []}
        loading={eventsQuery.isPending}
        data-testid={`${testIdPrefix}-table`}
        pagination={{
          current: page,
          pageSize,
          total: eventsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
        expandable={{
          expandedRowRender: (record) => (
            <pre className="max-h-72 overflow-auto text-xs">
              {JSON.stringify(record.body, null, 2)}
            </pre>
          ),
          rowExpandable: (record) => Object.keys(record.body ?? {}).length > 0,
        }}
        locale={{
          emptyText: (
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'editor.ruleChain.events.empty',
                defaultMessage: 'No events',
              })}
            </Typography.Text>
          ),
        }}
      />
    </div>
  );
}
