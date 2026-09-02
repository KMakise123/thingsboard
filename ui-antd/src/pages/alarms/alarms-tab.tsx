/**
 * Global alarms tab (spec 3.6): full filter set + live AlarmData WS stream
 * + batch actions. Data channel = two entityType subscriptions (DEVICE +
 * ASSET) merged client-side — see components/alarms/use-global-alarm-data.ts
 * for the entityFilter decision. The REST /v2/alarms page is only the
 * one-way seed. Filters/page live in the URL (bookmarkable).
 */
import {
  CheckOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useAlarmColumns } from '@/components/alarms/alarm-columns';
import {
  type GlobalAlarmFilter,
  useGlobalAlarmData,
} from '@/components/alarms/use-global-alarm-data';
import AlarmDetailsModal from '@/components/entities/detail/AlarmDetailsModal';
import type { AlarmRow } from '@/components/entities/detail/alarm-format';
import { serverErrorText } from '@/components/entities/server-error-text';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { readAuthorityInfo } from '@/components/shared/use-authority';
import { useBatchRun } from '@/components/shared/use-batch-run';
import { tokenStore } from '@/core/auth/token-store';
import {
  type AlarmSearchStatus,
  ackAlarm,
  assignAlarm,
  clearAlarm,
  deleteAlarm,
  getAlarms,
  getAlarmTypes,
  unassignAlarm,
} from '@/services/tb/alarm';
import { getUsers } from '@/services/tb/user';
import { type AlarmData, AlarmSeverity, EntityType } from '@/types/tb';
import { type AlarmsPageUrlState, TIMEWINDOW_PRESETS } from './url-state';

const SEARCH_DEBOUNCE_MS = 400;
const CHANNEL_PAGE_SIZE = 100;

/** Detail-page route for an alarm originator (unknown types = plain text). */
function originatorHref(originatorType: string, originatorId: string) {
  switch (originatorType) {
    case EntityType.DEVICE:
      return `/devices/${originatorId}`;
    case EntityType.ASSET:
      return `/assets/${originatorId}`;
    case EntityType.ENTITY_VIEW:
      return `/entityViews/${originatorId}`;
    case EntityType.CUSTOMER:
      return `/customers/${originatorId}`;
    default:
      return undefined;
  }
}

/** Confirm options for one lifecycle batch action. */
interface BatchConfirm {
  targets: Array<AlarmRow>;
  /** Filter applied first (drop already-ack'ed / already-cleared rows). */
  filter: (alarm: AlarmRow) => boolean;
  /** Message when nothing is left after the filter (ui-ngx parity). */
  alreadyKey: string;
  alreadyDefault: string;
  title: string;
  text: string;
  okText: string;
  danger: boolean;
  action: (alarmId: string) => Promise<unknown>;
  successKey: string;
  successDefault: string;
}

export default function AlarmsTab({
  state,
  patch,
}: {
  state: AlarmsPageUrlState;
  patch: (partial: Partial<AlarmsPageUrlState>) => void;
}) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();

  const { authority, customerId: cuCustomerId } = useMemo(
    readAuthorityInfo,
    [],
  );
  const myUserId = useMemo(() => tokenStore.decodeTokenClaims()?.userId, []);

  // ui-ngx alarm-table-config write boundary: CU may only act on alarms of
  // their own customer (propagated alarms from elsewhere stay read-only).
  const canWriteAlarm = useMemo(() => {
    if (authority !== 'CUSTOMER_USER') {
      return undefined;
    }
    return (alarm: AlarmRow) =>
      !!cuCustomerId && alarm.customerId?.id === cuCustomerId;
  }, [authority, cuCustomerId]);

  // ---- filter change helper (every filter resets the page) ----
  const patchFilter = (partial: Partial<AlarmsPageUrlState>) =>
    patch({ ...partial, page: 1 });

  // ---- text search (server-side, debounced; URL carries the committed value)
  const [searchInput, setSearchInput] = useState(state.textSearch);
  useEffect(() => {
    setSearchInput(state.textSearch);
  }, [state.textSearch]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== state.textSearch) {
        patch({ textSearch: next, page: 1 });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput, patch, state.textSearch]);

  // ---- filter option sources ----
  const alarmTypesQuery = useQuery({
    queryKey: ['alarm-types'],
    queryFn: getAlarmTypes,
    staleTime: 5 * 60_000,
  });
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const assigneeUsersQuery = useQuery({
    queryKey: ['alarm-assignee-filter-users', assigneeSearch],
    queryFn: () =>
      getUsers({
        pageSize: 50,
        page: 0,
        textSearch: assigneeSearch || undefined,
        sortOrder: { property: 'email', direction: 'ASC' },
      }),
    staleTime: 60_000,
  });

  // ---- data: REST seed + dual-channel WS stream ----
  const assigneeId = state.assigneeId === 'me' ? myUserId : state.assigneeId;
  const timeWindowMs = TIMEWINDOW_PRESETS.find(
    (preset) => preset.id === state.tw,
  )?.ms;
  const wsFilter: GlobalAlarmFilter = {
    statusList: state.statusList,
    severityList: state.severityList,
    typeList: state.typeList,
    assigneeId,
    searchPropagatedAlarms: state.searchPropagatedAlarms,
    textSearch: state.textSearch || undefined,
    timeWindowMs,
  };

  const seedQuery = useQuery({
    queryKey: [
      'alarms',
      'global-seed',
      state.statusList.join(','),
      state.severityList.join(','),
      state.typeList.join(','),
      assigneeId ?? '',
      state.textSearch,
    ],
    queryFn: () =>
      getAlarms(
        {
          statusList: state.statusList,
          severityList: state.severityList,
          typeList: state.typeList,
          assigneeId,
        },
        {
          pageSize: CHANNEL_PAGE_SIZE,
          page: 0,
          textSearch: state.textSearch || undefined,
          sortOrder: { property: 'createdTime', direction: 'DESC' },
        },
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const { rows, status } = useGlobalAlarmData({
    filter: wsFilter,
    pageSize: CHANNEL_PAGE_SIZE,
    seed: seedQuery.data?.data as Array<AlarmData> | undefined,
  });

  // ---- batch plumbing (ui-ngx group actions: confirm first, fan out after) ----
  const [selectedIds, setSelectedIds] = useState<Array<string>>([]);
  const selectedAlarms = rows.filter((row) => selectedIds.includes(row.id.id));
  const writableSelection = canWriteAlarm
    ? selectedAlarms.filter(canWriteAlarm)
    : selectedAlarms;
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  const runBatch = async (
    alarms: Array<AlarmRow>,
    action: (alarmId: string) => Promise<unknown>,
    successKey: string,
    successDefault: string,
  ) => {
    setBatchOpen(true);
    const summary = await batch.run(
      alarms,
      (alarm) => alarm.type,
      (alarm) => action(alarm.id.id),
    );
    setSelectedIds([]);
    if (summary.failed > 0) {
      void message.warning(
        formatMessage(
          {
            id: 'pages.alarms.batchPartial',
            defaultMessage: '{ok} succeeded, {fail} failed.',
          },
          { ok: summary.ok, fail: summary.failed },
        ),
      );
    } else {
      void message.success(
        formatMessage({ id: successKey, defaultMessage: successDefault }),
      );
    }
  };

  const confirmBatch = (options: BatchConfirm) => {
    const targets = options.targets.filter(options.filter);
    if (options.targets.length > 0 && targets.length === 0) {
      void message.info(
        formatMessage({
          id: options.alreadyKey,
          defaultMessage: options.alreadyDefault,
        }),
      );
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.alarms.batchCountTitle',
          defaultMessage:
            '{action} {count, plural, =1 {1 alarm} other {# alarms}}?',
        },
        { action: options.title, count: targets.length },
      ),
      content: options.text,
      okButtonProps: options.danger ? { danger: true } : undefined,
      okText: options.okText,
      cancelText: formatMessage({
        id: 'pages.alarms.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () =>
        runBatch(
          targets,
          options.action,
          options.successKey,
          options.successDefault,
        ),
    });
  };

  const confirmDelete = (alarms: Array<AlarmRow>) => {
    if (alarms.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.alarms.deleteTitle',
          defaultMessage:
            'Delete {count, plural, =1 {1 alarm} other {# alarms}}?',
        },
        { count: alarms.length },
      ),
      content: formatMessage({
        id: 'pages.alarms.deleteText',
        defaultMessage:
          'Be careful, after the confirmation the alarm(s) will become unrecoverable.',
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
      onOk: () =>
        runBatch(
          alarms,
          deleteAlarm,
          'pages.alarms.toastDeleted',
          'Alarm deleted.',
        ),
    });
  };

  // ---- columns + row handlers ----
  const [detailsAlarm, setDetailsAlarm] = useState<AlarmRow | null>(null);
  const columns = useAlarmColumns({
    readOnly: false,
    canWriteRow: canWriteAlarm,
    showOriginator: true,
    originatorHref: (row) =>
      originatorHref(row.originator.entityType, row.originator.id),
    handlers: {
      onDetails: (row) => setDetailsAlarm(row),
      onAck: (row) =>
        ackAlarm(row.id.id).catch(
          (error) => void message.error(serverErrorText(error)),
        ),
      onClear: (row) =>
        clearAlarm(row.id.id).catch(
          (error) => void message.error(serverErrorText(error)),
        ),
      onDelete: (row) => confirmDelete([row]),
      onAssign: (row, nextAssignee) =>
        (nextAssignee
          ? assignAlarm(row.id.id, nextAssignee)
          : unassignAlarm(row.id.id)
        ).catch((error) => void message.error(serverErrorText(error))),
    },
  });

  const ackLabel = formatMessage({
    id: 'pages.alarms.ack',
    defaultMessage: 'Acknowledge',
  });
  const clearLabel = formatMessage({
    id: 'pages.alarms.clear',
    defaultMessage: 'Clear',
  });

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <Select
          mode="multiple"
          allowClear
          className="min-w-44"
          value={state.statusList}
          placeholder={formatMessage({
            id: 'pages.alarms.filter.status',
            defaultMessage: 'Alarm status',
          })}
          maxTagCount="responsive"
          options={(
            ['ACTIVE', 'UNACK', 'ACK', 'CLEARED'] as Array<AlarmSearchStatus>
          ).map((value) => ({
            value,
            label: formatMessage({
              id: `pages.devices.detail.alarmFilter.${value}`,
              defaultMessage: value,
            }),
          }))}
          onChange={(values) =>
            patchFilter({ statusList: values as Array<AlarmSearchStatus> })
          }
        />
        <Select
          mode="multiple"
          allowClear
          className="min-w-40"
          value={state.severityList}
          placeholder={formatMessage({
            id: 'pages.alarms.filter.severity',
            defaultMessage: 'Severity',
          })}
          maxTagCount="responsive"
          options={Object.values(AlarmSeverity).map((value) => ({
            value,
            label: formatMessage({
              id: `pages.devices.detail.alarmSeverity.${value}`,
              defaultMessage: value,
            }),
          }))}
          onChange={(values) =>
            patchFilter({ severityList: values as Array<AlarmSeverity> })
          }
        />
        <Select
          mode="multiple"
          allowClear
          showSearch
          className="min-w-40"
          filterOption={(input, option) =>
            String(option?.label ?? '')
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          value={state.typeList}
          placeholder={formatMessage({
            id: 'pages.alarms.filter.type',
            defaultMessage: 'Alarm type',
          })}
          maxTagCount="responsive"
          loading={alarmTypesQuery.isPending}
          options={(alarmTypesQuery.data?.data ?? []).map((subtype) => ({
            value: subtype.type,
            label: subtype.type,
          }))}
          onChange={(values) => patchFilter({ typeList: values })}
        />
        <Select
          allowClear
          showSearch
          className="min-w-36"
          filterOption={false}
          value={state.assigneeId}
          onSearch={setAssigneeSearch}
          loading={assigneeUsersQuery.isPending}
          placeholder={formatMessage({
            id: 'pages.alarms.filter.assignee',
            defaultMessage: 'Assignee',
          })}
          options={[
            ...(myUserId
              ? [
                  {
                    value: 'me',
                    label: formatMessage({
                      id: 'pages.alarms.filter.assignedToMe',
                      defaultMessage: 'Assigned to me',
                    }),
                  },
                ]
              : []),
            ...(assigneeUsersQuery.data?.data ?? []).map((user) => ({
              value: user.id.id,
              label:
                [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                user.email,
            })),
          ]}
          onChange={(value) => patchFilter({ assigneeId: value || undefined })}
        />
        <Space.Compact>
          <Select
            className="w-32"
            value={state.tw}
            options={[
              {
                value: 'all',
                label: formatMessage({
                  id: 'pages.alarms.twAll',
                  defaultMessage: 'For all time',
                }),
              },
              ...TIMEWINDOW_PRESETS.map((preset) => ({
                value: preset.id,
                label: formatMessage({
                  id: `pages.alarms.tw.${preset.id}`,
                  defaultMessage: preset.id,
                }),
              })),
            ]}
            onChange={(value) => patchFilter({ tw: value })}
          />
        </Space.Compact>
        <Switch
          checked={state.searchPropagatedAlarms}
          onChange={(checked) =>
            patchFilter({ searchPropagatedAlarms: checked })
          }
        />
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'pages.alarms.filter.propagated',
            defaultMessage: 'Search propagated alarms',
          })}
        </Typography.Text>
        <Input.Search
          allowClear
          className="w-56"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={formatMessage({
            id: 'pages.alarms.search',
            defaultMessage: 'Search alarms',
          })}
        />
        <Tag color={status === 'open' ? 'processing' : 'warning'}>
          {formatMessage({
            id: 'pages.alarms.wsStatus',
            defaultMessage: 'Live updates',
          })}
          : {status}
        </Tag>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void seedQuery.refetch()}
        >
          {formatMessage({
            id: 'pages.alarms.refresh',
            defaultMessage: 'Refresh',
          })}
        </Button>
        <div className="flex-1" />
        {writableSelection.length > 0 && (
          <>
            <Typography.Text type="secondary">
              {formatMessage(
                {
                  id: 'pages.alarms.selectedCount',
                  defaultMessage: '{count} selected',
                },
                { count: writableSelection.length },
              )}
            </Typography.Text>
            <Button
              icon={<CheckOutlined />}
              onClick={() =>
                confirmBatch({
                  targets: writableSelection,
                  filter: (alarm) => !alarm.acknowledged,
                  alreadyKey: 'pages.alarms.alreadyAcked',
                  alreadyDefault: 'Selected alarms are already acknowledged.',
                  title: ackLabel,
                  text: formatMessage({
                    id: 'pages.alarms.ackText',
                    defaultMessage:
                      'Are you sure you want to acknowledge the selected alarms?',
                  }),
                  okText: ackLabel,
                  danger: false,
                  action: ackAlarm,
                  successKey: 'pages.alarms.toastAcked',
                  successDefault: 'Alarms acknowledged.',
                })
              }
            >
              {ackLabel}
            </Button>
            <Button
              onClick={() =>
                confirmBatch({
                  targets: writableSelection,
                  filter: (alarm) => !alarm.cleared,
                  alreadyKey: 'pages.alarms.alreadyCleared',
                  alreadyDefault: 'Selected alarms are already cleared.',
                  title: clearLabel,
                  text: formatMessage({
                    id: 'pages.alarms.clearText',
                    defaultMessage:
                      'Are you sure you want to clear the selected alarms?',
                  }),
                  okText: clearLabel,
                  danger: false,
                  action: clearAlarm,
                  successKey: 'pages.alarms.toastCleared',
                  successDefault: 'Alarms cleared.',
                })
              }
            >
              {clearLabel}
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(writableSelection)}
            >
              {formatMessage({
                id: 'pages.alarms.delete',
                defaultMessage: 'Delete',
              })}
            </Button>
          </>
        )}
      </Space>

      {seedQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.alarms.loadFailed',
            defaultMessage: 'Failed to load alarms',
          })}
          description={serverErrorText(seedQuery.error)}
        />
      )}

      <ProTable<AlarmRow>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns as ProColumns<AlarmRow>[]}
        dataSource={rows}
        loading={seedQuery.isPending && rows.length === 0}
        search={false}
        options={false}
        pagination={{
          current: state.page,
          pageSize: state.pageSize,
          total: rows.length,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              { id: 'pages.alarms.total', defaultMessage: '{count} total' },
              { count: total },
            ),
        }}
        onChange={(pagination) => {
          if (pagination.current && pagination.pageSize) {
            patch({
              page: pagination.current,
              pageSize: pagination.pageSize,
            });
          }
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.alarms.empty',
            defaultMessage: 'No alarms found',
          }),
        }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as Array<string>),
        }}
      />

      <AlarmDetailsModal
        open={!!detailsAlarm}
        alarm={detailsAlarm}
        readOnly={false}
        canWriteAlarm={canWriteAlarm}
        allowAssign
        onClose={() => setDetailsAlarm(null)}
      />

      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => {
          setBatchOpen(false);
          batch.reset();
        }}
      />
    </div>
  );
}
