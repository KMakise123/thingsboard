/**
 * Asset entity form for the detail page-header area (ui-ngx asset.component
 * parity — the asset has NO details tab; its fields render under the page
 * title in the PageContainer content slot, edit-on-toggle).
 *
 * Field set is the ui-ngx entity form: name (required, <=255), asset profile
 * (required), label (<=255), description (additionalInfo.description). The
 * customer shows read-only — assignment is a separate action (list dialog /
 * header unassign button). Saving posts the full asset via saveAsset
 * (partial PATCH is not a TB concept) and invalidates the detail query.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { getAssetProfiles, saveAsset } from '@/services/tb/asset';
import { type AssetInfo, EntityType } from '@/types/tb';

export interface AssetDetailsFormValues {
  name: string;
  assetProfileId: string;
  label?: string;
  description?: string;
}

function toFormValues(asset: AssetInfo): AssetDetailsFormValues {
  return {
    name: asset.name,
    assetProfileId: asset.assetProfileId?.id ?? '',
    label: asset.label ?? '',
    description:
      ((asset.additionalInfo ?? {}) as { description?: string }).description ??
      '',
  };
}

export function isAssetDetailsDirty(
  values: AssetDetailsFormValues,
  asset: AssetInfo,
): boolean {
  const baseline = toFormValues(asset);
  return (
    values.name !== baseline.name ||
    values.assetProfileId !== baseline.assetProfileId ||
    values.label !== baseline.label ||
    values.description !== baseline.description
  );
}

export default function AssetDetailsForm({
  asset,
  editing,
  onEditingChange,
  onDirtyChange,
}: {
  asset: AssetInfo;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AssetDetailsFormValues>();

  const initialValues = useMemo(() => toFormValues(asset), [asset]);
  const values = Form.useWatch([], form);
  // Dirty is only meaningful while editing: the read-only display form can
  // transiently diverge from the baseline and must never trip the guard.
  const dirty = editing && !!values && isAssetDetailsDirty(values, asset);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // Remount the form whenever the server-side values actually change (after
  // a save + invalidation): the key makes initialValues re-apply without
  // clobbering in-progress edits on identity-only refetches.
  const formKey = useMemo(() => JSON.stringify(initialValues), [initialValues]);

  useEffect(() => {
    if (editing) {
      form.setFieldsValue(initialValues);
    }
  }, [editing, form, initialValues]);

  const profilesQuery = useQuery({
    queryKey: ['asset-profiles', 'detail-select', asset.id.id],
    queryFn: () =>
      getAssetProfiles({
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
    enabled: editing,
  });

  const saveMutation = useMutation({
    mutationFn: (formValues: AssetDetailsFormValues) =>
      saveAsset({
        ...asset,
        name: formValues.name.trim(),
        label: formValues.label?.trim() || undefined,
        assetProfileId: {
          entityType: EntityType.ASSET_PROFILE,
          id: formValues.assetProfileId,
        },
        additionalInfo: {
          ...((asset.additionalInfo ?? {}) as Record<string, unknown>),
          description: formValues.description?.trim() || undefined,
        },
      }),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.assets.detail.toastSaved',
          defaultMessage: 'Asset saved.',
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: ['asset', 'detail', asset.id.id],
      });
      onEditingChange(false);
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.assets.detail.saveFailed',
            defaultMessage: 'Failed to save the asset: {reason}',
          },
          { reason: serverErrorText(error) },
        ),
      );
    },
  });

  if (!editing) {
    const description = (
      (asset.additionalInfo ?? {}) as { description?: string }
    ).description;
    return (
      <Row gutter={[16, 8]} className="mb-2">
        <Col span={6}>
          <TypographyLabel
            text={formatMessage({
              id: 'pages.assets.detail.name',
              defaultMessage: 'Name',
            })}
          />
          <div>{asset.name}</div>
        </Col>
        <Col span={6}>
          <TypographyLabel
            text={formatMessage({
              id: 'pages.assets.detail.profile',
              defaultMessage: 'Asset profile',
            })}
          />
          <div>{asset.assetProfileName || '-'}</div>
        </Col>
        <Col span={6}>
          <TypographyLabel
            text={formatMessage({
              id: 'pages.assets.detail.label',
              defaultMessage: 'Label',
            })}
          />
          <div>{asset.label || '-'}</div>
        </Col>
        <Col span={6}>
          <TypographyLabel
            text={formatMessage({
              id: 'pages.assets.detail.customer',
              defaultMessage: 'Customer',
            })}
          />
          <div>
            {asset.customerTitle ? (
              <SpaceInline>
                <span>{asset.customerTitle}</span>
                {asset.customerIsPublic ? (
                  <Tag color="blue">
                    {formatMessage({
                      id: 'pages.assets.detail.public',
                      defaultMessage: 'Public',
                    })}
                  </Tag>
                ) : null}
              </SpaceInline>
            ) : (
              '-'
            )}
          </div>
        </Col>
        <Col span={24}>
          <TypographyLabel
            text={formatMessage({
              id: 'pages.assets.detail.description',
              defaultMessage: 'Description',
            })}
          />
          <div>{description || '-'}</div>
        </Col>
      </Row>
    );
  }

  const profileOptions = (profilesQuery.data?.data ?? []).map((profile) => ({
    label: profile.name,
    value: profile.id.id,
  }));
  // Keep the current profile selectable even when not in the first page.
  const currentProfileId = asset.assetProfileId?.id;
  if (
    currentProfileId &&
    !profileOptions.some((option) => option.value === currentProfileId)
  ) {
    profileOptions.push({
      label: asset.assetProfileName || currentProfileId,
      value: currentProfileId,
    });
  }

  return (
    <Form<AssetDetailsFormValues>
      key={formKey}
      form={form}
      layout="vertical"
      initialValues={initialValues}
      className="mb-4"
      onFinish={(formValues) => saveMutation.mutate(formValues)}
      disabled={saveMutation.isPending}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="name"
            label={formatMessage({
              id: 'pages.assets.detail.name',
              defaultMessage: 'Name',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.assets.detail.nameRequired',
                  defaultMessage: 'Name is required.',
                }),
              },
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.assets.detail.nameTooLong',
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
            name="assetProfileId"
            label={formatMessage({
              id: 'pages.assets.detail.profile',
              defaultMessage: 'Asset profile',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.assets.detail.profileRequired',
                  defaultMessage: 'Asset profile is required.',
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
              id: 'pages.assets.detail.label',
              defaultMessage: 'Label',
            })}
            rules={[
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.assets.detail.labelTooLong',
                  defaultMessage: 'Label must be at most 255 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            name="description"
            label={formatMessage({
              id: 'pages.assets.detail.description',
              defaultMessage: 'Description',
            })}
          >
            <Input.TextArea rows={2} autoSize />
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
          id: 'pages.assets.detail.save',
          defaultMessage: 'Save',
        })}
      </Button>
    </Form>
  );
}

function TypographyLabel({ text }: { text: string }) {
  return (
    <Typography.Text type="secondary" className="block">
      {text}
    </Typography.Text>
  );
}

function SpaceInline({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1">{children}</span>;
}
