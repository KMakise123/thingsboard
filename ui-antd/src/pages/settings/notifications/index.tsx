/**
 * System settings → Notifications page (M14 wave-3, R25, spec 6.3-3/4).
 *
 * One page, role-shaped cards (ngx sms-provider.component parity — one
 * component, two variants):
 *   - SA only: SMS-provider card backed by the `sms` admin-settings bucket
 *     (GET degrades to a blank form when the bucket is not configured yet,
 *     ngx ignoreErrors parity) with the Send-test-sms dialog that posts the
 *     CURRENT form configuration without saving it;
 *   - SA + TA: the notification-settings card (SLACK botToken + the SA-only
 *     MOBILE_APP firebase section) backed by POST /api/notification/settings.
 *
 * The notification save chain runs the deepTrim + per-method cleanup ONCE
 * via toNotificationSettingsPayload (two-fa single-transform lesson) —
 * an empty-string field deletes the whole delivery method. Both cards keep
 * independent dirty flags; the leave-guard arms when EITHER is dirty
 * (ngx confirmForm double-form parity).
 */
import { InboxOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useModel } from '@umijs/max';
import { Button as AntButton, App, Card, Form, Input, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import SettingsCard from '@/components/settings/SettingsCard';
import { getAdminSettings, saveAdminSettings } from '@/services/tb/admin';
import {
  getNotificationSettings,
  saveNotificationSettings,
} from '@/services/tb/notification';
import { Authority } from '@/types/tb';
import type {
  AdminSettings,
  SmsProviderConfiguration,
  SmsProviderType,
} from '@/types/tb/admin';
import type { NotificationSettings } from '@/types/tb/notification';
import {
  createSmsProviderConfiguration,
  isSmsProviderConfigurationComplete,
  type SmsProviderFormValues,
  toNotificationSettingsPayload,
  toSmsFormValue,
  toSmsProviderConfiguration,
} from './data';
import SendTestSmsDialog from './send-test-sms-dialog';
import { SmsProviderFields } from './sms-provider-fields';

const SMS_QUERY_KEY = ['settings', 'sms'] as const;

export default function SettingsNotificationsPage() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const isSysAdmin =
    initialState?.currentUser?.authority === Authority.SYS_ADMIN;

  // ---- card 1 (SA): the `sms` admin-settings bucket --------------------
  const smsQuery = useQuery({
    queryKey: SMS_QUERY_KEY,
    queryFn:
      async (): Promise<AdminSettings<SmsProviderConfiguration> | null> => {
        try {
          return await getAdminSettings<SmsProviderConfiguration>('sms');
        } catch {
          // Unconfigured bucket answers 404 — ngx ignoreErrors degrade.
          return null;
        }
      },
  });
  const smsSnapshot = smsQuery.data;
  const [smsForm] = Form.useForm<SmsProviderFormValues>();
  const [smsDirty, setSmsDirty] = useState(false);
  const [smsInvalid, setSmsInvalid] = useState(false);
  const [testSmsOpen, setTestSmsOpen] = useState(false);
  /** Form values at dialog-open time (probe the CURRENT configuration). */
  const [testSmsConfiguration, setTestSmsConfiguration] =
    useState<SmsProviderConfiguration>();

  useEffect(() => {
    if (!smsQuery.isSuccess) {
      return;
    }
    smsForm.setFieldsValue(toSmsFormValue(smsSnapshot?.jsonValue));
    setSmsDirty(false);
  }, [smsSnapshot, smsQuery.isSuccess, smsForm]);

  const smsConfiguration = () =>
    toSmsProviderConfiguration(smsForm.getFieldsValue(true));
  const smsConfigurationComplete = () =>
    isSmsProviderConfigurationComplete(smsConfiguration());

  const smsSave = useMutation({
    mutationFn: (values: SmsProviderFormValues) => {
      const configuration = toSmsProviderConfiguration(values);
      const body: AdminSettings<SmsProviderConfiguration> = {
        // Save contract (contract #2): echo the snapshot id — a body
        // without id is "create" and a second save would 400.
        id: smsSnapshot?.id,
        key: 'sms',
        jsonValue: configuration as SmsProviderConfiguration,
      };
      return saveAdminSettings<SmsProviderConfiguration>(body);
    },
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.notifications.smsToastSaved',
          defaultMessage: 'SMS provider settings saved.',
        }),
      );
      setSmsDirty(false);
      void smsQuery.refetch();
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.common.saveFailed',
          defaultMessage: 'Failed to save the settings.',
        }),
      );
    },
  });

  const onSmsTypeChange = (type: SmsProviderType) => {
    // Switching type re-seeds the blank per-type defaults (ngx
    // createSmsProviderConfiguration on type change).
    smsForm.setFieldsValue(createSmsProviderConfiguration(type));
  };

  // ---- card 2 (SA + TA): notification settings (SLACK + MOBILE_APP) ----
  const notifQuery = useQuery({
    queryKey: ['notification-settings'],
    queryFn: getNotificationSettings,
  });
  const notifSnapshot = notifQuery.data;
  const [notifForm] = Form.useForm<NotificationSettings>();
  const [notifDirty, setNotifDirty] = useState(false);
  const [notifInvalid, setNotifInvalid] = useState(false);

  useEffect(() => {
    if (!notifQuery.isSuccess) {
      return;
    }
    notifForm.setFieldsValue(notifSnapshot as NotificationSettings);
    setNotifDirty(false);
  }, [notifSnapshot, notifQuery.isSuccess, notifForm]);

  const notifSave = useMutation({
    mutationFn: (values: NotificationSettings) =>
      saveNotificationSettings(
        toNotificationSettingsPayload(notifSnapshot, values),
      ),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.settings.notifications.toastSaved',
          defaultMessage: 'Notification settings saved.',
        }),
      );
      // The save response is the CLEANED payload echo, not a re-read of
      // the store — it is exactly what the server keeps, so re-hydrate
      // from it instead of refetching.
      notifForm.setFieldsValue(saved);
      setNotifDirty(false);
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.common.saveFailed',
          defaultMessage: 'Failed to save the settings.',
        }),
      );
    },
  });

  // Dirty leave confirm for BOTH forms (ngx confirmForm parity).
  useEffect(() => {
    if (!smsDirty && !notifDirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [smsDirty, notifDirty]);

  const firebaseFileName = Form.useWatch(
    [
      'deliveryMethodsConfigs',
      'MOBILE_APP',
      'firebaseServiceAccountCredentialsFileName',
    ],
    notifForm,
  ) as string | undefined;

  return (
    <div className="flex flex-col gap-4">
      {isSysAdmin && (
        <SettingsCard
          title={formatMessage({
            id: 'pages.settings.notifications.smsCardTitle',
            defaultMessage: 'SMS provider settings',
          })}
          loading={smsQuery.isPending}
          dirty={smsDirty}
          invalid={smsInvalid}
          saving={smsSave.isPending}
          onUndo={() => {
            smsForm.setFieldsValue(toSmsFormValue(smsSnapshot?.jsonValue));
            setSmsDirty(false);
          }}
          onSave={() => smsForm.submit()}
        >
          <Form<SmsProviderFormValues>
            form={smsForm}
            layout="vertical"
            onValuesChange={(changed) => {
              if (typeof changed.type === 'string') {
                onSmsTypeChange(changed.type as SmsProviderType);
              }
              setSmsDirty(true);
            }}
            onFieldsChange={(_, allFields) =>
              setSmsInvalid(
                allFields.some((field) => (field.errors ?? []).length > 0),
              )
            }
            onFinish={(values) => smsSave.mutate(values)}
          >
            <SmsProviderFields />
          </Form>
          <div className="flex items-center justify-end gap-2 pt-2">
            <AntButton
              disabled={!smsConfigurationComplete() || smsSave.isPending}
              onClick={() => {
                setTestSmsConfiguration(smsConfiguration());
                setTestSmsOpen(true);
              }}
            >
              {formatMessage({
                id: 'pages.settings.notifications.sendTestSms',
                defaultMessage: 'Send test SMS',
              })}
            </AntButton>
          </div>
        </SettingsCard>
      )}

      <SettingsCard
        title={formatMessage({
          id: 'pages.settings.notifications.slackCardTitle',
          defaultMessage: 'Slack settings',
        })}
        loading={notifQuery.isPending}
        dirty={notifDirty}
        invalid={notifInvalid}
        saving={notifSave.isPending}
        onUndo={() => {
          notifForm.setFieldsValue(notifSnapshot as NotificationSettings);
          setNotifDirty(false);
        }}
        onSave={() => notifForm.submit()}
      >
        <Form<NotificationSettings>
          form={notifForm}
          layout="vertical"
          onValuesChange={() => setNotifDirty(true)}
          onFieldsChange={(_, allFields) =>
            setNotifInvalid(
              allFields.some((field) => (field.errors ?? []).length > 0),
            )
          }
          onFinish={(values) => notifSave.mutate(values)}
        >
          <Form.Item
            name={['deliveryMethodsConfigs', 'SLACK', 'botToken']}
            label={formatMessage({
              id: 'pages.settings.notifications.slackApiToken',
              defaultMessage: 'Slack API token',
            })}
          >
            <Input.Password autoComplete="off" />
          </Form.Item>
          {isSysAdmin && (
            <Card
              type="inner"
              title={formatMessage({
                id: 'pages.settings.notifications.mobileAppTitle',
                defaultMessage: 'Mobile app settings',
              })}
              className="mb-2"
            >
              <Form.Item
                hidden
                name={[
                  'deliveryMethodsConfigs',
                  'MOBILE_APP',
                  'firebaseServiceAccountCredentialsFileName',
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                hidden
                name={[
                  'deliveryMethodsConfigs',
                  'MOBILE_APP',
                  'firebaseServiceAccountCredentials',
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label={formatMessage({
                  id: 'pages.settings.notifications.firebaseFile',
                  defaultMessage:
                    'Firebase service account credentials JSON file',
                })}
              >
                <FirebaseFileInput
                  existingFileName={firebaseFileName}
                  onFile={(name, content) => {
                    notifForm.setFieldsValue({
                      deliveryMethodsConfigs: {
                        MOBILE_APP: {
                          firebaseServiceAccountCredentialsFileName: name,
                          firebaseServiceAccountCredentials: content,
                        },
                      },
                    });
                    setNotifDirty(true);
                  }}
                />
              </Form.Item>
            </Card>
          )}
        </Form>
      </SettingsCard>

      {isSysAdmin && (
        <SendTestSmsDialog
          open={testSmsOpen}
          onClose={() => setTestSmsOpen(false)}
          configuration={testSmsConfiguration}
        />
      )}
    </div>
  );
}

/**
 * tb-file-input equivalent (ngx): the visible state is the stored FILE
 * NAME; the upload side-channels the file CONTENT into the sibling
 * `firebaseServiceAccountCredentials` field (PrivateKeyFileInput pattern).
 */
function FirebaseFileInput({
  existingFileName,
  onFile,
}: {
  existingFileName?: string;
  onFile: (fileName: string, content: string) => void;
}) {
  const { formatMessage } = useIntl();
  const onFileSelected = (file: UploadFile) => {
    const origin = file.originFileObj;
    if (!origin) {
      return false;
    }
    void origin.text().then((text) => {
      onFile(origin.name, text);
    });
    return false; // never auto-upload: the content travels in the payload
  };
  return (
    <Upload
      accept=".json,application/json"
      showUploadList={false}
      maxCount={1}
      beforeUpload={(_file, fileList) => onFileSelected(fileList[0])}
    >
      <AntButton icon={<InboxOutlined />}>
        {existingFileName ||
          formatMessage({
            id: 'pages.settings.notifications.firebaseSelect',
            defaultMessage: 'Select a file',
          })}
      </AntButton>
    </Upload>
  );
}
