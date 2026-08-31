import { Helmet, history, useIntl } from '@umijs/max';
import React from 'react';
import { brand } from '@/theme/brand';

import { AuthShell } from '../components/auth-shell';
import { LinkExpired } from '../components/link-expired';
import { SetPasswordForm } from '../components/set-password-form';
import { getQueryParam } from '../utils';

/**
 * /user/create-password — landing page of the activation email link
 * (`/api/noauth/activate?activateToken=…` 303 target). Missing token means
 * the link was consumed or mangled — show the expired notice.
 */
const CreatePassword: React.FC = () => {
  const { formatMessage } = useIntl();
  const activateToken = getQueryParam('activateToken');
  const title = formatMessage({ id: 'pages.createPassword.title' });

  if (!activateToken) {
    return <LinkExpired variant="activation" />;
  }

  return (
    <AuthShell title={title}>
      <Helmet>
        <title>{`${title} - ${brand.assets.appName}`}</title>
      </Helmet>
      <SetPasswordForm
        mode="activate"
        token={activateToken}
        submitLabel={formatMessage({ id: 'pages.createPassword.submit' })}
        onSuccess={() => history.replace('/user/login')}
      />
    </AuthShell>
  );
};

export default CreatePassword;
