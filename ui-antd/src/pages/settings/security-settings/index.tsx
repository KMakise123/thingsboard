/**
 * System settings → Security settings page (M14 wave-2, spec 6.4-1/2/3,
 * ui-ngx security-settings.component parity — two cards, two save chains).
 *
 * Card 1 — SecuritySettings (R30):
 *   General policy group (max failed logins — empty = never lock out,
 *   lockout notification email, activation/reset TTL 1..24 default 24,
 *   mobile secret key length ≥ 1) + Password policy group (length 6..50,
 *   maximumLength ≥ minimumLength cross-check, four per-class minimums,
 *   expiration/reuse days, allow whitespaces default true,
 *   force-reset-if-not-valid default false).
 *
 *   The server validates NOTHING in passwordPolicy (contract #6 — max ≤ min
 *   silently disables the upper bound), so this front-end matrix is the
 *   only defense. The force-reset hint describes the login-time behavior;
 *   it must NOT read as "saving will force everyone to change passwords
 *   now".
 *
 * Card 2 — JWT settings (R30):
 *   issuer required; signing key base64-decoded to ≥ 64 bytes with a
 *   Generate-key helper; token/refresh expiration times with refresh >
 *   token cross-check. SAVE = in-place reissue (contract #5): the POST
 *   response is a fresh JwtPair for the current user — it is swapped into
 *   the token store BEFORE any follow-up call, then the session user is
 *   refreshed and the form re-reads the saved settings. Changing issuer
 *   and/or key shows a confirmation first; canceling it sends NOTHING.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useModel } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import SettingsCard from '@/components/settings/SettingsCard';
import { tokenStore } from '@/core/auth/token-store';
import {
  getJwtSettings,
  getSecuritySettings,
  saveJwtSettings,
  saveSecuritySettings,
} from '@/services/tb/admin';
import type { JwtSettings, SecuritySettings } from '@/types/tb/admin';

type SecurityFormValues = SecuritySettings;
type JwtFormValues = JwtSettings;

const JWT_EXPIRATION_MAX = 2147483647;

/** ui-ngx randomAlphanumeric(64) — [A-Za-z0-9] alphabet. */
function randomAlphanumeric(length: number): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** ui-ngx base64Format validator (verbatim semantics). */
function signingKeyViolation(
  value: string | undefined,
): 'base64' | 'minLength' | null {
  if (!value || value === 'thingsboardDefaultSigningKey') {
    return null;
  }
  try {
    const decoded = atob(value);
    if (decoded.length < 64) {
      return 'minLength';
    }
    return null;
  } catch {
    return 'base64';
  }
}

export default function SettingsSecuritySettingsPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { initialState, setInitialState } = useModel('@@initialState');

  // ---- card 1: security settings
  const securityQuery = useQuery({
    queryKey: ['settings', 'securitySettings'],
    queryFn: getSecuritySettings,
  });
  const securitySnapshot = securityQuery.data;
  const [securityForm] = Form.useForm<SecurityFormValues>();
  const [securityDirty, setSecurityDirty] = useState(false);
  const [securityInvalid, setSecurityInvalid] = useState(false);

  useEffect(() => {
    if (securitySnapshot) {
      securityForm.setFieldsValue(securitySnapshot);
      setSecurityDirty(false);
    }
  }, [securitySnapshot, securityForm]);

  const securitySave = useMutation({
    mutationFn: (values: SecurityFormValues) =>
      saveSecuritySettings({
        ...securitySnapshot,
        ...values,
      } as SecuritySettings),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.settings.security.toastSaved',
          defaultMessage: 'Security settings saved.',
        }),
      );
      securityForm.setFieldsValue(saved);
      setSecurityDirty(false);
      void queryClient.invalidateQueries({
        queryKey: ['tb', 'noauth', 'user-password-policy'],
      });
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.common.saveFailed',
          defaultMessage: 'Failed to save the settings.',
        }),
      );
    },
  });

  // ---- card 2: JWT settings
  const jwtQuery = useQuery({
    queryKey: ['settings', 'jwtSettings'],
    queryFn: getJwtSettings,
  });
  const jwtSnapshot = jwtQuery.data;
  const [jwtForm] = Form.useForm<JwtFormValues>();
  const [jwtDirty, setJwtDirty] = useState(false);
  const [jwtInvalid, setJwtInvalid] = useState(false);

  useEffect(() => {
    if (jwtSnapshot) {
      jwtForm.setFieldsValue(jwtSnapshot);
      setJwtDirty(false);
    }
  }, [jwtSnapshot, jwtForm]);

  const jwtSave = useMutation({
    mutationFn: async (values: JwtFormValues) => {
      // The response is a FRESH JwtPair for the current user (contract #5):
      // swap it into the token store first so every follow-up call uses the
      // new session, then refresh the session user through the pipeline.
      const pair = await saveJwtSettings(values);
      tokenStore.setTokens(pair.token as string, pair.refreshToken ?? null);
      const user = await initialState?.fetchUserInfo?.();
      if (user) {
        setInitialState((prev) => ({ ...prev, currentUser: user }));
      }
      return pair;
    },
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.security.jwtSaved',
          defaultMessage: 'JWT settings saved.',
        }),
      );
      setJwtDirty(false);
      // Re-read refreshes the form with the stored settings (ngx
      // processJwtSettings parity).
      void jwtQuery.refetch();
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.common.saveFailed',
          defaultMessage: 'Failed to save the settings.',
        }),
      );
    },
  });

  /** ngx confirmChangeJWTSettings: confirm only issuer/key edits. */
  const onJwtSave = (values: JwtFormValues) => {
    const sensitiveChanged =
      values.tokenIssuer !== (jwtSnapshot?.tokenIssuer ?? '') ||
      values.tokenSigningKey !== (jwtSnapshot?.tokenSigningKey ?? '');
    if (!sensitiveChanged) {
      jwtSave.mutate(values);
      return;
    }
    modal.confirm({
      title: formatMessage({
        id: 'pages.settings.security.jwtConfirmTitle',
        defaultMessage: 'All users will be re-logged-in',
      }),
      content: formatMessage({
        id: 'pages.settings.security.jwtConfirmMessage',
        defaultMessage:
          'Change of the JWT Signing Key will cause all issued tokens to be invalid. All users will need to re-login. This will also affect scripts that use Rest API/Websockets.',
      }),
      okText: formatMessage({
        id: 'pages.settings.security.jwtConfirmOk',
        defaultMessage: 'Confirm',
      }),
      cancelText: formatMessage({
        id: 'pages.settings.security.jwtConfirmCancel',
        defaultMessage: 'Discard changes',
      }),
      onOk: () => jwtSave.mutate(values),
      // Cancel = no request at all.
    });
  };

  // Dirty leave confirm (ngx ConfirmOnExit equivalent): the browser-level
  // guard while either card is dirty — umi/react-router 6.3 has no route
  // blocker (see core/editor/contract/use-leave-guard.ts research note).
  useEffect(() => {
    if (!securityDirty && !jwtDirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [securityDirty, jwtDirty]);

  const minimumLengthValue = Form.useWatch(
    ['passwordPolicy', 'minimumLength'],
    securityForm,
  );

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard
        title={formatMessage({
          id: 'pages.settings.security.title',
          defaultMessage: 'Security settings',
        })}
        loading={securityQuery.isPending}
        dirty={securityDirty}
        invalid={securityInvalid}
        saving={securitySave.isPending}
        onUndo={() => {
          if (securitySnapshot) {
            securityForm.setFieldsValue(securitySnapshot);
          }
          setSecurityDirty(false);
        }}
        onSave={() => securityForm.submit()}
      >
        <Form<SecurityFormValues>
          form={securityForm}
          layout="vertical"
          initialValues={{
            userActivationTokenTtl: 24,
            passwordResetTokenTtl: 24,
            passwordPolicy: {
              allowWhitespaces: true,
              forceUserToResetPasswordIfNotValid: false,
            },
          }}
          onValuesChange={() => setSecurityDirty(true)}
          onFieldsChange={(_, allFields) =>
            setSecurityInvalid(
              allFields.some((field) => (field.errors ?? []).length > 0),
            )
          }
          onFinish={(values) => securitySave.mutate(values)}
        >
          <Card
            type="inner"
            title={formatMessage({
              id: 'pages.settings.security.generalPolicy',
              defaultMessage: 'General policy',
            })}
            className="mb-4"
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="maxFailedLoginAttempts"
                  label={formatMessage({
                    id: 'pages.settings.security.maxFailedLoginAttempts',
                    defaultMessage:
                      'Maximum number of failed login attempts, before account is locked',
                  })}
                  rules={[
                    {
                      type: 'number',
                      min: 0,
                      message: formatMessage({
                        id: 'pages.settings.security.maxFailedLoginAttemptsRange',
                        defaultMessage:
                          "Maximum number of failed login attempts can't be negative",
                      }),
                    },
                  ]}
                >
                  <InputNumber min={0} precision={0} className="w-full" />
                </Form.Item>
                <Form.Item
                  name="userLockoutNotificationEmail"
                  label={formatMessage({
                    id: 'pages.settings.security.lockoutEmail',
                    defaultMessage:
                      'In case user account lockout, send notification to email',
                  })}
                  rules={[
                    {
                      type: 'email',
                      message: formatMessage({
                        id: 'pages.settings.security.invalidEmailFormat',
                        defaultMessage: 'Invalid email format.',
                      }),
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="userActivationTokenTtl"
                  label={formatMessage({
                    id: 'pages.settings.security.activationTokenTtl',
                    defaultMessage: 'User activation link TTL in hours',
                  })}
                  rules={[
                    {
                      required: true,
                      message: formatMessage({
                        id: 'pages.settings.security.activationTokenTtlRange',
                        defaultMessage:
                          'User activation link TTL must be in range from 1 to 24 hours',
                      }),
                    },
                    {
                      type: 'number',
                      min: 1,
                      max: 24,
                      message: formatMessage({
                        id: 'pages.settings.security.activationTokenTtlRange',
                        defaultMessage:
                          'User activation link TTL must be in range from 1 to 24 hours',
                      }),
                    },
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={24}
                    precision={0}
                    className="w-full"
                  />
                </Form.Item>
                <Form.Item
                  name="passwordResetTokenTtl"
                  label={formatMessage({
                    id: 'pages.settings.security.resetTokenTtl',
                    defaultMessage: 'Password reset link TTL in hours',
                  })}
                  rules={[
                    {
                      required: true,
                      message: formatMessage({
                        id: 'pages.settings.security.resetTokenTtlRange',
                        defaultMessage:
                          'Password reset link TTL must be in range from 1 to 24 hours',
                      }),
                    },
                    {
                      type: 'number',
                      min: 1,
                      max: 24,
                      message: formatMessage({
                        id: 'pages.settings.security.resetTokenTtlRange',
                        defaultMessage:
                          'Password reset link TTL must be in range from 1 to 24 hours',
                      }),
                    },
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={24}
                    precision={0}
                    className="w-full"
                  />
                </Form.Item>
                <Form.Item
                  name="mobileSecretKeyLength"
                  label={formatMessage({
                    id: 'pages.settings.security.mobileSecretKeyLength',
                    defaultMessage: 'Mobile secret key length',
                  })}
                  rules={[
                    {
                      type: 'number',
                      min: 1,
                      message: formatMessage({
                        id: 'pages.settings.security.mobileSecretKeyLengthRange',
                        defaultMessage:
                          'Mobile secret key length must be positive',
                      }),
                    },
                  ]}
                >
                  <InputNumber min={1} precision={0} className="w-full" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card
            type="inner"
            title={formatMessage({
              id: 'pages.settings.security.passwordPolicy',
              defaultMessage: 'Password policy',
            })}
            className="mb-4"
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name={['passwordPolicy', 'minimumLength']}
                  label={formatMessage({
                    id: 'pages.settings.security.minimumPasswordLength',
                    defaultMessage: 'Minimum password length',
                  })}
                  rules={[
                    {
                      required: true,
                      message: formatMessage({
                        id: 'pages.settings.security.minimumPasswordLengthRequired',
                        defaultMessage: 'Minimum password length is required',
                      }),
                    },
                    {
                      type: 'number',
                      min: 6,
                      max: 50,
                      message: formatMessage({
                        id: 'pages.settings.security.minimumPasswordLengthRange',
                        defaultMessage:
                          'Minimum password length should be in a range from 6 to 50',
                      }),
                    },
                  ]}
                >
                  <InputNumber
                    min={6}
                    max={50}
                    precision={0}
                    className="w-full"
                  />
                </Form.Item>
                <Form.Item
                  name={['passwordPolicy', 'maximumLength']}
                  label={formatMessage({
                    id: 'pages.settings.security.maximumPasswordLength',
                    defaultMessage: 'Maximum password length',
                  })}
                  dependencies={[['passwordPolicy', 'minimumLength']]}
                  rules={[
                    {
                      type: 'number',
                      min: 6,
                      message: formatMessage({
                        id: 'pages.settings.security.maximumPasswordLengthMin',
                        defaultMessage:
                          'Maximum password length should be at least 6',
                      }),
                    },
                    {
                      validator: (_rule, value) => {
                        if (
                          value != null &&
                          minimumLengthValue != null &&
                          value < minimumLengthValue
                        ) {
                          return Promise.reject(
                            new Error(
                              formatMessage({
                                id: 'pages.settings.security.maximumPasswordLengthLessMin',
                                defaultMessage:
                                  'Maximum password length should be greater than minimum length',
                              }),
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <InputNumber min={6} precision={0} className="w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name={['passwordPolicy', 'minimumUppercaseLetters']}
                  label={formatMessage({
                    id: 'pages.settings.security.minimumUppercaseLetters',
                    defaultMessage: 'Minimum number of uppercase letters',
                  })}
                  rules={[
                    {
                      type: 'number',
                      min: 0,
                      message: formatMessage({
                        id: 'pages.settings.security.minimumUppercaseLettersRange',
                        defaultMessage:
                          "Minimum number of uppercase letters can't be negative",
                      }),
                    },
                  ]}
                >
                  <InputNumber min={0} precision={0} className="w-full" />
                </Form.Item>
                <Form.Item
                  name={['passwordPolicy', 'minimumLowercaseLetters']}
                  label={formatMessage({
                    id: 'pages.settings.security.minimumLowercaseLetters',
                    defaultMessage: 'Minimum number of lowercase letters',
                  })}
                  rules={[
                    {
                      type: 'number',
                      min: 0,
                      message: formatMessage({
                        id: 'pages.settings.security.minimumLowercaseLettersRange',
                        defaultMessage:
                          "Minimum number of lowercase letters can't be negative",
                      }),
                    },
                  ]}
                >
                  <InputNumber min={0} precision={0} className="w-full" />
                </Form.Item>
                <Form.Item
                  name={['passwordPolicy', 'minimumDigits']}
                  label={formatMessage({
                    id: 'pages.settings.security.minimumDigits',
                    defaultMessage: 'Minimum number of digits',
                  })}
                  rules={[
                    {
                      type: 'number',
                      min: 0,
                      message: formatMessage({
                        id: 'pages.settings.security.minimumDigitsRange',
                        defaultMessage:
                          "Minimum number of digits can't be negative",
                      }),
                    },
                  ]}
                >
                  <InputNumber min={0} precision={0} className="w-full" />
                </Form.Item>
                <Form.Item
                  name={['passwordPolicy', 'minimumSpecialCharacters']}
                  label={formatMessage({
                    id: 'pages.settings.security.minimumSpecialCharacters',
                    defaultMessage: 'Minimum number of special characters',
                  })}
                  rules={[
                    {
                      type: 'number',
                      min: 0,
                      message: formatMessage({
                        id: 'pages.settings.security.minimumSpecialCharactersRange',
                        defaultMessage:
                          "Minimum number of special characters can't be negative",
                      }),
                    },
                  ]}
                >
                  <InputNumber min={0} precision={0} className="w-full" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name={['passwordPolicy', 'passwordExpirationPeriodDays']}
                  label={formatMessage({
                    id: 'pages.settings.security.passwordExpirationPeriodDays',
                    defaultMessage: 'Password expiration period in days',
                  })}
                  rules={[
                    {
                      type: 'number',
                      min: 0,
                      message: formatMessage({
                        id: 'pages.settings.security.passwordExpirationPeriodDaysRange',
                        defaultMessage:
                          "Password expiration period in days can't be negative",
                      }),
                    },
                  ]}
                >
                  <InputNumber min={0} precision={0} className="w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name={['passwordPolicy', 'passwordReuseFrequencyDays']}
                  label={formatMessage({
                    id: 'pages.settings.security.passwordReuseFrequencyDays',
                    defaultMessage: 'Password reuse frequency in days',
                  })}
                  rules={[
                    {
                      type: 'number',
                      min: 0,
                      message: formatMessage({
                        id: 'pages.settings.security.passwordReuseFrequencyDaysRange',
                        defaultMessage:
                          "Password reuse frequency in days can't be negative",
                      }),
                    },
                  ]}
                >
                  <InputNumber min={0} precision={0} className="w-full" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name={['passwordPolicy', 'allowWhitespaces']}
                  valuePropName="checked"
                  label={formatMessage({
                    id: 'pages.settings.security.allowWhitespace',
                    defaultMessage: 'Allow whitespace',
                  })}
                >
                  <Checkbox />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name={[
                    'passwordPolicy',
                    'forceUserToResetPasswordIfNotValid',
                  ]}
                  valuePropName="checked"
                  label={formatMessage({
                    id: 'pages.settings.security.forceResetPasswordIfNotValid',
                    defaultMessage: 'Force to reset password if not valid',
                  })}
                  tooltip={formatMessage({
                    id: 'pages.settings.security.forceResetPasswordIfNotValidHint',
                    defaultMessage:
                      'Please be careful when enabling this feature: users with a no-longer-valid password will be asked to reset it via email at their next login.',
                  })}
                >
                  <Checkbox />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </SettingsCard>

      <SettingsCard
        title={formatMessage({
          id: 'pages.settings.security.jwtTitle',
          defaultMessage: 'JWT security settings',
        })}
        loading={jwtQuery.isPending}
        dirty={jwtDirty}
        invalid={jwtInvalid}
        saving={jwtSave.isPending}
        onUndo={() => {
          if (jwtSnapshot) {
            jwtForm.setFieldsValue(jwtSnapshot);
          }
          setJwtDirty(false);
        }}
        onSave={() => jwtForm.submit()}
      >
        <Form<JwtFormValues>
          form={jwtForm}
          layout="vertical"
          onValuesChange={() => setJwtDirty(true)}
          onFieldsChange={(_, allFields) =>
            setJwtInvalid(
              allFields.some((field) => (field.errors ?? []).length > 0),
            )
          }
          onFinish={onJwtSave}
        >
          <Form.Item
            name="tokenIssuer"
            label={formatMessage({
              id: 'pages.settings.security.jwtIssuer',
              defaultMessage: 'Issuer name',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.settings.security.jwtIssuerRequired',
                  defaultMessage: 'Issuer name is required.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.settings.security.jwtSigningKey',
              defaultMessage: 'Signing key',
            })}
            required
          >
            <Space.Compact className="w-full">
              <Form.Item
                name="tokenSigningKey"
                noStyle
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.settings.security.jwtSigningKeyRequired',
                      defaultMessage: 'Signing key is required.',
                    }),
                  },
                  {
                    validator: (_rule, value: string | undefined) => {
                      const violation = signingKeyViolation(value);
                      if (violation === 'base64') {
                        return Promise.reject(
                          new Error(
                            formatMessage({
                              id: 'pages.settings.security.jwtSigningKeyBase64',
                              defaultMessage:
                                'Signing key must be base64 format.',
                            }),
                          ),
                        );
                      }
                      if (violation === 'minLength') {
                        return Promise.reject(
                          new Error(
                            formatMessage({
                              id: 'pages.settings.security.jwtSigningKeyMinLength',
                              defaultMessage:
                                'Signing key must be at least 512 bits of data.',
                            }),
                          ),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input />
              </Form.Item>
              <Button
                onClick={() => {
                  jwtForm.setFieldsValue({
                    tokenSigningKey: btoa(randomAlphanumeric(64)),
                  });
                  setJwtDirty(true);
                }}
              >
                {formatMessage({
                  id: 'pages.settings.security.jwtGenerateKey',
                  defaultMessage: 'Generate key',
                })}
              </Button>
            </Space.Compact>
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="tokenExpirationTime"
                label={formatMessage({
                  id: 'pages.settings.security.jwtExpirationTime',
                  defaultMessage: 'Token expiration time (sec)',
                })}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.settings.security.jwtExpirationTimeRequired',
                      defaultMessage: 'Token expiration time is required.',
                    }),
                  },
                  {
                    type: 'number',
                    min: 60,
                    message: formatMessage({
                      id: 'pages.settings.security.jwtExpirationTimeMin',
                      defaultMessage: 'Minimum time is 60 seconds (1 minute).',
                    }),
                  },
                  {
                    type: 'number',
                    max: JWT_EXPIRATION_MAX,
                    message: formatMessage({
                      id: 'pages.settings.security.jwtExpirationTimeMax',
                      defaultMessage:
                        'Maximum allowed time is 2147483647 seconds(68 years).',
                    }),
                  },
                ]}
              >
                <InputNumber
                  min={60}
                  max={JWT_EXPIRATION_MAX}
                  precision={0}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="refreshTokenExpTime"
                label={formatMessage({
                  id: 'pages.settings.security.jwtRefreshExpirationTime',
                  defaultMessage: 'Refresh token expiration time (sec)',
                })}
                dependencies={['tokenExpirationTime']}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.settings.security.jwtRefreshExpirationTimeRequired',
                      defaultMessage:
                        'Refresh token expiration time is required.',
                    }),
                  },
                  {
                    type: 'number',
                    min: 900,
                    message: formatMessage({
                      id: 'pages.settings.security.jwtRefreshExpirationTimeMin',
                      defaultMessage:
                        'Minimum time is 900 seconds (15 minute).',
                    }),
                  },
                  {
                    type: 'number',
                    max: JWT_EXPIRATION_MAX,
                    message: formatMessage({
                      id: 'pages.settings.security.jwtRefreshExpirationTimeMax',
                      defaultMessage:
                        'Maximum allowed time is 2147483647 seconds (68 years).',
                    }),
                  },
                  {
                    validator: (_rule, value) => {
                      const tokenTime = jwtForm.getFieldValue(
                        'tokenExpirationTime',
                      );
                      if (
                        value != null &&
                        tokenTime != null &&
                        value <= tokenTime
                      ) {
                        return Promise.reject(
                          new Error(
                            formatMessage({
                              id: 'pages.settings.security.jwtRefreshExpirationTimeLessToken',
                              defaultMessage:
                                'Refresh token time must be greater token time.',
                            }),
                          ),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  min={900}
                  max={JWT_EXPIRATION_MAX}
                  precision={0}
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </SettingsCard>
    </div>
  );
}
