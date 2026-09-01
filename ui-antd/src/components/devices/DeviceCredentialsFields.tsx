/**
 * Device-credentials form fields (flat antd Form.Items, one fragment shared
 * by the wizard step and the credentials dialog).
 *
 * Parity: ui-ngx tb-device-credentials — a type toggle (only shown when the
 * transport admits more than one type) followed by the per-type fields:
 * ACCESS_TOKEN (1-32 chars + generate), MQTT_BASIC (clientId/userName/
 * password, at least one of clientId/userName), X509 (PEM textarea).
 * LWM2M_CREDENTIALS is read-only in M1 (typed editor ships with the profile
 * pages). Hosts own the <Form>; field names are flat and listed in
 * CREDENTIALS_FIELD_NAMES.
 */
import { Button, Form, Input, Segmented, Typography } from 'antd';
import { useIntl } from 'react-intl';

import { DeviceCredentialsType } from '@/types/tb';

import { generateSecret } from './credentials-value';

export const CREDENTIALS_FIELD_NAMES = {
  type: 'credentialsType',
  tokenId: 'credentialsId',
  clientId: 'clientId',
  userName: 'userName',
  password: 'password',
  certPem: 'certPem',
} as const;

/** Flat form value the hosts collect (field names above). */
export interface CredentialsFlatValue {
  credentialsType: DeviceCredentialsType;
  credentialsId?: string;
  clientId?: string;
  userName?: string;
  password?: string;
  certPem?: string;
}

const CREDENTIAL_TYPE_LABELS: Partial<Record<DeviceCredentialsType, string>> = {
  [DeviceCredentialsType.ACCESS_TOKEN]: 'Access token',
  [DeviceCredentialsType.X509_CERTIFICATE]: 'X.509',
  [DeviceCredentialsType.MQTT_BASIC]: 'MQTT Basic',
  [DeviceCredentialsType.LWM2M_CREDENTIALS]: 'LwM2M Credentials',
};

export interface DeviceCredentialsFieldsProps {
  allowedTypes: Array<DeviceCredentialsType>;
  /** Disable every input (read-only viewers). */
  disabled?: boolean;
  /** Pre-generate a token when the type is ACCESS_TOKEN (wizard default). */
  initAccessToken?: boolean;
}

export function DeviceCredentialsFields({
  allowedTypes,
  disabled = false,
  initAccessToken = false,
}: DeviceCredentialsFieldsProps) {
  const { formatMessage } = useIntl();
  const typeOptions = allowedTypes.map((type) => ({
    label: CREDENTIAL_TYPE_LABELS[type] ?? type,
    value: type,
  }));

  return (
    <>
      {allowedTypes.length > 1 ? (
        <Form.Item
          label={formatMessage({
            id: 'pages.devices.list.credentialsType',
            defaultMessage: 'Credentials type',
          })}
          name={CREDENTIALS_FIELD_NAMES.type}
          initialValue={allowedTypes[0]}
        >
          <Segmented options={typeOptions} disabled={disabled} block />
        </Form.Item>
      ) : (
        // Keep the type in form state even when there is nothing to toggle.
        <Form.Item
          name={CREDENTIALS_FIELD_NAMES.type}
          initialValue={allowedTypes[0]}
          hidden
        >
          <Input />
        </Form.Item>
      )}
      <Form.Item
        noStyle
        shouldUpdate={(prev, next) =>
          prev[CREDENTIALS_FIELD_NAMES.type] !==
          next[CREDENTIALS_FIELD_NAMES.type]
        }
      >
        {({ getFieldValue, setFieldsValue }) => {
          const type: DeviceCredentialsType | undefined = getFieldValue(
            CREDENTIALS_FIELD_NAMES.type,
          );
          switch (type) {
            case DeviceCredentialsType.ACCESS_TOKEN:
              return (
                <Form.Item
                  label={formatMessage({
                    id: 'pages.devices.list.credentialsAccessToken',
                    defaultMessage: 'Access token',
                  })}
                  name={CREDENTIALS_FIELD_NAMES.tokenId}
                  initialValue={
                    initAccessToken ? generateSecret(20) : undefined
                  }
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: formatMessage({
                        id: 'pages.devices.list.credentialsAccessTokenRequired',
                        defaultMessage: 'Access token is required.',
                      }),
                    },
                    {
                      max: 32,
                      message: formatMessage({
                        id: 'pages.devices.list.credentialsAccessTokenInvalid',
                        defaultMessage:
                          'Access token length must be from 1 to 32 characters.',
                      }),
                    },
                  ]}
                >
                  <Input
                    disabled={disabled}
                    allowClear
                    autoComplete="off"
                    suffix={
                      !disabled && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            setFieldsValue({
                              [CREDENTIALS_FIELD_NAMES.tokenId]:
                                generateSecret(20),
                            })
                          }
                        >
                          {formatMessage({
                            id: 'pages.devices.list.credentialsGenerate',
                            defaultMessage: 'Generate',
                          })}
                        </Button>
                      )
                    }
                  />
                </Form.Item>
              );
            case DeviceCredentialsType.X509_CERTIFICATE:
              return (
                <Form.Item
                  label={formatMessage({
                    id: 'pages.devices.list.credentialsCertificate',
                    defaultMessage: 'Certificate in PEM format',
                  })}
                  name={CREDENTIALS_FIELD_NAMES.certPem}
                  rules={[
                    {
                      required: true,
                      message: formatMessage({
                        id: 'pages.devices.list.credentialsCertificateRequired',
                        defaultMessage: 'Certificate is required.',
                      }),
                    },
                  ]}
                >
                  <Input.TextArea
                    disabled={disabled}
                    rows={8}
                    autoComplete="off"
                  />
                </Form.Item>
              );
            case DeviceCredentialsType.MQTT_BASIC:
              return (
                <>
                  <Form.Item
                    label={formatMessage({
                      id: 'pages.devices.list.credentialsClientId',
                      defaultMessage: 'Client ID',
                    })}
                    name={CREDENTIALS_FIELD_NAMES.clientId}
                  >
                    <Input disabled={disabled} allowClear autoComplete="off" />
                  </Form.Item>
                  <Form.Item
                    label={formatMessage({
                      id: 'pages.devices.list.credentialsUserName',
                      defaultMessage: 'User name',
                    })}
                    name={CREDENTIALS_FIELD_NAMES.userName}
                    dependencies={[CREDENTIALS_FIELD_NAMES.clientId]}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const clientId = getFieldValue(
                            CREDENTIALS_FIELD_NAMES.clientId,
                          );
                          if (value || clientId) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error(
                              formatMessage({
                                id: 'pages.devices.list.credentialsMqttRequired',
                                defaultMessage:
                                  'Client ID and/or User name are necessary',
                              }),
                            ),
                          );
                        },
                      }),
                    ]}
                  >
                    <Input disabled={disabled} allowClear autoComplete="off" />
                  </Form.Item>
                  <Form.Item
                    label={formatMessage({
                      id: 'pages.devices.list.credentialsPassword',
                      defaultMessage: 'Password',
                    })}
                    name={CREDENTIALS_FIELD_NAMES.password}
                  >
                    <Input.Password
                      disabled={disabled}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                </>
              );
            case DeviceCredentialsType.LWM2M_CREDENTIALS:
              return (
                <Typography.Paragraph type="secondary">
                  {formatMessage({
                    id: 'pages.devices.list.credentialsLwm2mHint',
                    defaultMessage:
                      'LwM2M credential editing arrives in a later release; shown read-only.',
                  })}
                </Typography.Paragraph>
              );
            default:
              return null;
          }
        }}
      </Form.Item>
    </>
  );
}
