/**
 * Shared repository-settings form (M14 wave-2, R22) — the three-scenario
 * form of ui-ngx tb-repository-settings:
 *   1. /settings/repository shell page (this wave),
 *   2. /versionControl "no repository" gate (wave 6),
 *   3. /settings/auto-commit "no repository" gate (wave 3).
 *
 * `detailsMode` compresses the layout and hides Delete (ngx parity for the
 * gate/popover mounts).
 *
 * Wire rules pinned by wave-1 T3 + contract #8/#9:
 *   - GET strips the three credential fields; stored credentials are
 *     HIDDEN behind "Change password / passphrase" checkboxes (R31);
 *   - save/checkAccess payloads strip untouched/empty credential fields
 *     (stripUnchangedCredentials — an empty string would be treated as a
 *     REAL credential and fail the validation clone);
 *   - save is a validation-style save (real clone/fetch): failures are
 *     500 "Failed to init repository!" WITHOUT a cause, while the
 *     Check-access probe surfaces the underlying reason — hence Check
 *     access is the diagnosable pre-save step and its error text is shown
 *     verbatim;
 *   - readOnly = the whole VC domain turns read-only for the tenant
 *     (versions Create disabled, auto-commit skipped) — hint + cache
 *     invalidation make every consumer re-read the gate state.
 */
import { InboxOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  checkRepositoryAccess,
  deleteRepositorySettings,
  getRepositorySettings,
  getRepositorySettingsInfo,
  type RepositorySettings,
  saveRepositorySettings,
} from '@/services/tb/version-control';
import {
  defaultRepositoryFormValues,
  type RepositorySettingsFormValues,
  stripUnchangedCredentials,
} from './repository-settings-data';

const AUTH_METHOD_OPTIONS = [
  { value: 'USERNAME_PASSWORD', key: 'authMethodUsernamePassword' },
  { value: 'PRIVATE_KEY', key: 'authMethodPrivateKey' },
] as const;

function toFormValue(
  settings: RepositorySettings | null,
): RepositorySettingsFormValues {
  if (!settings) {
    return defaultRepositoryFormValues();
  }
  return {
    repositoryUri: settings.repositoryUri,
    defaultBranch: settings.defaultBranch ?? 'main',
    readOnly: settings.readOnly ?? false,
    showMergeCommits: settings.showMergeCommits ?? false,
    authMethod: settings.authMethod ?? 'USERNAME_PASSWORD',
    username: settings.username,
    privateKeyFileName: settings.privateKeyFileName,
  };
}

/** Wire body of a form snapshot: strip credentials the user left alone. */
function toPayload(
  values: RepositorySettingsFormValues,
  changeFlags: {
    password: boolean;
    privateKey: boolean;
    privateKeyPassword: boolean;
  },
): RepositorySettings {
  const base = {
    repositoryUri: values.repositoryUri,
    defaultBranch: values.defaultBranch,
    readOnly: values.readOnly,
    showMergeCommits: values.showMergeCommits,
    authMethod: values.authMethod,
  };
  if (values.authMethod === 'USERNAME_PASSWORD') {
    return stripUnchangedCredentials(
      { ...base, username: values.username, password: values.password },
      changeFlags,
    );
  }
  return stripUnchangedCredentials(
    {
      ...base,
      privateKeyFileName: values.privateKeyFileName,
      privateKey: values.privateKey,
      privateKeyPassword: values.privateKeyPassword,
    },
    changeFlags,
  );
}

/**
 * tb-file-input equivalent (ngx): the form field VALUE is the file NAME
 * (the wire field), while the file content is side-channeled into the
 * sibling `privateKey` field — the ImageField controlled pattern
 * (components/profiles/image-field.tsx).
 */
function PrivateKeyFileInput({
  value,
  onChange,
  onContent,
}: {
  value?: string;
  onChange?: (value?: string) => void;
  onContent?: (content: string) => void;
}) {
  const { formatMessage } = useIntl();
  const onFile = (file: UploadFile) => {
    const origin = file.originFileObj;
    if (!origin) {
      return false;
    }
    void origin.text().then((text) => {
      onContent?.(text);
      onChange?.(origin.name);
    });
    return false; // never auto-upload: the key travels in the save payload
  };
  return (
    <Upload.Dragger
      accept=".pem"
      showUploadList={false}
      maxCount={1}
      beforeUpload={(_file, fileList) => onFile(fileList[0])}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">
        {value ||
          formatMessage({
            id: 'pages.versionControl.repository.dropPrivateKeyFile',
            defaultMessage: 'Drag and drop a private key file or click',
          })}
      </p>
    </Upload.Dragger>
  );
}

export default function RepositorySettingsForm({
  detailsMode = false,
}: {
  detailsMode?: boolean;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // hasRepository 状态源 (contract #11): one query drives every gate.
  const infoQuery = useQuery({
    queryKey: ['vc-repo-info'],
    queryFn: getRepositorySettingsInfo,
  });
  const settingsQuery = useQuery({
    queryKey: ['vc-repo-settings'],
    queryFn: getRepositorySettings,
    enabled: infoQuery.data?.configured === true,
  });
  const stored = settingsQuery.data ?? null;

  const [form] = Form.useForm<RepositorySettingsFormValues>();
  const [dirty, setDirty] = useState(false);
  const [invalid, setInvalid] = useState(false);
  /** Stored credentials hide their inputs behind "Change ..." checkboxes. */
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [hasStoredKeyPassword, setHasStoredKeyPassword] = useState(false);

  const authMethod = Form.useWatch('authMethod', form);
  const changePassword = Form.useWatch('changePassword', form);
  const changePrivateKeyPassword = Form.useWatch(
    'changePrivateKeyPassword',
    form,
  );

  useEffect(() => {
    if (!settingsQuery.isSuccess) {
      return;
    }
    form.setFieldsValue(toFormValue(stored));
    setHasStoredPassword(stored?.authMethod === 'USERNAME_PASSWORD');
    setHasStoredKeyPassword(stored?.authMethod === 'PRIVATE_KEY');
    setDirty(false);
  }, [stored, settingsQuery.isSuccess, form]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['vc-repo-info'] });
    void queryClient.invalidateQueries({ queryKey: ['vc-branches'] });
  };

  const changeFlags = () => ({
    password: form.getFieldValue('changePassword') === true,
    // A private key is only ever present via a fresh upload (the stored
    // one never re-displayed), so it always travels with its flag on.
    privateKey: true,
    privateKeyPassword: form.getFieldValue('changePrivateKeyPassword') === true,
  });

  const saveMutation = useMutation({
    mutationFn: (values: RepositorySettingsFormValues) =>
      saveRepositorySettings(toPayload(values, changeFlags())),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.versionControl.repository.toastSaved',
          defaultMessage: 'Repository settings saved.',
        }),
      );
      form.setFieldsValue(toFormValue(saved));
      form.setFieldsValue({
        changePassword: false,
        changePrivateKeyPassword: false,
      });
      setHasStoredPassword(saved.authMethod === 'USERNAME_PASSWORD');
      setHasStoredKeyPassword(saved.authMethod === 'PRIVATE_KEY');
      setDirty(false);
      invalidate();
    },
    onError: (error) => {
      // 500 "Failed to init repository!" without a cause — guide the user
      // through the Check-access probe which shows the underlying reason.
      void message.error(
        `${formatMessage({
          id: 'pages.versionControl.repository.saveFailedHint',
          defaultMessage:
            'Failed to save the repository settings. Run Check access to see the underlying reason.',
        })} (${serverErrorText(error)})`,
      );
    },
  });

  const checkAccessMutation = useMutation({
    mutationFn: (values: RepositorySettingsFormValues) =>
      checkRepositoryAccess(toPayload(values, changeFlags())),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.versionControl.repository.checkAccessSuccess',
          defaultMessage: 'Repository access successfully verified!',
        }),
      );
    },
    onError: (error) => {
      // 400 carries the underlying cause ("Unable to access repository:
      // <reason>") — surface it verbatim (contract #9).
      void message.error(
        serverErrorText(error) ||
          formatMessage({
            id: 'pages.versionControl.repository.checkAccessFailed',
            defaultMessage: 'Failed to verify repository access.',
          }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRepositorySettings,
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.versionControl.repository.toastDeleted',
          defaultMessage: 'Repository settings deleted.',
        }),
      );
      form.setFieldsValue(toFormValue(null));
      form.setFieldsValue({
        changePassword: false,
        changePrivateKeyPassword: false,
      });
      setHasStoredPassword(false);
      setHasStoredKeyPassword(false);
      setDirty(false);
      invalidate();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  // Dirty leave confirm (ngx ConfirmOnExit equivalent): umi on react-router
  // 6.3 exposes no route blocker, so the guard is the browser-level event
  // (same pattern as the detail pages / security-settings).
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const busy =
    saveMutation.isPending ||
    checkAccessMutation.isPending ||
    deleteMutation.isPending;

  return (
    <Card
      title={formatMessage({
        id: 'pages.versionControl.repository.title',
        defaultMessage: 'Repository settings',
      })}
      loading={infoQuery.isPending || settingsQuery.isPending}
    >
      <Form<RepositorySettingsFormValues>
        form={form}
        layout="vertical"
        initialValues={defaultRepositoryFormValues()}
        onValuesChange={(changed) => {
          // The "Change ..." checkboxes are UI-only — they do not dirty the
          // settings themselves.
          if (
            !('changePassword' in changed) &&
            !('changePrivateKeyPassword' in changed)
          ) {
            setDirty(true);
          }
        }}
        onFieldsChange={(_, allFields) =>
          setInvalid(allFields.some((field) => (field.errors ?? []).length > 0))
        }
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item
          name="repositoryUri"
          label={formatMessage({
            id: 'pages.versionControl.repository.repositoryUri',
            defaultMessage: 'Repository URL',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.versionControl.repository.repositoryUriRequired',
                defaultMessage: 'Repository URL is required.',
              }),
            },
          ]}
        >
          <Input placeholder="https://git.example.com/repo.git" />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="defaultBranch"
              label={formatMessage({
                id: 'pages.versionControl.repository.defaultBranch',
                defaultMessage: 'Default branch name',
              })}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="authMethod"
              label={formatMessage({
                id: 'pages.versionControl.repository.authMethod',
                defaultMessage: 'Authentication method',
              })}
              rules={[
                {
                  required: true,
                  message: formatMessage({
                    id: 'pages.versionControl.repository.authMethodRequired',
                    defaultMessage: 'Authentication method is required.',
                  }),
                },
              ]}
            >
              <Select
                options={AUTH_METHOD_OPTIONS.map((option) => ({
                  value: option.value,
                  label: formatMessage({
                    id: `pages.versionControl.repository.${option.key}`,
                    defaultMessage:
                      option.value === 'PRIVATE_KEY'
                        ? 'Private key'
                        : 'Password / access token',
                  }),
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <div className="flex flex-col gap-1 pb-4">
          <Form.Item
            name="readOnly"
            valuePropName="checked"
            className="mb-0"
            tooltip={formatMessage({
              id: 'pages.versionControl.repository.readOnlyHint',
              defaultMessage:
                'While read-only, every version-control operation that writes to the repository (create version, auto-commit) is disabled for the tenant.',
            })}
          >
            <Checkbox>
              {formatMessage({
                id: 'pages.versionControl.repository.readOnly',
                defaultMessage: 'Read-only',
              })}
            </Checkbox>
          </Form.Item>
          <Form.Item
            name="showMergeCommits"
            valuePropName="checked"
            className="mb-0"
          >
            <Checkbox>
              {formatMessage({
                id: 'pages.versionControl.repository.showMergeCommits',
                defaultMessage: 'Show merge commits',
              })}
            </Checkbox>
          </Form.Item>
        </div>

        <Card
          type="inner"
          title={formatMessage({
            id: 'pages.versionControl.repository.authentication',
            defaultMessage: 'Authentication settings',
          })}
          className="mb-4"
        >
          {authMethod === 'PRIVATE_KEY' ? (
            <>
              <Form.Item
                name="privateKeyFileName"
                label={formatMessage({
                  id: 'pages.versionControl.repository.privateKey',
                  defaultMessage: 'Private key',
                })}
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.versionControl.repository.privateKeyRequired',
                      defaultMessage: 'Private key file is required.',
                    }),
                  },
                ]}
              >
                <PrivateKeyFileInput
                  onContent={(content) =>
                    form.setFieldsValue({ privateKey: content })
                  }
                />
              </Form.Item>
              {hasStoredKeyPassword && (
                <Form.Item
                  name="changePrivateKeyPassword"
                  valuePropName="checked"
                >
                  <Checkbox
                    onChange={(event) => {
                      if (event.target.checked) {
                        form.setFieldsValue({ privateKeyPassword: '' });
                      }
                    }}
                  >
                    {formatMessage({
                      id: 'pages.versionControl.repository.changePassphrase',
                      defaultMessage: 'Change passphrase',
                    })}
                  </Checkbox>
                </Form.Item>
              )}
              {(!hasStoredKeyPassword || changePrivateKeyPassword === true) && (
                <Form.Item
                  name="privateKeyPassword"
                  label={formatMessage({
                    id: 'pages.versionControl.repository.passphrase',
                    defaultMessage: 'Passphrase',
                  })}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              )}
            </>
          ) : (
            <>
              <Form.Item
                name="username"
                label={formatMessage({
                  id: 'pages.versionControl.repository.username',
                  defaultMessage: 'Username',
                })}
              >
                <Input autoComplete="off" />
              </Form.Item>
              {hasStoredPassword && (
                <Form.Item name="changePassword" valuePropName="checked">
                  <Checkbox
                    onChange={(event) => {
                      if (event.target.checked) {
                        form.setFieldsValue({ password: '' });
                      }
                    }}
                  >
                    {formatMessage({
                      id: 'pages.versionControl.repository.changePassword',
                      defaultMessage: 'Change password / access token',
                    })}
                  </Checkbox>
                </Form.Item>
              )}
              {(!hasStoredPassword || changePassword === true) && (
                <Form.Item
                  name="password"
                  label={formatMessage({
                    id: 'pages.versionControl.repository.password',
                    defaultMessage: 'Password / access token',
                  })}
                  extra={formatMessage({
                    id: 'pages.versionControl.repository.usernamePasswordHint',
                    defaultMessage:
                      'GitHub users must use access tokens with write permissions to the repository.',
                  })}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              )}
            </>
          )}
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!detailsMode && stored && (
            <Popconfirm
              title={formatMessage({
                id: 'pages.versionControl.repository.deleteConfirmTitle',
                defaultMessage:
                  'Are you sure you want to delete repository settings?',
              })}
              description={formatMessage({
                id: 'pages.versionControl.repository.deleteConfirmText',
                defaultMessage:
                  'Be careful, after the confirmation the repository settings will be removed and version control feature will be unavailable.',
              })}
              okText={formatMessage({
                id: 'pages.versionControl.repository.delete',
                defaultMessage: 'Delete',
              })}
              cancelText={formatMessage({
                id: 'pages.common.cancel',
                defaultMessage: 'Cancel',
              })}
              onConfirm={() => deleteMutation.mutate()}
              okButtonProps={{ danger: true }}
            >
              <Button danger disabled={busy}>
                {formatMessage({
                  id: 'pages.versionControl.repository.delete',
                  defaultMessage: 'Delete',
                })}
              </Button>
            </Popconfirm>
          )}
          {!detailsMode && <span className="flex-1" />}
          <Button
            disabled={busy || invalid}
            onClick={() => {
              // Validate WITHOUT submitting to the save mutation: the
              // probe shares the payload shape but never persists.
              void form
                .validateFields()
                .then((values) => checkAccessMutation.mutate(values))
                .catch(() => {
                  // Validation errors render on the fields themselves.
                });
            }}
            loading={checkAccessMutation.isPending}
          >
            {formatMessage({
              id: 'pages.versionControl.repository.checkAccess',
              defaultMessage: 'Check access',
            })}
          </Button>
          <Button
            type="primary"
            disabled={busy || invalid || !dirty}
            onClick={() => form.submit()}
            loading={saveMutation.isPending}
          >
            {formatMessage({
              id: 'pages.settings.common.save',
              defaultMessage: 'Save',
            })}
          </Button>
        </div>
      </Form>
      {infoQuery.data && (
        <Typography.Text type="secondary" className="mt-2 block">
          {infoQuery.data.configured
            ? formatMessage({
                id: 'pages.versionControl.repository.configuredState',
                defaultMessage: 'Repository configured.',
              })
            : formatMessage({
                id: 'pages.versionControl.repository.notConfiguredState',
                defaultMessage: 'Repository is not configured yet.',
              })}
        </Typography.Text>
      )}
    </Card>
  );
}
