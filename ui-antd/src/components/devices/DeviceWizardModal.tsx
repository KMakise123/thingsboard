/**
 * Multi-step new-device wizard (device-wizard-dialog parity, AntD Steps).
 *
 * Steps: device profile -> details -> credentials -> connectivity result.
 * The device is created when leaving the credentials step (with credentials
 * via saveDeviceWithCredentials, or plain saveDevice when skipped — the
 * backend then mints a random access token, as in ui-ngx). The final step
 * renders the shared ConnectivityPanel for the freshly created device and
 * "finish" hands the created entity back so the list can invalidate + toast.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Steps,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  getDeviceProfiles,
  saveDevice,
  saveDeviceWithCredentials,
} from '@/services/tb/device';
import {
  type Device,
  type DeviceCredentials,
  DeviceCredentialsType,
  type DeviceProfileInfo,
  EntityType,
} from '@/types/tb';
import { ConnectivityPanel } from './connectivity';
import {
  credentialTypesForTransport,
  formValueToCredentials,
  isMqttBasicValid,
  isValidAccessToken,
} from './credentials-value';
import {
  type CredentialsFlatValue,
  DeviceCredentialsFields,
} from './DeviceCredentialsFields';

export interface DeviceWizardModalProps {
  open: boolean;
  onClose: () => void;
  /** Fires on "finish" with the created device (list invalidates + toasts). */
  onCreated: (device: Device) => void;
}

interface DetailsFormValue {
  name: string;
  label?: string;
  gateway: boolean;
  overwriteActivityTime: boolean;
  description?: string;
}

const STEP_PROFILE = 0;
const STEP_DETAILS = 1;
const STEP_CREDENTIALS = 2;
const STEP_CONNECTIVITY = 3;

export function DeviceWizardModal({
  open,
  onClose,
  onCreated,
}: DeviceWizardModalProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [step, setStep] = useState(STEP_PROFILE);
  const [profileId, setProfileId] = useState<string>();
  const [created, setCreated] = useState<Device>();
  const [createError, setCreateError] = useState<string>();
  const [profileSearch, setProfileSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Details values are captured when leaving step 2: the step's <Form>
  // unmounts on the step change and a disconnected form reads back {} —
  // building the device from getFieldsValue() at step 3 would lose the name.
  const [detailsValues, setDetailsValues] = useState<DetailsFormValue>();

  const [profileForm] = Form.useForm();
  const [detailsForm] = Form.useForm();
  const [credentialsForm] = Form.useForm();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(profileSearch.trim());
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [profileSearch]);

  const profilesQuery = useQuery({
    queryKey: ['device-profiles', 'wizard', debouncedSearch],
    queryFn: () =>
      getDeviceProfiles({
        pageSize: 50,
        page: 0,
        textSearch: debouncedSearch || undefined,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
    enabled: open,
  });

  const profiles: Array<DeviceProfileInfo> = profilesQuery.data?.data ?? [];
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id.id === profileId),
    [profiles, profileId],
  );
  const allowedTypes = credentialTypesForTransport(
    selectedProfile?.transportType,
  );

  // Reset between openings.
  useEffect(() => {
    if (open) {
      setStep(STEP_PROFILE);
      setProfileId(undefined);
      setCreated(undefined);
      setCreateError(undefined);
      setProfileSearch('');
      setDebouncedSearch('');
      setDetailsValues(undefined);
      profileForm.resetFields();
      detailsForm.resetFields();
      credentialsForm.resetFields();
    }
  }, [open, profileForm, detailsForm, credentialsForm]);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      device: Device;
      credentials?: DeviceCredentials;
    }) =>
      payload.credentials
        ? saveDeviceWithCredentials(payload.device, payload.credentials)
        : saveDevice(payload.device),
    onSuccess: (device) => {
      setCreated(device);
      setCreateError(undefined);
      setStep(STEP_CONNECTIVITY);
    },
    onError: (error) => {
      setCreateError(serverErrorText(error));
    },
  });

  // Create payload: the backend mints id/createdTime — sending a blank
  // EntityId UUID (or createdTime 0) fails Device deserialization with
  // "Invalid UUID string" (verified against the live backend).
  type DeviceDraft = Omit<Device, 'id' | 'createdTime'>;
  const buildDevice = (values: Partial<DetailsFormValue>): Device => {
    const draft: DeviceDraft = {
      name: (values.name ?? '').trim(),
      label: values.label?.trim() || undefined,
      deviceProfileId: {
        entityType: EntityType.DEVICE_PROFILE,
        id: profileId as string,
      },
      additionalInfo: {
        gateway: !!values.gateway,
        overwriteActivityTime: !!values.overwriteActivityTime,
        description: values.description?.trim() || undefined,
      },
    };
    return draft as Device;
  };

  const collectWireCredentials = (
    flat: CredentialsFlatValue,
  ): DeviceCredentials | undefined => {
    if (
      flat.credentialsType === DeviceCredentialsType.ACCESS_TOKEN &&
      !isValidAccessToken(flat.credentialsId)
    ) {
      return undefined;
    }
    if (
      flat.credentialsType === DeviceCredentialsType.MQTT_BASIC &&
      !isMqttBasicValid({
        clientId: flat.clientId ?? '',
        userName: flat.userName ?? '',
        password: flat.password ?? '',
      })
    ) {
      return undefined;
    }
    return formValueToCredentials({
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
    });
  };

  const gotoDetails = async () => {
    await profileForm.validateFields();
    setStep(STEP_DETAILS);
  };

  const gotoCredentials = async () => {
    const values = (await detailsForm.validateFields()) as DetailsFormValue;
    // Stash before the step change unmounts the details form (its store is
    // detached on unmount; the create step reads this stash instead).
    setDetailsValues(values);
    setStep(STEP_CREDENTIALS);
  };

  const createWithCredentials = async () => {
    const flat = await credentialsForm.validateFields();
    const credentials = collectWireCredentials(flat);
    const device = buildDevice(detailsValues ?? {});
    if (!credentials) {
      // Nothing usable typed — fall back to the backend-generated token so
      // the wizard never blocks creation (ui-ngx "optional step" semantics).
      createMutation.mutate({ device });
      return;
    }
    createMutation.mutate({ device, credentials });
  };

  const createSkippingCredentials = () => {
    createMutation.mutate({ device: buildDevice(detailsValues ?? {}) });
  };

  const finish = () => {
    if (created) {
      onCreated(created);
      void message.success(
        formatMessage({
          id: 'pages.devices.list.toastDeviceCreated',
          defaultMessage: 'Device created.',
        }),
      );
    }
    onClose();
  };

  const stepItems = [
    {
      title: formatMessage({
        id: 'pages.devices.list.wizardStepProfile',
        defaultMessage: 'Select device profile',
      }),
    },
    {
      title: formatMessage({
        id: 'pages.devices.list.wizardStepDetails',
        defaultMessage: 'Device details',
      }),
    },
    {
      title: formatMessage({
        id: 'pages.devices.list.wizardStepCredentials',
        defaultMessage: 'Credentials',
      }),
    },
    {
      title: formatMessage({
        id: 'pages.devices.list.wizardStepConnectivity',
        defaultMessage: 'Check connectivity',
      }),
    },
  ];

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.devices.list.wizardTitle',
        defaultMessage: 'Add new device',
      })}
      width={720}
      footer={null}
      destroyOnHidden
      onCancel={onClose}
    >
      <Steps size="small" current={step} items={stepItems} className="mb-6" />
      {createError && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          closable
          onClose={() => setCreateError(undefined)}
          title={createError}
        />
      )}

      {step === STEP_PROFILE && (
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={() => void gotoDetails()}
        >
          <Form.Item
            name="profileId"
            label={formatMessage({
              id: 'pages.devices.list.profile',
              defaultMessage: 'Device profile',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.devices.list.wizardProfileRequired',
                  defaultMessage: 'Device profile is required.',
                }),
              },
            ]}
          >
            <Select
              showSearch
              filterOption={false}
              onSearch={setProfileSearch}
              loading={profilesQuery.isPending}
              placeholder={formatMessage({
                id: 'pages.devices.list.wizardProfilePlaceholder',
                defaultMessage: 'Search and select a device profile',
              })}
              options={profiles.map((profile) => ({
                label: profile.name,
                value: profile.id.id,
              }))}
              onChange={(value) => setProfileId(value)}
            />
          </Form.Item>
          <WizardActions
            okText={formatMessage({
              id: 'pages.devices.list.wizardNext',
              defaultMessage: 'Next',
            })}
            okHtmlType="submit"
            onCancel={onClose}
          />
        </Form>
      )}

      {step === STEP_DETAILS && (
        <Form
          form={detailsForm}
          layout="vertical"
          initialValues={{ gateway: false, overwriteActivityTime: false }}
          onFinish={() => void gotoCredentials()}
        >
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'pages.devices.list.wizardName',
              defaultMessage: 'Name',
            })}
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage({
                  id: 'pages.devices.list.wizardNameRequired',
                  defaultMessage: 'Name is required.',
                }),
              },
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.devices.list.wizardNameMaxLength',
                  defaultMessage: 'Name should be less than 256 characters.',
                }),
              },
            ]}
          >
            <Input autoFocus />
          </Form.Item>
          <Form.Item
            name="label"
            label={formatMessage({
              id: 'pages.devices.list.label',
              defaultMessage: 'Label',
            })}
            rules={[
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.devices.list.wizardLabelMaxLength',
                  defaultMessage: 'Label should be less than 256 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="gateway" valuePropName="checked" noStyle>
            <Checkbox>
              {formatMessage({
                id: 'pages.devices.list.isGateway',
                defaultMessage: 'Is gateway',
              })}
            </Checkbox>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) => prev.gateway !== next.gateway}
          >
            {({ getFieldValue }) =>
              getFieldValue('gateway') ? (
                <Form.Item
                  name="overwriteActivityTime"
                  valuePropName="checked"
                  className="mt-2"
                >
                  <Checkbox>
                    {formatMessage({
                      id: 'pages.devices.list.wizardOverwriteActivityTime',
                      defaultMessage:
                        'Overwrite activity time for connected device',
                    })}
                  </Checkbox>
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="description"
            className="mt-2"
            label={formatMessage({
              id: 'pages.devices.list.wizardDescription',
              defaultMessage: 'Description',
            })}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <WizardActions
            onBack={() => setStep(STEP_PROFILE)}
            okText={formatMessage({
              id: 'pages.devices.list.wizardNext',
              defaultMessage: 'Next',
            })}
            okHtmlType="submit"
            onCancel={onClose}
          />
        </Form>
      )}

      {step === STEP_CREDENTIALS && (
        <Form form={credentialsForm} layout="vertical">
          <DeviceCredentialsFields
            allowedTypes={allowedTypes}
            initAccessToken
          />
          <WizardActions
            onBack={() => setStep(STEP_DETAILS)}
            okText={formatMessage({
              id: 'pages.devices.list.wizardCreate',
              defaultMessage: 'Create device',
            })}
            okLoading={createMutation.isPending}
            okOnClick={() => void createWithCredentials()}
            extra={
              <Button
                type="text"
                disabled={createMutation.isPending}
                onClick={createSkippingCredentials}
              >
                {formatMessage({
                  id: 'pages.devices.list.wizardSkipCredentials',
                  defaultMessage: 'Skip (auto-generate credentials)',
                })}
              </Button>
            }
            onCancel={onClose}
          />
        </Form>
      )}

      {step === STEP_CONNECTIVITY && (
        <div className="flex flex-col gap-4">
          <Typography.Paragraph type="secondary">
            {formatMessage({
              id: 'pages.devices.list.wizardCreatedHint',
              defaultMessage:
                'The device has been created. You can check its connectivity before finishing.',
            })}
          </Typography.Paragraph>
          <ConnectivityPanel deviceId={created?.id.id} afterAdd />
          <WizardActions
            okText={formatMessage({
              id: 'pages.devices.list.wizardFinish',
              defaultMessage: 'Finish',
            })}
            okOnClick={finish}
            onCancel={onClose}
          />
        </div>
      )}
    </Modal>
  );
}

/** Shared bottom actions row (cancel on the left, flow buttons on the right). */
function WizardActions({
  onBack,
  okText,
  okHtmlType,
  okOnClick,
  okLoading,
  extra,
  onCancel,
}: {
  onBack?: () => void;
  okText: string;
  okHtmlType?: 'submit';
  okOnClick?: () => void;
  okLoading?: boolean;
  extra?: React.ReactNode;
  onCancel: () => void;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className="flex items-center justify-between gap-2 border-t border-t-solid pt-4">
      <Button onClick={onCancel}>
        {formatMessage({
          id: 'pages.devices.list.cancel',
          defaultMessage: 'Cancel',
        })}
      </Button>
      <div className="flex items-center gap-2">
        {extra}
        {onBack && (
          <Button onClick={onBack}>
            {formatMessage({
              id: 'pages.devices.list.back',
              defaultMessage: 'Back',
            })}
          </Button>
        )}
        <Button
          type="primary"
          htmlType={okHtmlType}
          onClick={okOnClick}
          loading={okLoading}
        >
          {okText}
        </Button>
      </div>
    </div>
  );
}
