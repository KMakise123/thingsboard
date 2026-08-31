import { MailOutlined } from '@ant-design/icons';
import { Helmet, history, useIntl } from '@umijs/max';
import { Alert, App, Button, Form, Input, Typography } from 'antd';
import React, { useState } from 'react';
import type { ServerError } from '@/core/http/server-error';
import { requestPasswordReset } from '@/services/tb';
import { brand } from '@/theme/brand';

import { AuthShell } from '../components/auth-shell';
import { toServerError } from '../utils';

interface ForgotPasswordValues {
  email: string;
}

/**
 * /user/forgot-password (ui-ngx resetPasswordRequest): submit an email,
 * the backend always answers 200 (anti-enumeration), then the form locks.
 */
const ForgotPassword: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ServerError | null>(null);
  const { message } = App.useApp();
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: 'pages.forgotPassword.title' });

  const handleFinish = async (values: ForgotPasswordValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
      message.success(formatMessage({ id: 'pages.forgotPassword.success' }));
    } catch (reason) {
      setError(toServerError(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={title}>
      <Helmet>
        <title>{`${title} - ${brand.assets.appName}`}</title>
      </Helmet>
      <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
        {formatMessage({ id: 'pages.forgotPassword.description' })}
      </Typography.Paragraph>
      {sent && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          title={formatMessage({ id: 'pages.forgotPassword.success' })}
        />
      )}
      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title={formatMessage({ id: error.titleKey })}
          description={error.detail || undefined}
        />
      )}
      <Form<ForgotPasswordValues>
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        disabled={sent}
      >
        <Form.Item
          name="email"
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.forgotPassword.email.required',
              }),
            },
            {
              type: 'email',
              message: formatMessage({
                id: 'pages.forgotPassword.email.invalid',
              }),
            },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder={formatMessage({
              id: 'pages.forgotPassword.email.placeholder',
            })}
            autoComplete="email"
            autoFocus
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="large" onClick={() => history.push('/user/login')}>
            {formatMessage({ id: 'pages.linkExpired.backToLogin' })}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            style={{ flex: 1 }}
            loading={submitting}
            disabled={sent}
          >
            {formatMessage({ id: 'pages.forgotPassword.submit' })}
          </Button>
        </div>
      </Form>
    </AuthShell>
  );
};

export default ForgotPassword;
