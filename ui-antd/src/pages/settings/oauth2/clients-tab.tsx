/**
 * OAuth2 clients tab (settings domain, spec 3.7; ui-ngx clients table +
 * client dialog parity, AntD-ized). Table: createdTime / title / platforms
 * with edit + delete. Dialog (ui-ngx 850px form): provider template preset
 * (GET /api/oauth2/config/template — presets overwrite fields except the
 * title), platforms (empty = All), credentials, client settings and the
 * mapper settings (BASIC / GITHUB / APPLE share the basic mapper fields —
 * GITHUB pins emailAttributeKey — and CUSTOM swaps in the custom mapper).
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  deleteOauth2Client,
  getOauth2ClientById,
  getOauth2ClientInfos,
  getOauth2ClientTemplates,
  saveOauth2Client,
} from '@/services/tb/oauth2';
import type {
  Oauth2Client,
  Oauth2ClientInfo,
  Oauth2ClientRegistrationTemplate,
  PlatformType,
} from '@/types/tb/oauth2';
import {
  applyClientTemplate,
  type ClientFormValues,
  MAPPER_TYPES,
  PLATFORM_TYPES,
  toClientFormValue,
  toClientPayload,
} from './data';

const URL_REGEXP =
  /^[A-Za-z][A-Za-z\d.+-]*:\/*(?:\w+(?::\w+)?@)?[^\s/]+(?::\d+)?(?:\/[\w#!:.,?+=&%@\-/]*)?$/;

export default function ClientsTab() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const CLIENTS_KEY = ['settings', 'oauth2-clients'] as const;

  const clientsQuery = useQuery({
    queryKey: [...CLIENTS_KEY, 'page'],
    queryFn: () =>
      getOauth2ClientInfos({
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Oauth2Client | null>(null);

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = async (info: Oauth2ClientInfo) => {
    const full = await getOauth2ClientById(info.id.id);
    setEditTarget(full);
    setDialogOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOauth2Client(id),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.oauth2.toastClientDeleted',
          defaultMessage: 'OAuth2 client deleted.',
        }),
      );
      void queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = (client: Oauth2ClientInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.settings.oauth2.deleteClientTitle',
          defaultMessage:
            "Are you sure you want to delete OAuth2 client '{name}'?",
        },
        { name: client.title },
      ),
      content: formatMessage({
        id: 'pages.settings.oauth2.deleteClientText',
        defaultMessage:
          'Be careful, after the confirmation the client and all related data will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(client.id.id),
    });
  };

  const columns = [
    {
      title: formatMessage({
        id: 'pages.settings.common.createdTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'createdTime',
      width: 170,
      render: (ts: number) => (
        <span className="tabular-nums">
          {dayjs(ts).format('YYYY-MM-DD HH:mm:ss')}
        </span>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.settings.oauth2.clientTitle',
        defaultMessage: 'Title',
      }),
      dataIndex: 'title',
    },
    {
      title: formatMessage({
        id: 'pages.settings.oauth2.allowedPlatforms',
        defaultMessage: 'Platforms',
      }),
      dataIndex: 'platforms',
      render: (platforms?: PlatformType[]) =>
        !platforms || platforms.length === 0 ? (
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.settings.oauth2.allPlatforms',
              defaultMessage: 'All platforms',
            })}
          </Typography.Text>
        ) : (
          <Space size={4} wrap>
            {platforms.map((platform) => (
              <Tag key={platform}>
                {formatMessage({
                  id: `pages.settings.oauth2.platform.${platform}`,
                  defaultMessage: platform,
                })}
              </Tag>
            ))}
          </Space>
        ),
    },
    {
      valueType: 'option' as const,
      width: 100,
      render: (_: unknown, record: Oauth2ClientInfo) => [
        <Button
          key="edit"
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => void openEdit(record)}
        />,
        <Button
          key="delete"
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => confirmDelete(record)}
        />,
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {formatMessage({
            id: 'pages.settings.oauth2.addClient',
            defaultMessage: 'Add OAuth2 client',
          })}
        </Button>
      </div>
      <Table<Oauth2ClientInfo>
        rowKey={(record) => record.id.id}
        size="small"
        columns={columns}
        dataSource={clientsQuery.data?.data ?? []}
        loading={clientsQuery.isPending}
        pagination={{
          total: clientsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.settings.oauth2.noClients',
            defaultMessage: 'No OAuth2 clients',
          }),
        }}
      />
      <ClientDialog
        open={dialogOpen}
        client={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
        }}
      />
    </div>
  );
}

function ClientDialog({
  open,
  client,
  onClose,
  onSaved,
}: {
  open: boolean;
  client: Oauth2Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<ClientFormValues>();
  const editing = !!client;

  const templatesQuery = useQuery({
    queryKey: ['settings', 'oauth2-templates'],
    queryFn: getOauth2ClientTemplates,
    enabled: open,
  });
  const templates = templatesQuery.data ?? [];
  const providerNames = ['Custom', ...templates.map((t) => t.name)];

  const mapperType = Form.useWatch('mapperType', form);
  const tenantNameStrategy = Form.useWatch('tenantNameStrategy', form);
  const [currentTitle, setCurrentTitle] = useState('');

  useEffect(() => {
    if (open) {
      const values = toClientFormValue(client);
      form.setFieldsValue(values);
      setCurrentTitle(values.title);
    }
  }, [open, client, form]);

  const saveMutation = useMutation({
    mutationFn: (values: ClientFormValues) =>
      saveOauth2Client(toClientPayload(values, client)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.oauth2.toastClientSaved',
          defaultMessage: 'OAuth2 client saved.',
        }),
      );
      onSaved();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const urlRule = (required: boolean, requiredMessageId: string) => [
    ...(required
      ? [
          {
            required: true,
            message: formatMessage({
              id: requiredMessageId,
              defaultMessage: 'This field is required.',
            }),
          },
        ]
      : []),
    {
      pattern: URL_REGEXP,
      message: formatMessage({
        id: 'pages.settings.oauth2.uriPatternError',
        defaultMessage: 'URI is invalid.',
      }),
    },
  ];

  return (
    <Modal
      open={open}
      width={850}
      title={formatMessage({
        id: editing
          ? 'pages.settings.oauth2.clientDetails'
          : 'pages.settings.oauth2.addClient',
        defaultMessage: editing ? 'OAuth2 client details' : 'Add OAuth2 client',
      })}
      destroyOnHidden
      confirmLoading={saveMutation.isPending}
      onCancel={onClose}
      okText={formatMessage({
        id: 'pages.settings.common.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.settings.common.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={() => form.submit()}
    >
      <Form<ClientFormValues>
        form={form}
        layout="vertical"
        disabled={saveMutation.isPending}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="providerName"
              label={formatMessage({
                id: 'pages.settings.oauth2.loginProvider',
                defaultMessage: 'Login provider',
              })}
              rules={[{ required: true }]}
            >
              <Select
                options={providerNames.map((name) => ({
                  value: name,
                  label:
                    name === 'Custom'
                      ? formatMessage({
                          id: 'pages.settings.oauth2.customProvider',
                          defaultMessage: 'Custom',
                        })
                      : name,
                }))}
                onChange={(name: string) => {
                  const template =
                    templates.find((t) => t.name === name) ?? null;
                  form.setFieldsValue(
                    applyClientTemplate(
                      template as Oauth2ClientRegistrationTemplate | null,
                      currentTitle,
                    ),
                  );
                  form.setFieldsValue({ providerName: name });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="title"
              label={formatMessage({
                id: 'pages.settings.oauth2.clientTitle',
                defaultMessage: 'Title',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.settings.oauth2.clientTitleRequired',
                    defaultMessage: 'Title is required.',
                  }),
                },
                { max: 100 },
              ]}
            >
              <Input
                onChange={(event) => setCurrentTitle(event.target.value)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="platforms"
          label={formatMessage({
            id: 'pages.settings.oauth2.allowedPlatforms',
            defaultMessage: 'Allowed platforms',
          })}
          tooltip={formatMessage({
            id: 'pages.settings.oauth2.platformsHint',
            defaultMessage: 'Empty selection means all platforms.',
          })}
        >
          <Select
            mode="multiple"
            allowClear
            options={PLATFORM_TYPES.map((platform) => ({
              value: platform,
              label: formatMessage({
                id: `pages.settings.oauth2.platform.${platform}`,
                defaultMessage: platform,
              }),
            }))}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="clientId"
              label={formatMessage({
                id: 'pages.settings.oauth2.clientId',
                defaultMessage: 'Client ID',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.settings.oauth2.clientIdRequired',
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
                id: 'pages.settings.oauth2.clientSecret',
                defaultMessage: 'Client secret',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.settings.oauth2.clientSecretRequired',
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

        <Typography.Title level={5} className="mt-2">
          {formatMessage({
            id: 'pages.settings.oauth2.clientSettings',
            defaultMessage: 'Client settings',
          })}
        </Typography.Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="accessTokenUri"
              label={formatMessage({
                id: 'pages.settings.oauth2.accessTokenUri',
                defaultMessage: 'Access token URI',
              })}
              rules={urlRule(
                true,
                'pages.settings.oauth2.accessTokenUriRequired',
              )}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="authorizationUri"
              label={formatMessage({
                id: 'pages.settings.oauth2.authorizationUri',
                defaultMessage: 'Authorization URI',
              })}
              rules={urlRule(
                true,
                'pages.settings.oauth2.authorizationUriRequired',
              )}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="jwkSetUri"
              label={formatMessage({
                id: 'pages.settings.oauth2.jwkSetUri',
                defaultMessage: 'JSON Web Key URI',
              })}
              rules={urlRule(false, '')}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="userInfoUri"
              label={formatMessage({
                id: 'pages.settings.oauth2.userInfoUri',
                defaultMessage: 'User info URI',
              })}
              rules={urlRule(false, '')}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="clientAuthenticationMethod"
              label={formatMessage({
                id: 'pages.settings.oauth2.clientAuthenticationMethod',
                defaultMessage: 'Client authentication method',
              })}
            >
              <Select
                options={['NONE', 'BASIC', 'POST'].map((method) => ({
                  value: method,
                  label: method,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="loginButtonLabel"
              label={formatMessage({
                id: 'pages.settings.oauth2.loginButtonLabel',
                defaultMessage: 'Provider label',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.settings.oauth2.loginButtonLabelRequired',
                    defaultMessage: 'Provider label is required.',
                  }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="loginButtonIcon"
          label={formatMessage({
            id: 'pages.settings.oauth2.loginButtonIcon',
            defaultMessage: 'Login button icon',
          })}
        >
          <Input />
        </Form.Item>

        <Typography.Title level={5} className="mt-2">
          {formatMessage({
            id: 'pages.settings.oauth2.mapperSettings',
            defaultMessage: 'Mapper settings',
          })}
        </Typography.Title>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="mapperType"
              label={formatMessage({
                id: 'pages.settings.oauth2.mapperType',
                defaultMessage: 'Mapper type',
              })}
            >
              <Select
                options={MAPPER_TYPES.map((type) => ({
                  value: type,
                  label: type,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="scope"
              label={formatMessage({
                id: 'pages.settings.oauth2.scope',
                defaultMessage: 'Scope',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.settings.oauth2.scopeRequired',
                    defaultMessage: 'Scope is required.',
                  }),
                },
              ]}
            >
              <Select mode="tags" open={false} tokenSeparators={[',', ' ']} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="userNameAttributeName"
              label={formatMessage({
                id: 'pages.settings.oauth2.userNameAttributeName',
                defaultMessage: 'User name attribute key',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.settings.oauth2.userNameAttributeNameRequired',
                    defaultMessage: 'User name attribute key is required.',
                  }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="allowUserCreation"
              valuePropName="checked"
              label={formatMessage({
                id: 'pages.settings.oauth2.allowUserCreation',
                defaultMessage: 'Allow user creation',
              })}
            >
              <Checkbox />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="activateUser"
              valuePropName="checked"
              label={formatMessage({
                id: 'pages.settings.oauth2.activateUser',
                defaultMessage: 'Activate user',
              })}
            >
              <Checkbox />
            </Form.Item>
          </Col>
        </Row>

        {mapperType !== 'CUSTOM' && (
          <>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="emailAttributeKey"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.emailAttributeKey',
                    defaultMessage: 'Email attribute key',
                  })}
                  rules={[
                    ...(mapperType === 'GITHUB'
                      ? []
                      : [
                          {
                            required: true,
                            message: formatMessage({
                              id: 'pages.settings.oauth2.emailAttributeKeyRequired',
                              defaultMessage:
                                'Email attribute key is required.',
                            }),
                          },
                        ]),
                    { max: 31 },
                  ]}
                >
                  <Input disabled={mapperType === 'GITHUB'} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="firstNameAttributeKey"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.firstNameAttributeKey',
                    defaultMessage: 'First name attribute key',
                  })}
                  rules={[{ max: 31 }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="lastNameAttributeKey"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.lastNameAttributeKey',
                    defaultMessage: 'Last name attribute key',
                  })}
                  rules={[{ max: 31 }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="tenantNameStrategy"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.tenantNameStrategy',
                    defaultMessage: 'Tenant name strategy',
                  })}
                >
                  <Select
                    options={['DOMAIN', 'EMAIL', 'CUSTOM'].map((strategy) => ({
                      value: strategy,
                      label: strategy,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="tenantNamePattern"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.tenantNamePattern',
                    defaultMessage: 'Tenant name pattern',
                  })}
                  rules={[
                    ...(tenantNameStrategy === 'CUSTOM'
                      ? [
                          {
                            required: true,
                            message: formatMessage({
                              id: 'pages.settings.oauth2.tenantNamePatternRequired',
                              defaultMessage:
                                'Tenant name pattern is required.',
                            }),
                          },
                        ]
                      : []),
                    { max: 255 },
                  ]}
                >
                  <Input disabled={tenantNameStrategy !== 'CUSTOM'} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customerNamePattern"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.customerNamePattern',
                    defaultMessage: 'Customer name pattern',
                  })}
                  rules={[{ max: 255 }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="defaultDashboardName"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.defaultDashboardName',
                    defaultMessage: 'Default dashboard name',
                  })}
                  rules={[{ max: 255 }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="alwaysFullScreen"
              valuePropName="checked"
              label={formatMessage({
                id: 'pages.settings.oauth2.alwaysFullScreen',
                defaultMessage: 'Always fullscreen',
              })}
            >
              <Checkbox />
            </Form.Item>
          </>
        )}

        {mapperType === 'CUSTOM' && (
          <>
            <Form.Item
              name="customUrl"
              label={formatMessage({
                id: 'pages.settings.oauth2.customUrl',
                defaultMessage: 'URL',
              })}
              rules={urlRule(true, 'pages.settings.oauth2.customUrlRequired')}
            >
              <Input maxLength={255} />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customUsername"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.customUsername',
                    defaultMessage: 'Username',
                  })}
                  rules={[{ max: 255 }]}
                >
                  <Input autoComplete="off" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customPassword"
                  label={formatMessage({
                    id: 'pages.settings.oauth2.customPassword',
                    defaultMessage: 'Password',
                  })}
                  rules={[{ max: 255 }]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="sendToken"
              valuePropName="checked"
              label={formatMessage({
                id: 'pages.settings.oauth2.sendToken',
                defaultMessage: 'Send Token',
              })}
            >
              <Checkbox />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
