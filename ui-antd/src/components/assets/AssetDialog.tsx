/**
 * Asset add/edit dialog (ui-ngx asset dialog parity: the entity form fields
 * — name (required, <=255), asset profile (required), label (<=255),
 * description; on create an optional assign-to-customer select, exactly the
 * ui-ngx `isAdd` customer autocomplete).
 *
 * Create posts a draft WITHOUT id/createdTime (the backend mints them; a
 * blank EntityId fails deserialization — device wizard found this first).
 * The optional create-time customer rides in the save body (TB assigns when
 * customerId is present); edit never touches the customer — assignment is a
 * separate list/detail action (ui-ngx shows the customer select on add only).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { App, Form, Input, Modal, Select } from 'antd';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { getAssetProfiles, saveAsset } from '@/services/tb/asset';
import { getCustomers } from '@/services/tb/customer';
import { type Asset, type AssetInfo, EntityType } from '@/types/tb';

export interface AssetDialogProps {
  open: boolean;
  /** Present = edit this asset; absent = create. */
  asset?: AssetInfo | null;
  onClose: () => void;
  /** Fires after a successful save (list invalidates + toasts). */
  onSaved: (saved: Asset) => void;
}

interface AssetFormValues {
  name: string;
  assetProfileId: string;
  label?: string;
  description?: string;
  /** Create-only: optional customer assignment. */
  customerId?: string;
}

function toFormValues(asset: AssetInfo): AssetFormValues {
  return {
    name: asset.name,
    assetProfileId: asset.assetProfileId?.id ?? '',
    label: asset.label ?? '',
    description:
      ((asset.additionalInfo ?? {}) as { description?: string }).description ??
      '',
  };
}

export function AssetDialog({
  open,
  asset,
  onClose,
  onSaved,
}: AssetDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<AssetFormValues>();
  const editing = !!asset;

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        asset
          ? toFormValues(asset)
          : {
              name: '',
              assetProfileId: '',
              label: '',
              description: '',
              customerId: undefined,
            },
      );
    }
  }, [open, asset, form]);

  const profilesQuery = useQuery({
    queryKey: ['asset-profiles', 'dialog'],
    queryFn: () =>
      getAssetProfiles({
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
    enabled: open,
  });

  const customersQuery = useQuery({
    queryKey: ['customers', 'asset-dialog'],
    queryFn: () =>
      getCustomers({
        pageSize: 50,
        page: 0,
        textSearch: undefined,
        sortOrder: { property: 'title', direction: 'ASC' },
      }),
    enabled: open && !editing,
  });

  const customerOptions = useMemo(
    () =>
      (customersQuery.data?.data ?? [])
        // The system public customer is not assignable (ui-ngx filters it).
        .filter((customer) => !customer.additionalInfo?.isPublic)
        .map((customer) => ({
          label: customer.title,
          value: customer.id.id,
        })),
    [customersQuery.data],
  );

  const saveMutation = useMutation({
    mutationFn: (values: AssetFormValues) => {
      const additionalInfo: Record<string, unknown> = {
        ...((asset?.additionalInfo ?? {}) as Record<string, unknown>),
        description: values.description?.trim() || undefined,
      };
      if (editing && asset) {
        const update: Asset = {
          ...asset,
          name: values.name.trim(),
          label: values.label?.trim() || undefined,
          assetProfileId: {
            entityType: EntityType.ASSET_PROFILE,
            id: values.assetProfileId,
          },
          additionalInfo,
        };
        return saveAsset(update);
      }
      // Create: backend mints id/createdTime — omit both.
      const draft = {
        name: values.name.trim(),
        label: values.label?.trim() || undefined,
        assetProfileId: {
          entityType: EntityType.ASSET_PROFILE,
          id: values.assetProfileId,
        },
        additionalInfo,
        ...(values.customerId
          ? {
              customerId: {
                entityType: EntityType.CUSTOMER,
                id: values.customerId,
              },
            }
          : {}),
      };
      return saveAsset(draft as Asset);
    },
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.assets.dialog.toastSaved',
          defaultMessage: 'Asset saved.',
        }),
      );
      onSaved(saved);
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.assets.dialog.saveFailed',
            defaultMessage: 'Failed to save the asset: {reason}',
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
  const currentProfileId = asset?.assetProfileId?.id;
  if (
    editing &&
    currentProfileId &&
    !profileOptions.some((option) => option.value === currentProfileId)
  ) {
    profileOptions.push({
      label: asset?.assetProfileName || currentProfileId,
      value: currentProfileId,
    });
  }

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: editing
          ? 'pages.assets.dialog.editTitle'
          : 'pages.assets.dialog.addTitle',
        defaultMessage: editing ? 'Edit asset' : 'Add new asset',
      })}
      destroyOnHidden
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      okText={formatMessage({
        id: 'pages.assets.dialog.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.assets.dialog.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={() => form.submit()}
    >
      <Form<AssetFormValues>
        form={form}
        layout="vertical"
        disabled={saveMutation.isPending}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'pages.assets.dialog.name',
            defaultMessage: 'Name',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.assets.dialog.nameRequired',
                defaultMessage: 'Name is required.',
              }),
            },
            {
              max: 255,
              message: formatMessage({
                id: 'pages.assets.dialog.nameTooLong',
                defaultMessage: 'Name must be at most 255 characters.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="assetProfileId"
          label={formatMessage({
            id: 'pages.assets.dialog.assetProfile',
            defaultMessage: 'Asset profile',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.assets.dialog.assetProfileRequired',
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
            placeholder={formatMessage({
              id: 'pages.assets.dialog.assetProfilePlaceholder',
              defaultMessage: 'Select an asset profile',
            })}
          />
        </Form.Item>
        <Form.Item
          name="label"
          label={formatMessage({
            id: 'pages.assets.dialog.label',
            defaultMessage: 'Label',
          })}
          rules={[
            {
              max: 255,
              message: formatMessage({
                id: 'pages.assets.dialog.labelTooLong',
                defaultMessage: 'Label must be at most 255 characters.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
        {!editing && (
          <Form.Item
            name="customerId"
            label={formatMessage({
              id: 'pages.assets.dialog.customer',
              defaultMessage: 'Assign to customer',
            })}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={customersQuery.isPending}
              options={customerOptions}
              placeholder={formatMessage({
                id: 'pages.assets.dialog.customerPlaceholder',
                defaultMessage: 'Leave unassigned',
              })}
            />
          </Form.Item>
        )}
        <Form.Item
          name="description"
          label={formatMessage({
            id: 'pages.assets.dialog.description',
            defaultMessage: 'Description',
          })}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
