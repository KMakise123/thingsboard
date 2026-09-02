/**
 * Profile page tests (hoisted-mock convention): the prefilled form, the
 * save chain (saveUser → initialState refresh → locale switch → silent
 * token refresh) and the language "follow" behavior (lang key removed).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhAccount from '@/locales/zh-CN/account';
import zhCommon from '@/locales/zh-CN/common';
import zhMenu from '@/locales/zh-CN/menu';
import zhSettings from '@/locales/zh-CN/settings';
import { Authority, type User } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhMenu, ...zhSettings, ...zhAccount },
});

const routerMock = vi.hoisted(() => ({
  history: { push: vi.fn(), replace: vi.fn() },
  getLocale: vi.fn(() => 'zh-CN'),
  setInitialState: vi.fn(),
}));

const modelMock = vi.hoisted(() => ({
  state: { currentUser: null as User | null },
}));

const tokenStoreMock = vi.hoisted(() => ({
  getRefreshToken: vi.fn(() => 'refresh-1'),
  setTokens: vi.fn(),
}));

const setLocaleMock = vi.hoisted(() => ({ changeLocale: vi.fn() }));

const authMock = vi.hoisted(() => ({ refreshToken: vi.fn() }));
const userMock = vi.hoisted(() => ({ saveUser: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: routerMock.history,
  getLocale: routerMock.getLocale,
  useModel: (_name: string) => ({
    initialState: modelMock.state,
    setInitialState: routerMock.setInitialState,
  }),
  useSelectedRoutes: vi.fn(() => []),
  useAppData: vi.fn(() => ({ clientRoutes: [] })),
}));

vi.mock('@/locales/set-locale', () => setLocaleMock);
vi.mock('@/services/tb/auth', () => authMock);
vi.mock('@/services/tb/user', () => userMock);
vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));

// PageContainer pulls pro-components; render through plain antd to keep the
// vitest module graph resolvable (users-page finding).
vi.mock('@ant-design/pro-components', async () => {
  const { Card } = await import('antd');
  return {
    PageContainer: (props: {
      children?: React.ReactNode;
      extra?: React.ReactNode;
    }) => (
      <Card>
        {props.extra}
        {props.children}
      </Card>
    ),
  };
});

import ProfilePage from './index';

function baseUser(additionalInfo?: Record<string, unknown>): User {
  return {
    id: { entityType: 'USER', id: 'u-1' },
    createdTime: 0,
    email: 'tenant@thingsboard.org',
    authority: Authority.TENANT_ADMIN,
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: '+8613800000000',
    additionalInfo,
  } as User;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <ProfilePage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('account profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelMock.state.currentUser = baseUser({ lastLoginTs: 1_700_000_000_000 });
    routerMock.getLocale.mockReturnValue('zh-CN');
    userMock.saveUser.mockImplementation(async (user: User) => user);
    authMock.refreshToken.mockResolvedValue({
      token: 'jwt-2',
      refreshToken: 'refresh-2',
    });
  });

  it('renders the form prefilled from currentUser with the last login', async () => {
    renderPage();

    expect(
      await screen.findByDisplayValue('tenant@thingsboard.org'),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+8613800000000')).toBeInTheDocument();
    expect(screen.getByText(/上次登录：/)).toBeInTheDocument();
    // No additionalInfo.lang → the select prefills the follow option.
    expect(screen.getByText('跟随界面语言')).toBeInTheDocument();
  });

  it('runs the full save chain: saveUser → state → locale → token refresh', async () => {
    routerMock.getLocale.mockReturnValue('en-US');
    renderPage();
    await screen.findByDisplayValue('tenant@thingsboard.org');

    fireEvent.change(screen.getByDisplayValue('Ada'), {
      target: { value: 'Grace' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(
      await screen.findByText('中文', {
        selector: '.ant-select-item-option-content',
      }),
    );
    // Saving appears with the form dirty.
    fireEvent.click(await screen.findByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(userMock.saveUser).toHaveBeenCalledTimes(1);
    });
    const payload = userMock.saveUser.mock.calls[0][0] as User;
    expect(payload.firstName).toBe('Grace');
    expect(payload.additionalInfo).toMatchObject({ lang: 'zh_CN' });
    expect(userMock.saveUser.mock.calls[0][1]).toEqual({
      sendActivationMail: false,
    });

    // The shell state gets a function updater producing the saved user.
    await waitFor(() => {
      expect(routerMock.setInitialState).toHaveBeenCalled();
    });
    const updater = routerMock.setInitialState.mock.calls[0][0] as (s: {
      currentUser: User | null;
    }) => { currentUser: User };
    expect(updater({ currentUser: null }).currentUser).toBe(payload);

    // The locale flips to the mapped app locale and the token pair refreshes.
    expect(setLocaleMock.changeLocale).toHaveBeenCalledWith('zh-CN');
    await waitFor(() => {
      expect(authMock.refreshToken).toHaveBeenCalledWith('refresh-1');
    });
    expect(tokenStoreMock.setTokens).toHaveBeenCalledWith('jwt-2', 'refresh-2');
  });

  it('keeps the session locale and deletes the lang key on follow', async () => {
    modelMock.state.currentUser = baseUser({ lang: 'zh_CN' });
    renderPage();
    await screen.findByDisplayValue('tenant@thingsboard.org');

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(
      await screen.findByText('跟随界面语言', {
        selector: '.ant-select-item-option-content',
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(userMock.saveUser).toHaveBeenCalledTimes(1);
    });
    const payload = userMock.saveUser.mock.calls[0][0] as User;
    expect(payload.additionalInfo).toEqual({});
    expect(setLocaleMock.changeLocale).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(authMock.refreshToken).toHaveBeenCalledWith('refresh-1');
    });
  });

  it('blocks an invalid email before any request', async () => {
    renderPage();
    await screen.findByDisplayValue('tenant@thingsboard.org');

    fireEvent.change(screen.getByDisplayValue('tenant@thingsboard.org'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText('邮箱格式无效。')).toBeInTheDocument();
    expect(userMock.saveUser).not.toHaveBeenCalled();
    expect(authMock.refreshToken).not.toHaveBeenCalled();
  });

  it('shows a toast and keeps the form when saving fails', async () => {
    userMock.saveUser.mockRejectedValue(new Error('boom'));
    renderPage();
    await screen.findByDisplayValue('tenant@thingsboard.org');

    fireEvent.change(screen.getByDisplayValue('Ada'), {
      target: { value: 'Grace' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText('保存个人资料失败。')).toBeInTheDocument();
    expect(authMock.refreshToken).not.toHaveBeenCalled();
  });
});
