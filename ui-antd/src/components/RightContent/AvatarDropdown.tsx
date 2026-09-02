import {
  LogoutOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Spin } from 'antd';
import React, { startTransition } from 'react';
import { resetWsManager } from '@/components/layout/ws-manager';
import { logout } from '@/services/tb';

import HeaderDropdown from '../HeaderDropdown';

type GlobalHeaderRightProps = {
  children?: React.ReactNode;
};

/**
 * User menu (M4): profile / security entries into the /account family plus
 * sign-out; locale switching lives in LangDropdown. Sign-out = POST
 * /api/auth/logout (services layer always clears the four token keys) + WS
 * socket close + back to the login page with the current URL as the
 * post-login redirect target.
 */
export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  children,
}) => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { formatMessage } = useIntl();

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: formatMessage({ id: 'menu.account.profile' }),
    },
    {
      key: 'security',
      icon: <SafetyCertificateOutlined />,
      label: formatMessage({ id: 'menu.account.security' }),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: formatMessage({ id: 'app.userMenu.logout' }),
    },
  ];

  const handleLogout = async () => {
    try {
      // logout() clears the token store even when the call fails.
      await logout();
    } catch {
      // Network failure must not keep a dead session alive.
    }
    resetWsManager();
    startTransition(() => {
      setInitialState((s) => ({ ...s, currentUser: null }));
    });
    if (window.location.pathname !== '/user/login') {
      const { pathname, search } = window.location;
      history.replace(
        `/user/login?redirect=${encodeURIComponent(pathname + search)}`,
      );
    }
  };

  const onMenuClick: MenuProps['onClick'] = (event) => {
    if (event.key === 'profile') {
      history.push('/account/profile');
      return;
    }
    if (event.key === 'security') {
      history.push('/account/security');
      return;
    }
    if (event.key === 'logout') {
      handleLogout();
    }
  };

  if (!initialState?.currentUser) {
    return <Spin size="small" />;
  }

  return (
    <HeaderDropdown
      placement="bottomRight"
      menu={{
        selectedKeys: [],
        onClick: onMenuClick,
        items: menuItems,
      }}
      arrow
    >
      {children}
    </HeaderDropdown>
  );
};
