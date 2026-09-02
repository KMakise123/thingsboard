import { history, useModel } from '@umijs/max';
import { Spin } from 'antd';
import React, { useEffect } from 'react';
import { roleDefaultPath } from '@/pages/user/utils';

/**
 * Role-aware entry for `/` and the 404 fallback: TA / CU → device list,
 * SA → tenants list. Anonymous visitors are picked up by the layout
 * runtime's onPageChange and sent to the login page.
 */
const HomeEntry: React.FC = () => {
  const { initialState } = useModel('@@initialState');

  useEffect(() => {
    const user = initialState?.currentUser;
    if (user) {
      history.replace(roleDefaultPath(user));
    }
  }, [initialState?.currentUser]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 96 }}>
      <Spin size="large" />
    </div>
  );
};

export default HomeEntry;
