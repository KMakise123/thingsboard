import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ServerErrorError,
  ThingsboardErrorCode,
} from '@/core/http/server-error';
import { Authority, type User } from '@/types/tb';

import Login from './index';

const historyMock = vi.hoisted(() => ({
  location: { pathname: '/user/login', search: '', hash: '' },
  replace: vi.fn(),
  push: vi.fn(),
}));

const modelMock = vi.hoisted(() => ({
  initialState: { currentUser: null as User | null },
  setInitialState: vi.fn(),
}));

const servicesMock = vi.hoisted(() => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
  getOauth2Clients: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn<() => { sub?: string; scopes?: string[] } | null>(
    () => null,
  ),
}));

vi.mock('@umijs/max', async () => {
  const { zhFormatMessage } = await import('../test-support');
  return {
    history: historyMock,
    useModel: () => modelMock,
    useIntl: () => ({ formatMessage: zhFormatMessage }),
    FormattedMessage: ({ id }: { id: string }) => zhFormatMessage({ id }),
    Helmet: ({ children }: { children: React.ReactNode }) => children,
    SelectLang: () => null,
    Link: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('@/services/tb', () => servicesMock);

vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));

const tenantUser = {
  authority: Authority.TENANT_ADMIN,
  email: 'tenant@thingsboard.org',
  name: 'Tenant Admin',
} as User;

const sysAdmin = {
  authority: Authority.SYS_ADMIN,
  email: 'sysadmin@thingsboard.org',
} as User;

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* motion off — jsdom never fires transitionend, so modal exits hang */}
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <Login />
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function submitCredentials(
  username: string,
  password: string,
): Promise<void> {
  fireEvent.change(screen.getByPlaceholderText('邮箱'), {
    target: { value: username },
  });
  fireEvent.change(screen.getByPlaceholderText('密码'), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));
}

describe('login page (password line)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/user/login');
    modelMock.initialState.currentUser = null;
    servicesMock.login.mockReset();
    servicesMock.getCurrentUser.mockReset();
    servicesMock.getOauth2Clients.mockReset();
    servicesMock.getOauth2Clients.mockResolvedValue([]);
    tokenStoreMock.decodeTokenClaims.mockReset();
    tokenStoreMock.decodeTokenClaims.mockReturnValue(null);
  });

  it('signs in a tenant admin and lands on the device list', async () => {
    servicesMock.login.mockResolvedValue({
      token: 't',
      refreshToken: 'r',
    });
    servicesMock.getCurrentUser.mockResolvedValue(tenantUser);

    renderLogin();
    await submitCredentials('tenant@thingsboard.org', 'tenant');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/devices');
    });
    expect(servicesMock.login).toHaveBeenCalledWith({
      username: 'tenant@thingsboard.org',
      password: 'tenant',
    });
    // setInitialState receives a state updater — apply it to assert the user.
    const updater = modelMock.setInitialState.mock.calls[0][0] as (
      state: unknown,
    ) => { currentUser: User };
    expect(updater({})).toEqual({ currentUser: tenantUser });
  });

  it('lands a sys admin on the tenants list', async () => {
    servicesMock.login.mockResolvedValue({ token: 't', refreshToken: 'r' });
    servicesMock.getCurrentUser.mockResolvedValue(sysAdmin);

    renderLogin();
    await submitCredentials('sysadmin@thingsboard.org', 'sysadmin');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/tenants');
    });
  });

  it('honours a safe ?redirect= target after login', async () => {
    window.history.pushState({}, '', '/user/login?redirect=/devices?page=2');
    servicesMock.login.mockResolvedValue({ token: 't', refreshToken: 'r' });
    servicesMock.getCurrentUser.mockResolvedValue(tenantUser);

    renderLogin();
    await submitCredentials('tenant@thingsboard.org', 'tenant');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/devices?page=2');
    });
  });

  it('routes a PRE_VERIFICATION_TOKEN login to the mfa page without a user fetch', async () => {
    servicesMock.login.mockResolvedValue({ token: 't', refreshToken: null });
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      sub: 'tenant@thingsboard.org',
      scopes: ['PRE_VERIFICATION_TOKEN'],
    });

    renderLogin();
    await submitCredentials('tenant@thingsboard.org', 'tenant');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/user/mfa');
    });
    expect(servicesMock.getCurrentUser).not.toHaveBeenCalled();
    expect(modelMock.setInitialState).not.toHaveBeenCalled();
  });

  it('forwards the ?redirect target to the mfa page', async () => {
    window.history.pushState(
      {},
      '',
      '/user/login?redirect=%2Fdevices%3Fpage%3D2',
    );
    servicesMock.login.mockResolvedValue({ token: 't', refreshToken: null });
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['PRE_VERIFICATION_TOKEN'],
    });

    renderLogin();
    await submitCredentials('tenant@thingsboard.org', 'tenant');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith(
        `/user/mfa?redirect=${encodeURIComponent('/devices?page=2')}`,
      );
    });
  });

  it('routes a MFA_CONFIGURATION_TOKEN login to the force-mfa page', async () => {
    servicesMock.login.mockResolvedValue({ token: 't', refreshToken: null });
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['MFA_CONFIGURATION_TOKEN'],
    });

    renderLogin();
    await submitCredentials('tenant@thingsboard.org', 'tenant');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/user/force-mfa');
    });
    expect(servicesMock.getCurrentUser).not.toHaveBeenCalled();
  });

  it('does not bounce an interim mfa token off the login page even with a stale user', () => {
    modelMock.initialState.currentUser = tenantUser;
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['PRE_VERIFICATION_TOKEN'],
    });

    renderLogin();

    expect(historyMock.replace).not.toHaveBeenCalled();
  });

  it('still bounces a live session with regular claims to the landing page', () => {
    modelMock.initialState.currentUser = tenantUser;

    renderLogin();

    expect(historyMock.replace).toHaveBeenCalledWith('/devices');
  });

  it('shows the verbatim server error on bad credentials and stays put', async () => {
    servicesMock.login.mockRejectedValue(
      new ServerErrorError({
        status: 401,
        errorCode: ThingsboardErrorCode.AUTHENTICATION,
        detail: 'Incorrect username or password',
        titleKey: 'tb.error.unauthorized',
      }),
    );

    renderLogin();
    await submitCredentials('tenant@thingsboard.org', 'wrong');

    await waitFor(() => {
      expect(
        screen.getByText('Incorrect username or password'),
      ).toBeInTheDocument();
    });
    expect(historyMock.replace).not.toHaveBeenCalled();
    expect(servicesMock.getCurrentUser).not.toHaveBeenCalled();
  });

  it('routes credentials-expired users to reset-expired-password with the resetToken', async () => {
    servicesMock.login.mockRejectedValue(
      new ServerErrorError({
        status: 401,
        errorCode: ThingsboardErrorCode.CREDENTIALS_EXPIRED,
        resetToken: 'the-reset-token',
        detail: 'Password expired',
        titleKey: 'tb.error.credentialsExpired',
      }),
    );

    renderLogin();
    await submitCredentials('tenant@thingsboard.org', 'expired');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith(
        '/user/reset-expired-password?resetToken=the-reset-token',
      );
    });
  });

  it('blocks submission of empty fields with validation messages', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(screen.getByText('请输入邮箱！')).toBeInTheDocument();
      expect(screen.getByText('请输入密码！')).toBeInTheDocument();
    });
    expect(servicesMock.login).not.toHaveBeenCalled();
  });
});

describe('login page (oauth2 buttons)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/user/login');
    modelMock.initialState.currentUser = null;
    servicesMock.login.mockReset();
    servicesMock.getCurrentUser.mockReset();
    servicesMock.getOauth2Clients.mockReset();
    servicesMock.getOauth2Clients.mockResolvedValue([]);
    tokenStoreMock.decodeTokenClaims.mockReset();
    tokenStoreMock.decodeTokenClaims.mockReturnValue(null);
  });

  it('renders no oauth2 section when the platform has no clients', async () => {
    renderLogin();
    await waitFor(() => {
      expect(servicesMock.getOauth2Clients).toHaveBeenCalled();
    });
    expect(screen.queryByText('使用 Test IdP 登录')).not.toBeInTheDocument();
  });

  it('renders one labelled button for a single client with a native href', async () => {
    servicesMock.getOauth2Clients.mockResolvedValue([
      { name: 'Test IdP', url: '/oauth2/authorization/abc' },
    ]);

    renderLogin();

    const button = await screen.findByText('使用 Test IdP 登录');
    expect(button.closest('a')).toHaveAttribute(
      'href',
      '/oauth2/authorization/abc',
    );
  });

  it('appends prevUri from the ?redirect param to the authorize url', async () => {
    window.history.pushState(
      {},
      '',
      '/user/login?redirect=%2Fdevices%3Fpage%3D2',
    );
    servicesMock.getOauth2Clients.mockResolvedValue([
      { name: 'Test IdP', url: '/oauth2/authorization/abc' },
    ]);

    renderLogin();

    const button = await screen.findByText('使用 Test IdP 登录');
    expect(button.closest('a')).toHaveAttribute(
      'href',
      `/oauth2/authorization/abc?prevUri=${encodeURIComponent(
        '/devices?page=2',
      )}`,
    );
  });

  it('renders a group title and per-client buttons for several clients', async () => {
    servicesMock.getOauth2Clients.mockResolvedValue([
      { name: 'IdP One', url: '/oauth2/authorization/one' },
      { name: 'IdP Two', url: '/oauth2/authorization/two' },
    ]);

    renderLogin();

    expect(await screen.findByText('使用以下方式登录')).toBeInTheDocument();
    expect(screen.getByText('IdP One')).toBeInTheDocument();
    expect(screen.getByText('IdP Two')).toBeInTheDocument();
    expect(screen.getByText('或')).toBeInTheDocument();
  });
});

describe('login page (loginError callback dialog)', () => {
  beforeEach(() => {
    // modal.warning portals into document.body — drop leftovers from a
    // previous case before asserting on absence.
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/user/login');
    vi.clearAllMocks();
    modelMock.initialState.currentUser = null;
    servicesMock.login.mockReset();
    servicesMock.getCurrentUser.mockReset();
    servicesMock.getOauth2Clients.mockReset();
    servicesMock.getOauth2Clients.mockResolvedValue([]);
    tokenStoreMock.decodeTokenClaims.mockReset();
    tokenStoreMock.decodeTokenClaims.mockReturnValue(null);
  });

  it('shows the decoded server message in a non-dismissable dialog and clears the query on ok', async () => {
    window.history.pushState(
      {},
      '',
      '/user/login?loginError=Provider%20is%20misconfigured',
    );

    renderLogin();

    expect(
      await screen.findByText('Provider is misconfigured'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '知道了' }));
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/user/login');
    });
    // Wait out the modal exit animation so no portal leaks into the
    // following case.
    await waitFor(() => {
      expect(
        screen.queryByText('Provider is misconfigured'),
      ).not.toBeInTheDocument();
    });
  });

  it('opens no dialog without the loginError param', () => {
    renderLogin();
    expect(
      screen.queryByText('Provider is misconfigured'),
    ).not.toBeInTheDocument();
  });
});
