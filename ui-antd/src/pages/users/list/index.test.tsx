/**
 * Users list page tests: URL-state plumbing (page/sort/search), the row
 * operations with their activation gating (link display / resend for
 * unactivated users, account toggle for activated ones, self-delete guard)
 * and the create entry. Services are mocked at the module boundary.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhUsers from '@/locales/zh-CN/users';
import { Authority, EntityType } from '@/types/tb';

const intl = createIntl({ locale: 'zh-CN', messages: zhUsers });

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
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
  getCustomerUsers: vi.fn(),
}));

const customerMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/user', () => servicesMock);
vi.mock('@/services/tb/customer', () => customerMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));
// vite-node cannot resolve antd's extensionless internal locale imports when
// they are pulled through @ant-design/pro-components' bundle; render through
// antd's Table keeping the props/onChange contract (same as the device list).
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
    // Thin passthrough: the page header (ADR 0008) renders extra + children.
    PageContainer: (props: {
      extra?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div>
        {props.extra}
        {props.children}
      </div>
    ),
  };
});

import UsersListPage from './index';

const ACTIVATION_LINK =
  'http://localhost:8080/api/noauth/activate?activateToken=token-1';

function user(id: string, email: string, extra: Record<string, unknown> = {}) {
  return {
    id: { entityType: EntityType.USER, id },
    createdTime: 1_700_000_000_000,
    email,
    authority: Authority.CUSTOMER_USER,
    firstName: '',
    lastName: '',
    ...extra,
  };
}

const TENANT_PAGE = {
  data: [
    user('user-ta', 'tenant@thingsboard.org', {
      authority: Authority.TENANT_ADMIN,
      additionalInfo: { userActivated: true, userCredentialsEnabled: true },
    }),
    user('user-cu', 'cu@thingsboard.org', {
      additionalInfo: { userActivated: false },
    }),
  ],
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
          <UsersListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

const DEFAULT_PAGE_LINK = {
  pageSize: 10,
  page: 0,
  textSearch: undefined,
  sortOrder: { property: 'createdTime', direction: 'DESC' },
};

const rowMenu = (index: number) =>
  document.querySelectorAll('.ant-dropdown-trigger')[index] as HTMLElement;

describe('users list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/users');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
      userId: 'session-user',
    });
    servicesMock.getUsers.mockResolvedValue(TENANT_PAGE);
    servicesMock.getUserById.mockImplementation(async (id: string) => {
      const found = TENANT_PAGE.data.find((entry) => entry.id.id === id);
      return found ?? TENANT_PAGE.data[0];
    });
    servicesMock.deleteUser.mockResolvedValue(undefined);
    servicesMock.getUserActivationLinkInfo.mockResolvedValue({
      value: ACTIVATION_LINK,
      ttlMs: 86_400_000,
    });
    servicesMock.sendActivationMail.mockResolvedValue(undefined);
    servicesMock.setUserCredentialsEnabled.mockResolvedValue(undefined);
    customerMock.getCustomers.mockResolvedValue({ data: [] });
    customerMock.getCustomerById.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/users');
  });

  it('loads page 1 with the default sort through the authority-scoped list', async () => {
    renderPage();

    expect(
      await screen.findByText('tenant@thingsboard.org'),
    ).toBeInTheDocument();
    expect(screen.getByText('cu@thingsboard.org')).toBeInTheDocument();
    expect(servicesMock.getUsers).toHaveBeenCalledWith(DEFAULT_PAGE_LINK);
    // The /users page never picks a scope client-side.
    expect(servicesMock.getCustomerUsers).not.toHaveBeenCalled();
  });

  it('moves pagination into the URL and the 0-based server call', async () => {
    servicesMock.getUsers.mockResolvedValue({
      ...TENANT_PAGE,
      totalElements: 15,
      totalPages: 2,
      hasNext: true,
    });
    renderPage();
    await screen.findByText('tenant@thingsboard.org');

    fireEvent.click(screen.getByTitle('2'));

    await waitFor(() => {
      expect(servicesMock.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
      );
    });
    expect(window.location.search).toContain('page=2');
  });

  it('turns a column click into server-side sort URL params', async () => {
    renderPage();
    await screen.findByText('tenant@thingsboard.org');

    const emailHeader = screen.getByText('Email').closest('th');
    expect(emailHeader).not.toBeNull();
    fireEvent.click(emailHeader as HTMLElement);

    await waitFor(() => {
      expect(servicesMock.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: { property: 'email', direction: 'ASC' },
        }),
      );
    });
    expect(window.location.search).toContain('sortProperty=email');
    expect(window.location.search).toContain('sortOrder=ASC');
  });

  it('debounces the text search into the server query', async () => {
    renderPage();
    await screen.findByText('tenant@thingsboard.org');

    fireEvent.change(screen.getByPlaceholderText('搜索用户'), {
      target: { value: ' cu ' },
    });

    await waitFor(
      () => {
        expect(servicesMock.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({ textSearch: 'cu' }),
        );
      },
      { timeout: 2500 },
    );
    expect(window.location.search).toContain('textSearch=cu');
  });

  it('offers the activation actions for an unactivated user', async () => {
    renderPage();
    await screen.findByText('cu@thingsboard.org');

    fireEvent.click(rowMenu(1));
    expect(await screen.findByText('显示激活链接')).toBeInTheDocument();
    expect(screen.getByText('重新发送激活')).toBeInTheDocument();
  });

  it('shows the activation link dialog with the backend link', async () => {
    renderPage();
    await screen.findByText('cu@thingsboard.org');

    fireEvent.click(rowMenu(1));
    fireEvent.click(await screen.findByText('显示激活链接'));

    await waitFor(() => {
      expect(servicesMock.getUserActivationLinkInfo).toHaveBeenCalledWith(
        'user-cu',
      );
    });
    expect(await screen.findByText('用户激活链接')).toBeInTheDocument();
    expect(screen.getByText(ACTIVATION_LINK)).toBeInTheDocument();
  });

  it('confirms before resending the activation email', async () => {
    renderPage();
    await screen.findByText('cu@thingsboard.org');

    fireEvent.click(rowMenu(1));
    fireEvent.click(await screen.findByText('重新发送激活'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(
      within(confirm).getByRole('button', { name: /重新发送激活/ }),
    );
    await waitFor(() => {
      expect(servicesMock.sendActivationMail).toHaveBeenCalledWith(
        'cu@thingsboard.org',
      );
    });
  });

  it('offers the account toggle for an activated user and posts the new state', async () => {
    renderPage();
    await screen.findByText('tenant@thingsboard.org');

    fireEvent.click(rowMenu(0));
    fireEvent.click(await screen.findByText('禁用用户账户'));

    await waitFor(() => {
      expect(servicesMock.setUserCredentialsEnabled).toHaveBeenCalledWith(
        'user-ta',
        false,
      );
    });
    expect(servicesMock.setUserCredentialsEnabled).toHaveBeenCalledTimes(1);
  });

  it('confirms before deleting a row and hides delete for the session user', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
      userId: 'user-ta',
    });
    renderPage();
    await screen.findByText('tenant@thingsboard.org');

    // The session user's own row has no delete entry.
    fireEvent.click(rowMenu(0));
    await screen.findByText('禁用用户账户');
    expect(screen.queryByText('删除')).not.toBeInTheDocument();

    fireEvent.click(rowMenu(1));
    fireEvent.click(await screen.findByText('删除'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    expect(
      within(confirm).getAllByText(/确定要删除用户“cu@thingsboard.org”吗？/),
    ).not.toHaveLength(0);
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteUser).toHaveBeenCalledWith('user-cu');
    });
  });

  it('opens the create dialog from the toolbar', async () => {
    renderPage();
    await screen.findByText('tenant@thingsboard.org');

    fireEvent.click(screen.getByRole('button', { name: /添加用户/ }));

    // Scope to the modal: the toolbar button carries the same label.
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('添加用户')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows the load-failure alert with the server error text', async () => {
    servicesMock.getUsers.mockRejectedValue(
      Object.assign(new Error('should-not-leak'), {
        detail: '用户列表不可用',
      }),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('加载用户列表失败')).toBeInTheDocument();
    });
  });
});
