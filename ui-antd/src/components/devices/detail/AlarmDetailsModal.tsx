/**
 * Alarm details dialog (spec 3.6, entity-tab edition): full field set read
 * from /api/alarm/info/{id} plus the comments timeline (system events +
 * user comments) from the alarm-comment endpoints; ack / clear actions for
 * users with write access.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Descriptions,
  Input,
  Modal,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/devices/server-error-text';
import {
  ackAlarm,
  clearAlarm,
  getAlarmComments,
  getAlarmInfoById,
  saveAlarmComment,
} from '@/services/tb/alarm';
import {
  ALARM_SEVERITY_TAG,
  ALARM_STATUS_TAG,
  type AlarmRow,
  alarmAssigneeName,
  alarmCommentAuthor,
  formatAlarmComment,
} from './alarm-format';

const ALARMS_QUERY_KEY = ['alarms'] as const;

function timeText(ts?: number): string {
  return ts ? dayjs(ts).format('YYYY-MM-DD HH:mm:ss') : '-';
}

export default function AlarmDetailsModal({
  open,
  alarm,
  readOnly,
  onClose,
}: {
  open: boolean;
  /** The table row snapshot; the dialog re-reads the full entity. */
  alarm: AlarmRow | null;
  readOnly: boolean;
  onClose: () => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [commentDraft, setCommentDraft] = useState('');

  const alarmId = alarm?.id.id ?? null;

  const alarmQuery = useQuery({
    queryKey: ['alarm', 'info', alarmId],
    queryFn: () => getAlarmInfoById(alarmId as string),
    enabled: open && !!alarmId,
  });
  const commentsQuery = useQuery({
    queryKey: ['alarm', 'comments', alarmId],
    queryFn: () =>
      getAlarmComments(alarmId as string, { pageSize: 100, page: 0 }),
    enabled: open && !!alarmId,
  });

  const current = alarmQuery.data ?? alarm;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ALARMS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ['alarm', 'info'] });
    void queryClient.invalidateQueries({ queryKey: ['alarm', 'comments'] });
  };

  const ackMutation = useMutation({
    mutationFn: () => ackAlarm(alarmId as string),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.alarmAcked',
          defaultMessage: 'Alarm acknowledged.',
        }),
      );
      invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const clearMutation = useMutation({
    mutationFn: () => clearAlarm(alarmId as string),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.alarmCleared',
          defaultMessage: 'Alarm cleared.',
        }),
      );
      invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => saveAlarmComment(alarmId as string, text),
    onSuccess: () => {
      setCommentDraft('');
      invalidate();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const translate = (key: string, values?: Record<string, string>) =>
    values
      ? formatMessage({ id: key, defaultMessage: key }, values)
      : formatMessage({ id: key, defaultMessage: key });

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.devices.detail.alarmDetailsTitle',
        defaultMessage: 'Alarm details',
      })}
      footer={null}
      onCancel={onClose}
      width={760}
      destroyOnHidden
    >
      {current ? (
        <div className="flex flex-col gap-4">
          <Descriptions
            size="small"
            column={2}
            bordered
            items={[
              {
                key: 'type',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmType',
                  defaultMessage: 'Type',
                }),
                children: current.type,
              },
              {
                key: 'severity',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmSeverity',
                  defaultMessage: 'Severity',
                }),
                children: (
                  <Tag color={ALARM_SEVERITY_TAG[current.severity]}>
                    {formatMessage({
                      id: `pages.devices.detail.alarmSeverity.${current.severity}`,
                      defaultMessage: current.severity,
                    })}
                  </Tag>
                ),
              },
              {
                key: 'status',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmStatus',
                  defaultMessage: 'Status',
                }),
                children: (
                  <Tag color={ALARM_STATUS_TAG[current.status]}>
                    {formatMessage({
                      id: `pages.devices.detail.alarmStatus.${current.status}`,
                      defaultMessage: current.status,
                    })}
                  </Tag>
                ),
              },
              {
                key: 'originator',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmOriginator',
                  defaultMessage: 'Originator',
                }),
                children:
                  current.originatorName ??
                  current.originator?.entityType ??
                  '-',
              },
              {
                key: 'created',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmCreatedTime',
                  defaultMessage: 'Created time',
                }),
                children: timeText(current.createdTime),
              },
              {
                key: 'start',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmStart',
                  defaultMessage: 'Start time',
                }),
                children: timeText(current.startTs),
              },
              {
                key: 'end',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmEnd',
                  defaultMessage: 'End time',
                }),
                children: timeText(current.endTs),
              },
              {
                key: 'ack',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmAckTime',
                  defaultMessage: 'Ack time',
                }),
                children: timeText(current.ackTs),
              },
              {
                key: 'clear',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmClearTime',
                  defaultMessage: 'Clear time',
                }),
                children: timeText(current.clearTs),
              },
              {
                key: 'assignee',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmAssignee',
                  defaultMessage: 'Assignee',
                }),
                children: alarmAssigneeName(current) || '-',
              },
              {
                key: 'details',
                label: formatMessage({
                  id: 'pages.devices.detail.alarmDetailsJson',
                  defaultMessage: 'Details',
                }),
                span: 2,
                children: (
                  <pre className="max-h-40 overflow-auto text-xs">
                    {JSON.stringify(current.details ?? {}, null, 2)}
                  </pre>
                ),
              },
            ]}
          />
          {!readOnly && (
            <Space>
              <Button
                type="primary"
                disabled={current.acknowledged || ackMutation.isPending}
                loading={ackMutation.isPending}
                onClick={() => ackMutation.mutate()}
              >
                {formatMessage({
                  id: 'pages.devices.detail.alarmAck',
                  defaultMessage: 'Acknowledge',
                })}
              </Button>
              <Button
                disabled={current.cleared || clearMutation.isPending}
                loading={clearMutation.isPending}
                onClick={() => clearMutation.mutate()}
              >
                {formatMessage({
                  id: 'pages.devices.detail.alarmClear',
                  defaultMessage: 'Clear',
                })}
              </Button>
            </Space>
          )}
          <div>
            <Typography.Title level={5}>
              {formatMessage({
                id: 'pages.devices.detail.alarmTimeline',
                defaultMessage: 'Timeline',
              })}
            </Typography.Title>
            <Timeline
              items={(commentsQuery.data?.data ?? []).map((entry) => ({
                color: entry.type === 'SYSTEM' ? 'gray' : 'blue',
                children: (
                  <div>
                    <Typography.Text strong>
                      {formatAlarmComment(entry, translate)}
                    </Typography.Text>
                    <br />
                    <Typography.Text type="secondary" className="text-xs">
                      {alarmCommentAuthor(entry) || entry.comment.userName} ·{' '}
                      {timeText(entry.createdTime)}
                    </Typography.Text>
                  </div>
                ),
              }))}
            />
            {!readOnly && (
              <Space.Compact className="w-full">
                <Input
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  onPressEnter={() => {
                    if (commentDraft.trim()) {
                      commentMutation.mutate(commentDraft.trim());
                    }
                  }}
                  placeholder={formatMessage({
                    id: 'pages.devices.detail.alarmCommentPlaceholder',
                    defaultMessage: 'Add a comment',
                  })}
                />
                <Button
                  type="primary"
                  disabled={!commentDraft.trim()}
                  loading={commentMutation.isPending}
                  onClick={() => commentMutation.mutate(commentDraft.trim())}
                >
                  {formatMessage({
                    id: 'pages.devices.detail.alarmCommentSend',
                    defaultMessage: 'Send',
                  })}
                </Button>
              </Space.Compact>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
