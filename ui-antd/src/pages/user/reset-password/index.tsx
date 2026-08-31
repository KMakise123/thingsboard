import { Helmet, history, useIntl } from '@umijs/max';
import React from 'react';
import { brand } from '@/theme/brand';

import { AuthShell } from '../components/auth-shell';
import { LinkExpired } from '../components/link-expired';
import { SetPasswordForm } from '../components/set-password-form';
import { getQueryParam } from '../utils';

/**
 * /user/reset-password — landing page of the email reset link
 * (`/api/noauth/resetPassword?resetToken=…` 303 target). Missing token
 * means the link was already consumed or mangled — show the expired notice.
 */
const ResetPassword: React.FC = () => {
  const { formatMessage } = useIntl();
  const resetToken = getQueryParam('resetToken');
  const title = formatMessage({ id: 'pages.resetPassword.title' });

  if (!resetToken) {
    return <LinkExpired variant="passwordReset" />;
  }

  return (
    <AuthShell title={title}>
      <Helmet>
        <title>{`${title} - ${brand.assets.appName}`}</title>
      </Helmet>
      <SetPasswordForm
        mode="reset"
        token={resetToken}
        submitLabel={formatMessage({ id: 'pages.resetPassword.submit' })}
        onSuccess={() => history.replace('/user/login')}
      />
    </AuthShell>
  );
};

export default ResetPassword;
