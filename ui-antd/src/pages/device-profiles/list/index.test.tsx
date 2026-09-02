/**
 * Device-profiles list page tests: the isDefault protection (default row is
 * not selectable, its delete entry is disabled and set-default is absent)
 * plus the row actions for a regular profile (set-default confirm, delete
 * confirm). Services are mocked at the module boundary.
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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhDeviceProfiles from '@/locales/zh-CN/device-profiles';
import { EntityType } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhDeviceProfiles },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getDeviceProfileList: vi.fn(),
  deleteDeviceProfile: vi.fn(),
  setDefaultDeviceProfile: vi.fn(),
}));
const exportMock = vi.hoisted(() => ({ exportDeviceProfile: vi.fn() }));

vi.mock('@/services/tb/device-profile', () => servicesMock);
vi.mock('@/components/profiles/export-profile', () => exportMock);

// vite-node cannot resolve antd's extensionless internal locale imports via
// the pro-components bundle — render ProTable as antd Table (see the assets
// list test for the full rationale).
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  type Row = Record<string, unknown>;
  const getByPath = (row: Row, path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (value, key) =>
          value && typeof value === 'object' ? (value as Row)[key] : undefined,
        row,
      );
  const ProTable = ({
    rowKey,
    ...rest
  }: React.ComponentProps<typeof Table>) => (
    <Table
      rowKey={
        typeof rowKey === 'string' && rowKey.includes('.')
          ? (row: unknown) => String(getByPath(row as Row, rowKey))
          : rowKey
      }
      {...rest}
    />
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

import DeviceProfilesListPage from './index';

function profile(
  id: string,
  name: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: { entityType: EntityType.DEVICE_PROFILE, id },
    createdTime: 1_700_000_000_000,
    name,
    description: '',
    default: false,
    type: 'DEFAULT',
    transportType: 'DEFAULT',
    profileData: {},
    ...extra,
  };
}

const PAGE = {
  data: [
    profile('dp-plain', 'regular-profile'),
    profile('dp-default', 'default-profile', { default: true }),
  ],
  totalElements: 2,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <DeviceProfilesListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

function rowOf(name: string): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(name) });
}

async function openRowMenu(name: string): Promise<HTMLElement> {
  const row = rowOf(name);
  fireEvent.click(within(row).getByRole('button'));
  return within(await screen.findByRole('menu')).getByRole('menuitem', {
    name: '删除',
  });
}

describe('device profiles list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/deviceProfiles');
    servicesMock.getDeviceProfileList.mockResolvedValue(PAGE);
    servicesMock.deleteDeviceProfile.mockResolvedValue(undefined);
    servicesMock.setDefaultDeviceProfile.mockResolvedValue(undefined);
  });

  it('renders both rows and hits the 0-based paged endpoint', async () => {
    renderPage();
    expect(await screen.findByText('regular-profile')).toBeInTheDocument();
    expect(screen.getByText('default-profile')).toBeInTheDocument();
    expect(servicesMock.getDeviceProfileList).toHaveBeenCalledWith({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('blocks selection and delete for the default profile', async () => {
    renderPage();
    await screen.findByText('default-profile');

    // The default row's selection checkbox is disabled (first checkbox = the
    // row-selection one; the second is the read-only default column marker).
    const row = rowOf('default-profile');
    const checkboxes = within(row).getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0]).toBeDisabled();

    const deleteItem = await openRowMenu('default-profile');
    expect(deleteItem.getAttribute('aria-disabled')).toBe('true');
    // set-default never renders for the default row.
    expect(
      within(screen.getByRole('menu')).queryByRole('menuitem', {
        name: '设为默认设备配置',
      }),
    ).not.toBeInTheDocument();
    expect(servicesMock.deleteDeviceProfile).not.toHaveBeenCalled();
  });

  it('offers set-default (confirmed) for a regular profile', async () => {
    renderPage();
    await screen.findByText('regular-profile');

    const deleteItem = await openRowMenu('regular-profile');
    expect(deleteItem.getAttribute('aria-disabled')).not.toBe('true');

    fireEvent.click(
      within(screen.getByRole('menu')).getByRole('menuitem', {
        name: '设为默认设备配置',
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: '是' }));
    await waitFor(() => {
      expect(servicesMock.setDefaultDeviceProfile).toHaveBeenCalledWith(
        'dp-plain',
      );
    });
  });

  it('deletes a regular profile after the confirm dialog', async () => {
    renderPage();
    await screen.findByText('regular-profile');

    const menuDelete = await openRowMenu('regular-profile');
    fireEvent.click(menuDelete);
    // The confirm dialog opens; click its danger OK button.
    // antd inserts a space between CJK characters in buttons ("删 除").
    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteDeviceProfile).toHaveBeenCalledWith('dp-plain');
    });
  });
});
