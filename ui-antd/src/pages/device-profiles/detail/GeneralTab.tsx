/**
 * Device-profile General tab (ui-ngx device-profile.component details-page
 * field set): name, default rule chain, mobile dashboard (select-only —
 * principle 3), default queue, default edge rule chain, firmware/software
 * OTA packages, type (fixed DEFAULT), image, description. The profile
 * configuration rides below as a collapse panel (empty for the DEFAULT
 * type — ui-ngx default-device-profile-configuration renders no fields).
 *
 * Save posts the FULL profile (TB has no PATCH); profileData is carried
 * verbatim — transport/provisioning tabs own their slices.
 */
import { SaveOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Col,
  Collapse,
  Form,
  Input,
  Row,
  Select,
  Typography,
} from 'antd';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { ImageField } from '@/components/profiles/image-field';
import {
  DashboardSelect,
  OtaPackageSelect,
  QueueNameSelect,
  RuleChainSelect,
} from '@/components/profiles/selects';
import { saveDeviceProfile } from '@/services/tb/device-profile';
import { EntityType } from '@/types/tb';
import { type DeviceProfile, OtaPackageType } from '@/types/tb/device-profile';

export interface DeviceGeneralFormValues {
  name: string;
  defaultRuleChainId?: string;
  defaultDashboardId?: string;
  defaultQueueName?: string;
  defaultEdgeRuleChainId?: string;
  firmwareId?: string;
  softwareId?: string;
  image?: string;
  description?: string;
}

function toFormValues(profile: DeviceProfile): DeviceGeneralFormValues {
  return {
    name: profile.name,
    defaultRuleChainId: profile.defaultRuleChainId?.id,
    defaultDashboardId: profile.defaultDashboardId?.id,
    defaultQueueName: profile.defaultQueueName,
    defaultEdgeRuleChainId: profile.defaultEdgeRuleChainId?.id,
    firmwareId: profile.firmwareId?.id,
    softwareId: profile.softwareId?.id,
    image: profile.image,
    description: profile.description ?? '',
  };
}

export function isDeviceGeneralDirty(
  values: DeviceGeneralFormValues,
  profile: DeviceProfile,
): boolean {
  const baseline = toFormValues(profile);
  return (
    values.name !== baseline.name ||
    values.defaultRuleChainId !== baseline.defaultRuleChainId ||
    values.defaultDashboardId !== baseline.defaultDashboardId ||
    values.defaultQueueName !== baseline.defaultQueueName ||
    values.defaultEdgeRuleChainId !== baseline.defaultEdgeRuleChainId ||
    values.firmwareId !== baseline.firmwareId ||
    values.softwareId !== baseline.softwareId ||
    values.image !== baseline.image ||
    values.description !== baseline.description
  );
}

export default function GeneralTab({
  profile,
  editing,
  onEditingChange,
  onDirtyChange,
}: {
  profile: DeviceProfile;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<DeviceGeneralFormValues>();

  const initialValues = useMemo(() => toFormValues(profile), [profile]);
  const values = Form.useWatch([], form);
  const dirty = editing && !!values && isDeviceGeneralDirty(values, profile);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // Remount the form whenever the server-side values actually change (after
  // a save + invalidation) so initialValues re-apply.
  const formKey = useMemo(() => JSON.stringify(initialValues), [initialValues]);

  useEffect(() => {
    if (editing) {
      form.setFieldsValue(initialValues);
    }
  }, [editing, form, initialValues]);

  const saveMutation = useMutation({
    mutationFn: (formValues: DeviceGeneralFormValues) =>
      saveDeviceProfile(toSaveProfilePayload(formValues, profile)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.device-profiles.detail.toastSaved',
          defaultMessage: 'Device profile saved.',
        }),
      );
      onEditingChange(false);
      void queryClient.invalidateQueries({
        queryKey: ['device-profile', 'detail'],
      });
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.device-profiles.detail.saveFailed',
            defaultMessage: 'Failed to save the device profile: {reason}',
          },
          { reason: serverErrorText(error) },
        ),
      );
    },
  });

  return (
    <Form<DeviceGeneralFormValues>
      key={formKey}
      form={form}
      layout="vertical"
      disabled={!editing || saveMutation.isPending}
      onFinish={(next) => saveMutation.mutate(next)}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
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
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="defaultRuleChainId"
            label={formatMessage({
              id: 'pages.device-profiles.detail.defaultRuleChain',
              defaultMessage: 'Default rule chain',
            })}
          >
            <RuleChainSelect />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="defaultDashboardId"
            label={formatMessage({
              id: 'pages.device-profiles.detail.mobileDashboard',
              defaultMessage: 'Mobile dashboard',
            })}
            extra={formatMessage({
              id: 'pages.device-profiles.detail.mobileDashboardHint',
              defaultMessage:
                'Mobile application uses this dashboard as a device details dashboard.',
            })}
          >
            {/* Select-only entry (spec principle 3): no editor access here. */}
            <DashboardSelect />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="defaultQueueName"
            label={formatMessage({
              id: 'pages.device-profiles.detail.defaultQueueName',
              defaultMessage: 'Default queue name',
            })}
            extra={formatMessage({
              id: 'pages.device-profiles.detail.selectQueueHint',
              defaultMessage: 'Choose from a dropdown list.',
            })}
          >
            <QueueNameSelect />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="defaultEdgeRuleChainId"
            label={formatMessage({
              id: 'pages.device-profiles.detail.defaultEdgeRuleChain',
              defaultMessage: 'Default edge rule chain',
            })}
            extra={formatMessage({
              id: 'pages.device-profiles.detail.defaultEdgeRuleChainHint',
              defaultMessage:
                'Used as default rule chain on the edge to process incoming data of the devices provisioned with this device profile.',
            })}
          >
            <RuleChainSelect ruleChainType="EDGE" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="firmwareId"
            label={formatMessage({
              id: 'pages.device-profiles.detail.firmware',
              defaultMessage: 'Firmware',
            })}
          >
            <OtaPackageSelect
              deviceProfileId={profile.id.id}
              otaPackageType={OtaPackageType.FIRMWARE}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="softwareId"
            label={formatMessage({
              id: 'pages.device-profiles.detail.software',
              defaultMessage: 'Software',
            })}
          >
            <OtaPackageSelect
              deviceProfileId={profile.id.id}
              otaPackageType={OtaPackageType.SOFTWARE}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label={formatMessage({
              id: 'pages.device-profiles.dialog.type',
              defaultMessage: 'Profile type',
            })}
          >
            {/* ui-ngx hides the type select on the details page; show the
                fixed value instead of an editable control. */}
            <Select
              disabled
              value={profile.type}
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
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="image"
            label={formatMessage({
              id: 'pages.device-profiles.detail.image',
              defaultMessage: 'Device profile image',
            })}
          >
            <ImageField />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            name="description"
            label={formatMessage({
              id: 'pages.device-profiles.dialog.description',
              defaultMessage: 'Description',
            })}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Col>
      </Row>

      {/* ui-ngx renders this expansion panel only when the profile type has
          a configuration form; DEFAULT ships none, so the panel shows the
          fixed type plus a no-fields note (SNMP configuration = leftover). */}
      <Collapse
        items={[
          {
            key: 'profile-configuration',
            label: formatMessage({
              id: 'pages.device-profiles.detail.profileConfiguration',
              defaultMessage: 'Profile configuration',
            }),
            children: (
              <Typography.Text type="secondary">
                {profile.type === 'DEFAULT'
                  ? formatMessage({
                      id: 'pages.device-profiles.detail.defaultConfigurationEmpty',
                      defaultMessage:
                        'The default profile type has no additional configuration.',
                    })
                  : formatMessage({
                      id: 'pages.device-profiles.detail.configurationNotEditable',
                      defaultMessage:
                        'This profile type has no configuration editor in v1; the stored configuration is preserved on save.',
                    })}
              </Typography.Text>
            ),
          },
        ]}
      />

      {editing && (
        <div className="mt-4 flex justify-end">
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
        </div>
      )}
      {saveMutation.isError && (
        <Typography.Text type="danger" className="mt-2 block">
          {serverErrorText(saveMutation.error)}
        </Typography.Text>
      )}
    </Form>
  );
}

/** Full-profile save payload (profileData rides verbatim). */
function toSaveProfilePayload(
  values: DeviceGeneralFormValues,
  profile: DeviceProfile,
): DeviceProfile {
  return {
    ...profile,
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    image: values.image,
    defaultRuleChainId: values.defaultRuleChainId
      ? { entityType: EntityType.RULE_CHAIN, id: values.defaultRuleChainId }
      : undefined,
    defaultDashboardId: values.defaultDashboardId
      ? { entityType: EntityType.DASHBOARD, id: values.defaultDashboardId }
      : undefined,
    defaultQueueName: values.defaultQueueName,
    defaultEdgeRuleChainId: values.defaultEdgeRuleChainId
      ? { entityType: EntityType.RULE_CHAIN, id: values.defaultEdgeRuleChainId }
      : undefined,
    firmwareId: values.firmwareId
      ? { entityType: EntityType.OTA_PACKAGE, id: values.firmwareId }
      : undefined,
    softwareId: values.softwareId
      ? { entityType: EntityType.OTA_PACKAGE, id: values.softwareId }
      : undefined,
  };
}
