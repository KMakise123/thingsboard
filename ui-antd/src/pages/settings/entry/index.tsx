import { history, useModel } from '@umijs/max';
import { Spin } from 'antd';
import React, { useEffect } from 'react';
import { Authority } from '@/types/tb';

/**
 * Role-aware /settings landing (M14 R01, replaces the static redirect to
 * general): SA → /settings/general, TA → /settings/home — ui-ngx's
 * redirectTo-by-authority for the settings tree. Access to this shell page
 * itself is gated by the route group (canSysAdminOrTenantAdmin).
 */
const SettingsEntry: React.FC = () => {
  const { initialState } = useModel('@@initialState');

  useEffect(() => {
    const user = initialState?.currentUser;
    if (!user) {
      return;
    }
    history.replace(
      user.authority === Authority.TENANT_ADMIN
        ? '/settings/home'
        : '/settings/general',
    );
  }, [initialState?.currentUser]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 96 }}>
      <Spin size="large" />
    </div>
  );
};

export default SettingsEntry;
