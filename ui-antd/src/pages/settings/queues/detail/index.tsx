/**
 * Queue detail page (M14 wave-3, R26, spec 6.3-2): `/settings/queues/:id`,
 * the ngx entity dialog's antd convergence into a routed detail page (OTA
 * detail shape). Name is LOCKED in edit mode (backend 400 "Queue name can't
 * be changed!") and the topic shows the stored derived value; the save
 * posts the snapshot + form delta and NEVER parses the response (a
 * rule-engine save answers an empty body). The Main system queue hides
 * Delete here too.
 */
import { DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import { Alert, App, Button, Card, Form, Space, Spin } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { deleteQueue, getQueueById, saveQueue } from '@/services/tb/queue';
import type { Queue } from '@/types/tb/queue';
import {
  isMainQueue,
  type QueueFormValues,
  toQueueFormValues,
  toQueuePayload,
} from '../data';
import QueueForm from '../queue-form';

export default function SettingsQueueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();

  const queueQuery = useQuery({
    queryKey: ['queues', 'rule-engine', 'detail', id],
    queryFn: () => getQueueById(id as string),
    enabled: !!id,
  });
  const snapshot = queueQuery.data;

  const [form] = Form.useForm<QueueFormValues>();

  useEffect(() => {
    if (snapshot) {
      form.setFieldsValue(toQueueFormValues(snapshot));
    }
  }, [snapshot, form]);

  const saveMutation = useMutation({
    mutationFn: (values: QueueFormValues) =>
      saveQueue(toQueuePayload(snapshot, values)),
    onSuccess: async () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.queues.toastSaved',
          defaultMessage: 'Queue saved.',
        }),
      );
      // The rule-engine save answers an EMPTY body — re-read the row
      // instead of parsing the response (contract #14).
      await queueQuery.refetch();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteQueue((snapshot as Queue).id.id),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.queues.toastDeleted',
          defaultMessage: 'Queue deleted.',
        }),
      );
      history.push('/settings/queues');
    },
    onError: (error) => {
      // Referenced by a device profile → backend 400 text, verbatim.
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = () => {
    if (!snapshot) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.settings.queues.deleteOneTitle',
          defaultMessage: "Are you sure you want to delete the queue '{name}'?",
        },
        { name: snapshot.name },
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
      onOk: () => deleteMutation.mutate(),
    });
  };

  return (
    <PageContainer
      title={snapshot?.name ?? (id as string)}
      breadcrumbLabel={snapshot?.name ?? (id as string)}
      onBack={() => history.push('/settings/queues')}
      extra={
        snapshot && (
          <Space wrap>
            {!isMainQueue(snapshot) && (
              <Button danger icon={<DeleteOutlined />} onClick={confirmDelete}>
                {formatMessage({
                  id: 'pages.settings.queues.delete',
                  defaultMessage: 'Delete',
                })}
              </Button>
            )}
            <Button
              type="primary"
              loading={saveMutation.isPending}
              disabled={saveMutation.isPending}
              onClick={() => form.submit()}
            >
              {formatMessage({
                id: 'pages.settings.common.save',
                defaultMessage: 'Save',
              })}
            </Button>
          </Space>
        )
      }
    >
      <Card loading={queueQuery.isPending}>
        {queueQuery.isError && (
          <Alert
            type="error"
            showIcon
            title={formatMessage({
              id: 'pages.settings.queues.loadFailed',
              defaultMessage: 'Failed to load queues',
            })}
            description={serverErrorText(queueQuery.error)}
          />
        )}
        {queueQuery.isPending && (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        )}
        {snapshot && <QueueForm form={form} editMode />}
      </Card>
    </PageContainer>
  );
}
