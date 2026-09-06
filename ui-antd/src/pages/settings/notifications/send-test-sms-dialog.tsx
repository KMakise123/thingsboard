/**
 * Send-test-sms dialog (M14 wave-3, R25, ui-ngx send-test-sms-dialog
 * parity): numberTo (E.164 pattern) + message (required, ≤1600) sent to
 * POST /api/admin/settings/testSms together with the form's CURRENT
 * provider configuration — the provider does NOT have to be saved first
 * (ngx passes smsProvider.value.configuration straight into the dialog).
 * SA-only endpoint → the dialog is only mounted on the sysadmin variant.
 */
import { useMutation } from '@tanstack/react-query';
import { Alert, App, Form, Input, Modal } from 'antd';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { sendTestSms } from '@/services/tb/admin';
import type { SmsProviderConfiguration } from '@/types/tb/admin';
import { PHONE_NUMBER_PATTERN } from './data';

export interface SendTestSmsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Current unsaved provider configuration from the settings form. */
  configuration?: SmsProviderConfiguration;
}

interface TestSmsFormValues {
  numberTo: string;
  message: string;
}

export default function SendTestSmsDialog({
  open,
  onClose,
  configuration,
}: SendTestSmsDialogProps) {
  const { formatMessage } = useIntl();
  const { message: toast } = App.useApp();
  const [form] = Form.useForm<TestSmsFormValues>();

  const mutation = useMutation({
    mutationFn: (values: TestSmsFormValues) =>
      sendTestSms({
        providerConfiguration: configuration as SmsProviderConfiguration,
        numberTo: values.numberTo,
        message: values.message,
      }),
    onSuccess: () => {
      void toast.success(
        formatMessage({
          id: 'pages.settings.notifications.testSmsSent',
          defaultMessage: 'Test SMS was successfully sent!',
        }),
      );
      handleClose();
    },
    // The backend answer carries the underlying send failure — surface it
    // verbatim (a fake number reaching a real provider errors here).
    onError: (error) => {
      void toast.error(serverErrorText(error));
    },
  });

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.settings.notifications.sendTestSms',
        defaultMessage: 'Send test SMS',
      })}
      okText={formatMessage({
        id: 'pages.settings.notifications.testSmsSend',
        defaultMessage: 'Send',
      })}
      cancelText={formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      })}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: !configuration }}
      onOk={() => {
        void form
          .validateFields()
          .then((values) => mutation.mutate(values))
          .catch(() => {
            // Field errors render on the inputs themselves.
          });
      }}
      onCancel={handleClose}
      destroyOnHidden
    >
      {!configuration && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          title={formatMessage({
            id: 'pages.settings.notifications.testSmsNoProvider',
            defaultMessage: 'SMS provider is not configured yet.',
          })}
        />
      )}
      <Form<TestSmsFormValues> form={form} layout="vertical">
        <Form.Item
          name="numberTo"
          label={formatMessage({
            id: 'pages.settings.notifications.testSmsNumberTo',
            defaultMessage: 'Phone number to',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.settings.notifications.testSmsNumberToRequired',
                defaultMessage: 'Phone number to is required.',
              }),
            },
            {
              pattern: PHONE_NUMBER_PATTERN,
              message: formatMessage({
                id: 'pages.settings.notifications.testSmsNumberToPattern',
                defaultMessage:
                  'Phone number must be in E.164 format, ex. +19995550123.',
              }),
            },
          ]}
        >
          <Input placeholder="+19995550123" />
        </Form.Item>
        <Form.Item
          name="message"
          label={formatMessage({
            id: 'pages.settings.notifications.testSmsMessage',
            defaultMessage: 'SMS message',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.settings.notifications.testSmsMessageRequired',
                defaultMessage: 'SMS message is required.',
              }),
            },
            {
              max: 1600,
              message: formatMessage({
                id: 'pages.settings.notifications.testSmsMessageMaxLength',
                defaultMessage: "SMS message can't be longer 1600 characters",
              }),
            },
          ]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
