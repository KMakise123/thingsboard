import { Helmet, history, useIntl } from '@umijs/max';
import React from 'react';
import { brand } from '@/theme/brand';

import { AuthShell } from '../components/auth-shell';
import { SetPasswordForm } from '../components/set-password-form';
import { getQueryParam } from '../utils';

/**
 * /user/reset-expired-password (ui-ngx resetExpiredPassword): users whose
 * password expired are routed here from the login response (errorCode 15
 * carries a resetToken); the token-less variant still allows a reset
 * attempt when the redirect lost its query.
 */
const ResetExpiredPassword: React.FC = () => {
  const { formatMessage } = useIntl();
  const resetToken = getQueryParam('resetToken') ?? '';
  const title = formatMessage({ id: 'pages.resetExpiredPassword.title' });

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

export default ResetExpiredPassword;
