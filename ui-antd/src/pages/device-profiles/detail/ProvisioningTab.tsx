/**
 * Device-profile provisioning tab (ui-ngx device-profile-provision-
 * configuration parity): provision strategy select plus the strategy-
 * specific fields — key+secret for ALLOW_CREATE_NEW_DEVICES /
 * CHECK_PRE_PROVISIONED_DEVICES, X509 chain toggle + certificate value +
 * CN regex for X509_CERTIFICATE_CHAIN. Self-contained edit surface; the
 * save merges the slice into the profile and posts the FULL entity,
 * mirroring ui-ngx prepareFormValue (provisionType/provisionDeviceKey ride
 * on the profile root, the secret lives in provisionConfiguration).
 */
import { CopyOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { saveDeviceProfile } from '@/services/tb/device-profile';
import {
  type DeviceProfile,
  type DeviceProvisionConfiguration,
  DeviceProvisionType,
} from '@/types/tb/device-profile';

interface ProvisioningFormValues {
  type: DeviceProvisionType;
  provisionDeviceKey?: string;
  provisionDeviceSecret?: string;
  allowCreateNewDevicesByX509Certificate?: boolean;
  certificateValue?: string;
  certificateRegExPattern?: string;
}

function toFormValues(profile: DeviceProfile): ProvisioningFormValues {
  const config: DeviceProvisionConfiguration = profile.profileData
    ?.provisionConfiguration ?? {
    type: profile.provisionType ?? DeviceProvisionType.DISABLED,
  };
  return {
    type: config.type ?? profile.provisionType ?? DeviceProvisionType.DISABLED,
    provisionDeviceKey: config.provisionDeviceKey ?? profile.provisionDeviceKey,
    provisionDeviceSecret: config.provisionDeviceSecret,
    allowCreateNewDevicesByX509Certificate:
      config.allowCreateNewDevicesByX509Certificate ?? false,
    certificateValue: config.certificateValue,
    certificateRegExPattern: config.certificateRegExPattern,
  };
}

export default function ProvisioningTab({
  profile,
}: {
  profile: DeviceProfile;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProvisioningFormValues>();
  const [editing, setEditing] = useState(false);

  const initialValues = useMemo(() => toFormValues(profile), [profile]);
  const values = Form.useWatch([], form);
  const dirty =
    editing &&
    !!values &&
    JSON.stringify(values) !== JSON.stringify(initialValues);

  const saveMutation = useMutation({
    mutationFn: (formValues: ProvisioningFormValues) =>
      saveDeviceProfile(toSavePayload(formValues, profile)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.device-profiles.detail.toastSaved',
          defaultMessage: 'Device profile saved.',
        }),
      );
      setEditing(false);
      void queryClient.invalidateQueries({
        queryKey: ['device-profile', 'detail'],
      });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const copyToClipboard = (text: string | undefined) => {
    if (!text) {
      return;
    }
    void navigator.clipboard.writeText(text);
    void message.success(
      formatMessage({
        id: 'pages.device-profiles.detail.provisionCopied',
        defaultMessage: 'Copied to the clipboard.',
      }),
    );
  };

  const strategy = values?.type;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        {!editing && (
          <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
            {formatMessage({
              id: 'pages.device-profiles.detail.edit',
              defaultMessage: 'Edit',
            })}
          </Button>
        )}
        {editing && (
          <Space>
            <Button onClick={() => setEditing(false)}>
              {formatMessage({
                id: 'pages.device-profiles.detail.cancelEdit',
                defaultMessage: 'Cancel edit',
              })}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              disabled={!dirty}
              onClick={() => form.submit()}
            >
              {formatMessage({
                id: 'pages.device-profiles.detail.save',
                defaultMessage: 'Save',
              })}
            </Button>
          </Space>
        )}
      </div>
      <Form<ProvisioningFormValues>
        form={form}
        layout="vertical"
        disabled={!editing || saveMutation.isPending}
        onFinish={(next) => saveMutation.mutate(next)}
        initialValues={initialValues}
      >
        <Form.Item
          name="type"
          label={formatMessage({
            id: 'pages.device-profiles.detail.provisionStrategy',
            defaultMessage: 'Provision strategy',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.device-profiles.detail.provisionStrategyRequired',
                defaultMessage: 'Provision strategy is required.',
              }),
            },
          ]}
        >
          <Select
            options={(
              Object.values(DeviceProvisionType) as Array<DeviceProvisionType>
            ).map((value) => ({
              label: formatMessage({
                id: `pages.device-profiles.provision.${value}`,
                defaultMessage: value,
              }),
              value,
            }))}
          />
        </Form.Item>

        {(strategy === DeviceProvisionType.ALLOW_CREATE_NEW_DEVICES ||
          strategy === DeviceProvisionType.CHECK_PRE_PROVISIONED_DEVICES) && (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="provisionDeviceKey"
                label={formatMessage({
                  id: 'pages.device-profiles.detail.provisionDeviceKey',
                  defaultMessage: 'Provision device key',
                })}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.device-profiles.detail.provisionDeviceKeyRequired',
                      defaultMessage: 'Provision device key is required.',
                    }),
                  },
                ]}
              >
                <Input
                  suffix={
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() =>
                        copyToClipboard(values?.provisionDeviceKey)
                      }
                    />
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="provisionDeviceSecret"
                label={formatMessage({
                  id: 'pages.device-profiles.detail.provisionDeviceSecret',
                  defaultMessage: 'Provision device secret',
                })}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.device-profiles.detail.provisionDeviceSecretRequired',
                      defaultMessage: 'Provision device secret is required.',
                    }),
                  },
                ]}
              >
                <Input
                  suffix={
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() =>
                        copyToClipboard(values?.provisionDeviceSecret)
                      }
                    />
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {strategy === DeviceProvisionType.X509_CERTIFICATE_CHAIN && (
          <>
            <Alert
              type="info"
              showIcon
              title={formatMessage({
                id: 'pages.device-profiles.detail.provisionX509Hint',
                defaultMessage:
                  'To provision a device using an X509 certificate chain, the device certificate CN must match the configured regular expression.',
              })}
            />
            <Form.Item
              name="allowCreateNewDevicesByX509Certificate"
              valuePropName="checked"
              className="mt-3"
            >
              <Switch />
            </Form.Item>
            <Typography.Text type="secondary" className="block pb-2">
              {formatMessage({
                id: 'pages.device-profiles.detail.provisionX509AllowCreateHint',
                defaultMessage:
                  'Allow create new devices with an X509 certificate chain.',
              })}
            </Typography.Text>
            <Form.Item
              name="certificateValue"
              label={formatMessage({
                id: 'pages.device-profiles.detail.provisionX509CertificateValue',
                defaultMessage: 'Certificate value',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.device-profiles.detail.provisionX509CertificateValueRequired',
                    defaultMessage: 'Certificate value is required.',
                  }),
                },
              ]}
            >
              <Input.TextArea rows={3} className="font-mono" />
            </Form.Item>
            <Form.Item
              name="certificateRegExPattern"
              label={formatMessage({
                id: 'pages.device-profiles.detail.provisionX509CnRegex',
                defaultMessage: 'CN regular expression variable',
              })}
              extra={formatMessage({
                id: 'pages.device-profiles.detail.provisionX509CnRegexHint',
                defaultMessage:
                  'The CN is matched against this regular expression.',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.device-profiles.detail.provisionX509CnRegexRequired',
                    defaultMessage: 'CN regular expression is required.',
                  }),
                },
              ]}
            >
              <Input className="font-mono" />
            </Form.Item>
          </>
        )}
      </Form>
      {saveMutation.isError && (
        <Typography.Text type="danger">
          {serverErrorText(saveMutation.error)}
        </Typography.Text>
      )}
    </div>
  );
}

/** Full-profile save payload (ui-ngx prepareFormValue mirror). */
function toSavePayload(
  values: ProvisioningFormValues,
  profile: DeviceProfile,
): DeviceProfile {
  const provisionConfiguration: DeviceProvisionConfiguration = {
    type: values.type,
    provisionDeviceSecret: values.provisionDeviceSecret,
    certificateValue: values.certificateValue,
    certificateRegExPattern: values.certificateRegExPattern,
    allowCreateNewDevicesByX509Certificate:
      values.allowCreateNewDevicesByX509Certificate ?? false,
  };
  return {
    ...profile,
    // The strategy + key mirror onto the profile root (backend contract).
    provisionType: values.type,
    provisionDeviceKey: values.provisionDeviceKey,
    profileData: {
      ...profile.profileData,
      provisionConfiguration,
    },
  };
}
