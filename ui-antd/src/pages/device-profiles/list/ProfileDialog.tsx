/**
 * Device-profile add/edit dialog (ui-ngx device-profile dialog parity for
 * the create path: name + type + transport type + description; the deep
 * configuration panels live on the detail page in this port, so the dialog
 * carries the identity fields only).
 *
 * Create posts a draft WITHOUT id/createdTime (the backend mints them) and
 * seeds profileData with the ui-ngx factory defaults for the chosen
 * transport type (createDeviceProfileTransportConfiguration). Edit keeps
 * profileData verbatim unless the transport type actually changed — then it
 * is rebuilt from the same factory, exactly like ui-ngx's
 * deviceProfileTransportTypeChanged.
 */
import { useMutation } from '@tanstack/react-query';
import { App, Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { saveDeviceProfile } from '@/services/tb/device-profile';
import { DeviceProfileType, DeviceTransportType } from '@/types/tb/device';
import {
  type DeviceProfile,
  DeviceProvisionType,
} from '@/types/tb/device-profile';
import {
  createDeviceProfileConfiguration,
  createDeviceProfileTransportConfiguration,
} from '../transport-defaults';

export interface ProfileDialogProps {
  open: boolean;
  /** Present = edit this profile; absent = create. */
  profile?: DeviceProfile | null;
  onClose: () => void;
  /** Fires after a successful save (list invalidates + toasts). */
  onSaved: (saved: DeviceProfile) => void;
}

interface ProfileFormValues {
  name: string;
  transportType: DeviceTransportType;
  description?: string;
}

export function ProfileDialog({
  open,
  profile,
  onClose,
  onSaved,
}: ProfileDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<ProfileFormValues>();
  const editing = !!profile;

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        profile
          ? {
              name: profile.name,
              transportType: profile.transportType,
              description: profile.description ?? '',
            }
          : {
              name: '',
              transportType: DeviceTransportType.DEFAULT,
              description: '',
            },
      );
    }
  }, [open, profile, form]);

  const saveMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      const name = values.name.trim();
      const description = values.description?.trim() || undefined;
      if (
        editing &&
        profile &&
        values.transportType === profile.transportType
      ) {
        return saveDeviceProfile({
          ...profile,
          name,
          description,
        });
      }
      // Create, or the transport type changed: rebuild profileData from the
      // factory defaults (ui-ngx deviceProfileTransportTypeChanged parity).
      const profileData = {
        configuration: createDeviceProfileConfiguration(
          DeviceProfileType.DEFAULT,
        ),
        transportConfiguration: createDeviceProfileTransportConfiguration(
          values.transportType,
        ),
        provisionConfiguration: { type: DeviceProvisionType.DISABLED },
      };
      if (editing && profile) {
        return saveDeviceProfile({
          ...profile,
          name,
          description,
          type: DeviceProfileType.DEFAULT,
          transportType: values.transportType,
          provisionType: DeviceProvisionType.DISABLED,
          profileData,
        });
      }
      // Create: backend mints id/createdTime — omit both.
      return saveDeviceProfile({
        name,
        description,
        default: false,
        type: DeviceProfileType.DEFAULT,
        transportType: values.transportType,
        provisionType: DeviceProvisionType.DISABLED,
        profileData,
      } as DeviceProfile);
    },
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.device-profiles.dialog.toastSaved',
          defaultMessage: 'Device profile saved.',
        }),
      );
      onSaved(saved);
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.device-profiles.dialog.saveFailed',
            defaultMessage: 'Failed to save the device profile: {reason}',
          },
          { reason: serverErrorText(error) },
        ),
      );
    },
  });

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: editing
          ? 'pages.device-profiles.dialog.editTitle'
          : 'pages.device-profiles.dialog.addTitle',
        defaultMessage: editing
          ? 'Edit device profile'
          : 'Add new device profile',
      })}
      destroyOnHidden
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      okText={formatMessage({
        id: 'pages.device-profiles.dialog.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.device-profiles.dialog.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={() => form.submit()}
    >
      <Form<ProfileFormValues>
        form={form}
        layout="vertical"
        disabled={saveMutation.isPending}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'pages.device-profiles.dialog.name',
            defaultMessage: 'Name',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.device-profiles.dialog.nameRequired',
                defaultMessage: 'Name is required.',
              }),
            },
            {
              max: 255,
              message: formatMessage({
                id: 'pages.device-profiles.dialog.nameTooLong',
                defaultMessage: 'Name must be at most 255 characters.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
        {/* ui-ngx ships one profile type (DEFAULT); SNMP profile
            configuration has no editor in v1 (M1 complex-editor precedent). */}
        <Form.Item
          name="type"
          label={formatMessage({
            id: 'pages.device-profiles.dialog.type',
            defaultMessage: 'Profile type',
          })}
          initialValue="DEFAULT"
        >
          <Select
            disabled
            options={[
              {
                label: formatMessage({
                  id: 'pages.device-profiles.typeDefault',
                  defaultMessage: 'Default',
                }),
                value: 'DEFAULT',
              },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="transportType"
          label={formatMessage({
            id: 'pages.device-profiles.dialog.transportType',
            defaultMessage: 'Transport type',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.device-profiles.dialog.transportTypeRequired',
                defaultMessage: 'Transport type is required.',
              }),
            },
          ]}
        >
          <Select
            options={(
              Object.values(DeviceTransportType) as Array<DeviceTransportType>
            ).map((type) => ({
              label: formatMessage({
                id: `pages.device-profiles.transport.${type}`,
                defaultMessage: type,
              }),
              value: type,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="description"
          label={formatMessage({
            id: 'pages.device-profiles.dialog.description',
            defaultMessage: 'Description',
          })}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
