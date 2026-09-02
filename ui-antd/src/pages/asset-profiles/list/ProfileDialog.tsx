/**
 * Asset-profile add/edit dialog (ui-ngx asset-profile dialog parity): name
 * (required, <=255) + description. The rest of the general fields live on
 * the detail page in this port. Create posts a draft WITHOUT id/createdTime
 * (the backend mints them — device wizard found this first).
 */
import { useMutation } from '@tanstack/react-query';
import { App, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { saveAssetProfile } from '@/services/tb/asset-profile';
import type { AssetProfile } from '@/types/tb/asset-profile';

export interface AssetProfileDialogProps {
  open: boolean;
  /** Present = edit this profile; absent = create. */
  profile?: AssetProfile | null;
  onClose: () => void;
  /** Fires after a successful save (list invalidates + toasts). */
  onSaved: (saved: AssetProfile) => void;
}

interface ProfileFormValues {
  name: string;
  description?: string;
}

export function AssetProfileDialog({
  open,
  profile,
  onClose,
  onSaved,
}: AssetProfileDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<ProfileFormValues>();
  const editing = !!profile;

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        profile
          ? { name: profile.name, description: profile.description ?? '' }
          : { name: '', description: '' },
      );
    }
  }, [open, profile, form]);

  const saveMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      const name = values.name.trim();
      const description = values.description?.trim() || undefined;
      if (editing && profile) {
        return saveAssetProfile({ ...profile, name, description });
      }
      return saveAssetProfile({
        name,
        description,
        default: false,
      } as AssetProfile);
    },
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.asset-profiles.dialog.toastSaved',
          defaultMessage: 'Asset profile saved.',
        }),
      );
      onSaved(saved);
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.asset-profiles.dialog.saveFailed',
            defaultMessage: 'Failed to save the asset profile: {reason}',
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
          ? 'pages.asset-profiles.dialog.editTitle'
          : 'pages.asset-profiles.dialog.addTitle',
        defaultMessage: editing
          ? 'Edit asset profile'
          : 'Add new asset profile',
      })}
      destroyOnHidden
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      okText={formatMessage({
        id: 'pages.asset-profiles.dialog.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.asset-profiles.dialog.cancel',
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
        <Form.Item
          name="description"
          label={formatMessage({
            id: 'pages.asset-profiles.dialog.description',
            defaultMessage: 'Description',
          })}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
