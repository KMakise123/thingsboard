import { history, useModel } from '@umijs/max';
import { Spin } from 'antd';
import React, { useEffect, useRef } from 'react';
import { tokenStore } from '@/core/auth/token-store';
import { getQueryParam, roleDefaultPath } from '@/pages/user/utils';
import { getCurrentUser } from '@/services/tb';

/**
 * Role-aware entry for `/` and the 404 fallback: TA / CU → device list,
 * SA → tenants list. Anonymous visitors are picked up by the layout
 * runtime's onPageChange and sent to the login page.
 *
 * Also the OAuth2 success-callback consumer (brief §1.4): the backend 302s
 * back to `/?accessToken=…&refreshToken=…`, so the pair is stored, the query
 * stripped and the regular user fetch + role landing takes over.
 */
const HomeEntry: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');

  useEffect(() => {
    const user = initialState?.currentUser;
    if (user) {
      history.replace(roleDefaultPath(user));
    }
  }, [initialState?.currentUser]);

  // Mount-only: the callback lands exactly once and must survive the
  // re-renders caused by the setInitialState below.
  const oauth2Consumed = useRef(false);
  useEffect(() => {
    if (oauth2Consumed.current) {
      return;
    }
    const accessToken = getQueryParam('accessToken');
    const refreshToken = getQueryParam('refreshToken');
    if (!accessToken || !refreshToken) {
      return;
    }
    oauth2Consumed.current = true;
    try {
      tokenStore.setTokens(accessToken, refreshToken);
    } catch {
      // Unusable pair — stay anonymous and let the normal flow take over.
      return;
    }
    history.replace(history.location.pathname);
    void (async () => {
      try {
        const user = await getCurrentUser();
        setInitialState((s) => ({ ...s, currentUser: user }));
      } catch {
        // A rejected user fetch already fired the unauthorized exit.
      }
    })();
  }, [setInitialState]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 96 }}>
      <Spin size="large" />
    </div>
  );
};

export default HomeEntry;
