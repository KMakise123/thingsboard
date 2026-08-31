import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Helmet, history, useIntl, useModel } from '@umijs/max';
import { Alert, App, Button, Form, Input } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import {
  isCredentialsExpired,
  type ServerError,
  ThingsboardErrorCode,
} from '@/core/http/server-error';
import { getCurrentUser, login } from '@/services/tb';
import { brand } from '@/theme/brand';

import { AuthShell } from '../components/auth-shell';
import {
  getQueryParam,
  getSafeRedirectUrl,
  roleDefaultPath,
  toServerError,
} from '../utils';

interface LoginFormValues {
  username: string;
  password: string;
}

/**
 * /user/login — password sign-in (ui-ngx LoginComponent parity: email
 * username, credentials-expired redirect with resetToken, password-violation
 * hint, verbatim server error passthrough).
 */
const Login: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<ServerError | null>(null);
  const [passwordViolation, setPasswordViolation] = useState(false);
  const { message } = App.useApp();
  const { formatMessage } = useIntl();
  const { initialState, setInitialState } = useModel('@@initialState');

  // Mount-time check only: a live session visiting /login goes straight to
  // the role landing page (spec §3.1). A ref keeps post-login
  // setInitialState from re-triggering the redirect and clobbering a
  // ?redirect= return URL.
  const mountedUser = useRef(initialState?.currentUser);
  useEffect(() => {
    if (mountedUser.current) {
      history.replace(roleDefaultPath(mountedUser.current));
    }
  }, []);

  const handleFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    setLoginError(null);
    setPasswordViolation(false);
    try {
      await login({ username: values.username, password: values.password });
      const user = await getCurrentUser();
      setInitialState((s) => ({ ...s, currentUser: user }));
      message.success(formatMessage({ id: 'pages.login.success' }));
      const redirect = getSafeRedirectUrl(getQueryParam('redirect'));
      history.replace(redirect ?? roleDefaultPath(user));
    } catch (reason) {
      const error = toServerError(reason);
      if (isCredentialsExpired(error)) {
        const suffix = error.resetToken
          ? `?resetToken=${encodeURIComponent(error.resetToken)}`
          : '';
        history.replace(`/user/reset-expired-password${suffix}`);
        return;
      }
      if (error.errorCode === ThingsboardErrorCode.PASSWORD_VIOLATION) {
        setPasswordViolation(true);
      }
      setLoginError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      subTitle={formatMessage({ id: 'pages.layouts.userLayout.title' })}
    >
      <Helmet>
        <title>{`${formatMessage({ id: 'menu.login' })} - ${brand.assets.appName}`}</title>
      </Helmet>
      <Form<LoginFormValues>
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        autoComplete="on"
      >
        {loginError && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            title={formatMessage({ id: loginError.titleKey })}
            description={loginError.detail || undefined}
          />
        )}
        <Form.Item
          name="username"
          rules={[
            {
              required: true,
              message: formatMessage({ id: 'pages.login.username.required' }),
            },
            {
              type: 'email',
              message: formatMessage({ id: 'pages.login.username.invalid' }),
            },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder={formatMessage({
              id: 'pages.login.username.placeholder',
            })}
            autoComplete="email"
            autoFocus
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[
            {
              required: true,
              message: formatMessage({ id: 'pages.login.password.required' }),
            },
          ]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder={formatMessage({
              id: 'pages.login.password.placeholder',
            })}
            autoComplete="current-password"
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={submitting}
        >
          {formatMessage({ id: 'pages.login.submit' })}
        </Button>
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => history.push('/user/forgot-password')}
          >
            {formatMessage({
              id: passwordViolation
                ? 'pages.login.resetPasswordAction'
                : 'pages.login.forgotPassword',
            })}
          </Button>
        </div>
      </Form>
    </AuthShell>
  );
};

export default Login;
