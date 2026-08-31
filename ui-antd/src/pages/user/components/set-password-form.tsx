import { useIntl } from '@umijs/max';
import { Alert, App, Button, Form, Spin } from 'antd';
import React, { useState } from 'react';
import { tokenStore } from '@/core/auth/token-store';
import type { ServerError } from '@/core/http/server-error';
import { activate, resetPasswordByToken } from '@/services/tb';
import { toServerError } from '../utils';
import { NewPasswordFields } from './new-password-fields';
import { usePasswordPolicy } from './password-policy';

/**
 * Shared set-password form for the reset / create / reset-expired pages
 * (ui-ngx reuses ResetPasswordComponent / CreatePasswordComponent the same
 * way). `mode: 'activate'` mirrors ui-ngx createPassword — the backend
 * returns a session, but spec §3.1 lands the user on the login page, so the
 * freshly stored pair is dropped.
 */
export const SetPasswordForm: React.FC<{
  mode: 'reset' | 'activate';
  token: string;
  submitLabel: string;
  onSuccess: () => void;
}> = ({ mode, token, submitLabel, onSuccess }) => {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { data: policy, isLoading } = usePasswordPolicy();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ServerError | null>(null);

  const handleFinish = async (values: { newPassword: string }) => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'activate') {
        // ui-ngx parity: sendActivationMail = true.
        await activate(token, values.newPassword, true);
        tokenStore.clear();
      } else {
        await resetPasswordByToken(token, values.newPassword);
      }
      message.success(
        formatMessage({
          id:
            mode === 'activate'
              ? 'pages.createPassword.success'
              : 'pages.resetPassword.success',
        }),
      );
      onSuccess();
    } catch (reason) {
      setError(toServerError(reason));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <Spin />
      </div>
    );
  }

  return (
    <Form layout="vertical" requiredMark={false} onFinish={handleFinish}>
      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title={formatMessage({ id: error.titleKey })}
          description={error.detail || undefined}
        />
      )}
      <NewPasswordFields policy={policy} />
      <Button
        type="primary"
        htmlType="submit"
        size="large"
        block
        loading={submitting}
        disabled={!token}
      >
        {submitLabel}
      </Button>
    </Form>
  );
};
