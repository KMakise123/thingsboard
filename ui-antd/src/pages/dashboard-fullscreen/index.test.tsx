/**
 * Dashboard fullscreen gate tests (M15 R48): the page-owned dual-state gate
 * (login render / anonymous redirect / publicId exchange) and the 401/403
 * isolation contract — a dead public session never bounces to /user/login.
 * Services and the dashboard loader are mocked at the module boundary.
 */
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import zhDashboards from '@/locales/zh-CN/dashboards';
import type { Dashboard } from '@/types/tb/dashboard';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

const historyMock = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}));

const locationMock = vi.hoisted(() => ({
  value: { pathname: '/dashboard/dash-1', search: '', hash: '' },
}));

const paramsMock = vi.hoisted(() => ({ value: { dashboardId: 'dash-1' } }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useLocation: () => locationMock.value,
  useParams: () => paramsMock.value,
}));

// Mirrors the real store: publicLogin flips the session into a public pair.
const tokenStoreMock = vi.hoisted(() => {
  const session = {
    jwtValid: false,
    claims: null as Record<string, unknown> | null,
  };
  return {
    session,
    isTokenValid: vi.fn(() => session.jwtValid),
    decodeTokenClaims: vi.fn(() => session.claims),
    clear: vi.fn(() => {
      session.jwtValid = false;
      session.claims = null;
    }),
  };
});

const authMock = vi.hoisted(() => ({
  publicLogin: vi.fn(),
}));

// The unauthorized-exit registry (services/tb/http) with swap semantics.
const httpMock = vi.hoisted(() => {
  let handler: ((event: unknown) => void) | undefined;
  return {
    setTbUnauthorizedHandler: vi.fn((next?: (event: unknown) => void) => {
      handler = next;
    }),
    getTbUnauthorizedHandler: vi.fn(() => handler),
    /** Fire the currently registered exit, as the http/ws layers would. */
    fire: (event: unknown) => handler?.(event),
  };
});

const useDashboardMock = vi.hoisted(() => ({
  value: {
    query: { isPending: true, isError: false, error: null },
    dashboard: undefined,
  } as unknown,
}));

vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));
vi.mock('@/services/tb/auth', () => authMock);
vi.mock('@/services/tb/http', () => httpMock);
vi.mock('@/components/dashboard/use-dashboard', () => ({
  useDashboard: () => useDashboardMock.value,
}));

// The renderer is a boundary mock — its own behaviour has page tests.
vi.mock('@/components/dashboard/DashboardPage', () => ({
  DashboardPage: (props: { embedded?: boolean; isTenantAdmin?: boolean }) => (
    <div
      data-testid="dashboard-page-mock"
      data-embedded={String(Boolean(props.embedded))}
      data-ta={String(Boolean(props.isTenantAdmin))}
    />
  ),
}));

import DashboardFullscreenPage from './index';

function pendingQuery() {
  return {
    query: { isPending: true, isError: false, error: null },
    dashboard: undefined,
  };
}

function loadedQuery(dashboard: Partial<Dashboard>) {
  return {
    query: { isPending: false, isError: false, error: null },
    dashboard: dashboard as Dashboard,
  };
}

function serverError(status: number): ServerErrorError {
  // The real error class: DashboardBody discriminates via instanceof.
  return new ServerErrorError({
    status,
    detail: 'mock',
    titleKey: 'tb.error.mock',
  });
}

function erroredQuery(status: number) {
  return {
    query: { isPending: false, isError: true, error: serverError(status) },
    dashboard: undefined,
  };
}

function setPublicSession(sub: string) {
  tokenStoreMock.session.jwtValid = true;
  tokenStoreMock.session.claims = {
    sub,
    isPublic: true,
    scopes: ['CUSTOMER_USER'],
  };
}

function setLoginSession() {
  tokenStoreMock.session.jwtValid = true;
  tokenStoreMock.session.claims = { sub: 'user-1', scopes: ['TENANT_ADMIN'] };
}

function renderPage() {
  return render(
    <RawIntlProvider value={intl}>
      <DashboardFullscreenPage />
    </RawIntlProvider>,
  );
}

describe('dashboard fullscreen gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStoreMock.session.jwtValid = false;
    tokenStoreMock.session.claims = null;
    locationMock.value = {
      pathname: '/dashboard/dash-1',
      search: '',
      hash: '',
    };
    paramsMock.value = { dashboardId: 'dash-1' };
    useDashboardMock.value = pendingQuery();
    // Reset the registry so a stale page-scoped exit never leaks across tests.
    httpMock.setTbUnauthorizedHandler(undefined);
  });

  it('renders a logged-in user as themselves, ignoring publicId', () => {
    setLoginSession();
    locationMock.value = { ...locationMock.value, search: '?publicId=pub-1' };
    useDashboardMock.value = loadedQuery({ title: 'Demo' });

    const { container } = renderPage();

    expect(screen.getByTestId('dashboard-page-mock')).toHaveAttribute(
      'data-embedded',
      'false',
    );
    expect(screen.getByTestId('dashboard-page-mock')).toHaveAttribute(
      'data-ta',
      'true',
    );
    expect(authMock.publicLogin).not.toHaveBeenCalled();
    expect(historyMock.replace).not.toHaveBeenCalled();
    expect(container.querySelector('.ant-alert')).toBeNull();
  });

  it('anonymous without publicId redirects to login with the full address', () => {
    renderPage();

    expect(historyMock.replace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/dashboard/dash-1')}`,
    );
    expect(authMock.publicLogin).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dashboard-page-mock')).toBeNull();
  });

  it('anonymous + publicId exchanges via publicLogin, then renders embedded', async () => {
    locationMock.value = {
      ...locationMock.value,
      search: '?publicId=pub-1',
    };
    authMock.publicLogin.mockImplementation(async () => {
      setPublicSession('pub-1');
      return { token: 't', refreshToken: 'r' };
    });
    useDashboardMock.value = loadedQuery({ title: 'Demo' });

    renderPage();

    await waitFor(() => {
      expect(authMock.publicLogin).toHaveBeenCalledWith('pub-1');
    });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page-mock')).toHaveAttribute(
        'data-embedded',
        'true',
      );
    });
    expect(historyMock.replace).not.toHaveBeenCalled();
  });

  it('a failed exchange (401 dead link) strips publicId and bounces to login', async () => {
    locationMock.value = {
      ...locationMock.value,
      search: '?publicId=dead&state=abc',
    };
    authMock.publicLogin.mockRejectedValue(new Error('401'));

    renderPage();

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith(
        `/user/login?redirect=${encodeURIComponent('/dashboard/dash-1?state=abc')}`,
      );
    });
    expect(screen.queryByTestId('dashboard-page-mock')).toBeNull();
  });

  it('a mismatched public ticket (sub !== publicId) re-exchanges', async () => {
    setPublicSession('other-pub');
    locationMock.value = {
      ...locationMock.value,
      search: '?publicId=pub-1',
    };
    authMock.publicLogin.mockImplementation(async () => {
      setPublicSession('pub-1');
      return { token: 't', refreshToken: 'r' };
    });
    useDashboardMock.value = loadedQuery({ title: 'Demo' });

    renderPage();

    await waitFor(() => {
      expect(authMock.publicLogin).toHaveBeenCalledWith('pub-1');
    });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page-mock')).toHaveAttribute(
        'data-embedded',
        'true',
      );
    });
  });

  it('a failed public refresh (401) shows the session-expired state, never login', async () => {
    setPublicSession('pub-1');
    locationMock.value = {
      ...locationMock.value,
      search: '?publicId=pub-1',
    };
    useDashboardMock.value = loadedQuery({ title: 'Demo' });

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page-mock')).toBeInTheDocument();
    });

    // The page swapped in a scoped exit — fire it the way the http/ws
    // layers would after a failed refresh flight.
    expect(httpMock.setTbUnauthorizedHandler).toHaveBeenCalled();
    httpMock.fire({ source: 'http', reason: 'refresh-failed' });

    expect(
      await screen.findByTestId('public-notice-sessionExpired'),
    ).toBeInTheDocument();
    expect(historyMock.replace).not.toHaveBeenCalled();
    expect(tokenStoreMock.clear).toHaveBeenCalled();
  });

  it('getDashboard 403 on a public session shows "no longer public", never login', () => {
    setPublicSession('pub-1');
    locationMock.value = {
      ...locationMock.value,
      search: '?publicId=pub-1',
    };
    useDashboardMock.value = erroredQuery(403);

    renderPage();

    expect(
      screen.getByTestId('public-notice-notPublicAnymore'),
    ).toBeInTheDocument();
    expect(historyMock.replace).not.toHaveBeenCalled();
  });

  it('getDashboard 404 on a public session shows "not found", never login', () => {
    setPublicSession('pub-1');
    locationMock.value = {
      ...locationMock.value,
      search: '?publicId=pub-1',
    };
    useDashboardMock.value = erroredQuery(404);

    renderPage();

    expect(screen.getByTestId('public-notice-notFound')).toBeInTheDocument();
    expect(historyMock.replace).not.toHaveBeenCalled();
  });

  it('a logged-in user keeps the generic error alert (no public face)', () => {
    setLoginSession();
    useDashboardMock.value = erroredQuery(403);

    renderPage();

    expect(
      screen.getByText(/\[403\]|mock/i).closest('.ant-alert'),
    ).not.toBeNull();
    expect(screen.queryByTestId(/public-notice/)).toBeNull();
    expect(historyMock.replace).not.toHaveBeenCalled();
  });
});
