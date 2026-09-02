/**
 * System settings → Outgoing mail page (spec 3.7, ui-ngx mail-server parity).
 *
 * One settings bucket (key `mail`) saved through POST /api/admin/settings.
 * Field groups follow ui-ngx mail-server.component:
 *   - provider preset select (CUSTOM + GET /api/mail/config/template rows);
 *     picking a preset overwrites the SMTP + OAuth2 URI fields (ui-ngx
 *     patchValue semantics), OFFICE_365 additionally derives
 *     authUri/tokenUri from the tenant id (%s placeholder);
 *   - connection settings (protocol/host/port/timeout, TLS, proxy);
 *   - authentication: basic (username + change-password-gated password —
 *     the server strips the stored password on read) or OAuth2
 *     (clientId/clientSecret/tenantId/URIs/scope + redirect-URI builder +
 *     the generate-token flow that navigates to the external IdP);
 *   - send test mail (POST /api/admin/settings/testMail — lands in the
 *     current sys-admin user's inbox).
 */

import { CopyOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import SettingsCard from '@/components/settings/SettingsCard';
import {
  generateMailOauth2AccessToken,
  getAdminSettings,
  getMailConfigTemplates,
  getMailOauth2LoginProcessingUrl,
  saveAdminSettings,
  sendTestMail,
} from '@/services/tb/admin';
import type {
  AdminSettings,
  MailConfigTemplate,
  MailServerSettings,
} from '@/types/tb/admin';

const TLS_VERSIONS = ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];

/** ui-ngx mail-server URL_REGEXP (verbatim). */
const URL_REGEXP =
  /^[A-Za-z][A-Za-z\d.+-]*:\/*(?:\w+(?::\w+)?@)?[^\s/]+(?::\d+)?(?:\/[\w#!:.,?+=&%@\-/]*)?$/;
/** ui-ngx DOMAIN_AND_PORT_REGEXP (verbatim). */
const DOMAIN_AND_PORT_REGEXP = /^(?:\w+(?::\w+)?@)?[^\s/]+(?::\d+)?$/;

interface MailFormValues extends MailServerSettings {
  /** UI-only gate: the stored password is only sent when this is set. */
  changePassword?: boolean;
}

interface RedirectDomainValues {
  scheme: 'HTTP' | 'HTTPS';
  name: string;
}

const CUSTOM_PROVIDER = 'CUSTOM';
const OFFICE_365_PROVIDER = 'OFFICE_365';

export default function SettingsOutgoingMailPage() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();

  const settingsQuery = useQuery({
    queryKey: ['settings', 'mail'],
    queryFn: () => getAdminSettings<MailServerSettings>('mail'),
  });
  const templatesQuery = useQuery({
    queryKey: ['settings', 'mail-templates'],
    queryFn: getMailConfigTemplates,
  });
  const loginUrlQuery = useQuery({
    queryKey: ['settings', 'mail-login-processing-url'],
    queryFn: getMailOauth2LoginProcessingUrl,
  });

  const snapshot = settingsQuery.data;
  const templates = useMemo(() => {
    const map = new Map<string, MailConfigTemplate>();
    for (const template of templatesQuery.data ?? []) {
      map.set(template.providerId, template);
    }
    return map;
  }, [templatesQuery.data]);
  const templateProviderIds = useMemo(
    () => [CUSTOM_PROVIDER, ...Array.from(templates.keys()).sort()],
    [templates],
  );

  const [form] = Form.useForm<MailFormValues>();
  const [domainForm] = Form.useForm<RedirectDomainValues>();
  const [dirty, setDirty] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [domainDirty, setDomainDirty] = useState(false);
  /** Mirror of ui-ngx showChangePassword: first save reveals the gate. */
  const [showChangePassword, setShowChangePassword] = useState(true);

  const providerId = Form.useWatch('providerId', form);
  const enableTls = Form.useWatch('enableTls', form);
  const enableProxy = Form.useWatch('enableProxy', form);
  const enableOauth2 = Form.useWatch('enableOauth2', form);
  const changePassword = Form.useWatch('changePassword', form);
  const tenantId = Form.useWatch('providerTenantId', form);

  const loadIntoForms = (settings: AdminSettings<MailServerSettings>) => {
    const json = { ...settings.jsonValue };
    // The server may deliver enableTls as a string (ui-ngx coerces too).
    if (typeof json.enableTls === 'string') {
      json.enableTls = (json.enableTls as unknown as string) === 'true';
    }
    const gate = (json as { showChangePassword?: boolean }).showChangePassword;
    setShowChangePassword(gate ?? true);
    delete (json as { showChangePassword?: boolean }).showChangePassword;
    if (!json.providerId) {
      json.providerId = CUSTOM_PROVIDER;
    }
    form.setFieldsValue(json as MailFormValues);
    if (json.redirectUri) {
      try {
        const url = new URL(json.redirectUri);
        const parsed = {
          scheme: url.protocol.startsWith('https') ? 'HTTPS' : 'HTTP',
          name: url.host,
        } as RedirectDomainValues;
        domainForm.setFieldsValue(parsed);
        setRedirectDomain(parsed);
      } catch {
        // Unparsable redirect URI: leave the builder at its defaults.
      }
    }
    setDirty(false);
    setDomainDirty(false);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadIntoForms closes over the current snapshot on purpose
  useEffect(() => {
    if (snapshot) {
      loadIntoForms(snapshot);
    }
  }, [snapshot]);

  useEffect(() => {
    if (!domainForm.getFieldValue('name')) {
      domainForm.setFieldValue('name', window.location.hostname);
    }
  }, [domainForm]);

  // Redirect-URI preview follows the builder fields (ui-ngx redirectURI()).
  const [redirectDomain, setRedirectDomain] = useState<RedirectDomainValues>({
    scheme: 'HTTPS',
    name: window.location.hostname,
  });
  const loginProcessingUrl = loginUrlQuery.data ?? '';
  const redirectUriPreview = useMemo(() => {
    if (!redirectDomain.name) {
      return '';
    }
    return `${redirectDomain.scheme.toLowerCase()}://${redirectDomain.name}${loginProcessingUrl}`;
  }, [redirectDomain, loginProcessingUrl]);

  // OFFICE_365 derives the URIs from the tenant id (ui-ngx %s template).
  // biome-ignore lint/correctness/useExhaustiveDependencies: form is a stable useForm instance
  useEffect(() => {
    if (providerId !== OFFICE_365_PROVIDER || !tenantId) {
      return;
    }
    const template = templates.get(OFFICE_365_PROVIDER);
    if (!template) {
      return;
    }
    form.setFieldsValue({
      authUri: template.authorizationUri.replace('%s', tenantId),
      tokenUri: template.accessTokenUri.replace('%s', tenantId),
    });
  }, [tenantId, providerId, templates]);

  /** ui-ngx providerId change: preset overwrites SMTP + OAuth2 fields. */
  const onProviderChange = (value: string) => {
    if (!value || value === CUSTOM_PROVIDER) {
      if (snapshot) {
        loadIntoForms({
          key: 'mail',
          jsonValue: {
            ...snapshot.jsonValue,
            providerId: CUSTOM_PROVIDER,
          },
        });
      }
      return;
    }
    const template = templates.get(value);
    if (!template) {
      return;
    }
    form.setFieldsValue({
      smtpProtocol: template.smtpProtocol,
      smtpHost: template.smtpHost,
      smtpPort: template.smtpPort,
      timeout: template.timeout,
      enableTls: template.enableTls,
      tlsVersion: template.tlsVersion,
      authUri: template.authorizationUri,
      tokenUri: template.accessTokenUri,
      scope: template.scope,
      enableOauth2: false,
      enableProxy: false,
      proxyHost: undefined,
      proxyPort: undefined,
      proxyUser: undefined,
      proxyPassword: undefined,
      clientId: undefined,
      clientSecret: undefined,
      providerTenantId: undefined,
      redirectUri: undefined,
    });
    setDirty(true);
  };

  const buildPayload = (
    values: MailFormValues,
  ): AdminSettings<MailServerSettings> => {
    const { changePassword: gate, ...formValue } = values;
    const json: MailServerSettings = {
      ...(snapshot?.jsonValue ?? {}),
      ...formValue,
      providerId: formValue.providerId || CUSTOM_PROVIDER,
    };
    if (gate !== true && showChangePassword) {
      // Locked password stays server-side: never send a stale value.
      delete json.password;
    }
    return { key: 'mail', jsonValue: json };
  };

  const saveMutation = useMutation({
    mutationFn: (values: MailFormValues) =>
      saveAdminSettings(buildPayload(values)),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.settings.mail.toastSaved',
          defaultMessage: 'Mail settings saved.',
        }),
      );
      setShowChangePassword(true);
      loadIntoForms(saved);
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

  const testMailMutation = useMutation({
    mutationFn: (values: MailFormValues) => sendTestMail(buildPayload(values)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.mail.toastTestMailSent',
          defaultMessage: 'Test mail has been sent!',
        }),
      );
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.mail.testMailFailed',
          defaultMessage: 'Failed to send the test mail.',
        }),
      );
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: generateMailOauth2AccessToken,
    onSuccess: (uri) => {
      window.location.href = uri;
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.mail.tokenGenerateFailed',
          defaultMessage: 'Failed to start the OAuth2 flow.',
        }),
      );
    },
  });

  const busy =
    saveMutation.isPending ||
    testMailMutation.isPending ||
    generateTokenMutation.isPending;

  const tokenGenerated = !!snapshot?.jsonValue.tokenGenerated;

  return (
    <SettingsCard
      title={formatMessage({
        id: 'pages.settings.mail.title',
        defaultMessage: 'Outgoing mail settings',
      })}
      loading={settingsQuery.isPending}
      dirty={dirty || domainDirty}
      invalid={invalid}
      saving={saveMutation.isPending}
      onUndo={() => {
        if (snapshot) {
          loadIntoForms(snapshot);
        }
      }}
      onSave={() => form.submit()}
    >
      <Form<MailFormValues>
        form={form}
        layout="vertical"
        initialValues={{ providerId: CUSTOM_PROVIDER, smtpProtocol: 'SMTP' }}
        onValuesChange={(changed) => {
          // providerId applies a whole preset (onProviderChange) — not a
          // plain value edit; it manages the dirty flag itself.
          if (!('providerId' in changed)) {
            setDirty(true);
          }
        }}
        onFieldsChange={(_, allFields) =>
          setInvalid(allFields.some((field) => (field.errors ?? []).length > 0))
        }
        onFinish={(values) => saveMutation.mutate(values)}
        disabled={busy}
      >
        <Form.Item
          name="mailFrom"
          label={formatMessage({
            id: 'pages.settings.mail.mailFrom',
            defaultMessage: 'Mail From',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.settings.mail.mailFromRequired',
                defaultMessage: 'Mail From is required.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="providerId"
          label={formatMessage({
            id: 'pages.settings.mail.smtpProvider',
            defaultMessage: 'SMTP provider',
          })}
        >
          <Select
            options={templateProviderIds.map((id) => ({
              value: id,
              label:
                id === CUSTOM_PROVIDER
                  ? formatMessage({
                      id: 'pages.settings.mail.customProvider',
                      defaultMessage: 'Custom',
                    })
                  : (templates.get(id)?.name ?? id),
            }))}
            onChange={onProviderChange}
          />
        </Form.Item>

        <Collapse
          className="mb-4"
          defaultActiveKey={
            providerId === CUSTOM_PROVIDER ? ['connection'] : []
          }
          items={[
            {
              key: 'connection',
              label: formatMessage({
                id: 'pages.settings.mail.connectionSettings',
                defaultMessage: 'Connection settings',
              }),
              forceRender: true,
              children: (
                <>
                  <Form.Item
                    name="smtpProtocol"
                    label={formatMessage({
                      id: 'pages.settings.mail.smtpProtocol',
                      defaultMessage: 'SMTP protocol',
                    })}
                  >
                    <Segmented
                      options={[
                        { value: 'SMTP', label: 'SMTP' },
                        { value: 'SMTPS', label: 'SMTPS' },
                      ]}
                    />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col xs={24} md={14}>
                      <Form.Item
                        name="smtpHost"
                        label={formatMessage({
                          id: 'pages.settings.mail.smtpHost',
                          defaultMessage: 'SMTP host',
                        })}
                        rules={[
                          {
                            required: true,
                            message: formatMessage({
                              id: 'pages.settings.mail.smtpHostRequired',
                              defaultMessage: 'SMTP host is required.',
                            }),
                          },
                        ]}
                      >
                        <Input placeholder="localhost" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                      <Form.Item
                        name="smtpPort"
                        label={formatMessage({
                          id: 'pages.settings.mail.smtpPort',
                          defaultMessage: 'SMTP port',
                        })}
                        rules={[
                          {
                            required: true,
                            message: formatMessage({
                              id: 'pages.settings.mail.smtpPortRequired',
                              defaultMessage: 'SMTP port is required.',
                            }),
                          },
                        ]}
                      >
                        <InputNumber
                          min={1}
                          max={65535}
                          precision={0}
                          className="w-full"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="timeout"
                    label={formatMessage({
                      id: 'pages.settings.mail.timeout',
                      defaultMessage: 'Timeout (msec)',
                    })}
                    rules={[
                      {
                        required: true,
                        message: formatMessage({
                          id: 'pages.settings.mail.timeoutRequired',
                          defaultMessage: 'Timeout is required.',
                        }),
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      max={999999}
                      precision={0}
                      className="w-full"
                    />
                  </Form.Item>
                  <Form.Item
                    name="enableTls"
                    valuePropName="checked"
                    label={formatMessage({
                      id: 'pages.settings.mail.enableTls',
                      defaultMessage: 'Enable TLS',
                    })}
                  >
                    <Checkbox />
                  </Form.Item>
                  {enableTls && (
                    <Form.Item
                      name="tlsVersion"
                      label={formatMessage({
                        id: 'pages.settings.mail.tlsVersion',
                        defaultMessage: 'TLS version',
                      })}
                    >
                      <Select
                        options={TLS_VERSIONS.map((v) => ({
                          value: v,
                          label: v,
                        }))}
                        allowClear
                      />
                    </Form.Item>
                  )}
                  <Form.Item
                    name="enableProxy"
                    valuePropName="checked"
                    label={formatMessage({
                      id: 'pages.settings.mail.enableProxy',
                      defaultMessage: 'Enable proxy',
                    })}
                  >
                    <Checkbox />
                  </Form.Item>
                  {enableProxy && (
                    <>
                      <Row gutter={16}>
                        <Col xs={24} md={14}>
                          <Form.Item
                            name="proxyHost"
                            label={formatMessage({
                              id: 'pages.settings.mail.proxyHost',
                              defaultMessage: 'Proxy host',
                            })}
                            rules={[
                              {
                                required: true,
                                message: formatMessage({
                                  id: 'pages.settings.mail.proxyHostRequired',
                                  defaultMessage: 'Proxy host is required.',
                                }),
                              },
                            ]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={10}>
                          <Form.Item
                            name="proxyPort"
                            label={formatMessage({
                              id: 'pages.settings.mail.proxyPort',
                              defaultMessage: 'Proxy port',
                            })}
                            rules={[
                              {
                                required: true,
                                message: formatMessage({
                                  id: 'pages.settings.mail.proxyPortRequired',
                                  defaultMessage: 'Proxy port is required.',
                                }),
                              },
                            ]}
                          >
                            <InputNumber
                              min={1}
                              max={65535}
                              precision={0}
                              className="w-full"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="proxyUser"
                            label={formatMessage({
                              id: 'pages.settings.mail.proxyUser',
                              defaultMessage: 'Proxy user',
                            })}
                          >
                            <Input autoComplete="off" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="proxyPassword"
                            label={formatMessage({
                              id: 'pages.settings.mail.proxyPassword',
                              defaultMessage: 'Proxy password',
                            })}
                          >
                            <Input.Password autoComplete="new-password" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  )}
                </>
              ),
            },
          ]}
        />

        <Card
          type="inner"
          title={formatMessage({
            id: 'pages.settings.mail.authentication',
            defaultMessage: 'Authentication',
          })}
          className="mb-4"
        >
          <Form.Item
            name="username"
            label={formatMessage({
              id: 'pages.settings.mail.username',
              defaultMessage: 'Username',
            })}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="enableOauth2"
            label={formatMessage({
              id: 'pages.settings.mail.authMethod',
              defaultMessage: 'Authentication method',
            })}
          >
            <Segmented
              options={[
                {
                  value: false,
                  label: formatMessage({
                    id: 'pages.settings.mail.basic',
                    defaultMessage: 'Basic',
                  }),
                },
                {
                  value: true,
                  label: formatMessage({
                    id: 'pages.settings.mail.oauth2',
                    defaultMessage: 'OAuth 2.0',
                  }),
                },
              ]}
            />
          </Form.Item>

          {!enableOauth2 && (
            <>
              {showChangePassword && (
                <Form.Item
                  name="changePassword"
                  valuePropName="checked"
                  label={formatMessage({
                    id: 'pages.settings.mail.changePassword',
                    defaultMessage: 'Change password',
                  })}
                >
                  <Checkbox />
                </Form.Item>
              )}
              {(changePassword || !showChangePassword) && (
                <Form.Item
                  name="password"
                  label={formatMessage({
                    id: 'pages.settings.mail.password',
                    defaultMessage: 'Password',
                  })}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              )}
            </>
          )}

          {enableOauth2 && (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="clientId"
                    label={formatMessage({
                      id: 'pages.settings.mail.clientId',
                      defaultMessage: 'Client ID',
                    })}
                    rules={[
                      {
                        required: true,
                        message: formatMessage({
                          id: 'pages.settings.mail.clientIdRequired',
                          defaultMessage: 'Client ID is required.',
                        }),
                      },
                      { max: 255 },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="clientSecret"
                    label={formatMessage({
                      id: 'pages.settings.mail.clientSecret',
                      defaultMessage: 'Client secret',
                    })}
                    rules={[
                      {
                        required: true,
                        message: formatMessage({
                          id: 'pages.settings.mail.clientSecretRequired',
                          defaultMessage: 'Client secret is required.',
                        }),
                      },
                      { max: 2048 },
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                </Col>
              </Row>
              {providerId === OFFICE_365_PROVIDER && (
                <Form.Item
                  name="providerTenantId"
                  label={formatMessage({
                    id: 'pages.settings.mail.microsoftTenantId',
                    defaultMessage: 'Directory (tenant) Id',
                  })}
                  rules={[
                    {
                      required: true,
                      message: formatMessage({
                        id: 'pages.settings.mail.microsoftTenantIdRequired',
                        defaultMessage: 'Directory (tenant) Id is required.',
                      }),
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
              )}
              <Collapse
                className="mb-4"
                defaultActiveKey={
                  providerId === CUSTOM_PROVIDER ? ['advanced'] : []
                }
                items={[
                  {
                    key: 'advanced',
                    label: formatMessage({
                      id: 'pages.settings.mail.advancedSettings',
                      defaultMessage: 'Advanced settings',
                    }),
                    forceRender: true,
                    children: (
                      <>
                        <Form.Item
                          name="authUri"
                          label={formatMessage({
                            id: 'pages.settings.mail.authUri',
                            defaultMessage: 'Authorization URI',
                          })}
                          rules={[
                            {
                              required: true,
                              message: formatMessage({
                                id: 'pages.settings.mail.uriRequired',
                                defaultMessage:
                                  'Authorization URI is required.',
                              }),
                            },
                            {
                              pattern: URL_REGEXP,
                              message: formatMessage({
                                id: 'pages.settings.mail.uriPatternError',
                                defaultMessage: 'URI is invalid.',
                              }),
                            },
                          ]}
                        >
                          <Input disabled={providerId !== CUSTOM_PROVIDER} />
                        </Form.Item>
                        <Form.Item
                          name="tokenUri"
                          label={formatMessage({
                            id: 'pages.settings.mail.tokenUri',
                            defaultMessage: 'Token URI',
                          })}
                          rules={[
                            {
                              required: true,
                              message: formatMessage({
                                id: 'pages.settings.mail.tokenUriRequired',
                                defaultMessage: 'Token URI is required.',
                              }),
                            },
                            {
                              pattern: URL_REGEXP,
                              message: formatMessage({
                                id: 'pages.settings.mail.uriPatternError',
                                defaultMessage: 'URI is invalid.',
                              }),
                            },
                          ]}
                        >
                          <Input disabled={providerId !== CUSTOM_PROVIDER} />
                        </Form.Item>
                        <Form.Item
                          name="scope"
                          label={formatMessage({
                            id: 'pages.settings.mail.scope',
                            defaultMessage: 'Scope',
                          })}
                          rules={[
                            {
                              required: true,
                              message: formatMessage({
                                id: 'pages.settings.mail.scopeRequired',
                                defaultMessage: 'Scope is required.',
                              }),
                            },
                          ]}
                        >
                          <Select
                            mode="tags"
                            open={false}
                            tokenSeparators={[',', ' ']}
                          />
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />
              <Card
                type="inner"
                size="small"
                title={formatMessage({
                  id: 'pages.settings.mail.redirectUri',
                  defaultMessage: 'Redirect URI',
                })}
                className="mb-4"
              >
                <Form<RedirectDomainValues>
                  form={domainForm}
                  layout="vertical"
                  onValuesChange={(_, values) => {
                    setDomainDirty(true);
                    setRedirectDomain(values as RedirectDomainValues);
                  }}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="scheme"
                        label={formatMessage({
                          id: 'pages.settings.mail.protocol',
                          defaultMessage: 'Protocol',
                        })}
                      >
                        <Select
                          options={[
                            { value: 'HTTP', label: 'HTTP' },
                            { value: 'HTTPS', label: 'HTTPS' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Form.Item
                        name="name"
                        label={formatMessage({
                          id: 'pages.settings.mail.domainName',
                          defaultMessage: 'Domain name',
                        })}
                        rules={[
                          {
                            required: true,
                            message: formatMessage({
                              id: 'pages.settings.mail.domainNameRequired',
                              defaultMessage: 'Domain name is required.',
                            }),
                          },
                          {
                            pattern: DOMAIN_AND_PORT_REGEXP,
                            message: formatMessage({
                              id: 'pages.settings.mail.domainNameInvalid',
                              defaultMessage:
                                'Domain name should not contain "/" and ":". For example: thingsboard.io',
                            }),
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
                <Form.Item
                  label={formatMessage({
                    id: 'pages.settings.mail.redirectUriTemplate',
                    defaultMessage: 'Redirect URI template',
                  })}
                >
                  <Input
                    readOnly
                    value={redirectUriPreview}
                    suffix={<CopyButton text={redirectUriPreview} />}
                  />
                </Form.Item>
              </Card>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Space>
                  <Typography.Text type="secondary">
                    {formatMessage({
                      id: 'pages.settings.mail.accessTokenStatus',
                      defaultMessage: 'Access token status:',
                    })}
                  </Typography.Text>
                  <Typography.Text>
                    {tokenGenerated
                      ? formatMessage({
                          id: 'pages.settings.mail.tokenStatusGenerated',
                          defaultMessage: 'Generated',
                        })
                      : formatMessage({
                          id: 'pages.settings.mail.tokenStatusNotGenerated',
                          defaultMessage: 'Not generated',
                        })}
                  </Typography.Text>
                </Space>
                <Button
                  type="primary"
                  loading={generateTokenMutation.isPending}
                  disabled={invalid || dirty || domainDirty}
                  onClick={() => generateTokenMutation.mutate()}
                >
                  {tokenGenerated
                    ? formatMessage({
                        id: 'pages.settings.mail.updateAccessToken',
                        defaultMessage: 'Update access token',
                      })
                    : formatMessage({
                        id: 'pages.settings.mail.generateAccessToken',
                        defaultMessage: 'Generate access token',
                      })}
                </Button>
              </div>
            </>
          )}
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button
            disabled={
              busy ||
              invalid ||
              (enableOauth2 === true && (dirty || domainDirty))
            }
            loading={testMailMutation.isPending}
            onClick={async () => {
              // Validate without saving (ui-ngx sendTestMail uses the live form).
              try {
                const values = await form.validateFields();
                testMailMutation.mutate(values);
              } catch {
                // Validation errors are rendered by the form itself.
              }
            }}
          >
            {formatMessage({
              id: 'pages.settings.mail.sendTestMail',
              defaultMessage: 'Send test mail',
            })}
          </Button>
        </div>
      </Form>
    </SettingsCard>
  );
}

function CopyButton({ text }: { text: string }) {
  const { message } = App.useApp();
  const { formatMessage } = useIntl();
  return (
    <Typography.Link
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        void message.success(
          formatMessage({
            id: 'pages.settings.mail.copied',
            defaultMessage: 'Copied to clipboard.',
          }),
        );
      }}
    >
      <CopyOutlined />
    </Typography.Link>
  );
}
