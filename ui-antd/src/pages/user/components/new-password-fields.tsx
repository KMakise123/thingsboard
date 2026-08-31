import { LockOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Form, Input } from 'antd';
import React, { useMemo } from 'react';
import type { UserPasswordPolicy } from '@/services/tb';

import { newPasswordRules, PasswordPolicyPanel } from './password-policy';

/**
 * New-password + confirmation pair with the live policy hints. Shared by
 * reset-password / create-password / reset-expired-password (ui-ngx uses the
 * same form in all three).
 */
export const NewPasswordFields: React.FC<{
  policy?: UserPasswordPolicy;
}> = ({ policy }) => {
  const { formatMessage } = useIntl();
  const rules = useMemo(
    () => newPasswordRules(policy, formatMessage),
    [policy, formatMessage],
  );
  const passwordValue = Form.useWatch('newPassword');

  return (
    <>
      <Form.Item
        name="newPassword"
        label={formatMessage({ id: 'pages.password.newPassword' })}
        rules={rules}
        hasFeedback
      >
        <Input.Password
          size="large"
          prefix={<LockOutlined />}
          autoComplete="new-password"
        />
      </Form.Item>
      <Form.Item
        name="confirmPassword"
        label={formatMessage({ id: 'pages.password.confirmPassword' })}
        dependencies={['newPassword']}
        hasFeedback
        rules={[
          {
            required: true,
            message: formatMessage({ id: 'pages.password.required' }),
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || value === getFieldValue('newPassword')) {
                return Promise.resolve();
              }
              return Promise.reject(
                new Error(formatMessage({ id: 'pages.password.notMatch' })),
              );
            },
          }),
        ]}
      >
        <Input.Password
          size="large"
          prefix={<LockOutlined />}
          autoComplete="new-password"
        />
      </Form.Item>
      <PasswordPolicyPanel policy={policy} value={passwordValue ?? ''} />
    </>
  );
};
