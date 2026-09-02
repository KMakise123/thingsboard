/**
 * Account security page (route /account/security, brief §2-E, ui-ngx
 * security.component parity minus the API-keys card — the backend contract
 * is absent, registered in the BCR). Three cards, ui-ngx order:
 *
 *   1. JWT token — expiration (localStorage `jwt_token_expiration`) +
 *      copy `Bearer <token>`; an expired token only warns (ui-ngx
 *      copyToken rule).
 *   2. Change password — current/new/confirm with the live password
 *      policy (shared usePasswordPolicy) and the server-detail error
 *      grading from brief §1.5. The action buttons appear only when dirty.
 *   3. Two-factor auth — hidden entirely when the platform enables no
 *      providers; rows = the platform providers joined with the account
 *      settings, each with an enable switch, per-provider data
 *      interpolation, the default-method selector (>1 non-BACKUP_CODE
 *      active) and backup-code regeneration.
 */
import { CopyOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useModel } from '@umijs/max';
import {
  App,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Spin,
  Switch,
  Typography,
} from 'antd';
import type { Rule } from 'antd/es/form';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { TOKEN_STORAGE_KEYS, tokenStore } from '@/core/auth/token-store';
import {
  newPasswordRules,
  PasswordPolicyPanel,
  usePasswordPolicy,
} from '@/pages/user/components/password-policy';
import { changePassword } from '@/services/tb/auth';
import {
  deleteTwoFaAccountConfig,
  getAccountTwoFaSettings,
  getAvailableTwoFaProviderTypes,
  updateTwoFaAccountConfig,
} from '@/services/tb/two-fa-account';
import type {
  AccountTwoFaSettings,
  TwoFaProviderType,
} from '@/types/tb/two-fa';
import {
  backupCodesLocked,
  changePasswordError,
  defaultProviderType,
  jwtExpirationDate,
  mainMethodCandidates,
  orderedProviderRows,
  providerDataInfo,
  settingsHasConfig,
} from './data';
import TwoFaEnableDialog from './two-fa-enable-dialog';
import { useCopy } from './use-copy';

const SETTINGS_KEY = ['tb', '2fa', 'account', 'settings'];
const PROVIDERS_KEY = ['tb', '2fa', 'account', 'providers'];

interface PasswordFormValue {
  currentPassword: string;
  newPassword: string;
  newPassword2: string;
}

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-4">
      <JwtTokenCard />
      <ChangePasswordCard />
      <TwoFaCard />
    </div>
  );
}

/** Card 1 — JWT token validity + copy. */
function JwtTokenCard() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const copy = useCopy();

  const token = tokenStore.getToken() ?? '';
  const expirationRaw = localStorage.getItem(
    TOKEN_STORAGE_KEYS.jwtTokenExpiration,
  );
  const expired = !tokenStore.isTokenValid('jwt');
  const expiration = jwtExpirationDate(expirationRaw);

  const copyToken = async () => {
    if (expired) {
      // ui-ngx parity: an expired token is not copied, only warned about.
      void message.warning(
        formatMessage({ id: 'pages.account.security.tokenExpiredWarn' }),
      );
      return;
    }
    if (await copy(`Bearer ${token}`)) {
      void message.success(
        formatMessage({ id: 'pages.account.security.tokenCopied' }),
      );
    }
  };

  return (
    <Card title={formatMessage({ id: 'pages.account.security.jwtTitle' })}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography.Text>
          {formatMessage({ id: 'pages.account.security.tokenValidTill' })}{' '}
          <Typography.Text strong>
            {expiration !== null
              ? dayjs(expiration).format('YYYY-MM-DD HH:mm:ss')
              : '-'}
          </Typography.Text>
        </Typography.Text>
        <Button type="primary" icon={<CopyOutlined />} onClick={copyToken}>
          {formatMessage({ id: 'pages.account.security.copyToken' })}
        </Button>
      </div>
    </Card>
  );
}

/** Card 2 — change password with the live policy checklist. */
function ChangePasswordCard() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordFormValue>();
  const [dirty, setDirty] = useState(false);
  const policyQuery = usePasswordPolicy();
  const newPassword = Form.useWatch('newPassword', form);

  const changeMutation = useMutation({
    mutationFn: (values: PasswordFormValue) =>
      changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      void message.success(
        formatMessage({ id: 'pages.account.security.toastPasswordChanged' }),
      );
      form.resetFields();
      setDirty(false);
    },
    onError: (error) => {
      // Brief §1.5 grading (ui-ngx onChangePassword parity).
      const outcome = changePasswordError(error);
      switch (outcome.kind) {
        case 'currentPassword':
          form.setFields([
            {
              name: 'currentPassword',
              errors: [
                formatMessage({
                  id: 'pages.account.security.currentPasswordIncorrect',
                }),
              ],
            },
          ]);
          break;
        case 'policyReload':
          void policyQuery.refetch();
          break;
        case 'alreadyUsed':
          form.setFields([{ name: 'newPassword', errors: [outcome.detail] }]);
          break;
        case 'rateLimited':
          void message.warning(
            formatMessage({ id: 'tb.error.tooManyRequests' }),
          );
          break;
        default:
          void message.error(serverErrorText(outcome.error));
      }
    },
  });

  const policyRules = newPasswordRules(policyQuery.data, formatMessage);
  // Group rule 1: the new password must differ from the CURRENT one.
  const sameAsOldRule: Rule = {
    validator: (_rule, value: string) =>
      !value || value !== form.getFieldValue('currentPassword')
        ? Promise.resolve()
        : Promise.reject(
            new Error(
              formatMessage({
                id: 'pages.account.security.passwordSameAsOld',
              }),
            ),
          ),
  };
  const matchRule: Rule = {
    validator: (_rule, value: string) =>
      !value || value === form.getFieldValue('newPassword')
        ? Promise.resolve()
        : Promise.reject(
            new Error(
              formatMessage({ id: 'pages.account.security.passwordsNotMatch' }),
            ),
          ),
  };

  return (
    <Card
      title={formatMessage({ id: 'pages.account.security.changePassword' })}
    >
      <div className="flex flex-col gap-6 md:flex-row">
        <Form<PasswordFormValue>
          form={form}
          layout="vertical"
          className="flex-1"
          style={{ maxWidth: 420 }}
          onValuesChange={() => setDirty(true)}
          onFinish={(values) => changeMutation.mutate(values)}
        >
          <Form.Item
            name="currentPassword"
            label={formatMessage({
              id: 'pages.account.security.currentPassword',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.account.security.currentPasswordRequired',
                }),
              },
            ]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={formatMessage({ id: 'pages.account.security.newPassword' })}
            rules={[...policyRules, sameAsOldRule]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="newPassword2"
            label={formatMessage({
              id: 'pages.account.security.newPasswordAgain',
            })}
            rules={[matchRule]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          {dirty && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  form.resetFields();
                  setDirty(false);
                }}
              >
                {formatMessage({ id: 'pages.common.cancel' })}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={changeMutation.isPending}
              >
                {formatMessage({ id: 'pages.account.security.changePassword' })}
              </Button>
            </div>
          )}
        </Form>
        <div className="flex-1">
          <PasswordPolicyPanel
            policy={policyQuery.data}
            value={newPassword ?? ''}
          />
        </div>
      </div>
    </Card>
  );
}

/** Card 3 — per-provider two-factor auth switches + dialogs. */
function TwoFaCard() {
  const { formatMessage } = useIntl();
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const { initialState } = useModel('@@initialState');
  const [dialogProvider, setDialogProvider] = useState<TwoFaProviderType>();

  const providersQuery = useQuery({
    queryKey: PROVIDERS_KEY,
    queryFn: getAvailableTwoFaProviderTypes,
  });
  const providerTypes = providersQuery.data;

  const settingsQuery = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: getAccountTwoFaSettings,
    enabled: (providerTypes?.length ?? 0) > 0,
  });
  const settings = settingsQuery.data;

  // Platform disabled (or not yet known) → the whole card stays hidden.
  if (!providerTypes || providerTypes.length === 0) {
    return null;
  }
  if (settingsQuery.isPending) {
    return (
      <Card title={formatMessage({ id: 'pages.account.security.twoFaTitle' })}>
        <Spin />
      </Card>
    );
  }

  const rows = orderedProviderRows(providerTypes);
  const activeTypes = rows.filter((type) => settingsHasConfig(settings, type));
  const activeSet = new Set(activeTypes);
  const defaultProvider = defaultProviderType(settings);
  const showMainMethod = mainMethodCandidates(activeTypes).length > 1;

  const applySettings = (next: AccountTwoFaSettings | undefined) => {
    if (next) {
      queryClient.setQueryData(SETTINGS_KEY, next);
    }
  };

  const toggleProvider = (type: TwoFaProviderType, checked: boolean) => {
    if (checked) {
      setDialogProvider(type);
      return;
    }
    const name = formatMessage({
      id: `pages.account.security.provider.${type}`,
    });
    modal.confirm({
      title: formatMessage(
        { id: 'pages.account.security.disableTitle' },
        { name },
      ),
      content: formatMessage(
        { id: 'pages.account.security.disableText' },
        { name },
      ),
      okButtonProps: { danger: true },
      onOk: async () => {
        applySettings(await deleteTwoFaAccountConfig(type));
      },
    });
  };

  const regenerateBackupCodes = () => {
    const codesLeft = providerDataInfo('BACKUP_CODE', settings);
    const start = async () => {
      applySettings(await deleteTwoFaAccountConfig('BACKUP_CODE'));
      setDialogProvider('BACKUP_CODE');
    };
    if (typeof codesLeft === 'number' && codesLeft > 0) {
      modal.confirm({
        title: formatMessage({ id: 'pages.account.security.regenerateTitle' }),
        content: formatMessage(
          { id: 'pages.account.security.regenerateText' },
          { count: codesLeft },
        ),
        okText: formatMessage({ id: 'pages.account.security.regenerateOk' }),
        okButtonProps: { danger: true },
        onOk: start,
      });
      return;
    }
    void start();
  };

  const switchDefaultProvider = async (type: TwoFaProviderType) => {
    if (type === defaultProvider) {
      return;
    }
    await updateTwoFaAccountConfig(type, true);
    applySettings(await getAccountTwoFaSettings());
  };

  return (
    <Card title={formatMessage({ id: 'pages.account.security.twoFaTitle' })}>
      <Typography.Paragraph type="secondary">
        {formatMessage({ id: 'pages.account.security.twoFaDescription' })}
      </Typography.Paragraph>
      <Typography.Title level={5}>
        {formatMessage({ id: 'pages.account.security.twoFaAuthenticateWith' })}
      </Typography.Title>
      {rows.map((type, index) => {
        const enabled = activeSet.has(type);
        const info = providerDataInfo(type, settings);
        return (
          <div key={type}>
            {index > 0 && <Divider className="my-4" />}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Typography.Text strong>
                  {formatMessage({
                    id: `pages.account.security.provider.${type}`,
                  })}
                </Typography.Text>
                <Typography.Paragraph type="secondary" className="mb-0">
                  {formatMessage(
                    {
                      id: `pages.account.security.provider.${type}.${
                        enabled ? 'hint' : 'description'
                      }`,
                    },
                    // TOTP's hint carries no {info}; extra values are ignored.
                    { info: info ?? '' },
                  )}
                </Typography.Paragraph>
                {enabled && showMainMethod && type !== 'BACKUP_CODE' && (
                  <Checkbox
                    className="mt-2"
                    checked={defaultProvider === type}
                    onChange={() => switchDefaultProvider(type)}
                  >
                    {formatMessage({
                      id: 'pages.account.security.twoFaMainMethod',
                    })}
                  </Checkbox>
                )}
                {enabled && type === 'BACKUP_CODE' && (
                  <div className="mt-2">
                    <Button onClick={regenerateBackupCodes}>
                      {formatMessage({
                        id: 'pages.account.security.getNewCode',
                      })}
                    </Button>
                  </div>
                )}
              </div>
              <Switch
                checked={enabled}
                disabled={
                  type === 'BACKUP_CODE' &&
                  backupCodesLocked(activeTypes, settings, rows)
                }
                onChange={(checked) => toggleProvider(type, checked)}
              />
            </div>
          </div>
        );
      })}
      {dialogProvider && (
        <TwoFaEnableDialog
          providerType={dialogProvider}
          email={initialState?.currentUser?.email}
          open
          onClose={() => setDialogProvider(undefined)}
          onSaved={(next) => {
            queryClient.setQueryData(SETTINGS_KEY, next);
            setDialogProvider(undefined);
          }}
        />
      )}
    </Card>
  );
}
