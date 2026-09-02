/**
 * Tenant-profiles list page tests: the default-row guards (set-default and
 * delete disabled for the default profile, its checkbox not selectable) and
 * the set-default confirm posting to the default endpoint.
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
import zhTenantProfiles from '@/locales/zh-CN/tenant-profiles';
import { EntityType } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhTenantProfiles },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getTenantProfiles: vi.fn(),
  getTenantProfileById: vi.fn(),
  saveTenantProfile: vi.fn(),
  deleteTenantProfile: vi.fn(),
  setDefaultTenantProfile: vi.fn(),
  getTenantProfileInfos: vi.fn(),
  getTenantProfileInfoById: vi.fn(),
  getDefaultTenantProfileInfo: vi.fn(),
}));

vi.mock('@/services/tb/tenant-profile', () => servicesMock);
vi.mock('@/core/ws/hooks', () => ({
  useAttributeSubscription: () => ({ data: [], status: 'connected' }),
  useLatestTelemetrySubscription: () => ({ data: [], status: 'connected' }),
}));
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

import TenantProfilesListPage from './index';

function prof(id: string, name: string, isDefault = false) {
  return {
    id: { entityType: EntityType.TENANT_PROFILE, id },
    createdTime: 1_700_000_000_000,
    name,
    description: '',
    default: isDefault,
  };
}

const PROFILES_PAGE = {
  data: [prof('profile-0', 'Default profile', true), prof('profile-1', 'Gold')],
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
          <TenantProfilesListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

const rowMenu = (index: number) =>
  document.querySelectorAll('.ant-dropdown-trigger')[index] as HTMLElement;

describe('tenant-profiles list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/tenantProfiles');
    servicesMock.getTenantProfiles.mockResolvedValue(PROFILES_PAGE);
    servicesMock.deleteTenantProfile.mockResolvedValue(undefined);
    servicesMock.setDefaultTenantProfile.mockResolvedValue(undefined);
    servicesMock.getTenantProfileById.mockResolvedValue({
      ...PROFILES_PAGE.data[1],
      profileData: { configuration: { type: 'DEFAULT' } },
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/tenantProfiles');
  });

  it('renders the default checkbox column and profile rows', async () => {
    renderPage();

    expect(await screen.findByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('Default profile')).toBeInTheDocument();
    expect(screen.getByText('默认')).toBeInTheDocument();
  });

  it('disables set-default and delete for the default profile', async () => {
    renderPage();
    await screen.findByText('Gold');

    // Row 0 = the default profile: both entries are disabled.
    fireEvent.click(rowMenu(0));
    const setDefault = await screen.findByText('设为默认租户配置');
    expect(setDefault.closest('li')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('删除租户配置').closest('li')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('keeps set-default and delete enabled for a non-default profile', async () => {
    renderPage();
    await screen.findByText('Gold');

    // Row 1 = Gold: the entries stay enabled.
    fireEvent.click(rowMenu(1));
    expect(await screen.findByText('设为默认租户配置')).toBeInTheDocument();
    expect(screen.getByText('删除租户配置').closest('li')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('confirms set-default and posts to the default endpoint', async () => {
    renderPage();
    await screen.findByText('Gold');

    fireEvent.click(rowMenu(1));
    fireEvent.click(await screen.findByText('设为默认租户配置'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(
      within(confirm).getByRole('button', { name: /设为默认租户配置/ }),
    );
    await waitFor(() => {
      expect(servicesMock.setDefaultTenantProfile).toHaveBeenCalledWith(
        'profile-1',
      );
    });
  });
});
