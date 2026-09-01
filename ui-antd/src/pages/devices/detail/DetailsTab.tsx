/**
 * Device details tab (spec 3.3 `details`): view/edit the device entity
 * fields with the ui-ngx field set — name (required, ≤255), device profile
 * (required), label (≤255), gateway / overwrite-activity-time switches and
 * the free-form description. Saving posts the full device via saveDevice
 * (partial PATCH is not a TB concept) and invalidates the detail query.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  App,
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Switch,
  Typography,
} from 'antd';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/devices/server-error-text';
import { getDeviceProfiles, saveDevice } from '@/services/tb/device';
import { type Device, type DeviceInfo, EntityType } from '@/types/tb';

export interface DeviceDetailsFormValues {
  name: string;
  deviceProfileId: string;
  label: string;
  gateway: boolean;
  overwriteActivityTime: boolean;
  description: string;
}

function toFormValues(device: DeviceInfo): DeviceDetailsFormValues {
  const info = (device.additionalInfo ?? {}) as {
    gateway?: boolean;
    overwriteActivityTime?: boolean;
    description?: string;
  };
  return {
    name: device.name,
    deviceProfileId: device.deviceProfileId?.id ?? '',
    label: device.label ?? '',
    gateway: info.gateway ?? false,
    overwriteActivityTime: info.overwriteActivityTime ?? false,
    description: info.description ?? '',
  };
}

export function isDeviceDetailsDirty(
  values: DeviceDetailsFormValues,
  device: DeviceInfo,
): boolean {
  const baseline = toFormValues(device);
  return (
    values.name !== baseline.name ||
    values.deviceProfileId !== baseline.deviceProfileId ||
    values.label !== baseline.label ||
    values.gateway !== baseline.gateway ||
    values.overwriteActivityTime !== baseline.overwriteActivityTime ||
    values.description !== baseline.description
  );
}

export function toSaveDevicePayload(
  values: DeviceDetailsFormValues,
  device: DeviceInfo,
): Device {
  return {
    ...device,
    name: values.name,
    label: values.label,
    deviceProfileId: {
      entityType: EntityType.DEVICE_PROFILE,
      id: values.deviceProfileId,
    },
    additionalInfo: {
      ...(device.additionalInfo ?? {}),
      gateway: values.gateway,
      overwriteActivityTime: values.overwriteActivityTime,
      description: values.description,
    },
  };
}

export default function DetailsTab({
  device,
  editing,
  onEditingChange,
  onDirtyChange,
}: {
  device: DeviceInfo;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<DeviceDetailsFormValues>();

  const initialValues = useMemo(() => toFormValues(device), [device]);
  const values = Form.useWatch([], form);
  // Dirty is only meaningful while editing: the read-only display form can
  // transiently diverge from the baseline (e.g. profile select not yet
  // loaded) and must never trip the unsaved-changes guard.
  const dirty = editing && !!values && isDeviceDetailsDirty(values, device);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // Remount the form whenever the server-side values actually change (after
  // a save + invalidation): the key makes initialValues re-apply without
  // clobbering in-progress edits on identity-only refetches.
  const formKey = useMemo(() => JSON.stringify(initialValues), [initialValues]);

  const profilesQuery = useQuery({
    queryKey: ['device-profiles', 'detail-select', device.id.id],
    queryFn: () =>
      getDeviceProfiles({
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
    enabled: editing,
  });

  const saveMutation = useMutation({
    mutationFn: (formValues: DeviceDetailsFormValues) =>
      saveDevice(toSaveDevicePayload(formValues, device)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.toastSaved',
          defaultMessage: 'Device saved.',
        }),
      );
      onEditingChange(false);
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.devices.detail.saveFailed',
            defaultMessage: 'Failed to save the device: {reason}',
          },
          { reason: serverErrorText(error) },
        ),
      );
    },
  });

  const profileOptions = (profilesQuery.data?.data ?? []).map((profile) => ({
    label: profile.name,
    value: profile.id.id,
  }));
  // Keep the current profile selectable even when not in the first page.
  if (
    editing &&
    initialValues.deviceProfileId &&
    !profileOptions.some(
      (option) => option.value === initialValues.deviceProfileId,
    )
  ) {
    profileOptions.push({
      label: device.deviceProfileName || initialValues.deviceProfileId,
      value: initialValues.deviceProfileId,
    });
  }

  if (!editing) {
    const info = (device.additionalInfo ?? {}) as { description?: string };
    return (
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.devices.detail.name',
              defaultMessage: 'Name',
            })}
          </Typography.Text>
          <Typography.Paragraph>{device.name}</Typography.Paragraph>
        </Col>
        <Col span={12}>
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.devices.detail.profile',
              defaultMessage: 'Device profile',
            })}
          </Typography.Text>
          <Typography.Paragraph>
            {device.deviceProfileName || '-'}
          </Typography.Paragraph>
        </Col>
        <Col span={12}>
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.devices.detail.label',
              defaultMessage: 'Label',
            })}
          </Typography.Text>
          <Typography.Paragraph>{device.label || '-'}</Typography.Paragraph>
        </Col>
        <Col span={12}>
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.devices.detail.isGateway',
              defaultMessage: 'Is gateway',
            })}
          </Typography.Text>
          <Typography.Paragraph>
            {formatMessage({
              id: ((device.additionalInfo ?? {}) as { gateway?: boolean })
                .gateway
                ? 'pages.devices.detail.yes'
                : 'pages.devices.detail.no',
              defaultMessage: (
                (device.additionalInfo ?? {}) as {
                  gateway?: boolean;
                }
              ).gateway
                ? 'Yes'
                : 'No',
            })}
          </Typography.Paragraph>
        </Col>
        <Col span={24}>
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.devices.detail.description',
              defaultMessage: 'Description',
            })}
          </Typography.Text>
          <Typography.Paragraph>{info.description || '-'}</Typography.Paragraph>
        </Col>
      </Row>
    );
  }

  return (
    <Form<DeviceDetailsFormValues>
      key={formKey}
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(formValues) => saveMutation.mutate(formValues)}
      disabled={saveMutation.isPending}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'pages.devices.detail.name',
              defaultMessage: 'Name',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.devices.detail.nameRequired',
                  defaultMessage: 'Name is required.',
                }),
              },
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.devices.detail.nameTooLong',
                  defaultMessage: 'Name must be at most 255 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="deviceProfileId"
            label={formatMessage({
              id: 'pages.devices.detail.profile',
              defaultMessage: 'Device profile',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.devices.detail.profileRequired',
                  defaultMessage: 'Device profile is required.',
                }),
              },
            ]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={profilesQuery.isPending}
              options={profileOptions}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="label"
            label={formatMessage({
              id: 'pages.devices.detail.label',
              defaultMessage: 'Label',
            })}
            rules={[
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.devices.detail.labelTooLong',
                  defaultMessage: 'Label must be at most 255 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="gateway"
            label={formatMessage({
              id: 'pages.devices.detail.isGateway',
              defaultMessage: 'Is gateway',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="overwriteActivityTime"
            label={formatMessage({
              id: 'pages.devices.detail.overwriteActivityTime',
              defaultMessage: 'Overwrite activity time for gateway',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            name="description"
            label={formatMessage({
              id: 'pages.devices.detail.description',
              defaultMessage: 'Description',
            })}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Col>
      </Row>
      <Button
        type="primary"
        htmlType="submit"
        loading={saveMutation.isPending}
        disabled={!dirty}
      >
        {formatMessage({
          id: 'pages.devices.detail.save',
          defaultMessage: 'Save',
        })}
      </Button>
    </Form>
  );
}
