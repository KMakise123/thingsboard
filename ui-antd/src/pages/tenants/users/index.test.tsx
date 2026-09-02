/**
 * Tenant-admins scope page tests: the shared UsersTable is wired to the
 * tenant-scoped endpoint, the authority picker is fixed (TENant_ADMIN +
 * parent tenant), and the login-as row entry follows the backend
 * token-access switch (present when on, absent when off; click fetches the
 * target JwtPair and swaps the session).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import zhTenants from '@/locales/zh-CN/tenants';
import zhUsers from '@/locales/zh-CN/users';
import { Authority, EntityType, type User } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhUsers, ...zhTenants },
});

const routerMock = vi.hoisted(() => ({
  useParams: vi.fn(() => ({ id: 'tenant-1' })),
  history: { push: vi.fn(), replace: vi.fn() },
  setInitialState: vi.fn(),
  useSelectedRoutes: vi.fn(() => []),
  useAppData: vi.fn(() => ({ clientRoutes: [] })),
}));

vi.mock('@umijs/max', () => ({
  useParams: routerMock.useParams,
  history: routerMock.history,
  useModel: (_name: string) => ({
    initialState: { currentUser: null },
    setInitialState: routerMock.setInitialState,
  }),
  useSelectedRoutes: routerMock.useSelectedRoutes,
  useAppData: routerMock.useAppData,
}));

const servicesMock = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getUserById: vi.fn(),
  saveUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserActivationLinkInfo: vi.fn(),
  getUserActivationLink: vi.fn(),
  sendActivationMail: vi.fn(),
  setUserCredentialsEnabled: vi.fn(),
  getUserToken: vi.fn(),
  isUserTokenAccessEnabled: vi.fn(),
}));

const tenantMock = vi.hoisted(() => ({
  getTenantInfo: vi.fn(),
  getTenantUsers: vi.fn(),
}));

const customerMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
  setTokens: vi.fn(),
}));

vi.mock('@/services/tb/user', () => servicesMock);
vi.mock('@/services/tb/tenant', () => tenantMock);
vi.mock('@/services/tb/customer', () => customerMock);
vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));
vi.mock('@/services/tb/auth', () => ({
  getCurrentUser: vi.fn(),
}));
// vite-node cannot resolve antd's extensionless internal locale imports when
// they are pulled through @ant-design/pro-components' bundle (users-page
// finding); render through antd's Table keeping the props contract.
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
    PageContainer: (props: {
      title?: React.ReactNode;
      extra?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div>
        {props.title}
        {props.extra}
        {props.children}
      </div>
    ),
  };
});

import TenantUsersPage from './index';

function user(id: string, email: string, extra: Record<string, unknown> = {}) {
  return {
    id: { entityType: 'USER', id },
    createdTime: 1_700_000_000_000,
    email,
    authority: Authority.TENANT_ADMIN,
    firstName: '',
    lastName: '',
    additionalInfo: { userActivated: true, userCredentialsEnabled: true },
    ...extra,
  } as unknown as User;
}

const TENANT_PAGE = {
  data: [user('ta-1', 'admin@acme.io'), user('ta-2', 'ops@acme.io')],
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <TenantUsersPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

const rowMenu = (index: number) =>
  document.querySelectorAll('.ant-dropdown-trigger')[index] as HTMLElement;

describe('tenant-admins scope page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/tenants/tenant-1/users');
    tenantMock.getTenantInfo.mockResolvedValue({
      id: { entityType: EntityType.TENANT, id: 'tenant-1' },
      createdTime: 0,
      title: 'ACME',
      tenantProfileId: {
        entityType: EntityType.TENANT_PROFILE,
        id: 'profile-1',
      },
    });
    tenantMock.getTenantUsers.mockResolvedValue(TENANT_PAGE);
    servicesMock.getUserById.mockResolvedValue(TENANT_PAGE.data[0]);
    servicesMock.deleteUser.mockResolvedValue(undefined);
    servicesMock.getUserActivationLinkInfo.mockResolvedValue({
      value: 'http://link',
      ttlMs: 1000,
    });
    servicesMock.sendActivationMail.mockResolvedValue(undefined);
    servicesMock.setUserCredentialsEnabled.mockResolvedValue(undefined);
    servicesMock.getUsers.mockResolvedValue({ data: [], totalElements: 0 });
    customerMock.getCustomers.mockResolvedValue({ data: [] });
    customerMock.getCustomerById.mockResolvedValue(undefined);
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['SYS_ADMIN'],
      userId: 'sa-1',
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('loads the tenant admins through the tenant-scoped endpoint', async () => {
    renderPage();

    expect(await screen.findByText('admin@acme.io')).toBeInTheDocument();
    expect(tenantMock.getTenantUsers).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ page: 0 }),
    );
    // The authority-scoped /users endpoint is never touched here.
    expect(servicesMock.getUsers).not.toHaveBeenCalled();
    // The header mirrors the ui-ngx "<tenant>: tenant admins" title.
    expect(screen.getAllByText(/ACME：租户管理员/).length).toBeGreaterThan(0);
  });

  it('offers login-as when the backend token switch is on', async () => {
    servicesMock.isUserTokenAccessEnabled.mockResolvedValue(true);
    servicesMock.getUserToken.mockResolvedValue({
      token: 'jwt-1',
      refreshToken: 'refresh-1',
    });
    const getCurrentUser = vi.mocked(
      (await import('@/services/tb/auth')).getCurrentUser,
    );
    getCurrentUser.mockResolvedValue(user('ta-1', 'admin@acme.io'));
    renderPage();
    await screen.findByText('admin@acme.io');

    fireEvent.click(rowMenu(0));
    fireEvent.click(await screen.findByText('以租户管理员身份登录'));

    await waitFor(() => {
      expect(servicesMock.getUserToken).toHaveBeenCalledWith('ta-1');
    });
    expect(tokenStoreMock.setTokens).toHaveBeenCalledWith('jwt-1', 'refresh-1');
    expect(routerMock.history.replace).toHaveBeenCalled();
  });

  it('hides the login-as entry while the token switch is off', async () => {
    servicesMock.isUserTokenAccessEnabled.mockResolvedValue(false);
    renderPage();
    await screen.findByText('admin@acme.io');

    fireEvent.click(rowMenu(0));
    expect(await screen.findByText('禁用用户账户')).toBeInTheDocument();
    expect(screen.queryByText('以租户管理员身份登录')).not.toBeInTheDocument();
    expect(servicesMock.getUserToken).not.toHaveBeenCalled();
  });

  it('shows a server error when the impersonation is refused', async () => {
    servicesMock.isUserTokenAccessEnabled.mockResolvedValue(true);
    servicesMock.getUserToken.mockRejectedValue(
      new ServerErrorError({
        status: 403,
        detail: '没有权限执行该操作',
        titleKey: 'tb.error.forbidden',
      }),
    );
    renderPage();
    await screen.findByText('admin@acme.io');

    fireEvent.click(rowMenu(0));
    fireEvent.click(await screen.findByText('以租户管理员身份登录'));

    await waitFor(() => {
      expect(screen.getByText('没有权限执行该操作')).toBeInTheDocument();
    });
    expect(tokenStoreMock.setTokens).not.toHaveBeenCalled();
  });
});
