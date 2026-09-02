/**
 * Alarms tab panel (spec 3.3 `alarms` / 3.6 entity-tab edition).
 *
 * Data channel = core/ws ALARM_DATA subscription (never REST polling): a
 * single-entity filter pre-fills the device scope, the REST v2 page is only
 * the one-way seed. New/updated alarms render as the server pushes them
 * (≤5s acceptance). Status filter chips re-issue the query on the same
 * subscription. Actions: ack / clear (single + batch), delete (single +
 * batch with confirm), details dialog, assignee reassign — TA only (CU
 * reads). Columns and the details dialog come from the shared alarm core in
 * components/alarms (spec 3.6: one alarm cell/column core across the entity
 * tab and the global page).
 */
import { CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useAlarmColumns } from '@/components/alarms/alarm-columns';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  type AlarmSearchStatus,
  ackAlarm,
  assignAlarm,
  clearAlarm,
  deleteAlarm,
  getEntityAlarms,
  unassignAlarm,
} from '@/services/tb/alarm';
import type { AlarmData, EntityId } from '@/types/tb';
import AlarmDetailsModal from './AlarmDetailsModal';
import type { AlarmRow } from './alarm-format';
import { useAlarmDataSubscription } from './use-alarm-data-subscription';

type StatusFilterId = 'any' | AlarmSearchStatus;

const STATUS_FILTERS: Array<{
  id: StatusFilterId;
  list?: Array<AlarmSearchStatus>;
}> = [
  { id: 'any' },
  { id: 'ACTIVE', list: ['ACTIVE'] },
  { id: 'UNACK', list: ['UNACK'] },
  { id: 'ACK', list: ['ACK'] },
  { id: 'CLEARED', list: ['CLEARED'] },
];

const ALARMS_SEED_KEY = ['alarms'] as const;

export default function AlarmsPanel({
  entityId,
  readOnly,
}: {
  /** Polymorphic entity reference (DEVICE / ASSET / ENTITY_VIEW / ...). */
  entityId: EntityId;
  readOnly: boolean;
}) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilterId>('any');
  const [selectedIds, setSelectedIds] = useState<Array<string>>([]);
  const [detailsAlarm, setDetailsAlarm] = useState<AlarmRow | null>(null);

  const statusList = STATUS_FILTERS.find(
    (filter) => filter.id === statusFilter,
  )?.list;

  const seedQuery = useQuery({
    queryKey: [
      ...ALARMS_SEED_KEY,
      entityId.entityType,
      entityId.id,
      statusFilter,
    ],
    queryFn: () =>
      getEntityAlarms(
        entityId,
        { statusList },
        {
          pageSize: 100,
          page: 0,
          sortOrder: { property: 'createdTime', direction: 'DESC' },
        },
      ),
  });
  const seed = seedQuery.data?.data;

  const { data: rows, status } = useAlarmDataSubscription({
    entityId,
    statusList,
    // AlarmData extends AlarmInfo; the assignee join rides along untouched.
    seed: seed as Array<AlarmData> | undefined,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ALARMS_SEED_KEY });

  const runForAll = async (
    alarms: Array<AlarmRow>,
    action: (alarmId: string) => Promise<unknown>,
    successKey: string,
  ) => {
    let failed = 0;
    for (const alarm of alarms) {
      try {
        await action(alarm.id.id);
      } catch {
        failed += 1;
      }
    }
    if (failed > 0) {
      void message.warning(
        formatMessage(
          {
            id: 'pages.devices.detail.alarmBatchPartial',
            defaultMessage: '{ok} succeeded, {fail} failed.',
          },
          { ok: alarms.length - failed, fail: failed },
        ),
      );
    } else {
      void message.success(formatMessage({ id: successKey }));
    }
    setSelectedIds([]);
    void invalidate();
  };

  const ackMutation = useMutation({
    mutationFn: (alarmId: string) => ackAlarm(alarmId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.alarmAcked',
          defaultMessage: 'Alarm acknowledged.',
        }),
      );
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });
  const clearMutation = useMutation({
    mutationFn: (alarmId: string) => clearAlarm(alarmId),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.alarmCleared',
          defaultMessage: 'Alarm cleared.',
        }),
      );
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const confirmDelete = (alarms: Array<AlarmRow>) => {
    if (alarms.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.devices.detail.alarmDeleteManyTitle',
          defaultMessage:
            'Delete {count, plural, =1 {1 alarm} other {# alarms}}?',
        },
        { count: alarms.length },
      ),
      content: formatMessage({
        id: 'pages.devices.detail.alarmDeleteText',
        defaultMessage:
          'After the confirmation the alarm(s) will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.devices.detail.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.devices.detail.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () =>
        runForAll(alarms, deleteAlarm, 'pages.devices.detail.alarmDeleted'),
    });
  };

  const assign = async (alarmId: string, assigneeId: string | null) => {
    try {
      await (assigneeId
        ? assignAlarm(alarmId, assigneeId)
        : unassignAlarm(alarmId));
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const columns = useAlarmColumns({
    readOnly,
    handlers: {
      onDetails: (row) => setDetailsAlarm(row),
      onAck: (row) => ackMutation.mutate(row.id.id),
      onClear: (row) => clearMutation.mutate(row.id.id),
      onDelete: (row) => confirmDelete([row]),
      onAssign: (row, assigneeId) => void assign(row.id.id, assigneeId),
    },
  });

  const selectedAlarms = rows.filter((row) => selectedIds.includes(row.id.id));

  return (
    <div className="flex flex-col gap-3">
      <Space wrap>
        <Segmented
          value={statusFilter}
          onChange={(next) => {
            setStatusFilter(next as StatusFilterId);
            setSelectedIds([]);
          }}
          options={STATUS_FILTERS.map((filter) => ({
            value: filter.id,
            label: formatMessage({
              id: `pages.devices.detail.alarmFilter.${filter.id}`,
              defaultMessage: filter.id,
            }),
          }))}
        />
        <Tag color={status === 'open' ? 'processing' : 'warning'}>
          {formatMessage({
            id: 'pages.devices.detail.wsStatus',
            defaultMessage: 'Live updates',
          })}
          : {status}
        </Tag>
        <div className="flex-1" />
        {!readOnly && selectedAlarms.length > 0 && (
          <>
            <Typography.Text type="secondary">
              {formatMessage(
                {
                  id: 'pages.devices.detail.selectedCount',
                  defaultMessage: '{count} selected',
                },
                { count: selectedAlarms.length },
              )}
            </Typography.Text>
            <Button
              icon={<CheckOutlined />}
              onClick={() =>
                runForAll(
                  selectedAlarms.filter((row) => !row.acknowledged),
                  ackAlarm,
                  'pages.devices.detail.alarmAcked',
                )
              }
            >
              {formatMessage({
                id: 'pages.devices.detail.alarmAck',
                defaultMessage: 'Acknowledge',
              })}
            </Button>
            <Button
              onClick={() =>
                runForAll(
                  selectedAlarms.filter((row) => !row.cleared),
                  clearAlarm,
                  'pages.devices.detail.alarmCleared',
                )
              }
            >
              {formatMessage({
                id: 'pages.devices.detail.alarmClear',
                defaultMessage: 'Clear',
              })}
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(selectedAlarms)}
            >
              {formatMessage({
                id: 'pages.devices.detail.delete',
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
            id: 'pages.devices.detail.alarmLoadFailed',
            defaultMessage: 'Failed to load alarms',
          })}
          description={serverErrorText(seedQuery.error)}
        />
      )}

      <Table<AlarmRow>
        rowKey={(record) => record.id.id}
        size="small"
        columns={columns}
        dataSource={rows}
        loading={seedQuery.isPending && rows.length === 0}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowSelection={
          readOnly
            ? undefined
            : {
                selectedRowKeys: selectedIds,
                onChange: (keys) => setSelectedIds(keys as Array<string>),
              }
        }
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.detail.alarmEmpty',
            defaultMessage: 'No alarms',
          }),
        }}
      />

      <AlarmDetailsModal
        open={!!detailsAlarm}
        alarm={detailsAlarm}
        readOnly={readOnly}
        onClose={() => setDetailsAlarm(null)}
        allowAssign={!readOnly}
      />
    </div>
  );
}
