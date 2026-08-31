import { history, useIntl } from '@umijs/max';
import { Button, Result } from 'antd';
import React from 'react';

/**
 * 403 node for the layout runtime (replaces umi's Chinese-only default).
 * Reached when an authenticated user hand-types a route their Authority
 * does not cover (spec §3.2).
 */
export const Forbidden: React.FC = () => {
  const { formatMessage } = useIntl();
  return (
    <Result
      status="403"
      title={formatMessage({ id: 'app.error.forbidden.title' })}
      subTitle={formatMessage({ id: 'app.error.forbidden.description' })}
      extra={
        <Button type="primary" onClick={() => history.replace('/')}>
          {formatMessage({ id: 'app.error.forbidden.back' })}
        </Button>
      }
    />
  );
};
