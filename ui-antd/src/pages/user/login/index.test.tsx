import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
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
      <AntdApp>
        <Login />
      </AntdApp>
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

  it('lands a sys admin on the temporary home page (M1)', async () => {
    servicesMock.login.mockResolvedValue({ token: 't', refreshToken: 'r' });
    servicesMock.getCurrentUser.mockResolvedValue(sysAdmin);

    renderLogin();
    await submitCredentials('sysadmin@thingsboard.org', 'sysadmin');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/home');
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
