import { ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons';
import { Helmet, history, useIntl } from '@umijs/max';
import { App, Button, Form, Input, Spin } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { serverErrorText } from '@/components/entities/server-error-text';
import { tokenStore } from '@/core/auth/token-store';
import { toServerError } from '@/pages/user/utils';
import { logout } from '@/services/tb';
import {
  generateTwoFaAccountConfig,
  getAccountTwoFaSettings,
  getAvailableTwoFaProviderTypes,
  submitTwoFaAccountConfig,
  verifyAndSaveTwoFaAccountConfig,
} from '@/services/tb/two-fa-account';
import { brand } from '@/theme/brand';
import type {
  AccountTwoFaSettings,
  BackupCodeTwoFaAccountConfig,
  TotpTwoFaAccountConfig,
  TwoFaAccountConfig,
  TwoFaProviderType,
} from '@/types/tb/two-fa';

import { AuthShell } from '../components/auth-shell';
import { DIGIT_CODE_SPEC, maskVerificationCode } from '../mfa/data';
import {
  backupCodesText,
  firstActivationIsDefault,
  forceMfaProviderList,
  moreProvidersAvailable,
  PHONE_PATTERN,
  parseTotpSecret,
} from './data';

interface ContactFormValues {
  phone?: string;
  email?: string;
}

interface CodeFormValues {
  code: string;
}

type ProviderView = 'SETUP' | 'TOTP' | 'SMS' | 'EMAIL' | 'BACKUP_CODE';
/** INPUT = enroll form / codes screen, ENTER_CODE = code box, SUCCESS = done. */
type FlowStep = 'INPUT' | 'ENTER_CODE' | 'SUCCESS';

const PROVIDER_NAME_KEY: Record<TwoFaProviderType, string> = {
  TOTP: 'pages.mfa.provider.totp',
  SMS: 'pages.mfa.provider.sms',
  EMAIL: 'pages.mfa.provider.email',
  BACKUP_CODE: 'pages.mfa.provider.backupCode',
};

const SUCCESS_TITLE_KEY: Record<TwoFaProviderType, string> = {
  TOTP: 'pages.forceMfa.success.totp',
  SMS: 'pages.forceMfa.success.sms',
  EMAIL: 'pages.forceMfa.success.email',
  BACKUP_CODE: 'pages.forceMfa.success.backupCode',
};

const SUCCESS_DESC_KEY: Record<TwoFaProviderType, string> = {
  TOTP: 'pages.forceMfa.success.totpDescription',
  SMS: 'pages.forceMfa.success.smsDescription',
  EMAIL: 'pages.forceMfa.success.emailDescription',
  BACKUP_CODE: 'pages.forceMfa.success.backupCodeDescription',
};

/**
 * /user/force-mfa — forced 2FA enrollment (ui-ngx
 * force-two-factor-auth-login parity): SETUP → per-provider INPUT →
 * ENTER_CODE → SUCCESS; the first activated provider becomes the default;
 * SUCCESS ends with a logout back to the login page (brief §2-C).
 */
const ForceMfaPage: React.FC = () => {
  const [allowed, setAllowed] = useState<TwoFaProviderType[] | null>(null);
  const [settings, setSettings] = useState<AccountTwoFaSettings | null>(null);
  const [view, setView] = useState<ProviderView>('SETUP');
  const [step, setStep] = useState<FlowStep>('INPUT');
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [contact, setContact] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [builtConfig, setBuiltConfig] = useState<TwoFaAccountConfig | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();
  const { formatMessage } = useIntl();
  const inputForm = Form.useForm<ContactFormValues>()[0];
  const codeForm = Form.useForm<CodeFormValues>()[0];
  const phoneValue = Form.useWatch('phone', inputForm);
  const emailValue = Form.useWatch('email', inputForm);

  // Page guard (brief §2-C): only the MFA_CONFIGURATION_TOKEN scope may run
  // the enrollment flow; anything else exits through logout.
  const guardOk = useRef(
    tokenStore.decodeTokenClaims()?.scopes?.[0] === 'MFA_CONFIGURATION_TOKEN',
  ).current;
  const emailPrefill = useRef(
    tokenStore.decodeTokenClaims()?.sub ?? '',
  ).current;
  // ui-ngx useByDefault flag: true until the first config is built.
  const useDefault = useRef(true);

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

  useEffect(() => {
    if (!guardOk) {
      exitToLogin();
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [types, accountSettings] = await Promise.all([
          getAvailableTwoFaProviderTypes(),
          getAccountTwoFaSettings(),
        ]);
        if (cancelled) {
          return;
        }
        setSettings(accountSettings ?? null);
        // Fresh account (no configs) → BACKUP_CODE filtered out (§2-C).
        setAllowed(
          forceMfaProviderList(
            types ?? [],
            !firstActivationIsDefault(accountSettings),
          ),
        );
      } catch {
        if (!cancelled) {
          exitToLogin();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guardOk, exitToLogin]);

  const backToSetup = () => {
    codeForm.resetFields();
    setView('SETUP');
    setStep('INPUT');
  };

  /** Enter a provider flow; TOTP/BACKUP_CODE generate their template first. */
  const enterProvider = async (type: TwoFaProviderType) => {
    inputForm.resetFields();
    if (type === 'SMS' || type === 'EMAIL') {
      setView(type);
      setStep('INPUT');
      return;
    }
    setSubmitting(true);
    try {
      if (type === 'TOTP') {
        const config = (await generateTwoFaAccountConfig(
          'TOTP',
        )) as TotpTwoFaAccountConfig;
        // First activation carries useByDefault=true (§2-C).
        setBuiltConfig({ ...config, useByDefault: useDefault.current });
        useDefault.current = false;
        setTotpSecret(parseTotpSecret(config.authUrl));
        setView('TOTP');
        setStep('INPUT');
      } else {
        const config = (await generateTwoFaAccountConfig(
          'BACKUP_CODE',
        )) as BackupCodeTwoFaAccountConfig;
        const stamped = { ...config, useByDefault: useDefault.current };
        useDefault.current = false;
        // Backup codes verify without a code step — activate immediately.
        const fresh = await verifyAndSaveTwoFaAccountConfig(stamped);
        setSettings(fresh ?? settings);
        setBuiltConfig(stamped);
        setBackupCodes(config.codes ?? []);
        setView('BACKUP_CODE');
        setStep('INPUT');
      }
    } catch (reason) {
      message.error(serverErrorText(reason));
    } finally {
      setSubmitting(false);
    }
  };

  const sendContactCode = async () => {
    if (view !== 'SMS' && view !== 'EMAIL') {
      return;
    }
    const values = await inputForm.validateFields();
    const stampedConfig: TwoFaAccountConfig =
      view === 'SMS'
        ? {
            providerType: 'SMS',
            useByDefault: useDefault.current,
            phoneNumber: values.phone ?? '',
          }
        : {
            providerType: 'EMAIL',
            useByDefault: useDefault.current,
            email: values.email ?? '',
          };
    useDefault.current = false;
    setSubmitting(true);
    try {
      await submitTwoFaAccountConfig(stampedConfig);
      setBuiltConfig(stampedConfig);
      setContact(view === 'SMS' ? (values.phone ?? '') : (values.email ?? ''));
      setStep('ENTER_CODE');
    } catch (reason) {
      message.error(serverErrorText(reason));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCode = async () => {
    if (!builtConfig) {
      return;
    }
    const { code } = await codeForm.validateFields();
    setSubmitting(true);
    try {
      const fresh = await verifyAndSaveTwoFaAccountConfig(builtConfig, code);
      setSettings(fresh ?? settings);
      setStep('SUCCESS');
    } catch (reason) {
      const error = toServerError(reason);
      if (error.status === 400) {
        codeForm.setFields([
          {
            name: 'code',
            errors: [formatMessage({ id: 'pages.mfa.code.incorrect' })],
          },
        ]);
      } else if (error.status === 429) {
        // ui-ngx force flow parity: no 5-second auto-clear here.
        codeForm.setFields([
          {
            name: 'code',
            errors: [formatMessage({ id: 'pages.mfa.code.tooManyRequests' })],
          },
        ]);
      } else {
        message.error(serverErrorText(reason));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = async () => {
    if (!totpSecret) {
      return;
    }
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(totpSecret);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        const area = document.createElement('textarea');
        area.value = totpSecret;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand('copy');
        area.remove();
      } catch {
        ok = false;
      }
    }
    if (ok) {
      message.success(formatMessage({ id: 'pages.forceMfa.totp.copied' }));
    } else {
      message.error(formatMessage({ id: 'pages.forceMfa.totp.copyFailed' }));
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([backupCodesText(backupCodes)], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const printCodes = () => {
    const rows = backupCodes
      .map(
        (code) =>
          `<div class="code-row"><input type="checkbox"><span class="code">${code}</span></div>`,
      )
      .join('');
    const win = window.open('', 'Print backup code');
    if (!win) {
      return;
    }
    win.document.write(
      `<!doctype html><html><head><title>Backup codes</title><style>
        .code-row { margin: 0 6px 8px; display: flex; min-width: 130px; }
        .code { font: 400 16px/20px monospace; margin-left: 6px; }
      </style></head><body style="margin:0"><div style="margin:8px">
      <h3 style="text-align:center">Backup codes</h3>${rows}</div></body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const hasConfig = !firstActivationIsDefault(settings);
  const showTryAnother = (allowed?.length ?? 0) > 1 && view !== 'SETUP';

  const enterCodeDescription = (): string => {
    if (view === 'SMS') {
      return formatMessage({ id: 'pages.forceMfa.enterCode.sms' }, { contact });
    }
    if (view === 'EMAIL') {
      return formatMessage({ id: 'pages.mfa.description.email' }, { contact });
    }
    return formatMessage({ id: 'pages.forceMfa.enterCode.totp' });
  };

  const tryAnotherButton = showTryAnother && (
    <Button
      block
      style={{ marginTop: 8 }}
      onClick={() => {
        if (step === 'ENTER_CODE') {
          codeForm.resetFields();
          setStep('INPUT');
        } else {
          backToSetup();
        }
      }}
    >
      {formatMessage({ id: 'pages.mfa.tryAnotherWay' })}
    </Button>
  );

  const renderSuccessCard = () => {
    if (!builtConfig) {
      return null;
    }
    return (
      <div>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>
          {formatMessage({ id: SUCCESS_TITLE_KEY[builtConfig.providerType] })}
        </p>
        <p>
          {formatMessage({ id: SUCCESS_DESC_KEY[builtConfig.providerType] })}
        </p>
        <Button type="primary" block onClick={exitToLogin}>
          {formatMessage({ id: 'pages.forceMfa.login' })}
        </Button>
        {moreProvidersAvailable(allowed ?? [], settings) && (
          <Button block style={{ marginTop: 8 }} onClick={backToSetup}>
            {formatMessage({ id: 'pages.forceMfa.addVerificationMethod' })}
          </Button>
        )}
      </div>
    );
  };

  return (
    <AuthShell
      title={formatMessage({
        id: hasConfig
          ? 'pages.forceMfa.title.configured'
          : 'pages.forceMfa.title.required',
      })}
    >
      <Helmet>
        <title>{`${formatMessage({ id: 'pages.forceMfa.title.required' })} - ${brand.assets.appName}`}</title>
      </Helmet>
      {!guardOk || !allowed ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : view === 'SETUP' ? (
        <div>
          <p>
            {formatMessage({
              id: hasConfig
                ? 'pages.forceMfa.description.configured'
                : 'pages.forceMfa.description.required',
            })}
          </p>
          {allowed.map((type) => (
            <Button
              key={type}
              block
              style={{ marginBottom: 8 }}
              disabled={!!settings?.configs?.[type] || submitting}
              onClick={() => void enterProvider(type)}
            >
              {formatMessage({ id: PROVIDER_NAME_KEY[type] })}
            </Button>
          ))}
          {hasConfig && (
            <Button type="primary" block onClick={exitToLogin}>
              {formatMessage({ id: 'pages.forceMfa.login' })}
            </Button>
          )}
        </div>
      ) : view === 'TOTP' && step === 'INPUT' ? (
        <div>
          <p>{formatMessage({ id: 'pages.forceMfa.totp.scanQr' })}</p>
          {/* Same local-render shape as the security page's TOTP dialog
              (brief §3): the otpauth URL becomes an inline SVG QR code. */}
          {builtConfig?.providerType === 'TOTP' && (
            <QRCodeSVG value={builtConfig.authUrl} size={180} />
          )}
          <p>{formatMessage({ id: 'pages.forceMfa.totp.enterKey' })}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: 1, wordBreak: 'break-all' }}>
              {totpSecret}
            </code>
            <Button
              type="text"
              icon={<CopyOutlined />}
              aria-label={formatMessage({ id: 'pages.forceMfa.totp.copyKey' })}
              title={formatMessage({ id: 'pages.forceMfa.totp.copyKey' })}
              onClick={() => void copySecret()}
            />
          </div>
          <Button
            type="primary"
            block
            style={{ marginTop: 16 }}
            onClick={() => setStep('ENTER_CODE')}
          >
            {formatMessage({ id: 'pages.mfa.continue' })}
          </Button>
          {tryAnotherButton}
        </div>
      ) : view === 'BACKUP_CODE' && step === 'INPUT' ? (
        <div>
          <p>
            {formatMessage({ id: 'pages.forceMfa.backupCode.description' })}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {backupCodes.map((code) => (
              <code key={code} style={{ fontSize: 16 }}>
                {code}
              </code>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
            <Button block onClick={downloadCodes}>
              {formatMessage({ id: 'pages.forceMfa.backupCode.download' })}
            </Button>
            <Button block onClick={printCodes}>
              {formatMessage({ id: 'pages.forceMfa.backupCode.print' })}
            </Button>
          </div>
          <p>{formatMessage({ id: 'pages.forceMfa.backupCode.warn' })}</p>
          <Button type="primary" block onClick={() => setStep('SUCCESS')}>
            {formatMessage({ id: 'pages.mfa.continue' })}
          </Button>
          {tryAnotherButton}
        </div>
      ) : step === 'INPUT' ? (
        // SMS / EMAIL enroll form
        <Form<ContactFormValues>
          form={inputForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ email: emailPrefill }}
        >
          <p>
            {formatMessage({
              id:
                view === 'SMS'
                  ? 'pages.forceMfa.sms.description'
                  : 'pages.forceMfa.email.description',
            })}
          </p>
          {view === 'SMS' ? (
            <Form.Item<ContactFormValues>
              name="phone"
              label={formatMessage({ id: 'pages.forceMfa.phone.label' })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.forceMfa.phone.label',
                  }),
                },
                {
                  pattern: PHONE_PATTERN,
                  message: formatMessage({
                    id: 'pages.forceMfa.phone.invalid',
                  }),
                },
              ]}
            >
              <Input placeholder="+8613800138000" autoComplete="tel" />
            </Form.Item>
          ) : (
            <Form.Item<ContactFormValues>
              name="email"
              label={formatMessage({ id: 'pages.forceMfa.email.label' })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.forceMfa.email.label',
                  }),
                },
                {
                  type: 'email',
                  message: formatMessage({ id: 'pages.mfa.code.invalid' }),
                },
              ]}
            >
              <Input
                placeholder={formatMessage({
                  id: 'pages.forceMfa.email.label',
                })}
                autoComplete="email"
              />
            </Form.Item>
          )}
          <Button
            type="primary"
            block
            loading={submitting}
            disabled={
              submitting ||
              (view === 'SMS'
                ? !PHONE_PATTERN.test(phoneValue ?? '')
                : !emailValue)
            }
            onClick={() => void sendContactCode()}
          >
            {formatMessage({ id: 'pages.forceMfa.sendCode' })}
          </Button>
          {tryAnotherButton}
        </Form>
      ) : step === 'ENTER_CODE' ? (
        <Form<CodeFormValues>
          form={codeForm}
          layout="vertical"
          requiredMark={false}
        >
          <p>{enterCodeDescription()}</p>
          <Form.Item<CodeFormValues>
            name="code"
            getValueFromEvent={(e: ChangeEvent<HTMLInputElement>) =>
              maskVerificationCode(e.target.value ?? '', 'TOTP')
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
                    filled.length === DIGIT_CODE_SPEC.maxLength &&
                    DIGIT_CODE_SPEC.pattern.test(filled)
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
              maxLength={DIGIT_CODE_SPEC.maxLength}
              inputMode={DIGIT_CODE_SPEC.inputMode}
              autoComplete="one-time-code"
              placeholder={formatMessage({
                id: 'pages.forceMfa.verificationCode',
              })}
            />
          </Form.Item>
          <Button
            type="primary"
            block
            loading={submitting}
            onClick={() => void confirmCode()}
          >
            {formatMessage({ id: 'pages.forceMfa.confirm' })}
          </Button>
          {tryAnotherButton}
        </Form>
      ) : (
        renderSuccessCard()
      )}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        aria-label={formatMessage({ id: 'pages.mfa.back' })}
        onClick={view === 'SETUP' ? exitToLogin : backToSetup}
        style={{ marginTop: 16 }}
      >
        {formatMessage({ id: 'pages.mfa.back' })}
      </Button>
    </AuthShell>
  );
};

export default ForceMfaPage;
