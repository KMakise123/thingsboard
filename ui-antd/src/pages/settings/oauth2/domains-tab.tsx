/**
 * OAuth2 domains tab (settings domain, spec 3.7; ui-ngx domains table +
 * domain dialog parity). Table: createdTime / name / attached clients
 * (chips) / oauth2Enabled + propagateToEdge as inline row switches (each
 * toggle saves the domain immediately, ui-ngx cellAction semantics). The
 * dialog edits name (with the redirect-URI preview built from
 * GET /api/oauth2/loginProcessingUrl), the enable switches and the
 * attached-client multi-select. Save split follows ui-ngx: create posts
 * the client ids in `?oauth2ClientIds=`, update PUTs them separately.
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  deleteDomain,
  getDomainInfos,
  getOauth2ClientInfos,
  getOauth2LoginProcessingUrl,
  saveDomain,
  updateDomainOauth2Clients,
} from '@/services/tb/oauth2';
import type { Domain, DomainInfo } from '@/types/tb/oauth2';

const DOMAIN_AND_PORT_REGEXP = /^(?:\w+(?::\w+)?@)?[^\s/]+(?::\d+)?$/;

interface DomainFormValues {
  name: string;
  oauth2Enabled: boolean;
  propagateToEdge: boolean;
  clientIds: string[];
}

export default function DomainsTab() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const DOMAINS_KEY = ['settings', 'oauth2-domains'] as const;

  const domainsQuery = useQuery({
    queryKey: [...DOMAINS_KEY, 'page'],
    queryFn: () =>
      getDomainInfos({
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      domain,
      field,
    }: {
      domain: DomainInfo;
      field: 'oauth2Enabled' | 'propagateToEdge';
    }) => {
      const { oauth2ClientInfos: _infos, ...body } = domain;
      return saveDomain({ ...body, [field]: !domain[field] });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DOMAINS_KEY });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDomain(id),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.oauth2.toastDomainDeleted',
          defaultMessage: 'Domain deleted.',
        }),
      );
      void queryClient.invalidateQueries({ queryKey: DOMAINS_KEY });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const confirmDelete = (domain: DomainInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.settings.oauth2.deleteDomainTitle',
          defaultMessage: "Are you sure you want to delete domain '{name}'?",
        },
        { name: domain.name },
      ),
      content: formatMessage({
        id: 'pages.settings.oauth2.deleteDomainText',
        defaultMessage:
          'Be careful, after the confirmation the domain and all related provider data will become unavailable.',
      }),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(domain.id.id),
    });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DomainInfo | null>(null);

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
        id: 'pages.settings.oauth2.domainName',
        defaultMessage: 'Domain name',
      }),
      dataIndex: 'name',
    },
    {
      title: formatMessage({
        id: 'pages.settings.oauth2.clients',
        defaultMessage: 'OAuth2 clients',
      }),
      dataIndex: 'oauth2ClientInfos',
      render: (infos?: DomainInfo['oauth2ClientInfos']) =>
        !infos || infos.length === 0 ? (
          '-'
        ) : (
          <Space size={4} wrap>
            {infos.map((info) => (
              <Tag key={typeof info === 'string' ? info : info.id.id}>
                {typeof info === 'string' ? info : info.title}
              </Tag>
            ))}
          </Space>
        ),
    },
    {
      title: formatMessage({
        id: 'pages.settings.oauth2.oauth2Enabled',
        defaultMessage: 'OAuth2',
      }),
      dataIndex: 'oauth2Enabled',
      width: 110,
      align: 'center' as const,
      render: (_: unknown, record: DomainInfo) => (
        <Switch
          checked={record.oauth2Enabled}
          loading={toggleMutation.isPending}
          onChange={() =>
            toggleMutation.mutate({ domain: record, field: 'oauth2Enabled' })
          }
        />
      ),
    },
    {
      title: formatMessage({
        id: 'pages.settings.oauth2.propagateToEdge',
        defaultMessage: 'Propagate to Edge',
      }),
      dataIndex: 'propagateToEdge',
      width: 150,
      align: 'center' as const,
      render: (_: unknown, record: DomainInfo) => (
        <Switch
          checked={record.propagateToEdge}
          loading={toggleMutation.isPending}
          onChange={() =>
            toggleMutation.mutate({ domain: record, field: 'propagateToEdge' })
          }
        />
      ),
    },
    {
      valueType: 'option' as const,
      width: 100,
      render: (_: unknown, record: DomainInfo) => [
        <Button
          key="edit"
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setEditTarget(record);
            setDialogOpen(true);
          }}
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditTarget(null);
            setDialogOpen(true);
          }}
        >
          {formatMessage({
            id: 'pages.settings.oauth2.addDomain',
            defaultMessage: 'Add domain',
          })}
        </Button>
      </div>
      <Table<DomainInfo>
        rowKey={(record) => record.id.id}
        size="small"
        columns={columns}
        dataSource={domainsQuery.data?.data ?? []}
        loading={domainsQuery.isPending}
        pagination={{
          total: domainsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.settings.oauth2.noDomains',
            defaultMessage: 'No domains',
          }),
        }}
      />
      <DomainDialog
        open={dialogOpen}
        domain={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void queryClient.invalidateQueries({ queryKey: DOMAINS_KEY });
        }}
      />
    </div>
  );
}

function DomainDialog({
  open,
  domain,
  onClose,
  onSaved,
}: {
  open: boolean;
  domain: DomainInfo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<DomainFormValues>();
  const editing = !!domain;

  const clientsQuery = useQuery({
    queryKey: ['settings', 'oauth2-clients', 'dialog'],
    queryFn: () =>
      getOauth2ClientInfos({
        pageSize: 100,
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
    enabled: open,
  });
  const loginUrlQuery = useQuery({
    queryKey: ['settings', 'oauth2-login-processing-url'],
    queryFn: getOauth2LoginProcessingUrl,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: domain?.name ?? '',
        oauth2Enabled: domain?.oauth2Enabled ?? true,
        propagateToEdge: domain?.propagateToEdge ?? false,
        clientIds:
          domain?.oauth2ClientInfos?.map((info) =>
            typeof info === 'string' ? info : info.id.id,
          ) ?? [],
      });
    }
  }, [open, domain, form]);

  const name = Form.useWatch('name', form);
  const loginProcessingUrl = loginUrlQuery.data ?? '';
  // ui-ngx domain redirectURI(): bare domain + the login-processing suffix.
  const redirectUriPreview = name ? `${name}${loginProcessingUrl}` : '';

  const saveMutation = useMutation({
    mutationFn: async (values: DomainFormValues) => {
      const { clientIds, ...body } = values;
      const core = {
        name: body.name.trim(),
        oauth2Enabled: body.oauth2Enabled,
        propagateToEdge: body.propagateToEdge,
      };
      if (editing && domain) {
        const { oauth2ClientInfos: _infos, ...snapshot } = domain;
        await saveDomain({ ...snapshot, ...core });
        await updateDomainOauth2Clients(domain.id.id, clientIds);
        return;
      }
      // Create: the backend mints id/createdTime (AssetDialog precedent).
      await saveDomain(core as unknown as Domain, clientIds);
    },
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.oauth2.toastDomainSaved',
          defaultMessage: 'Domain saved.',
        }),
      );
      onSaved();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: editing
          ? 'pages.settings.oauth2.domainDetails'
          : 'pages.settings.oauth2.addDomain',
        defaultMessage: editing ? 'Domain details' : 'Add domain',
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
      <Form<DomainFormValues>
        form={form}
        layout="vertical"
        disabled={saveMutation.isPending}
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'pages.settings.oauth2.domainName',
            defaultMessage: 'Domain name',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.settings.oauth2.domainNameRequired',
                defaultMessage: 'Domain name is required.',
              }),
            },
            { max: 255 },
            {
              pattern: DOMAIN_AND_PORT_REGEXP,
              message: formatMessage({
                id: 'pages.settings.oauth2.domainNameInvalid',
                defaultMessage:
                  'Domain name should not contain "/" and ":". For example: thingsboard.io',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage({
            id: 'pages.settings.oauth2.redirectUriTemplate',
            defaultMessage: 'Redirect URI template',
          })}
        >
          <Typography.Text
            copyable={redirectUriPreview ? { text: redirectUriPreview } : false}
          >
            {redirectUriPreview || '-'}
          </Typography.Text>
        </Form.Item>
        <Form.Item
          name="oauth2Enabled"
          valuePropName="checked"
          label={formatMessage({
            id: 'pages.settings.oauth2.oauth2Enabled',
            defaultMessage: 'OAuth2',
          })}
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="clientIds"
          label={formatMessage({
            id: 'pages.settings.oauth2.clients',
            defaultMessage: 'OAuth2 clients',
          })}
        >
          <Select
            mode="multiple"
            allowClear
            optionFilterProp="label"
            loading={clientsQuery.isPending}
            options={(clientsQuery.data?.data ?? []).map((client) => ({
              value: client.id.id,
              label: client.title,
            }))}
            placeholder={formatMessage({
              id: 'pages.settings.oauth2.addClientPlaceholder',
              defaultMessage: 'Attach OAuth2 clients',
            })}
          />
        </Form.Item>
        <Form.Item
          name="propagateToEdge"
          valuePropName="checked"
          label={formatMessage({
            id: 'pages.settings.oauth2.propagateToEdge',
            defaultMessage: 'Propagate to Edge',
          })}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
