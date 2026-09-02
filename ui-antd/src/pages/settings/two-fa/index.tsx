/**
 * System settings → Two-factor auth page (spec 3.7, ui-ngx
 * two-factor-auth-settings parity). One form over GET/POST /api/2fa/settings:
 *
 *   - platform policy: enforce switch + enforced-users filter (ALL_USERS /
 *     TENANT_ADMINISTRATORS with a tenants↔tenant-profiles id list /
 *     SYSTEM_ADMINISTRATORS) + lockout/verification limits + the
 *     `attempts:seconds` verification-code check rate limit;
 *   - provider strategies (TOTP/SMS/EMAIL/BACKUP_CODE): the enable switch
 *     reveals the provider's fields; only enabled providers travel on save.
 *
 * ui-ngx constraints kept: BACKUP_CODE cannot be the only enabled provider
 * (its switch locks), and enforcing 2FA requires at least one provider.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  App,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Segmented,
  Select,
  Switch,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import SettingsCard from '@/components/settings/SettingsCard';
import { getTwoFaSettings, saveTwoFaSettings } from '@/services/tb/two-fa';
import type { TwoFaProviderType } from '@/types/tb/two-fa';
import {
  anyProviderEnabled,
  backupCodeSwitchDisabled,
  type ProviderFormValue,
  smsTemplateValid,
  TWO_FA_PROVIDER_TYPES,
  type TwoFaFormValues,
  toTwoFaFormValue,
  toTwoFaSettingsPayload,
} from './data';

export default function SettingsTwoFaPage() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();

  // Unconfigured platforms answer 200 with an EMPTY body — normalize it to
  // null so react-query accepts it and the form falls back to defaults.
  const settingsQuery = useQuery({
    queryKey: ['settings', 'two-fa'],
    queryFn: async () => (await getTwoFaSettings()) ?? null,
  });
  const snapshot = settingsQuery.data;

  const [form] = Form.useForm<TwoFaFormValues>();
  const [dirty, setDirty] = useState(false);
  const [formInvalid, setFormInvalid] = useState(false);

  const enforceTwoFa = Form.useWatch('enforceTwoFa', form) === true;
  const filterType = Form.useWatch(['enforcedUsersFilter', 'type'], form);
  const filterByTenants =
    Form.useWatch(['enforcedUsersFilter', 'filterByTenants'], form) !== false;
  const rateLimitEnabled =
    Form.useWatch('verificationCodeCheckRateLimitEnable', form) === true;
  const providers = Form.useWatch('providers', form) as
    | Array<ProviderFormValue>
    | undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies: form is a stable useForm instance
  useEffect(() => {
    if (snapshot || settingsQuery.isSuccess) {
      form.setFieldsValue(toTwoFaFormValue(snapshot));
      setDirty(false);
    }
  }, [snapshot, settingsQuery.isSuccess]);

  const saveMutation = useMutation({
    mutationFn: (formValues: TwoFaFormValues) =>
      saveTwoFaSettings(toTwoFaSettingsPayload(formValues)),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.settings.twoFa.toastSaved',
          defaultMessage: 'Two-factor auth settings saved.',
        }),
      );
      form.setFieldsValue(toTwoFaFormValue(saved));
      setDirty(false);
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

  const providerMissing =
    enforceTwoFa && !anyProviderEnabled(providers) && !settingsQuery.isPending;

  return (
    <SettingsCard
      title={formatMessage({
        id: 'pages.settings.twoFa.title',
        defaultMessage: 'Two-factor authentication',
      })}
      loading={settingsQuery.isPending}
      dirty={dirty}
      invalid={formInvalid || providerMissing}
      saving={saveMutation.isPending}
      onUndo={() => {
        form.setFieldsValue(toTwoFaFormValue(snapshot));
        setDirty(false);
      }}
      onSave={() => form.submit()}
    >
      <Form<TwoFaFormValues>
        form={form}
        layout="vertical"
        onValuesChange={() => setDirty(true)}
        onFieldsChange={(_, allFields) =>
          setFormInvalid(
            allFields.some((field) => (field.errors ?? []).length > 0),
          )
        }
        onFinish={(formValues) => saveMutation.mutate(formValues)}
      >
        <Card size="small" className="mb-4">
          <Form.Item
            name="enforceTwoFa"
            valuePropName="checked"
            label={formatMessage({
              id: 'pages.settings.twoFa.force2fa',
              defaultMessage: 'Enforce two-factor authentication',
            })}
            className="mb-2"
          >
            <Switch />
          </Form.Item>
          {enforceTwoFa && (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name={['enforcedUsersFilter', 'type']}
                    label={formatMessage({
                      id: 'pages.settings.twoFa.enforceFor',
                      defaultMessage: 'Enforce for',
                    })}
                  >
                    <Select
                      options={[
                        {
                          value: 'ALL_USERS',
                          label: formatMessage({
                            id: 'pages.settings.twoFa.allUsers',
                            defaultMessage: 'All users',
                          }),
                        },
                        {
                          value: 'TENANT_ADMINISTRATORS',
                          label: formatMessage({
                            id: 'pages.settings.twoFa.tenantAdministrators',
                            defaultMessage: 'Tenant administrators',
                          }),
                        },
                        {
                          value: 'SYSTEM_ADMINISTRATORS',
                          label: formatMessage({
                            id: 'pages.settings.twoFa.systemAdministrators',
                            defaultMessage: 'System administrators',
                          }),
                        },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>
              {filterType === 'TENANT_ADMINISTRATORS' && (
                <>
                  <Segmented
                    className="mb-4"
                    value={filterByTenants ? 'tenants' : 'profiles'}
                    onChange={(value) => {
                      form.setFieldValue(
                        ['enforcedUsersFilter', 'filterByTenants'],
                        value === 'tenants',
                      );
                      setDirty(true);
                    }}
                    options={[
                      {
                        value: 'tenants',
                        label: formatMessage({
                          id: 'pages.settings.twoFa.tenants',
                          defaultMessage: 'Tenants',
                        }),
                      },
                      {
                        value: 'profiles',
                        label: formatMessage({
                          id: 'pages.settings.twoFa.tenantProfiles',
                          defaultMessage: 'Tenant profiles',
                        }),
                      },
                    ]}
                  />
                  {filterByTenants ? (
                    <Form.Item
                      name={['enforcedUsersFilter', 'tenantsIds']}
                      label={formatMessage({
                        id: 'pages.settings.twoFa.tenants',
                        defaultMessage: 'Tenants',
                      })}
                      tooltip={formatMessage({
                        id: 'pages.settings.twoFa.idListHint',
                        defaultMessage: 'Leave empty to apply to all.',
                      })}
                    >
                      <IdListSelect />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name={['enforcedUsersFilter', 'tenantProfilesIds']}
                      label={formatMessage({
                        id: 'pages.settings.twoFa.tenantProfiles',
                        defaultMessage: 'Tenant profiles',
                      })}
                      tooltip={formatMessage({
                        id: 'pages.settings.twoFa.idListHint',
                        defaultMessage: 'Leave empty to apply to all.',
                      })}
                    >
                      <IdListSelect />
                    </Form.Item>
                  )}
                </>
              )}
            </>
          )}
        </Card>

        <Card
          size="small"
          title={formatMessage({
            id: 'pages.settings.twoFa.verificationLimitations',
            defaultMessage: 'Verification limitations',
          })}
          className="mb-4"
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="maxVerificationFailuresBeforeUserLockout"
                label={formatMessage({
                  id: 'pages.settings.twoFa.maxVerificationFailures',
                  defaultMessage:
                    'Max verification failures before user lockout',
                })}
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    max: 65535,
                    message: formatMessage({
                      id: 'pages.settings.twoFa.positiveInteger',
                      defaultMessage: 'Must be a non-negative integer.',
                    }),
                  },
                ]}
              >
                <InputNumber
                  min={0}
                  max={65535}
                  precision={0}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="totalAllowedTimeForVerification"
                label={formatMessage({
                  id: 'pages.settings.twoFa.totalAllowedTime',
                  defaultMessage: 'Total allowed time for verification (sec)',
                })}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.settings.twoFa.totalAllowedTimeRequired',
                      defaultMessage: 'Total allowed time is required.',
                    }),
                  },
                  {
                    type: 'number',
                    min: 60,
                    message: formatMessage({
                      id: 'pages.settings.twoFa.totalAllowedTimeMin',
                      defaultMessage:
                        'The minimum allowed total time is 60 sec.',
                    }),
                  },
                ]}
              >
                <InputNumber min={60} precision={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="minVerificationCodeSendPeriod"
                label={formatMessage({
                  id: 'pages.settings.twoFa.minSendPeriod',
                  defaultMessage: 'Min verification code send period (sec)',
                })}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.settings.twoFa.minSendPeriodRequired',
                      defaultMessage: 'Min send period is required.',
                    }),
                  },
                  {
                    type: 'number',
                    min: 5,
                    message: formatMessage({
                      id: 'pages.settings.twoFa.minSendPeriodMin',
                      defaultMessage: 'The minimum period is 5 sec.',
                    }),
                  },
                ]}
              >
                <InputNumber min={5} precision={0} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="verificationCodeCheckRateLimitEnable"
            valuePropName="checked"
            label={formatMessage({
              id: 'pages.settings.twoFa.verificationCodeCheckRateLimit',
              defaultMessage: 'Verification code check rate limit',
            })}
            className="mb-2"
          >
            <Switch />
          </Form.Item>
          {rateLimitEnabled && (
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="verificationCodeCheckRateLimitNumber"
                  label={formatMessage({
                    id: 'pages.settings.twoFa.checkAttempts',
                    defaultMessage: 'Number of checking attempts',
                  })}
                  rules={[
                    {
                      required: true,
                      message: formatMessage({
                        id: 'pages.settings.twoFa.checkAttemptsRequired',
                        defaultMessage:
                          'Number of checking attempts is required.',
                      }),
                    },
                    {
                      type: 'number',
                      min: 1,
                      message: formatMessage({
                        id: 'pages.settings.twoFa.positiveInteger',
                        defaultMessage: 'Must be a non-negative integer.',
                      }),
                    },
                  ]}
                >
                  <InputNumber min={1} precision={0} className="w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="verificationCodeCheckRateLimitTime"
                  label={formatMessage({
                    id: 'pages.settings.twoFa.withinTime',
                    defaultMessage: 'Within time (sec)',
                  })}
                  rules={[
                    {
                      required: true,
                      message: formatMessage({
                        id: 'pages.settings.twoFa.withinTimeRequired',
                        defaultMessage: 'Time is required.',
                      }),
                    },
                    {
                      type: 'number',
                      min: 1,
                      message: formatMessage({
                        id: 'pages.settings.twoFa.positiveInteger',
                        defaultMessage: 'Must be a non-negative integer.',
                      }),
                    },
                  ]}
                >
                  <InputNumber min={1} precision={0} className="w-full" />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Card>

        <Card
          size="small"
          title={formatMessage({
            id: 'pages.settings.twoFa.availableProviders',
            defaultMessage: 'Available providers',
          })}
        >
          {providerMissing && (
            <Alert
              type="error"
              showIcon
              className="mb-4"
              message={formatMessage({
                id: 'pages.settings.twoFa.availableProvidersRequired',
                defaultMessage:
                  'At least one two-factor auth provider must be configured.',
              })}
            />
          )}
          {TWO_FA_PROVIDER_TYPES.map((providerType, index) => (
            <ProviderCard
              key={providerType}
              index={index}
              providerType={providerType}
              provider={providers?.find((p) => p.providerType === providerType)}
              backupCodeSwitchDisabled={backupCodeSwitchDisabled(providers)}
            />
          ))}
        </Card>
      </Form>
    </SettingsCard>
  );
}

function ProviderCard({
  index,
  providerType,
  provider,
  backupCodeSwitchDisabled: backupLocked,
}: {
  index: number;
  providerType: TwoFaProviderType;
  provider?: ProviderFormValue;
  backupCodeSwitchDisabled: boolean;
}) {
  const { formatMessage } = useIntl();
  const enabled = provider?.enable === true;
  const switchDisabled = providerType === 'BACKUP_CODE' && backupLocked;
  const namePrefix: Array<string | number> = ['providers', index];

  return (
    <Card
      size="small"
      title={formatMessage({
        id: `pages.settings.twoFa.provider.${providerType}`,
        defaultMessage: providerType,
      })}
      extra={
        <Form.Item
          name={[...namePrefix, 'enable']}
          valuePropName="checked"
          className="mb-0"
        >
          <Switch disabled={switchDisabled} />
        </Form.Item>
      }
      className="mb-4"
    >
      <Form.Item name={[...namePrefix, 'providerType']} hidden>
        <Input />
      </Form.Item>
      {enabled && providerType === 'TOTP' && (
        <Form.Item
          name={[...namePrefix, 'issuerName']}
          label={formatMessage({
            id: 'pages.settings.twoFa.issuerName',
            defaultMessage: 'Issuer name',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.settings.twoFa.issuerNameRequired',
                defaultMessage: 'Issuer name is required.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
      )}
      {enabled && providerType === 'SMS' && (
        <>
          <Form.Item
            name={[...namePrefix, 'smsVerificationMessageTemplate']}
            label={formatMessage({
              id: 'pages.settings.twoFa.verificationMessageTemplate',
              defaultMessage: 'Verification message template',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.settings.twoFa.verificationMessageTemplateRequired',
                  defaultMessage: 'Verification message template is required.',
                }),
              },
              {
                validator: (_, value: string | undefined) =>
                  !value || smsTemplateValid(value)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          formatMessage({
                            id: 'pages.settings.twoFa.verificationMessageTemplatePattern',
                            defaultMessage: `Verification message needs to contain pattern: ${'$'}{code}.`,
                          }),
                        ),
                      ),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name={[...namePrefix, 'verificationCodeLifetime']}
            label={formatMessage({
              id: 'pages.settings.twoFa.verificationCodeLifetime',
              defaultMessage: 'Verification code lifetime (sec)',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.settings.twoFa.verificationCodeLifetimeRequired',
                  defaultMessage: 'Verification code lifetime is required.',
                }),
              },
            ]}
          >
            <InputNumber min={1} precision={0} className="w-full" />
          </Form.Item>
        </>
      )}
      {enabled && providerType === 'EMAIL' && (
        <Form.Item
          name={[...namePrefix, 'verificationCodeLifetime']}
          label={formatMessage({
            id: 'pages.settings.twoFa.verificationCodeLifetime',
            defaultMessage: 'Verification code lifetime (sec)',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.settings.twoFa.verificationCodeLifetimeRequired',
                defaultMessage: 'Verification code lifetime is required.',
              }),
            },
          ]}
        >
          <InputNumber min={1} precision={0} className="w-full" />
        </Form.Item>
      )}
      {enabled && providerType === 'BACKUP_CODE' && (
        <Form.Item
          name={[...namePrefix, 'codesQuantity']}
          label={formatMessage({
            id: 'pages.settings.twoFa.numberOfCodes',
            defaultMessage: 'Number of verification codes',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.settings.twoFa.numberOfCodesRequired',
                defaultMessage: 'Number of verification codes is required.',
              }),
            },
          ]}
        >
          <InputNumber min={1} precision={0} className="w-full" />
        </Form.Item>
      )}
    </Card>
  );
}

/**
 * UUID list input for tenants/tenant-profiles (ui-ngx uses an entity
 * autocomplete; the tags-mode fallback keeps the same wire payload — see
 * the M3 report for the parity follow-up).
 */
function IdListSelect() {
  const { formatMessage } = useIntl();
  return (
    <Select
      mode="tags"
      open={false}
      tokenSeparators={[',', ' ']}
      placeholder={formatMessage({
        id: 'pages.settings.twoFa.idListPlaceholder',
        defaultMessage: 'Enter UUIDs separated by commas',
      })}
    />
  );
}
