/**
 * Tenant create/edit dialog (ui-ngx tenant form, AntD modal). Fields come
 * from the shared TenantFormFields; save = POST /api/tenant (create and
 * update share the endpoint) — the host reloads the info shape afterwards
 * (ui-ngx saveEntity mergeMaps onto getTenantInfo).
 */
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  formValuesToTenant,
  TenantFormFields,
  type TenantFormValues,
  tenantToFormValues,
} from '@/components/tenants/TenantFormFields';
import { saveTenant } from '@/services/tb/tenant';
import type { TenantInfo } from '@/types/tb/tenant';

export interface TenantDialogProps {
  open: boolean;
  /** Null/undefined = create mode. */
  tenant?: TenantInfo | null;
  onClose: () => void;
  /** Save succeeded — the host toasts and invalidates. */
  onSaved: (tenant: TenantInfo) => void;
}

export function TenantDialog({
  open,
  tenant,
  onClose,
  onSaved,
}: TenantDialogProps) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<TenantFormValues>();
  const editing = !!tenant;
  const [serverError, setServerError] = useState<string>();

  useEffect(() => {
    if (open) {
      setServerError(undefined);
      form.resetFields();
      form.setFieldsValue(tenantToFormValues(tenant));
    }
  }, [open, tenant, form]);

  const saveMutation = useMutation({
    mutationFn: (values: TenantFormValues) =>
      saveTenant(formValuesToTenant(values, tenant)),
    onSuccess: (saved) => {
      onSaved(saved);
    },
    onError: (error) => {
      setServerError(serverErrorText(error));
    },
  });

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: editing
          ? 'pages.tenants.dialog.editTitle'
          : 'pages.tenants.dialog.createTitle',
        defaultMessage: editing ? 'Edit tenant' : 'Add tenant',
      })}
      width={640}
      onCancel={onClose}
      destroyOnHidden
      footer={null}
    >
      {serverError && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          closable
          onClose={() => setServerError(undefined)}
          title={serverError}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <TenantFormFields />
        <div className="flex items-center justify-end gap-2 border-t border-t-solid pt-4">
          <Button onClick={onClose}>
            {formatMessage({
              id: 'pages.common.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saveMutation.isPending}
          >
            {formatMessage({
              id: editing
                ? 'pages.tenants.dialog.actionSave'
                : 'pages.tenants.dialog.actionAdd',
              defaultMessage: editing ? 'Save' : 'Add',
            })}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
