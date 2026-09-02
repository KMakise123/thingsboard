/**
 * Enable-2FA dialog for the account/security page (brief §2-E, ui-ngx
 * authentication-dialog/* parity, one parameterized Modal instead of four
 * Angular components). Per provider:
 *
 *   TOTP        generate → QR + plain-text secret + copy → 6-digit code →
 *               verifyAndSave
 *   SMS         phone (E.164) → submit (sends the code) → code →
 *               verifyAndSave
 *   EMAIL       prefilled email → submit → code → verifyAndSave
 *   BACKUP_CODE generate → verifyAndSave with NO code step → one-time code
 *               list + download txt + print
 *
 * In-dialog errors (brief): 400 → field error with the server detail,
 * 429 → rate-limit hint, everything else → toast. A successful activation
 * hands the fresh AccountTwoFaSettings to onSaved (BACKUP_CODE keeps the
 * modal open so the one-time codes can still be captured).
 */
import {
  CopyOutlined,
  DownloadOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Typography,
} from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  generateTwoFaAccountConfig,
  submitTwoFaAccountConfig,
  verifyAndSaveTwoFaAccountConfig,
} from '@/services/tb/two-fa-account';
import type {
  AccountTwoFaSettings,
  TotpTwoFaAccountConfig,
  TwoFaAccountConfig,
  TwoFaProviderType,
} from '@/types/tb/two-fa';
import {
  parseAuthUrlSecret,
  smsPhoneValid,
  verificationCodeValid,
} from './data';
import { useCopy } from './use-copy';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function downloadBackupCodes(codes: Array<string>): void {
  const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'backup-codes.txt';
  anchor.click();
  URL.revokeObjectURL(url);
}

function printBackupCodes(codes: Array<string>): void {
  const rows = codes
    .map(
      (code) =>
        `<div class="code-row"><input type="checkbox"><span class="code">${code}</span></div>`,
    )
    .join('');
  const win = window.open('', '_blank');
  if (!win) {
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>Backup codes</title><style>` +
      `body{font-family:sans-serif;padding:24px}` +
      `.code-row{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:16px}` +
      `.code{letter-spacing:2px}</style></head><body>` +
      `<h1>Backup codes</h1>${rows}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
}

export interface TwoFaEnableDialogProps {
  providerType: TwoFaProviderType;
  /** EMAIL dialog prefill (the current account email). */
  email?: string;
  open: boolean;
  onClose: () => void;
  onSaved: (settings: AccountTwoFaSettings) => void;
}

export default function TwoFaEnableDialog({
  providerType,
  email,
  open,
  onClose,
  onSaved,
}: TwoFaEnableDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const copy = useCopy();
  const queryClient = useQueryClient();

  // TOTP template (authUrl) / BACKUP_CODE generated codes.
  const [totpConfig, setTotpConfig] = useState<TotpTwoFaAccountConfig>();
  const [backupCodes, setBackupCodes] = useState<Array<string>>();

  // SMS/EMAIL two-step flow: contact input first, verification code second.
  const [step, setStep] = useState<'contact' | 'code'>('contact');
  const [contact, setContact] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [rateLimited, setRateLimited] = useState(false);

  const settingsKey = ['tb', '2fa', 'account', 'settings'];

  // Brief error grading: 400 → field error (server detail), 429 → hint,
  // everything else → toast with the server text.
  const gradeError = (error: unknown) => {
    const status = (error as { status?: number }).status;
    if (status === 400) {
      setFieldError(serverErrorText(error));
      return;
    }
    if (status === 429) {
      setRateLimited(true);
      return;
    }
    void message.error(serverErrorText(error));
  };

  const verifyMutation = useMutation({
    mutationFn: (input: {
      config: TwoFaAccountConfig;
      verificationCode?: string;
    }) => verifyAndSaveTwoFaAccountConfig(input.config, input.verificationCode),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKey, settings);
      // BACKUP_CODE keeps the modal open afterwards: the codes are shown
      // one-time right here.
      onSaved(settings);
    },
    onError: gradeError,
  });

  const submitMutation = useMutation({
    mutationFn: (config: TwoFaAccountConfig) =>
      submitTwoFaAccountConfig(config),
    onSuccess: () => {
      setFieldError(undefined);
      setStep('code');
    },
    onError: gradeError,
  });

  // TOTP and BACKUP_CODE start with a server-generated template; BACKUP_CODE
  // chains generate → verifyAndSave immediately (no code step, ui-ngx).
  // The effect runs once per dialog session (open × providerType); the other
  // captured values (email, onSaved, ...) are stable for that session.
  // biome-ignore lint/correctness/useExhaustiveDependencies: dialog session-scoped effect
  useEffect(() => {
    if (!open) {
      return;
    }
    setTotpConfig(undefined);
    setBackupCodes(undefined);

    setStep('contact');
    setContact(providerType === 'EMAIL' ? (email ?? '') : '');
    setFieldError(undefined);
    setRateLimited(false);
    if (providerType !== 'TOTP' && providerType !== 'BACKUP_CODE') {
      return;
    }
    generateTwoFaAccountConfig(providerType)
      .then((config) => {
        if (providerType === 'TOTP') {
          setTotpConfig(config as TotpTwoFaAccountConfig);
          return undefined;
        }
        setBackupCodes((config as { codes?: Array<string> }).codes ?? []);
        return verifyAndSaveTwoFaAccountConfig(config);
      })
      .then((settings) => {
        if (settings) {
          queryClient.setQueryData(settingsKey, settings);
          onSaved(settings);
        }
      })
      .catch(gradeError);
  }, [open, providerType]);

  if (providerType === 'BACKUP_CODE') {
    return (
      <Modal
        title={formatMessage({
          id: 'pages.account.security.dialog.getBackupCodeTitle',
        })}
        open={open}
        onCancel={onClose}
        footer={
          <Button type="primary" onClick={onClose}>
            OK
          </Button>
        }
      >
        <Typography.Paragraph type="secondary">
          {formatMessage({
            id: 'pages.account.security.dialog.backupCodeDescription',
          })}
        </Typography.Paragraph>
        {backupCodes ? (
          <>
            <Alert
              className="mb-4"
              type="warning"
              showIcon
              message={formatMessage({
                id: 'pages.account.security.dialog.backupCodeWarn',
              })}
            />
            <Space direction="vertical">
              {backupCodes.map((code) => (
                <Typography.Text key={code} code>
                  {code}
                </Typography.Text>
              ))}
            </Space>
            <div className="mt-4 flex gap-2">
              <Button
                icon={<DownloadOutlined />}
                onClick={() => downloadBackupCodes(backupCodes)}
              >
                {formatMessage({
                  id: 'pages.account.security.dialog.downloadTxt',
                })}
              </Button>
              <Button
                icon={<PrinterOutlined />}
                onClick={() => printBackupCodes(backupCodes)}
              >
                {formatMessage({ id: 'pages.account.security.dialog.print' })}
              </Button>
            </div>
          </>
        ) : (
          <Spin />
        )}
      </Modal>
    );
  }

  if (providerType === 'TOTP') {
    const secret = totpConfig ? parseAuthUrlSecret(totpConfig.authUrl) : '';
    return (
      <Modal
        title={formatMessage({
          id: 'pages.account.security.dialog.enableTotpTitle',
        })}
        open={open}
        onCancel={onClose}
        footer={null}
      >
        {rateLimited && (
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            message={formatMessage({
              id: 'pages.account.security.dialog.tooManyRequests',
            })}
          />
        )}
        <Typography.Paragraph>
          {formatMessage({ id: 'pages.account.security.dialog.scanQrCode' })}
        </Typography.Paragraph>
        {totpConfig && <QRCodeSVG value={totpConfig.authUrl} size={180} />}
        {secret && (
          <div className="mt-2">
            <Typography.Paragraph type="secondary">
              {formatMessage({
                id: 'pages.account.security.dialog.enterKeyManually',
              })}
            </Typography.Paragraph>
            <Space>
              <Typography.Text code>{secret}</Typography.Text>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={async () => {
                  if (await copy(secret)) {
                    void message.success(
                      formatMessage({
                        id: 'pages.account.security.dialog.keyCopied',
                      }),
                    );
                  }
                }}
              >
                {formatMessage({
                  id: 'pages.account.security.dialog.copyKey',
                })}
              </Button>
            </Space>
          </div>
        )}
        <CodeForm
          className="mt-4"
          fieldError={fieldError}
          loading={verifyMutation.isPending}
          onSubmit={(code) => {
            setFieldError(undefined);
            if (totpConfig) {
              verifyMutation.mutate({
                config: totpConfig,
                verificationCode: code,
              });
            }
          }}
        />
      </Modal>
    );
  }

  // SMS / EMAIL: contact step → verification-code step.
  const isEmail = providerType === 'EMAIL';
  const buildConfig = () =>
    (isEmail
      ? { providerType, email: contact, useByDefault: true }
      : {
          providerType,
          phoneNumber: contact,
          useByDefault: true,
        }) as TwoFaAccountConfig;

  return (
    <Modal
      title={formatMessage({
        id: isEmail
          ? 'pages.account.security.dialog.enableEmailTitle'
          : 'pages.account.security.dialog.enableSmsTitle',
      })}
      open={open}
      onCancel={onClose}
      footer={null}
    >
      {rateLimited && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message={formatMessage({
            id: 'pages.account.security.dialog.tooManyRequests',
          })}
        />
      )}
      {step === 'contact' ? (
        <Form
          layout="vertical"
          onFinish={() => submitMutation.mutate(buildConfig())}
        >
          <Typography.Paragraph type="secondary">
            {formatMessage({
              id: isEmail
                ? 'pages.account.security.dialog.emailStepDescription'
                : 'pages.account.security.dialog.smsStepDescription',
            })}
          </Typography.Paragraph>
          <Form.Item
            name="contact"
            label={formatMessage({
              id: isEmail
                ? 'pages.account.security.dialog.emailStepLabel'
                : 'pages.account.security.dialog.smsStepLabel',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: isEmail
                    ? 'pages.account.profile.emailRequired'
                    : 'pages.account.security.dialog.phoneRequired',
                }),
              },
              {
                validator: (_, value: string) =>
                  !value ||
                  (isEmail ? EMAIL_PATTERN.test(value) : smsPhoneValid(value))
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          formatMessage({
                            id: isEmail
                              ? 'pages.account.profile.emailInvalid'
                              : 'pages.account.security.dialog.phoneInvalid',
                          }),
                        ),
                      ),
              },
            ]}
            validateStatus={fieldError ? 'error' : undefined}
            help={fieldError}
          >
            <Input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              autoComplete={isEmail ? 'email' : 'tel'}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitMutation.isPending}
          >
            {formatMessage({ id: 'pages.account.security.dialog.next' })}
          </Button>
        </Form>
      ) : (
        <CodeForm
          fieldError={fieldError}
          loading={verifyMutation.isPending}
          address={contact}
          onSubmit={(code) => {
            setFieldError(undefined);
            verifyMutation.mutate({
              config: buildConfig(),
              verificationCode: code,
            });
          }}
        />
      )}
    </Modal>
  );
}

/** Shared 6-digit code step (TOTP/SMS/EMAIL flows). */
function CodeForm({
  fieldError,
  loading,
  address,
  onSubmit,
  className,
}: {
  fieldError?: string;
  loading: boolean;
  address?: string;
  onSubmit: (code: string) => void;
  className?: string;
}) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<{ code: string }>();
  return (
    <Form
      form={form}
      layout="vertical"
      className={className}
      onFinish={({ code }) => onSubmit(code)}
    >
      {address && (
        <Typography.Paragraph type="secondary">
          {formatMessage(
            { id: 'pages.account.security.dialog.verificationStepDescription' },
            { address },
          )}
        </Typography.Paragraph>
      )}
      <Form.Item
        name="code"
        label={formatMessage({
          id: 'pages.account.security.dialog.verificationCode',
        })}
        rules={[
          {
            required: true,
            message: formatMessage({
              id: 'pages.account.security.dialog.verificationCodeInvalid',
            }),
          },
          {
            validator: (_, value: string) =>
              !value || verificationCodeValid(value)
                ? Promise.resolve()
                : Promise.reject(
                    new Error(
                      formatMessage({
                        id: 'pages.account.security.dialog.verificationCodeInvalid',
                      }),
                    ),
                  ),
          },
        ]}
        validateStatus={fieldError ? 'error' : undefined}
        help={fieldError}
      >
        <Input inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        {formatMessage({ id: 'pages.account.security.dialog.next' })}
      </Button>
    </Form>
  );
}
