/**
 * Dashboard single-page (fullscreen) route `/dashboard/:dashboardId`
 * (brief §0.C): no app shell (layout:false), readonly, singlePageMode
 * chrome — the toolbar's fullscreen button becomes "exit".
 *
 * M15 R42: the route carries no access key; this page gates itself over
 * the login/public dual state (public-gate.ts decision table):
 *   - anonymous + URL publicId → POST /api/auth/login/public exchange,
 *     then render embedded (public session);
 *   - anonymous without publicId → /user/login?redirect=… (the exit the
 *     old access interception provided);
 *   - public session (claims.isPublic, sub === publicId) → render as-is
 *     (F5 keeps the session);
 *   - logged-in user → render as themselves, publicId ignored.
 *
 * 401/403 isolation (contract hard rule): while a PUBLIC session renders,
 * the global unauthorized exit is swapped for a page-scoped one — a dead
 * public session (refresh failure included) shows the "session expired,
 * refresh the page" empty state instead of bouncing to /user/login. The
 * previous handler is restored on unmount. getDashboard 403/404 surface
 * dedicated empty states ("no longer public" / "not found"), never a
 * redirect.
 */

import { history, useLocation, useParams } from '@umijs/max';
import { Alert, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { useDashboard } from '@/components/dashboard/use-dashboard';
import { serverErrorText } from '@/components/entities/server-error-text';
import { useAuthority } from '@/components/shared/use-authority';
import { tokenStore } from '@/core/auth/token-store';
import { ServerErrorError } from '@/core/http/server-error';
import { publicLogin } from '@/services/tb/auth';
import {
  getTbUnauthorizedHandler,
  setTbUnauthorizedHandler,
} from '@/services/tb/http';

import { loginRedirectUrl, resolvePublicGate } from './public-gate';

function GateSpin() {
  const { formatMessage } = useIntl();
  return (
    <Spin
      style={{ display: 'block', margin: '25vh auto' }}
      tip={formatMessage({
        id: 'dashboards.page.loading',
        defaultMessage: 'Loading dashboard…',
      })}
    >
      <div style={{ minHeight: 120 }} />
    </Spin>
  );
}

/** Public-session-only empty states (contract: never a redirect). */
function PublicNotice({
  kind,
}: {
  kind: 'sessionExpired' | 'notPublicAnymore' | 'notFound';
}) {
  const { formatMessage } = useIntl();
  const message = {
    sessionExpired: formatMessage({
      id: 'dashboards.public.sessionExpired',
      defaultMessage:
        'This public session has expired. Refresh the page to re-enter.',
    }),
    notPublicAnymore: formatMessage({
      id: 'dashboards.public.notPublicAnymore',
      defaultMessage: 'This dashboard is no longer public.',
    }),
    notFound: formatMessage({
      id: 'dashboards.public.notFound',
      defaultMessage: 'This dashboard does not exist.',
    }),
  }[kind];
  return (
    <Alert
      style={{ margin: 24 }}
      type="warning"
      showIcon
      message={message}
      data-testid={`public-notice-${kind}`}
    />
  );
}

interface DashboardBodyProps {
  dashboardId: string;
  reloadKey: string | undefined;
  isPublicSession: boolean;
}

function DashboardBody({
  dashboardId,
  reloadKey,
  isPublicSession,
}: DashboardBodyProps) {
  const { authority } = useAuthority();
  const { query, dashboard } = useDashboard(dashboardId);

  if (query.isPending) {
    return <GateSpin />;
  }
  if (query.isError) {
    const status =
      query.error instanceof ServerErrorError ? query.error.status : 0;
    // Public-face empty states — visibility failures stay on the page
    // (contract: 403 = link alive but dashboard no longer public;
    // 404 = dashboard gone; neither may redirect anywhere).
    if (isPublicSession && status === 403) {
      return <PublicNotice kind="notPublicAnymore" />;
    }
    if (isPublicSession && status === 404) {
      return <PublicNotice kind="notFound" />;
    }
    return (
      <Alert
        style={{ margin: 24 }}
        type="error"
        showIcon
        message={serverErrorText(query.error)}
      />
    );
  }
  if (!dashboard) {
    return null;
  }
  return (
    <div style={{ padding: 12 }}>
      <DashboardPage
        dashboard={dashboard}
        singlePageMode
        // Public sessions render embedded (R43): the toolbar's
        // fullscreen/export/dashboard-select chrome is hidden — the
        // structural equivalent of ngx forceFullscreen. isTenantAdmin is
        // structurally false there (public claims scope CUSTOMER_USER).
        embedded={isPublicSession}
        isTenantAdmin={authority === 'TENANT_ADMIN'}
        reloadKey={reloadKey}
      />
    </div>
  );
}

export default function DashboardFullscreenPage() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const location = useLocation();

  // Bumped (value unread) after a successful publicLogin so the gate
  // re-decides against the freshly stored token pair — tokenStore is not
  // reactive state, and the decision below re-runs on every render.
  const [, setExchangeEpoch] = useState(0);
  // Set by the page-scoped unauthorized exit (public sessions only).
  const [sessionExpired, setSessionExpired] = useState(false);

  const publicId = useMemo(
    () => new URLSearchParams(location.search).get('publicId'),
    [location.search],
  );

  const decision = resolvePublicGate({
    hasValidToken: tokenStore.isTokenValid('jwt'),
    claims: tokenStore.decodeTokenClaims(),
    publicId,
  });

  const isPublicSession =
    decision === 'render' && tokenStore.decodeTokenClaims()?.isPublic === true;
  const reloadKey =
    new URLSearchParams(location.search).get('reload') ?? undefined;

  // Anonymous without publicId: the login exit the old access gate provided.
  useEffect(() => {
    if (decision === 'login-redirect') {
      history.replace(
        loginRedirectUrl(location.pathname, location.search, location.hash),
      );
    }
  }, [decision, location.pathname, location.search, location.hash]);

  // Anonymous + publicId (or a stale public ticket on another link):
  // exchange for a public session; every failure is a 401 = dead link →
  // strip publicId and bounce to login (ngx parity, brief §2.B).
  useEffect(() => {
    if (decision !== 'public-login' && decision !== 'relogin-public') {
      return;
    }
    if (!publicId) {
      history.replace(
        loginRedirectUrl(location.pathname, location.search, location.hash),
      );
      return;
    }
    let active = true;
    publicLogin(publicId)
      .then(() => {
        if (active) {
          setExchangeEpoch((epoch) => epoch + 1);
        }
      })
      .catch(() => {
        if (active) {
          history.replace(
            loginRedirectUrl(location.pathname, location.search, location.hash),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [decision, publicId, location.pathname, location.search, location.hash]);

  // 401 isolation for public sessions (contract hard rule): swap the
  // global unauthorized exit for a page-scoped one while a public render
  // is on screen — a dead session (refresh failure included) shows the
  // session-expired empty state instead of /user/login.
  useEffect(() => {
    if (!isPublicSession) {
      return;
    }
    const previous = getTbUnauthorizedHandler();
    setTbUnauthorizedHandler(() => {
      // Drop the dead pair; re-entering is a page refresh (the link and
      // its publicId are still in the URL), never a redirect.
      tokenStore.clear();
      setSessionExpired(true);
    });
    return () => {
      if (previous) {
        setTbUnauthorizedHandler(previous);
      }
    };
  }, [isPublicSession]);

  if (sessionExpired) {
    return <PublicNotice kind="sessionExpired" />;
  }
  if (decision === 'login-redirect') {
    return null;
  }
  if (decision === 'public-login' || decision === 'relogin-public') {
    return <GateSpin />;
  }
  if (!dashboardId) {
    return null;
  }
  return (
    <DashboardBody
      dashboardId={dashboardId}
      reloadKey={reloadKey}
      isPublicSession={isPublicSession}
    />
  );
}
