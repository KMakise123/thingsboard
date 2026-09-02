/**
 * Edit dialog for a customer-scope user (self-contained thin copy — the
 * users domain owns its own dialog; spec principle: the customer scope page
 * only needs basic edit). Fields: email / firstName / lastName / phone —
 * authority + customerId are fixed by the surrounding scope and never
 * edited here. Save goes through saveUser (POST /api/user is create AND
 * update).
 */

import { App, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import { saveUser } from '@/services/tb/user';
import type { User } from '@/types/tb';

export interface CustomerUserEditDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSaved: (user: User) => void;
}

interface UserEditFormValues {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export function CustomerUserEditDialog({
  open,
  user,
  onClose,
  onSaved,
}: CustomerUserEditDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<UserEditFormValues>();

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      });
    }
  }, [open, user, form]);

  const save = async () => {
    // Failed validation rejects — expected control flow, swallow it.
    const values = await form.validateFields().catch(() => undefined);
    if (!values || !user) {
      return;
    }
    try {
      const saved = await saveUser({ ...user, ...values });
      void message.success(
        formatMessage({
          id: 'pages.customers.users.toastSaved',
          defaultMessage: 'User saved.',
        }),
      );
      onSaved(saved);
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={formatMessage({
        id: 'pages.customers.users.editTitle',
        defaultMessage: 'Edit user',
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
        <Form.Item
          name="email"
          label={formatMessage({
            id: 'pages.customers.users.fieldEmail',
            defaultMessage: 'Email',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.customers.form.emailInvalid',
                defaultMessage: 'Invalid email format',
              }),
            },
            {
              type: 'email',
              message: formatMessage({
                id: 'pages.customers.form.emailInvalid',
                defaultMessage: 'Invalid email format',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="firstName"
          label={formatMessage({
            id: 'pages.customers.users.fieldFirstName',
            defaultMessage: 'First name',
          })}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="lastName"
          label={formatMessage({
            id: 'pages.customers.users.fieldLastName',
            defaultMessage: 'Last name',
          })}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="phone"
          label={formatMessage({
            id: 'pages.customers.users.fieldPhone',
            defaultMessage: 'Phone',
          })}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
