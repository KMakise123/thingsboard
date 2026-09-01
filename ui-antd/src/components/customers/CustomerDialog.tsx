/**
 * Create / edit customer dialog (list-page surface). Renders the shared
 * CustomerFormFields inside a Modal; the detail page hosts the same fields
 * inline. Save goes through services/tb saveCustomer (POST /api/customer is
 * create AND update); errors surface via serverErrorText.
 */

import { App, Form, Modal } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';

import {
  CustomerFormFields,
  type CustomerFormValues,
  customerToFormValues,
  formValuesToCustomer,
} from '@/components/customers/CustomerFormFields';
import { serverErrorText } from '@/components/entities/server-error-text';
import { saveCustomer } from '@/services/tb/customer';
import type { Customer } from '@/types/tb';

export interface CustomerDialogProps {
  open: boolean;
  /** null/undefined = create; a Customer = edit. */
  customer?: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

export function CustomerDialog({
  open,
  customer,
  onClose,
  onSaved,
}: CustomerDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<CustomerFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(customerToFormValues(customer));
    }
  }, [open, customer, form]);

  const save = async () => {
    const values = await form.validateFields();
    try {
      const saved = await saveCustomer(formValuesToCustomer(values, customer));
      void message.success(
        formatMessage({
          id: customer
            ? 'pages.customers.form.toastSaved'
            : 'pages.customers.form.toastCreated',
          defaultMessage: customer ? 'Customer saved.' : 'Customer created.',
        }),
      );
      onSaved(saved);
    } catch (error) {
      void message.error(
        `${formatMessage({
          id: 'pages.customers.form.toastSaveFailed',
          defaultMessage: 'Failed to save',
        })}: ${serverErrorText(error)}`,
      );
    }
  };

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={formatMessage({
        id: customer
          ? 'pages.customers.form.dialogEditTitle'
          : 'pages.customers.form.dialogCreateTitle',
        defaultMessage: customer ? 'Edit customer' : 'New customer',
      })}
      onCancel={onClose}
      onOk={() => void save()}
      okText={formatMessage({
        id: 'pages.customers.form.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.customers.form.cancel',
        defaultMessage: 'Cancel',
      })}
    >
      <Form form={form} layout="vertical">
        <CustomerFormFields customerId={customer?.id.id} />
      </Form>
    </Modal>
  );
}
