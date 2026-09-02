import { UserOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { QueryClientProvider } from '@tanstack/react-query';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { getLocale, history, Link } from '@umijs/max';
import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';

// Initialize dayjs plugins globally
dayjs.extend(relativeTime);

import {
  AvatarDropdown,
  ErrorBoundary,
  LangDropdown,
  OfflineBanner,
} from '@/components';
import {
  AntdAppBridge,
  getAppBridge,
} from '@/components/layout/antd-app-bridge';
import { Forbidden } from '@/components/layout/forbidden';
import {
  installAppWsManager,
  resetWsManager,
} from '@/components/layout/ws-manager';
import { tokenStore } from '@/core/auth/token-store';
import type { UnauthorizedEvent } from '@/core/http/client';
import { createTbQueryClient } from '@/core/query-client';
import {
  getCurrentUser,
  setTbLanguage,
  setTbUnauthorizedHandler,
} from '@/services/tb';
import { getThemeConfig } from '@/theme/brand';
import type { User } from '@/types/tb';
import defaultSettings from '../config/defaultSettings';

const loginPath = '/user/login';

// Persistent theme object (ADR 0007): computed once at module scope so the
// root ConfigProvider never flips between undefined and an object, which
// would remount the whole tree. v1 is light-only.
const appThemeConfig = getThemeConfig('light');

/**
 * Unified unauthorized exit (issue #8): the HTTP client's failed-refresh
 * event and the WS manager's AUTH-reject event both land here. Tokens are
 * cleared, the socket is recycled and the browser goes to the login page
 * with the current URL as the redirect target. Idempotent while already
 * inside the login family.
 */
function handleUnauthorized(_event: UnauthorizedEvent): void {
  tokenStore.clear();
  resetWsManager();
  const { pathname, search, hash } = history.location;
  if (pathname.startsWith('/user/')) {
    return;
  }
  const target = `${pathname}${search}${hash}`;
  history.replace(`${loginPath}?redirect=${encodeURIComponent(target)}`);
}

// Composition-root wiring (runs once at module import, before any page).
setTbLanguage(() => getLocale());
setTbUnauthorizedHandler(handleUnauthorized);
installAppWsManager(handleUnauthorized);

/**
 * The app-wide QueryClient (core/query-client factory: 4xx never retried,
 * 5xx/network up to twice). Global error routing toasts the generic shell
 * title plus the verbatim server detail through the antd App context —
 * no static antd message calls (ADR 0007).
 */
const tbQueryClient = createTbQueryClient({
  onError: (error) => {
    const bridge = getAppBridge();
    if (!bridge) {
      return;
    }
    const title = bridge.formatMessage(error.titleKey);
    bridge.message.error(error.detail ? `${title}: ${error.detail}` : title);
  },
});

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: User | null;
  fetchUserInfo?: () => Promise<User | null>;
}> {
  // umi's locale plugin has already restored the persisted choice from
  // localStorage; redirect Accept-Language for every services/tb call.
  setTbLanguage(() => getLocale());

  // The documented bare-service exception (issue #8): getInitialState runs
  // outside React, so the current user is fetched without react-query.
  const fetchUserInfo = async (): Promise<User | null> => {
    try {
      return await getCurrentUser();
    } catch {
      return null;
    }
  };

  // Skip the network round-trip without a locally-valid session: a doomed
  // /api/auth/user would only fire the 401 refresh-failure event.
  const hasSession =
    tokenStore.isTokenValid('jwt') || tokenStore.isTokenValid('refresh');
  // MFA interim tokens (brief §3): /api/auth/user rejects them with 403,
  // whose failed-refresh exit would bounce the mfa pages back to login.
  // The interim pages need no currentUser — leave it unset instead.
  const scope = tokenStore.decodeTokenClaims()?.scopes?.[0];
  const isMfaInterim =
    scope === 'PRE_VERIFICATION_TOKEN' || scope === 'MFA_CONFIGURATION_TOKEN';
  const currentUser = hasSession && !isMfaInterim ? await fetchUserInfo() : null;

  return {
    fetchUserInfo,
    currentUser,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout supported api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  const user = initialState?.currentUser;
  return {
    menuItemRender: (item, dom) => {
      if (item.path) {
        return (
          <Link to={item.path} prefetch>
            {dom}
          </Link>
        );
      }
      return dom;
    },
    actionsRender: () => [<LangDropdown key="lang" />],
    avatarProps: {
      icon: <UserOutlined />,
      title: user?.name ?? user?.email ?? '',
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
    // v1 shell: no scaffold footer (brand lives in the header seam only).
    footerRender: false,
    onPageChange: () => {
      const { location } = history;
      // Not signed in and outside the login family → login with redirect.
      if (
        !initialState?.currentUser &&
        !location.pathname.startsWith('/user/')
      ) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(
            location.pathname + location.search + location.hash,
          )}`,
        );
      }
    },
    // Replace ProLayout's default ErrorBoundary with our offline-aware
    // version, so chunk load errors show friendly messages.
    ErrorBoundary,
    // Breadcrumbs are rendered by the page-container wrapper (ADR 0008).
    // ProLayout's pipeline must stay off: its RouteContext props would
    // override per-page values and evaluate before a page can supply the
    // entity name for dynamic segments.
    breadcrumbRender: false,
    menuHeaderRender: undefined,
    // Custom 403 (spec §3.2) — umi's default is Chinese-only scaffolding.
    unAccessible: <Forbidden />,
    // Capture the antd App context for module-scope consumers (query
    // error sink). Runs for layout routes; login pages handle their own
    // errors inline.
    childrenRender: (children) => (
      <>
        <AntdAppBridge />
        {children}
      </>
    ),
    ...initialState?.settings,
  };
};

export function rootContainer(container: React.ReactNode) {
  return (
    <ConfigProvider theme={appThemeConfig}>
      <QueryClientProvider client={tbQueryClient}>
        <OfflineBanner />
        <ErrorBoundary>{container}</ErrorBoundary>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
