/**
 * Device credentials dialog (device-credentials-dialog parity).
 *
 * View: renders the current credentials by type with copy affordances
 * (token / certificate / clientId+userName+password). Edit: TA can change
 * values and save (saveDeviceCredentials, version passed back). Reset:
 * confirm modal regenerates the secret part (fresh token, or MQTT
 * user/password) and saves. Customer users are read-only (CU 视角).
 *
 * NOTE (M1): the type switcher offers the DEFAULT-transport set unless the
 * stored type is LwM2M — the list row does not carry the profile's
 * transportType and the backend validates the final combination anyway.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, App, Button, Form, Modal, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import {
  getDeviceCredentials,
  saveDeviceCredentials,
} from '@/services/tb/device';
import {
  type DeviceCredentials,
  DeviceCredentialsType,
  type DeviceInfo,
} from '@/types/tb';

import {
  credentialCopyEntries,
  credentialsToFormValue,
  formValueToCredentials,
  regenerateFormSecret,
} from './credentials-value';
import {
  type CredentialsFlatValue,
  DeviceCredentialsFields,
} from './DeviceCredentialsFields';
import { serverErrorText } from './server-error-text';
import { useCopy } from './use-copy';

export interface DeviceCredentialsModalProps {
  open: boolean;
  device: DeviceInfo | null;
  /** CU 视角: fields disabled, save/reset hidden. */
  readOnly?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function DeviceCredentialsModal({
  open,
  device,
  readOnly = false,
  onClose,
  onSaved,
}: DeviceCredentialsModalProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const copy = useCopy();
  const [form] = Form.useForm();
  const [resetOpen, setResetOpen] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const deviceId = device?.id.id;
  const credentialsQuery = useQuery({
    queryKey: ['device-credentials', deviceId],
    queryFn: () => getDeviceCredentials(deviceId as string),
    enabled: open && !!deviceId,
  });

  const credentials = credentialsQuery.data;

  // Hydrate the form whenever fresh credentials arrive.
  useEffect(() => {
    if (credentials) {
      form.setFieldsValue(toFlatValue(credentials));
    }
  }, [credentials, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: { wire: DeviceCredentials; reset?: boolean }) =>
      saveDeviceCredentials(payload.wire),
    onSuccess: (_saved, payload) => {
      setSaveError(undefined);
      void message.success(
        formatMessage(
          payload?.reset
            ? {
                id: 'pages.devices.list.credentialsResetDone',
                defaultMessage: 'Credentials have been reset.',
              }
            : {
                id: 'pages.devices.list.credentialsSaved',
                defaultMessage: 'Credentials saved.',
              },
        ),
      );
      void credentialsQuery.refetch();
      onSaved?.();
    },
    onError: (error) => setSaveError(serverErrorText(error)),
  });

  const allowedTypes =
    credentials?.credentialsType === DeviceCredentialsType.LWM2M_CREDENTIALS
      ? [DeviceCredentialsType.LWM2M_CREDENTIALS]
      : [
          DeviceCredentialsType.ACCESS_TOKEN,
          DeviceCredentialsType.X509_CERTIFICATE,
          DeviceCredentialsType.MQTT_BASIC,
        ];

  const save = async () => {
    const flat = await form.validateFields();
    const wire = formValueToCredentials(
      {
        credentialsType: flat.credentialsType,
        credentialsId: flat.credentialsId,
        credentialsValue:
          flat.credentialsType === DeviceCredentialsType.MQTT_BASIC
            ? {
                clientId: flat.clientId ?? '',
                userName: flat.userName ?? '',
                password: flat.password ?? '',
              }
            : flat.certPem,
      },
      credentials,
    );
    saveMutation.mutate({ wire });
  };

  const doReset = () => {
    if (!credentials) {
      return;
    }
    const regenerated = regenerateFormSecret(
      credentialsToFormValue(credentials),
    );
    const wire = formValueToCredentials(regenerated, credentials);
    setResetOpen(false);
    saveMutation.mutate({ wire, reset: true });
  };

  const copyEntries = credentials
    ? credentialCopyEntries(credentialsToFormValue(credentials))
    : [];

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.devices.list.credentialsDialogTitle',
        defaultMessage: 'Device credentials',
      })}
      width={640}
      destroyOnHidden
      onCancel={onClose}
      footer={
        <div className="flex items-center justify-between">
          {/* Reset is a write operation: hidden for read-only (CU) users. */}
          {!readOnly && (
            <Button
              danger
              disabled={!credentials}
              onClick={() => setResetOpen(true)}
            >
              {formatMessage({
                id: 'pages.devices.list.credentialsReset',
                defaultMessage: 'Reset credentials',
              })}
            </Button>
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>
              {formatMessage({
                id: readOnly
                  ? 'pages.devices.list.close'
                  : 'pages.devices.list.cancel',
                defaultMessage: readOnly ? 'Close' : 'Cancel',
              })}
            </Button>
            {!readOnly && (
              <Button
                type="primary"
                loading={saveMutation.isPending}
                onClick={() => void save()}
              >
                {formatMessage({
                  id: 'pages.devices.list.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {saveError && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          closable
          onClose={() => setSaveError(undefined)}
          title={saveError}
        />
      )}
      {open && !credentials ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Spin />
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.devices.list.credentialsLoading',
              defaultMessage: 'Loading device credentials…',
            })}
          </Typography.Text>
        </div>
      ) : credentials ? (
        <Form form={form} layout="vertical" disabled={readOnly}>
          {readOnly && (
            <Typography.Paragraph type="secondary" className="mb-4">
              {formatMessage({
                id: 'pages.devices.list.credentialsReadOnlyHint',
                defaultMessage:
                  'Your role can only view the credentials (copy is supported).',
              })}
            </Typography.Paragraph>
          )}
          <DeviceCredentialsFields
            allowedTypes={allowedTypes}
            disabled={readOnly}
          />
          {copyEntries.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {copyEntries.map((entry) => (
                <Button
                  key={entry.key}
                  size="small"
                  onClick={() => void copy(entry.text)}
                >
                  {formatMessage({
                    id: 'pages.devices.list.credentialsCopy',
                    defaultMessage: 'Copy',
                  })}{' '}
                  {entry.key}
                </Button>
              ))}
            </div>
          )}
        </Form>
      ) : null}

      <Modal
        open={resetOpen}
        title={formatMessage({
          id: 'pages.devices.list.credentialsResetTitle',
          defaultMessage:
            'Are you sure you want to reset the device credentials?',
        })}
        okText={formatMessage({
          id: 'pages.devices.list.credentialsReset',
          defaultMessage: 'Reset credentials',
        })}
        okButtonProps={{ danger: true }}
        cancelText={formatMessage({
          id: 'pages.devices.list.cancel',
          defaultMessage: 'Cancel',
        })}
        confirmLoading={saveMutation.isPending}
        onOk={doReset}
        onCancel={() => setResetOpen(false)}
      >
        <Typography.Paragraph>
          {formatMessage({
            id: 'pages.devices.list.credentialsResetText',
            defaultMessage:
              'A new random access token will be generated and the device will have to reconnect with it.',
          })}
        </Typography.Paragraph>
      </Modal>
    </Modal>
  );
}

/** Wire credentials -> flat form value (CREDENTIALS_FIELD_NAMES names). */
export function toFlatValue(
  credentials: DeviceCredentials,
): CredentialsFlatValue {
  const value = credentialsToFormValue(credentials);
  const mqtt =
    typeof value.credentialsValue === 'object'
      ? value.credentialsValue
      : undefined;
  return {
    credentialsType: value.credentialsType,
    credentialsId: value.credentialsId ?? '',
    certPem:
      typeof value.credentialsValue === 'string'
        ? value.credentialsValue
        : undefined,
    clientId: mqtt?.clientId ?? '',
    userName: mqtt?.userName ?? '',
    password: mqtt?.password ?? '',
  };
}
