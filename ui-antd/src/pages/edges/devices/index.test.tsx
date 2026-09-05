/**
 * Edge-scope devices page tests (wave 5a): the scoped query plumbing with
 * the three GET filters, the detail jump, single/batch unassign, the
 * assign-existing dialog and the CUSTOMER_USER read-only collapse. Services
 * are mocked at the module boundary; pro-components is replaced by antd's
 * Table (same workaround as the edge list tests).
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
import zhDevicesList from '@/locales/zh-CN/devices/list';
import zhEdge from '@/locales/zh-CN/edge';
import { EntityType } from '@/types/tb';
import type { DeviceInfo } from '@/types/tb/device';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEdge, ...zhDevicesList },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({ id: 'edge-1' }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const edgeMock = vi.hoisted(() => ({
  getEdgeInfo: vi.fn(),
  getEdgeDevices: vi.fn(),
  assignEdgeDevice: vi.fn(),
  unassignEdgeDevice: vi.fn(),
}));

const deviceMock = vi.hoisted(() => ({
  getDeviceProfiles: vi.fn(),
  getDeviceTypes: vi.fn(),
  getTenantDevices: vi.fn(),
}));

vi.mock('@/services/tb/edge', () => edgeMock);
vi.mock('@/services/tb/device', () => deviceMock);

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
      content?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div>
        <h1>{props.title}</h1>
        {props.extra}
        {props.content}
        {props.children}
      </div>
    ),
  };
});

import EdgeDevicesPage from './index';

function device(id: string, name: string): DeviceInfo {
  return {
    id: { entityType: EntityType.DEVICE, id },
    createdTime: 1_700_000_000_000,
    name,
    type: 'default',
    label: '',
    active: true,
    deviceProfileName: '默认配置',
  } as DeviceInfo;
}

const PAGE = {
  data: [device('dev-1', 'scope-dev-a'), device('dev-2', 'scope-dev-b')],
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

const CANDIDATES = {
  data: [
    {
      id: { entityType: EntityType.DEVICE, id: 'tenant-dev-1' },
      createdTime: 1,
      name: 'tenant-dev-a',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
};

function renderPage(component: React.ReactNode = <EdgeDevicesPage />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>{component}</RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/edges/edge-1/devices');
  edgeMock.getEdgeInfo.mockResolvedValue({
    id: { entityType: EntityType.EDGE, id: 'edge-1' },
    createdTime: 1,
    name: '网关A',
    type: 'default',
    routingKey: 'rk',
    secret: 'sec',
  });
  edgeMock.getEdgeDevices.mockResolvedValue(PAGE);
  edgeMock.assignEdgeDevice.mockResolvedValue({});
  edgeMock.unassignEdgeDevice.mockResolvedValue(undefined);
  deviceMock.getDeviceTypes.mockResolvedValue([
    { type: 'default' },
    { type: 'factory' },
  ]);
  deviceMock.getDeviceProfiles.mockResolvedValue({
    data: [
      {
        id: { entityType: EntityType.DEVICE_PROFILE, id: 'prof-1' },
        name: '默认配置',
      },
    ],
    totalElements: 1,
    totalPages: 1,
    hasNext: false,
  });
  deviceMock.getTenantDevices.mockResolvedValue(CANDIDATES);
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

describe('EdgeDevicesPage', () => {
  it('queries the edge-scoped endpoint and titles with the edge name', async () => {
    renderPage();

    expect(await screen.findByText('scope-dev-a')).toBeInTheDocument();
    expect(edgeMock.getEdgeDevices).toHaveBeenCalledWith(
      'edge-1',
      {
        pageSize: 10,
        page: 0,
        textSearch: undefined,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
      { type: undefined, deviceProfileId: undefined, active: undefined },
    );
    expect(screen.getByText('网关A: 设备')).toBeInTheDocument();
  });

  it('rides the type filter through the GET query params', async () => {
    renderPage();
    await screen.findByText('scope-dev-a');

    fireEvent.mouseDown(screen.getByText('全部类型'));
    const option = await waitFor(() => {
      const node = document.querySelector(
        '.ant-select-item-option[title="factory"]',
      );
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(option);

    await waitFor(() => {
      expect(edgeMock.getEdgeDevices).toHaveBeenLastCalledWith(
        'edge-1',
        expect.objectContaining({
          sortOrder: { property: 'createdTime', direction: 'DESC' },
        }),
        { type: 'factory', deviceProfileId: undefined, active: undefined },
      );
    });
  });

  it('jumps to the device detail from the name link', async () => {
    renderPage();
    await screen.findByText('scope-dev-a');

    fireEvent.click(screen.getByText('scope-dev-a'));
    expect(historyMock.push).toHaveBeenCalledWith('/devices/dev-1');
  });

  it('confirms before unassigning a single device from the edge', async () => {
    renderPage();
    await screen.findByText('scope-dev-a');

    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('从 Edge 取消分配'));

    expect(
      (await screen.findAllByText(/确定要将“scope-dev-a”从 Edge 取消分配吗？/))
        .length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      within(document.body).getByRole('button', { name: /从 Edge 取消分配/ }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeDevice).toHaveBeenCalledWith(
        'edge-1',
        'dev-1',
      );
    });
  });

  it('fans batch unassign out per selected device', async () => {
    renderPage();
    await screen.findByText('scope-dev-a');

    const checkboxes = document.querySelectorAll(
      '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
    );
    expect(checkboxes).toHaveLength(2);
    fireEvent.click(checkboxes[0] as HTMLElement);
    fireEvent.click(checkboxes[1] as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('已选 2 条')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '取消分配所选' }));
    await screen.findAllByText(/确定要取消分配 2 个实体吗？/);
    fireEvent.click(
      within(document.body).getByRole('button', { name: /从 Edge 取消分配/ }),
    );
    await waitFor(() => {
      expect(edgeMock.unassignEdgeDevice).toHaveBeenCalledWith(
        'edge-1',
        'dev-1',
      );
      expect(edgeMock.unassignEdgeDevice).toHaveBeenCalledWith(
        'edge-1',
        'dev-2',
      );
    });
  });

  it('assigns existing tenant devices through the dialog', async () => {
    renderPage();
    await screen.findByText('scope-dev-a');

    fireEvent.click(screen.getByRole('button', { name: /分配已有设备/ }));
    const modal = await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    await waitFor(() => {
      expect(deviceMock.getTenantDevices).toHaveBeenCalledWith(
        expect.objectContaining({ textSearch: undefined }),
      );
    });

    fireEvent.mouseDown(
      within(modal).getByText('搜索并选择实体') as HTMLElement,
    );
    const option = await waitFor(() => {
      const node = document.querySelector(
        '.ant-select-item-option[title="tenant-dev-a"]',
      );
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(option);
    fireEvent.click(within(modal).getByRole('button', { name: /分\s*配/ }));

    await waitFor(() => {
      expect(edgeMock.assignEdgeDevice).toHaveBeenCalledWith(
        'edge-1',
        'tenant-dev-1',
      );
    });
  });

  it('collapses to read-only for CUSTOMER_USER', async () => {
    vi.resetModules();
    vi.doMock('@/pages/edges/detail/use-authority', () => ({
      useAuthority: () => ({ authority: 'CUSTOMER_USER' }),
    }));
    const { default: CuPage } = await import('./index');
    renderPage(<CuPage />);

    await screen.findByText('scope-dev-a');
    expect(
      screen.queryByRole('button', { name: /分配已有设备/ }),
    ).not.toBeInTheDocument();
    expect(document.querySelector('.ant-dropdown-trigger')).toBeNull();
    expect(
      document.querySelectorAll(
        '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
      ),
    ).toHaveLength(0);
    // The list and the detail jump stay.
    fireEvent.click(screen.getByText('scope-dev-a'));
    expect(historyMock.push).toHaveBeenCalledWith('/devices/dev-1');
    vi.doUnmock('@/pages/edges/detail/use-authority');
  });
});
