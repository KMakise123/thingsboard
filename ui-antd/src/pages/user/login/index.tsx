import { LockOutlined, LoginOutlined, MailOutlined } from '@ant-design/icons';
import { Helmet, history, useIntl, useModel } from '@umijs/max';
import { Alert, App, Button, Divider, Form, Input } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { tokenStore } from '@/core/auth/token-store';
import {
  isCredentialsExpired,
  type ServerError,
  ThingsboardErrorCode,
} from '@/core/http/server-error';
import { getCurrentUser, getOauth2Clients, login } from '@/services/tb';
import { brand } from '@/theme/brand';
import type { Oauth2ClientLoginInfo } from '@/types/tb/oauth2';

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

/** JWT `scopes[0]` of the two MFA interim tokens (brief §1.1). */
const PRE_VERIFICATION_SCOPE = 'PRE_VERIFICATION_TOKEN';
const MFA_CONFIGURATION_SCOPE = 'MFA_CONFIGURATION_TOKEN';

function currentTokenScope(): string | undefined {
  return tokenStore.decodeTokenClaims()?.scopes?.[0];
}

/** The login → mfa jump forwards the original ?redirect target along. */
function mfaTarget(path: string): string {
  const redirect = getQueryParam('redirect');
  return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path;
}

/**
 * /user/login — password sign-in (ui-ngx LoginComponent parity: email
 * username, credentials-expired redirect with resetToken, password-violation
 * hint, verbatim server error passthrough) plus the OAuth2 button section
 * and the loginError callback dialog (brief §1.4).
 */
const Login: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<ServerError | null>(null);
  const [passwordViolation, setPasswordViolation] = useState(false);
  const [oauth2Clients, setOauth2Clients] = useState<Oauth2ClientLoginInfo[]>(
    [],
  );
  const { message, modal } = App.useApp();
  const { formatMessage } = useIntl();
  const { initialState, setInitialState } = useModel('@@initialState');

  // Mount-time check only: a live session visiting /login goes straight to
  // the role landing page (spec §3.1). A ref keeps post-login
  // setInitialState from re-triggering the redirect and clobbering a
  // ?redirect= return URL.
  const mountedUser = useRef(initialState?.currentUser);
  useEffect(() => {
    if (!mountedUser.current) {
      return;
    }
    // Tokens cleared synchronously (logout / failed-refresh unauthorized
    // exit) must win over a stale currentUser ref: the memory state is
    // wiped through startTransition and can lag behind the navigation that
    // lands here. Without this guard the login page bounces the
    // just-logged-out user straight back to the role landing page with no
    // tokens — every subsequent request then 401s (M6 cross-cutting fix).
    if (!tokenStore.isTokenValid('jwt')) {
      return;
    }
    // MFA interim tokens normally leave currentUser empty (app.tsx), but a
    // stale ref must never bounce an interim state to the landing page —
    // that would loop mfa ⇄ login. Judge on the token scope, never on
    // "a token exists".
    const scope = currentTokenScope();
    if (scope === PRE_VERIFICATION_SCOPE || scope === MFA_CONFIGURATION_SCOPE) {
      return;
    }
    history.replace(roleDefaultPath(mountedUser.current));
  }, []);

  // OAuth2 button data (POST /api/noauth/oauth2Clients): the service
  // resolves [] on any failure so the section silently disappears.
  useEffect(() => {
    let cancelled = false;
    getOauth2Clients().then((clients) => {
      if (!cancelled) {
        setOauth2Clients(clients);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // OAuth2 failure callback lands on /user/login?loginError=<encoded>:
  // an undismissable dialog with the verbatim server message; confirming
  // strips the query so a refresh/re-mount does not replay the dialog.
  useEffect(() => {
    const detail = getQueryParam('loginError');
    if (!detail) {
      return;
    }
    const { destroy } = modal.warning({
      title: formatMessage({ id: 'pages.login.error.title' }),
      content: detail,
      okText: formatMessage({ id: 'pages.login.error.ok' }),
      closable: false,
      keyboard: false,
      maskClosable: false,
      onOk: () => {
        destroy();
        history.replace('/user/login');
      },
    });
  }, [formatMessage, modal]);

  const handleFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    setLoginError(null);
    setPasswordViolation(false);
    try {
      await login({ username: values.username, password: values.password });
      // Three-way split on the response scope (brief §1.1): the interim
      // MFA pairs are already stored by login() — just carry them over.
      const scope = currentTokenScope();
      if (scope === PRE_VERIFICATION_SCOPE) {
        history.replace(mfaTarget('/user/mfa'));
        return;
      }
      if (scope === MFA_CONFIGURATION_SCOPE) {
        history.replace(mfaTarget('/user/force-mfa'));
        return;
      }
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

  /** Native authorize navigation; ?redirect → ?prevUri (ui-ngx parity). */
  const oauth2Href = (client: Oauth2ClientLoginInfo): string => {
    const redirect = getQueryParam('redirect');
    return redirect
      ? `${client.url}?prevUri=${encodeURIComponent(redirect)}`
      : client.url;
  };

  const oauth2Section = oauth2Clients.length > 0 && (
    <div style={{ marginBottom: 8 }}>
      {oauth2Clients.length === 1 ? (
        <Button
          block
          size="large"
          icon={<LoginOutlined />}
          href={oauth2Href(oauth2Clients[0])}
        >
          {formatMessage(
            { id: 'pages.login.oauth2.signInWith' },
            { name: oauth2Clients[0].name },
          )}
        </Button>
      ) : (
        <>
          <div style={{ marginBottom: 8, textAlign: 'center' }}>
            {formatMessage({ id: 'pages.login.oauth2.groupTitle' })}
          </div>
          {oauth2Clients.map((client) => (
            <Button
              key={client.url}
              block
              size="large"
              icon={<LoginOutlined />}
              href={oauth2Href(client)}
              style={{ marginBottom: 8 }}
            >
              {client.name}
            </Button>
          ))}
        </>
      )}
    </div>
  );

  return (
    <AuthShell
      subTitle={formatMessage({ id: 'pages.layouts.userLayout.title' })}
    >
      <Helmet>
        <title>{`${formatMessage({ id: 'menu.login' })} - ${brand.assets.appName}`}</title>
      </Helmet>
      {oauth2Section}
      {oauth2Clients.length > 0 && (
        <Divider plain style={{ margin: '8px 0 16px' }}>
          {formatMessage({ id: 'pages.login.oauth2.or' })}
        </Divider>
      )}
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
