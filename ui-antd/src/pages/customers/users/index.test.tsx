/**
 * Customer-scope users page tests: the scoped query, the edit dialog save,
 * delete confirmation, show-activation-link and resend-activation ("reset
 * password" parity). Services are mocked at the module boundary.
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
import zhCustomers from '@/locales/zh-CN/customers';
import zhCommon from '@/locales/zh-CN/common';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhCustomers },
});

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn() },
  useParams: () => ({ id: 'cust-1' }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { Authority, EntityType } from '@/types/tb';

import CustomerUsersPage from './index';

const servicesMock = vi.hoisted(() => ({
  getCustomerTitle: vi.fn(),
  getCustomerUsers: vi.fn(),
  saveUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserActivationLink: vi.fn(),
  sendActivationMail: vi.fn(),
}));

vi.mock('@/services/tb/customer', () => ({
  getCustomerTitle: servicesMock.getCustomerTitle,
}));
vi.mock('@/services/tb/user', () => servicesMock);

vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
    PageContainer: (props: {
      extra?: React.ReactNode;
      content?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div>
        {props.extra}
        {props.content}
        {props.children}
      </div>
    ),
  };
});

function user(id: string, email: string, extra: Record<string, unknown> = {}) {
  return {
    id: { entityType: EntityType.USER, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 't-1' },
    customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
    authority: Authority.CUSTOMER_USER,
    email,
    firstName: '一',
    lastName: '张',
    ...extra,
  };
}

const PAGE = {
  data: [user('user-1', 'cu@thingsboard.org'), user('user-2', 'cu2@thingsboard.org')],
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
          <CustomerUsersPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('customer users scope page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/customers/cust-1/users');
    servicesMock.getCustomerTitle.mockResolvedValue('工厂 A');
    servicesMock.getCustomerUsers.mockResolvedValue(PAGE);
    servicesMock.saveUser.mockResolvedValue(PAGE.data[0]);
    servicesMock.deleteUser.mockResolvedValue(undefined);
    servicesMock.getUserActivationLink.mockResolvedValue(
      'http://localhost:8080/api/noauth/activate?activateToken=abc',
    );
    servicesMock.sendActivationMail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('loads the customer-scoped user list', async () => {
    renderPage();

    expect(
      await screen.findByText('cu@thingsboard.org'),
    ).toBeInTheDocument();
    expect(servicesMock.getCustomerUsers).toHaveBeenCalledWith('cust-1', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('edits a user through the dialog and keeps the entity id', async () => {
    renderPage();
    await screen.findByText('cu@thingsboard.org');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('编辑'));

    const titleNode = await screen.findByText('编辑用户', {
      selector: '.ant-modal-title',
    });
    const modal = titleNode.closest('.ant-modal') as HTMLElement;
    const emailInput = within(modal).getByLabelText('邮箱');
    fireEvent.change(emailInput, {
      target: { value: 'renamed@thingsboard.org' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(servicesMock.saveUser).toHaveBeenCalled();
    });
    const payload = servicesMock.saveUser.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect((payload.id as Record<string, unknown>).id).toBe('user-1');
    expect(payload.email).toBe('renamed@thingsboard.org');
  });

  it('confirms before deleting a user', async () => {
    renderPage();
    await screen.findByText('cu@thingsboard.org');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('删除'));

    const confirm = await screen.findAllByText(
      /确定要删除用户“cu@thingsboard\.org”吗？/,
    );
    expect(confirm.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteUser).toHaveBeenCalledWith('user-1');
    });
  });

  it('shows the activation link (the no-backend "reset password")', async () => {
    renderPage();
    await screen.findByText('cu@thingsboard.org');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('展示激活链接'));

    expect(
      await screen.findByText(
        'http://localhost:8080/api/noauth/activate?activateToken=abc',
      ),
    ).toBeInTheDocument();
    expect(servicesMock.getUserActivationLink).toHaveBeenCalledWith('user-1');
  });

  it('resends the activation email for the row user', async () => {
    renderPage();
    await screen.findByText('cu@thingsboard.org');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('重发激活邮件'));

    await waitFor(() => {
      expect(servicesMock.sendActivationMail).toHaveBeenCalledWith(
        'cu@thingsboard.org',
      );
    });
  });
});
