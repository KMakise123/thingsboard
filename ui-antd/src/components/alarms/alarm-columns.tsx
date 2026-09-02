/**
 * Shared alarm table columns (spec 3.3 entity tab + 3.6 global page).
 *
 * One column factory so the entity-scoped AlarmsPanel and the global alarms
 * page render the same cells (ui-ngx alarm-table-config order: createdTime /
 * originator / type / severity / assignee / status / actions). The severity,
 * status and label strings reuse the alarm keys that shipped with the device
 * detail wave (pages.devices.detail.*) — they are the de-facto alarm-domain
 * strings and keep the two consumers word-identical.
 *
 * Per-row write gating: readOnly turns the whole action set off; canWriteRow
 * additionally implements the CU boundary from ui-ngx alarm-table-config
 * (CUSTOMER_USER may only ack/clear/assign alarms owned by their customer).
 */
import { CheckOutlined, MoreOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Dropdown, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useIntl } from 'react-intl';
import {
  ALARM_SEVERITY_TAG,
  ALARM_STATUS_TAG,
  type AlarmRow,
} from '@/components/entities/detail/alarm-format';
import { AlarmAssigneeCell } from './alarm-assignee-cell';

export interface AlarmColumnHandlers {
  onDetails: (row: AlarmRow) => void;
  onAck?: (row: AlarmRow) => void;
  onClear?: (row: AlarmRow) => void;
  onDelete?: (row: AlarmRow) => void;
  /** Present = the assignee cell becomes a reassign popover. */
  onAssign?: (row: AlarmRow, assigneeId: string | null) => void;
}

export interface AlarmColumnsOptions {
  readOnly: boolean;
  /** Extra per-row gate on top of !readOnly (CU same-customer boundary). */
  canWriteRow?: (row: AlarmRow) => boolean;
  /** Show the originator column (global page); entity tabs leave it off. */
  showOriginator?: boolean;
  /** Link target for the originator cell; undefined renders plain text. */
  originatorHref?: (row: AlarmRow) => string | undefined;
  handlers: AlarmColumnHandlers;
}

export function useAlarmColumns(
  options: AlarmColumnsOptions,
): ColumnsType<AlarmRow> {
  const { formatMessage } = useIntl();
  const { readOnly, canWriteRow, showOriginator, originatorHref, handlers } =
    options;
  // Local consts: the action closures below need stable narrowing (TS won't
  // narrow a property access through the JSX callbacks).
  const { onDetails, onAck, onClear, onDelete, onAssign } = handlers;
  const canWrite = (row: AlarmRow) =>
    !readOnly && (canWriteRow ? canWriteRow(row) : true);

  const columns: ColumnsType<AlarmRow> = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.alarmCreatedTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 170,
      render: (ts: number) => (
        <span className="tabular-nums">
          {dayjs(ts).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
  ];

  if (showOriginator) {
    columns.push({
      title: formatMessage({
        id: 'pages.alarms.column.originator',
        defaultMessage: 'Originator',
      }),
      dataIndex: 'originatorName',
      ellipsis: true,
      render: (_, row) => {
        const name = row.originatorName || row.originator?.entityType || '-';
        const href = originatorHref?.(row);
        return href ? (
          <Typography.Link onClick={() => history.push(href)}>
            {name}
          </Typography.Link>
        ) : (
          name
        );
      },
    });
  }

  columns.push(
    {
      title: formatMessage({
        id: 'pages.devices.detail.alarmType',
        defaultMessage: 'Type',
      }),
      dataIndex: 'type',
      ellipsis: true,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.alarmSeverity',
        defaultMessage: 'Severity',
      }),
      dataIndex: 'severity',
      width: 110,
      render: (severity: AlarmRow['severity']) => (
        <Tag color={ALARM_SEVERITY_TAG[severity]}>
          {formatMessage({
            id: `pages.devices.detail.alarmSeverity.${severity}`,
            defaultMessage: severity,
          })}
        </Tag>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.alarmAssignee',
        defaultMessage: 'Assignee',
      }),
      dataIndex: 'assignee',
      width: 160,
      ellipsis: true,
      render: (_, row) => (
        <AlarmAssigneeCell
          alarm={row}
          onAssign={
            canWrite(row) && onAssign
              ? (assigneeId) => onAssign(row, assigneeId)
              : undefined
          }
        />
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.alarmStatus',
        defaultMessage: 'Status',
      }),
      dataIndex: 'status',
      width: 130,
      render: (statusValue: AlarmRow['status']) => (
        <Tag color={ALARM_STATUS_TAG[statusValue]}>
          {formatMessage({
            id: `pages.devices.detail.alarmStatus.${statusValue}`,
            defaultMessage: statusValue,
          })}
        </Tag>
      ),
    },
  );

  if (!readOnly) {
    columns.push({
      title: formatMessage({
        id: 'pages.devices.detail.actions',
        defaultMessage: 'Actions',
      }),
      key: 'actions',
      width: 130,
      render: (_, row) => {
        const writable = canWrite(row);
        return (
          <Space size={0}>
            <Button
              type="text"
              size="small"
              title={formatMessage({
                id: 'pages.devices.detail.alarmDetails',
                defaultMessage: 'Details',
              })}
              onClick={() => onDetails(row)}
            >
              {formatMessage({
                id: 'pages.devices.detail.alarmDetails',
                defaultMessage: 'Details',
              })}
            </Button>
            {writable && onAck && (
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                title={formatMessage({
                  id: 'pages.devices.detail.alarmAck',
                  defaultMessage: 'Acknowledge',
                })}
                disabled={row.acknowledged}
                onClick={() => onAck(row)}
              />
            )}
            {writable && (onClear || onDelete) && (
              <Dropdown
                menu={{
                  items: [
                    onClear
                      ? {
                          key: 'clear',
                          label: formatMessage({
                            id: 'pages.devices.detail.alarmClear',
                            defaultMessage: 'Clear',
                          }),
                          disabled: row.cleared,
                          onClick: () => onClear(row),
                        }
                      : null,
                    onDelete
                      ? {
                          key: 'delete',
                          danger: true,
                          label: formatMessage({
                            id: 'pages.devices.detail.delete',
                            defaultMessage: 'Delete',
                          }),
                          onClick: () => onDelete(row),
                        }
                      : null,
                  ].filter(Boolean),
                }}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </Space>
        );
      },
    });
  }

  return columns;
}
