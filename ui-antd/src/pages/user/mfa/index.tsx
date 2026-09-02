import { ArrowLeftOutlined } from '@ant-design/icons';
import { Helmet, history, useIntl, useModel } from '@umijs/max';
import { App, Button, Form, Input, Spin } from 'antd';
import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { serverErrorText } from '@/components/entities/server-error-text';
import { tokenStore } from '@/core/auth/token-store';
import {
  checkTwoFaVerificationCode,
  getCurrentUser,
  getTwoFaLoginProviders,
  logout,
  sendTwoFaVerificationCode,
} from '@/services/tb';
import { brand } from '@/theme/brand';
import type { TwoFaProviderInfo, TwoFaProviderType } from '@/types/tb/two-fa';

import { AuthShell } from '../components/auth-shell';
import {
  getQueryParam,
  getSafeRedirectUrl,
  roleDefaultPath,
  toServerError,
} from '../utils';
import {
  codeSpecFor,
  DIGIT_CODE_SPEC,
  maskVerificationCode,
  pickDefaultProvider,
  providerReceivesCode,
  resendCooldown,
} from './data';

interface CodeFormValues {
  code: string;
}

const PROVIDER_NAME_KEY: Record<TwoFaProviderType, string> = {
  TOTP: 'pages.mfa.provider.totp',
  SMS: 'pages.mfa.provider.sms',
  EMAIL: 'pages.mfa.provider.email',
  BACKUP_CODE: 'pages.mfa.provider.backupCode',
};

const PROVIDER_DESC_KEY: Record<TwoFaProviderType, string> = {
  TOTP: 'pages.mfa.description.totp',
  SMS: 'pages.mfa.description.sms',
  EMAIL: 'pages.mfa.description.email',
  BACKUP_CODE: 'pages.mfa.description.backupCode',
};

const PROVIDER_PLACEHOLDER_KEY: Record<TwoFaProviderType, string> = {
  TOTP: 'pages.mfa.placeholder.totp',
  SMS: 'pages.mfa.placeholder.sms',
  EMAIL: 'pages.mfa.placeholder.email',
  BACKUP_CODE: 'pages.mfa.placeholder.backupCode',
};

/**
 * /user/mfa — the MFA verification-code login step (ui-ngx
 * two-factor-auth-login parity): default provider preselected, auto-send
 * for push-code providers, resend cooldown, per-provider code shape and the
 * 400/429/other error tiering (brief §2-B).
 */
const MfaPage: React.FC = () => {
  const [providers, setProviders] = useState<TwoFaProviderInfo[] | null>(null);
  const [selected, setSelected] = useState<TwoFaProviderInfo | null>(null);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();
  const { formatMessage } = useIntl();
  const { setInitialState } = useModel('@@initialState');
  const [form] = Form.useForm<CodeFormValues>();
  const rateLimited = useRef(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Exit: server logout (clears the interim token) then the login page. */
  const exitToLogin = useCallback(() => {
    void (async () => {
      try {
        await logout();
      } catch {
        // the token is cleared in logout()'s finally either way
      }
      history.replace('/user/login');
    })();
  }, []);

  // Page guard (brief §2-B): anything but the PRE_VERIFICATION_TOKEN scope
  // is bounced to the login page before anything loads.
  const guardOk = useRef(
    tokenStore.decodeTokenClaims()?.scopes?.[0] === 'PRE_VERIFICATION_TOKEN',
  ).current;

  useEffect(() => {
    if (!guardOk) {
      exitToLogin();
    }
  }, [guardOk, exitToLogin]);

  const sendCode = useCallback(
    async (providerType: TwoFaProviderType, period: number | undefined) => {
      setSending(true);
      try {
        await sendTwoFaVerificationCode(providerType);
      } catch {
        // ui-ngx parity: the cooldown starts on a failed send too
      } finally {
        setSending(false);
        setCountdown(resendCooldown(period));
      }
    },
    [],
  );

  useEffect(() => {
    if (!guardOk) {
      return undefined;
    }
    let cancelled = false;
    getTwoFaLoginProviders()
      .then((list) => {
        if (cancelled) {
          return;
        }
        setProviders(list);
        const preferred = pickDefaultProvider(list);
        if (preferred) {
          setSelected(preferred);
          if (providerReceivesCode(preferred.type)) {
            void sendCode(
              preferred.type,
              preferred.minVerificationCodeSendPeriod,
            );
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          exitToLogin();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [guardOk, sendCode, exitToLogin]);

  // Resend cooldown ticker; the resend button shows once it hits zero.
  useEffect(() => {
    if (countdown === 0) {
      return undefined;
    }
    const id = setInterval(() => {
      setCountdown((current) => current - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  useEffect(
    () => () => {
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
      }
    },
    [],
  );

  const selectProvider = (info: TwoFaProviderInfo) => {
    form.resetFields();
    setSelected(info);
    if (providerReceivesCode(info.type)) {
      void sendCode(info.type, info.minVerificationCodeSendPeriod);
    }
  };

  const handleFinish = async ({ code }: CodeFormValues) => {
    if (!selected) {
      return;
    }
    setSubmitting(true);
    rateLimited.current = false;
    try {
      // The regular token pair is stored inside the service — just land.
      await checkTwoFaVerificationCode(selected.type, code);
      const user = await getCurrentUser();
      setInitialState((s) => ({ ...s, currentUser: user }));
      message.success(formatMessage({ id: 'pages.login.success' }));
      const redirect = getSafeRedirectUrl(getQueryParam('redirect'));
      history.replace(redirect ?? roleDefaultPath(user));
    } catch (reason) {
      const error = toServerError(reason);
      if (error.status === 400) {
        form.setFields([
          {
            name: 'code',
            errors: [formatMessage({ id: 'pages.mfa.code.incorrect' })],
          },
        ]);
      } else if (error.status === 429) {
        rateLimited.current = true;
        form.setFields([
          {
            name: 'code',
            errors: [formatMessage({ id: 'pages.mfa.code.tooManyRequests' })],
          },
        ]);
        // ui-ngx parity: the rate-limit hint auto-clears after 5 seconds.
        clearTimer.current = setTimeout(() => {
          if (rateLimited.current) {
            rateLimited.current = false;
            form.setFields([{ name: 'code', errors: [] }]);
          }
        }, 5000);
      } else {
        message.error(serverErrorText(reason));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Only read while a provider is selected (the form is not rendered
  // otherwise); the DIGIT fallback just keeps the type non-nullable.
  const spec = selected ? codeSpecFor(selected.type) : DIGIT_CODE_SPEC;

  return (
    <AuthShell title={formatMessage({ id: 'pages.mfa.title' })}>
      <Helmet>
        <title>{`${formatMessage({ id: 'pages.mfa.title' })} - ${brand.assets.appName}`}</title>
      </Helmet>
      {!guardOk ? null : !providers ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : !selected ? (
        <div>
          <p>{formatMessage({ id: 'pages.mfa.selectWay' })}</p>
          {providers.map((info) => (
            <Button
              key={info.type}
              block
              style={{ marginBottom: 8 }}
              onClick={() => selectProvider(info)}
            >
              {formatMessage({ id: PROVIDER_NAME_KEY[info.type] })}
            </Button>
          ))}
        </div>
      ) : (
        <Form<CodeFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleFinish}
        >
          <p>
            {formatMessage(
              { id: PROVIDER_DESC_KEY[selected.type] },
              { contact: selected.contact },
            )}
          </p>
          <Form.Item<CodeFormValues>
            name="code"
            getValueFromEvent={(e: ChangeEvent<HTMLInputElement>) =>
              maskVerificationCode(e.target.value ?? '', selected.type)
            }
            rules={[
              {
                required: true,
                message: formatMessage({ id: 'pages.mfa.code.required' }),
              },
              {
                validator: (_rule, value: string) => {
                  const filled = value ?? '';
                  if (
                    filled.length === spec.maxLength &&
                    spec.pattern.test(filled)
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(formatMessage({ id: 'pages.mfa.code.invalid' })),
                  );
                },
              },
            ]}
          >
            <Input
              size="large"
              maxLength={spec.maxLength}
              inputMode={spec.inputMode}
              autoComplete="one-time-code"
              placeholder={formatMessage({
                id: PROVIDER_PLACEHOLDER_KEY[selected.type],
              })}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={submitting}
            style={{ marginBottom: 8 }}
          >
            {formatMessage({ id: 'pages.mfa.continue' })}
          </Button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 32,
            }}
          >
            <div style={{ flex: 1 }}>
              {providerReceivesCode(selected.type) &&
                !sending &&
                (countdown > 0 ? (
                  <span>
                    {formatMessage(
                      { id: 'pages.mfa.resendWait' },
                      { time: countdown },
                    )}
                  </span>
                ) : (
                  <Button
                    type="link"
                    style={{ padding: 0 }}
                    onClick={() => {
                      form.setFields([{ name: 'code', errors: [] }]);
                      void sendCode(
                        selected.type,
                        selected.minVerificationCodeSendPeriod,
                      );
                    }}
                  >
                    {formatMessage({ id: 'pages.mfa.resendCode' })}
                  </Button>
                ))}
            </div>
            {providers.length > 1 && (
              <Button
                type="link"
                onClick={() => {
                  form.resetFields();
                  setSelected(null);
                }}
              >
                {formatMessage({ id: 'pages.mfa.tryAnotherWay' })}
              </Button>
            )}
          </div>
        </Form>
      )}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        aria-label={formatMessage({ id: 'pages.mfa.back' })}
        onClick={exitToLogin}
        style={{ marginTop: 16 }}
      >
        {formatMessage({ id: 'pages.mfa.back' })}
      </Button>
    </AuthShell>
  );
};

export default MfaPage;
