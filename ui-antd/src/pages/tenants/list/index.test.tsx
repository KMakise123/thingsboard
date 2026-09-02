/**
 * Tenants list page tests: URL-state plumbing (page/sort/search), the
 * manage-tenant-admins navigation, the delete confirmation and the create
 * dialog with the required tenant-profile picker. Services are mocked at
 * the module boundary.
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
import zhCommon from '@/locales/zh-CN/common';
import zhTenants from '@/locales/zh-CN/tenants';
import { EntityType } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhTenants },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getTenantInfos: vi.fn(),
  getTenantInfo: vi.fn(),
  saveTenant: vi.fn(),
  deleteTenant: vi.fn(),
  getTenantUsers: vi.fn(),
}));

const profilesMock = vi.hoisted(() => ({
  getTenantProfileInfos: vi.fn(),
  getTenantProfileInfoById: vi.fn(),
  getTenantProfiles: vi.fn(),
  getTenantProfileById: vi.fn(),
  saveTenantProfile: vi.fn(),
  deleteTenantProfile: vi.fn(),
  setDefaultTenantProfile: vi.fn(),
  getDefaultTenantProfileInfo: vi.fn(),
}));

vi.mock('@/services/tb/tenant', () => servicesMock);
vi.mock('@/services/tb/tenant-profile', () => profilesMock);
// vite-node cannot resolve antd's extensionless internal locale imports when
// they are pulled through @ant-design/pro-components' bundle; render through
// antd's Table keeping the props/onChange contract (users-page finding).
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  return {
    ProTable,
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

import TenantsListPage from './index';

function tenant(id: string, title: string) {
  return {
    id: { entityType: EntityType.TENANT, id },
    createdTime: 1_700_000_000_000,
    title,
    tenantProfileId: { entityType: EntityType.TENANT_PROFILE, id: 'profile-1' },
    tenantProfileName: 'Default',
    email: 'ops@acme.io',
    country: 'CN',
    city: 'Shenzhen',
  };
}

const TENANTS_PAGE = {
  data: [tenant('tenant-1', 'ACME')],
  totalElements: 1,
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
          <TenantsListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('tenants list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/tenants');
    servicesMock.getTenantInfos.mockResolvedValue(TENANTS_PAGE);
    servicesMock.deleteTenant.mockResolvedValue(undefined);
    profilesMock.getTenantProfileInfos.mockResolvedValue({
      data: [
        {
          id: { entityType: EntityType.TENANT_PROFILE, id: 'profile-1' },
          createdTime: 0,
          name: 'Default',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/tenants');
  });

  it('loads page 1 with the default sort through the Infos endpoint', async () => {
    renderPage();

    expect(await screen.findByText('ACME')).toBeInTheDocument();
    expect(servicesMock.getTenantInfos).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('navigates to the tenant admins scope page from the row menu', async () => {
    renderPage();
    await screen.findByText('ACME');

    fireEvent.click(
      document.querySelectorAll('.ant-dropdown-trigger')[0] as HTMLElement,
    );
    fireEvent.click(await screen.findByText('管理租户管理员'));

    expect(historyMock.push).toHaveBeenCalledWith('/tenants/tenant-1/users');
  });

  it('confirms before deleting a tenant', async () => {
    renderPage();
    await screen.findByText('ACME');

    fireEvent.click(
      document.querySelectorAll('.ant-dropdown-trigger')[0] as HTMLElement,
    );
    fireEvent.click(await screen.findByText('删除租户'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteTenant).toHaveBeenCalledWith('tenant-1');
    });
  });

  it('opens the create dialog with a required tenant-profile picker', async () => {
    renderPage();
    await screen.findByText('ACME');

    fireEvent.click(screen.getByRole('button', { name: /添加租户/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('租户配置')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /添\s*加/ }));
    await waitFor(() => {
      expect(servicesMock.saveTenant).not.toHaveBeenCalled();
    });
  });

  it('debounces the text search into the server query', async () => {
    renderPage();
    await screen.findByText('ACME');

    fireEvent.change(screen.getByPlaceholderText('搜索租户'), {
      target: { value: ' ac ' },
    });
    await waitFor(
      () => {
        expect(servicesMock.getTenantInfos).toHaveBeenCalledWith(
          expect.objectContaining({ textSearch: 'ac' }),
        );
      },
      { timeout: 2500 },
    );
    expect(window.location.search).toContain('textSearch=ac');
  });
});
