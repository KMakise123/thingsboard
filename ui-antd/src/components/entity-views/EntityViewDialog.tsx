/**
 * Create/edit entity-view dialog (list entry point, ui-ngx add-dialog
 * parity): the shared EntityViewFormFields inside a Modal. Create posts the
 * form fields only; edit seeds from the EntityViewInfo row and spreads it
 * back on save (buildEntityViewPayload).
 */
import { useMutation } from '@tanstack/react-query';
import { App, Form, Modal, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { saveEntityView } from '@/services/tb/entity-view';
import type { EntityView, EntityViewInfo } from '@/types/tb';
import EntityViewFormFields from './EntityViewFormFields';
import {
  buildEntityViewPayload,
  type EntityViewFormValues,
  emptyFormNumbers,
  entityViewToFormNumbers,
  formNumbersToFormValues,
  formValuesToNumbers,
} from './entity-view-form';

export interface EntityViewDialogProps {
  open: boolean;
  /** Null = create; otherwise the row being edited. */
  entityView: EntityViewInfo | null;
  onClose: () => void;
  /** Saved (create or update) — caller invalidates its queries. */
  onSaved: (saved: EntityView) => void;
}

export default function EntityViewDialog({
  open,
  entityView,
  onClose,
  onSaved,
}: EntityViewDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<EntityViewFormValues>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initialValues = useMemo(
    () =>
      formNumbersToFormValues(
        entityView ? entityViewToFormNumbers(entityView) : emptyFormNumbers(),
      ),
    [entityView],
  );

  useEffect(() => {
    if (open) {
      setSubmitError(null);
    }
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: (values: EntityViewFormValues) =>
      saveEntityView(
        buildEntityViewPayload(
          formValuesToNumbers(values),
          entityView ?? undefined,
        ),
      ),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.entityViews.list.toastSaved',
          defaultMessage: 'Entity view saved.',
        }),
      );
      onSaved(saved);
    },
    onError: (error) => {
      setSubmitError(serverErrorText(error));
    },
  });

  return (
    <Modal
      open={open}
      title={
        entityView
          ? formatMessage({
              id: 'pages.entityViews.list.dialogEditTitle',
              defaultMessage: 'Edit entity view',
            })
          : formatMessage({
              id: 'pages.entityViews.list.dialogAddTitle',
              defaultMessage: 'Add entity view',
            })
      }
      width={720}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={saveMutation.isPending}
      okText={formatMessage({
        id: 'pages.entityViews.list.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.entityViews.list.cancel',
        defaultMessage: 'Cancel',
      })}
      destroyOnHidden
    >
      <Form<EntityViewFormValues>
        form={form}
        layout="vertical"
        className="pt-2"
        initialValues={initialValues}
        onFinish={(values) => saveMutation.mutate(values)}
        disabled={saveMutation.isPending}
        preserve={false}
      >
        <EntityViewFormFields />
      </Form>
      {submitError ? (
        <Typography.Text type="danger" role="alert">
          {submitError}
        </Typography.Text>
      ) : null}
    </Modal>
  );
}
