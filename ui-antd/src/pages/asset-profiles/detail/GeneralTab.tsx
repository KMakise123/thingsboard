/**
 * Asset-profile General tab (ui-ngx asset-profile.component field set):
 * name, default rule chain, mobile dashboard (select-only — principle 3),
 * default queue, default edge rule chain, image, description. Save posts
 * the FULL profile (TB has no PATCH).
 */
import { SaveOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Col, Form, Input, Row, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { ImageField } from '@/components/profiles/image-field';
import {
  DashboardSelect,
  QueueNameSelect,
  RuleChainSelect,
} from '@/components/profiles/selects';
import { saveAssetProfile } from '@/services/tb/asset-profile';
import { EntityType } from '@/types/tb';
import type { AssetProfile } from '@/types/tb/asset-profile';

export interface AssetGeneralFormValues {
  name: string;
  defaultRuleChainId?: string;
  defaultDashboardId?: string;
  defaultQueueName?: string;
  defaultEdgeRuleChainId?: string;
  image?: string;
  description?: string;
}

function toFormValues(profile: AssetProfile): AssetGeneralFormValues {
  return {
    name: profile.name,
    defaultRuleChainId: profile.defaultRuleChainId?.id,
    defaultDashboardId: profile.defaultDashboardId?.id,
    defaultQueueName: profile.defaultQueueName,
    defaultEdgeRuleChainId: profile.defaultEdgeRuleChainId?.id,
    image: profile.image,
    description: profile.description ?? '',
  };
}

export function isAssetGeneralDirty(
  values: AssetGeneralFormValues,
  profile: AssetProfile,
): boolean {
  const baseline = toFormValues(profile);
  return (
    values.name !== baseline.name ||
    values.defaultRuleChainId !== baseline.defaultRuleChainId ||
    values.defaultDashboardId !== baseline.defaultDashboardId ||
    values.defaultQueueName !== baseline.defaultQueueName ||
    values.defaultEdgeRuleChainId !== baseline.defaultEdgeRuleChainId ||
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
  profile: AssetProfile;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AssetGeneralFormValues>();

  const initialValues = useMemo(() => toFormValues(profile), [profile]);
  const values = Form.useWatch([], form);
  const dirty = editing && !!values && isAssetGeneralDirty(values, profile);
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
    mutationFn: (formValues: AssetGeneralFormValues) =>
      saveAssetProfile(toSaveProfilePayload(formValues, profile)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.asset-profiles.detail.toastSaved',
          defaultMessage: 'Asset profile saved.',
        }),
      );
      onEditingChange(false);
      void queryClient.invalidateQueries({
        queryKey: ['asset-profile', 'detail'],
      });
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.asset-profiles.detail.saveFailed',
            defaultMessage: 'Failed to save the asset profile: {reason}',
          },
          { reason: serverErrorText(error) },
        ),
      );
    },
  });

  return (
    <Form<AssetGeneralFormValues>
      key={formKey}
      form={form}
      layout="vertical"
      // initialValues keep the read-only inputs showing the stored profile.
      initialValues={initialValues}
      disabled={!editing || saveMutation.isPending}
      onFinish={(next) => saveMutation.mutate(next)}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'pages.asset-profiles.dialog.name',
              defaultMessage: 'Name',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.asset-profiles.dialog.nameRequired',
                  defaultMessage: 'Name is required.',
                }),
              },
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.asset-profiles.dialog.nameTooLong',
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
              id: 'pages.asset-profiles.detail.defaultRuleChain',
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
              id: 'pages.asset-profiles.detail.mobileDashboard',
              defaultMessage: 'Mobile dashboard',
            })}
            extra={formatMessage({
              id: 'pages.asset-profiles.detail.mobileDashboardHint',
              defaultMessage:
                'Mobile applications use this dashboard as an asset details dashboard.',
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
              id: 'pages.asset-profiles.detail.defaultQueueName',
              defaultMessage: 'Default queue name',
            })}
            extra={formatMessage({
              id: 'pages.asset-profiles.detail.selectQueueHint',
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
              id: 'pages.asset-profiles.detail.defaultEdgeRuleChain',
              defaultMessage: 'Default edge rule chain',
            })}
            extra={formatMessage({
              id: 'pages.asset-profiles.detail.defaultEdgeRuleChainHint',
              defaultMessage:
                'Used as the rule chain on the edge to process the incoming data of the assets provisioned with this asset profile.',
            })}
          >
            <RuleChainSelect ruleChainType="EDGE" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="image"
            label={formatMessage({
              id: 'pages.asset-profiles.detail.image',
              defaultMessage: 'Asset profile image',
            })}
          >
            <ImageField />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            name="description"
            label={formatMessage({
              id: 'pages.asset-profiles.dialog.description',
              defaultMessage: 'Description',
            })}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Col>
      </Row>
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
              id: 'pages.asset-profiles.detail.save',
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

/** Full-profile save payload. */
function toSaveProfilePayload(
  values: AssetGeneralFormValues,
  profile: AssetProfile,
): AssetProfile {
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
  };
}
