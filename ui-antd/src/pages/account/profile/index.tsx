/**
 * Account profile page (route /account/profile, brief §2-D, ui-ngx
 * profile.component parity minus the M5 dashboard/unit facets).
 *
 * One card = one form over the current user: email / names / phone and the
 * language preference (`additionalInfo.lang`; the follow choice removes the
 * key). Saving runs the ui-ngx chain: POST /api/user → refresh
 * initialState.currentUser → switch the app locale when the preference is
 * explicit and different → silent token refresh so the JWT claims pick up
 * the new firstName/lastName. The page container carries the dirty back
 * guard (ADR 0008).
 */
import { useMutation } from '@tanstack/react-query';
import { getLocale, history, useModel } from '@umijs/max';
import { App, Button, Card, Form, Input, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import PageContainer from '@/components/layout/page-container';
import { tokenStore } from '@/core/auth/token-store';
import { changeLocale } from '@/locales/set-locale';
import { refreshToken } from '@/services/tb/auth';
import { saveUser } from '@/services/tb/user';
import type { User } from '@/types/tb';
import {
  localeForPreference,
  mergeProfileForm,
  type ProfileFormValue,
  profileFormValue,
  userLastLoginTs,
} from './data';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilePage() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { initialState, setInitialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser ?? null;

  const [form] = Form.useForm<ProfileFormValue>();
  const [dirty, setDirty] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: form is a stable useForm instance
  useEffect(() => {
    form.setFieldsValue(profileFormValue(currentUser));
    setDirty(false);
  }, [currentUser]);

  const saveMutation = useMutation({
    mutationFn: (values: ProfileFormValue) => {
      const payload = mergeProfileForm(currentUser as User, values);
      return saveUser(payload, { sendActivationMail: false });
    },
    onSuccess: async (saved, values) => {
      // 1. Mirror the saved entity into the shell state (avatar name etc.).
      setInitialState((s) => ({ ...s, currentUser: saved }));
      // 2. Follow an explicit language change immediately.
      const locale = localeForPreference(values.language);
      if (locale && locale !== getLocale()) {
        changeLocale(locale);
      }
      // 3. Silent token refresh so the JWT claims carry the new profile
      // (ui-ngx refreshJwtToken(false) parity). The caller owns the pair
      // side effects here (same contract as the login-as flow); a failed
      // refresh is silent — the stale pair keeps working and the regular
      // 401 refresh path re-runs later.
      try {
        const current = tokenStore.getRefreshToken();
        if (current) {
          const pair = await refreshToken(current);
          tokenStore.setTokens(pair.token, pair.refreshToken);
        }
      } catch {
        // keep the session on the previous pair
      }
      void message.success(
        formatMessage({
          id: 'pages.account.profile.toastSaved',
          defaultMessage: 'Profile saved.',
        }),
      );
      form.setFieldsValue(profileFormValue(saved));
      setDirty(false);
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.account.profile.toastSaveFailed',
          defaultMessage: 'Failed to save the profile.',
        }),
      );
    },
  });

  const lastLoginTs = userLastLoginTs(currentUser);

  return (
    <PageContainer
      // Explicit title: the leaf route name is 'profile', but the label
      // lives under the grouped key menu.account.profile.
      title={formatMessage({ id: 'menu.account.profile' })}
      dirty={dirty}
      onBack={() => history.push('/')}
    >
      <Card>
        <Form<ProfileFormValue>
          form={form}
          layout="vertical"
          style={{ maxWidth: 480 }}
          onValuesChange={() => setDirty(true)}
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <Form.Item
            name="email"
            label={formatMessage({
              id: 'pages.account.profile.email',
              defaultMessage: 'Email',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.account.profile.emailRequired',
                  defaultMessage: 'Email is required.',
                }),
              },
              {
                pattern: EMAIL_PATTERN,
                message: formatMessage({
                  id: 'pages.account.profile.emailInvalid',
                  defaultMessage: 'Invalid email format.',
                }),
              },
            ]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="firstName"
            label={formatMessage({
              id: 'pages.account.profile.firstName',
              defaultMessage: 'First name',
            })}
          >
            <Input autoComplete="given-name" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label={formatMessage({
              id: 'pages.account.profile.lastName',
              defaultMessage: 'Last name',
            })}
          >
            <Input autoComplete="family-name" />
          </Form.Item>
          <Form.Item
            name="phone"
            label={formatMessage({
              id: 'pages.account.profile.phone',
              defaultMessage: 'Phone number',
            })}
          >
            <Input autoComplete="tel" />
          </Form.Item>
          <Form.Item
            name="language"
            label={formatMessage({
              id: 'pages.account.profile.language',
              defaultMessage: 'Language',
            })}
          >
            <Select
              options={[
                {
                  value: '',
                  label: formatMessage({
                    id: 'pages.account.profile.languageFollow',
                    defaultMessage: 'Follow interface language',
                  }),
                },
                { value: 'zh_CN', label: '中文' },
                { value: 'en_US', label: 'English' },
              ]}
            />
          </Form.Item>
          {lastLoginTs !== undefined && (
            <Typography.Text type="secondary">
              {formatMessage(
                { id: 'pages.account.profile.lastLogin' },
                {
                  time: dayjs(lastLoginTs).format('YYYY-MM-DD HH:mm:ss'),
                },
              )}
            </Typography.Text>
          )}
          {dirty && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                onClick={() => {
                  form.setFieldsValue(profileFormValue(currentUser));
                  setDirty(false);
                }}
              >
                {formatMessage({
                  id: 'pages.common.cancel',
                  defaultMessage: 'Cancel',
                })}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saveMutation.isPending}
              >
                {formatMessage({
                  id: 'pages.settings.common.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            </div>
          )}
        </Form>
      </Card>
    </PageContainer>
  );
}
