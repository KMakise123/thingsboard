import { history, useIntl } from '@umijs/max';
import { Button, Result } from 'antd';
import React from 'react';

import { AuthShell } from './auth-shell';

/**
 * Expired-link notice (ui-ngx LinkExpiredComponent). Reached via backend
 * 303 redirects when an activation / password-reset token has expired.
 */
export const LinkExpired: React.FC<{
  variant: 'activation' | 'passwordReset';
}> = ({ variant }) => {
  const { formatMessage } = useIntl();
  const titleKey =
    variant === 'activation'
      ? 'pages.activationLinkExpired.title'
      : 'pages.passwordResetLinkExpired.title';
  const messageKey =
    variant === 'activation'
      ? 'pages.activationLinkExpired.message'
      : 'pages.passwordResetLinkExpired.message';
  return (
    <AuthShell>
      <Result
        status="warning"
        title={formatMessage({ id: titleKey })}
        subTitle={formatMessage({ id: messageKey })}
        extra={
          <Button type="primary" onClick={() => history.replace('/user/login')}>
            {formatMessage({ id: 'pages.linkExpired.backToLogin' })}
          </Button>
        }
      />
    </AuthShell>
  );
};
