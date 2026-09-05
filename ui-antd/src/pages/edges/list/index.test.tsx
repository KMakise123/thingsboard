/**
 * Edge instances list page tests (M13 wave-3): the explicit createdTime DESC
 * default, the type filter (resets the sort into the URL state), the create
 * dialog with locally-minted read-only routingKey/secret plus the auto-opened
 * install instructions (and the preference opt-out), row sync/delete/manage
 * entries, and batch assign. Services are mocked at the module boundary;
 * pro-components is replaced by antd's Table (same workaround as the
 * js-library/ota tests).
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
// AssignCustomerModal renders shared pages.entities.* strings.
import zhCommon from '@/locales/zh-CN/common';
import zhEdge from '@/locales/zh-CN/edge';
import zhMenu from '@/locales/zh-CN/menu';
import { EntityType } from '@/types/tb';
import type { EdgeInfo } from '@/types/tb/edge';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhMenu, ...zhEdge },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const edgeMock = vi.hoisted(() => ({
  getTenantEdgeInfos: vi.fn(),
  getCustomerEdgeInfos: vi.fn(),
  getEdgeTypes: vi.fn(),
  getEdgeInfo: vi.fn(),
  saveEdge: vi.fn(),
  deleteEdge: vi.fn(),
  assignEdgeToCustomer: vi.fn(),
  unassignEdgeFromCustomer: vi.fn(),
  makeEdgePublic: vi.fn(),
  syncEdge: vi.fn(),
  getUserSettings: vi.fn(),
  putUserSettings: vi.fn(),
  getEdgeInstructionsInstall: vi.fn(),
  getEdgeInstructionsUpgrade: vi.fn(),
  getEdgeUpgradeAvailable: vi.fn(),
}));

const customerMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
}));

vi.mock('@/services/tb/edge', () => edgeMock);
vi.mock('@/services/tb/customer', () => customerMock);

// vite-node cannot resolve antd's extensionless internal locale imports
// when pulled through pro-components' bundle — render through antd's Table
// (same workaround as the js-library/ota list tests).
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

import EdgeListPage from './index';
import { parseEdgeListUrlState, toPageLink } from './url-state';

function edge(
  id: string,
  name: string,
  extra: Partial<EdgeInfo> = {},
): EdgeInfo {
  return {
    id: { entityType: EntityType.EDGE, id },
    createdTime: 1_700_000_000_000,
    name,
    type: 'default',
    routingKey: `rk-${id}`,
    secret: `sec-${id}`,
    customerTitle: '',
    customerIsPublic: false,
    ...extra,
  } as EdgeInfo;
}

const UNASSIGNED = edge('edge-1', '网关A');
const ASSIGNED = edge('edge-2', '网关B', {
  customerTitle: '客户甲',
  customerId: { entityType: EntityType.CUSTOMER, id: 'cust-9' },
});
const PUBLIC = edge('edge-3', '网关C', {
  customerTitle: 'Public customer',
  customerId: { entityType: EntityType.CUSTOMER, id: 'cust-public' },
  customerIsPublic: true,
});

const PAGE = {
  data: [UNASSIGNED, ASSIGNED, PUBLIC],
  totalElements: 3,
  totalPages: 1,
  hasNext: false,
};

const CUSTOMERS_PAGE = {
  data: [
    {
      id: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
      title: '客户甲',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
};

const SAVED_EDGE = edge('edge-new', '新网关', { customerTitle: '' });

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <AntdApp>
          <EdgeListPage />
        </AntdApp>
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  edgeMock.getTenantEdgeInfos.mockResolvedValue(PAGE);
  edgeMock.getEdgeTypes.mockResolvedValue([
    { type: 'default' },
    { type: 'factory' },
  ]);
  edgeMock.getUserSettings.mockResolvedValue({});
  edgeMock.saveEdge.mockResolvedValue(SAVED_EDGE);
  edgeMock.deleteEdge.mockResolvedValue(undefined);
  edgeMock.syncEdge.mockResolvedValue(undefined);
  edgeMock.assignEdgeToCustomer.mockImplementation((_cid, edgeId) =>
    Promise.resolve(edge(edgeId, 'x')),
  );
  edgeMock.getEdgeInstructionsInstall.mockResolvedValue({
    instructions: '#### Step 1\nsudo apt install tbedge',
  });
  customerMock.getCustomers.mockResolvedValue(CUSTOMERS_PAGE);
});

afterEach(() => {
  window.history.replaceState({}, '', '/edges/instances');
  vi.clearAllMocks();
});

describe('edge list URL state', () => {
  it('defaults to an explicit createdTime DESC page link', () => {
    const state = parseEdgeListUrlState('');
    expect(state).toEqual({
      page: 1,
      pageSize: 10,
      sortProperty: 'createdTime',
      sortDirection: 'DESC',
      textSearch: '',
      type: undefined,
    });
    expect(toPageLink(state)).toEqual({
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
  });

  it('parses a bookmarked non-default state including the type filter', () => {
    const state = parseEdgeListUrlState(
      '?page=2&pageSize=20&sortProperty=name&sortOrder=ASC&textSearch=gw&type=factory',
    );
    expect(state.page).toBe(2);
    expect(state.sortProperty).toBe('name');
    expect(state.type).toBe('factory');
    const query = toPageLink(state);
    expect(query.page).toBe(1);
    expect(query.sortOrder).toEqual({ property: 'name', direction: 'ASC' });
  });
});

describe('EdgeListPage', () => {
  it('queries with the explicit createdTime DESC default and renders the tenant columns', async () => {
    renderPage();

    expect(await screen.findByText('网关A')).toBeInTheDocument();
    expect(screen.getByText('客户甲')).toBeInTheDocument();
    expect(edgeMock.getTenantEdgeInfos).toHaveBeenCalledWith(
      {
        pageSize: 10,
        page: 0,
        textSearch: undefined,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
      undefined,
    );
  });

  it('resets the sort and writes the type filter into the URL state on switch', async () => {
    renderPage();
    await screen.findByText('网关A');

    fireEvent.mouseDown(screen.getByText('全部 Edge 类型'));
    const option = await waitFor(() => {
      const node = document.querySelector(
        '.ant-select-item-option[title="factory"]',
      );
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(option);

    await waitFor(() => {
      expect(edgeMock.getTenantEdgeInfos).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortOrder: { property: 'createdTime', direction: 'DESC' },
        }),
        'factory',
      );
    });
    expect(window.location.search).toContain('type=factory');
  });

  it('creates an edge with locally-minted read-only credentials', async () => {
    renderPage();
    await screen.findByText('网关A');

    fireEvent.click(screen.getByRole('button', { name: /新增 Edge/ }));
    const modal = await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });

    // routingKey/secret render disabled with guid / 20-char shapes.
    const keyInput = within(modal).getByTestId(
      'edge-routing-key',
    ) as HTMLInputElement;
    const secretInput = within(modal).getByTestId(
      'edge-secret',
    ) as HTMLInputElement;
    expect(keyInput).toBeDisabled();
    expect(secretInput).toBeDisabled();
    expect(keyInput.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(secretInput.value).toMatch(/^[0-9a-z]{20}$/);

    fireEvent.change(within(modal).getByLabelText('名称'), {
      target: { value: '新网关' },
    });
    // The type field defaults to 'default' (free text).
    expect(
      (within(modal).getByLabelText('Edge 类型') as HTMLInputElement).value,
    ).toBe('default');
    fireEvent.change(within(modal).getByLabelText('标签'), {
      target: { value: '产线1' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /新\s*增/ }));

    await waitFor(() => {
      expect(edgeMock.saveEdge).toHaveBeenCalledTimes(1);
    });
    const request = edgeMock.saveEdge.mock.calls[0][0];
    expect(request.name).toBe('新网关');
    expect(request.type).toBe('default');
    expect(request.label).toBe('产线1');
    expect(request.routingKey).toBe(keyInput.value);
    expect(request.secret).toBe(secretInput.value);
    expect(request.additionalInfo).toEqual({ description: '' });
  });

  it('auto-opens the install instructions after create unless the preference opts out', async () => {
    renderPage();
    await screen.findByText('网关A');

    fireEvent.click(screen.getByRole('button', { name: /新增 Edge/ }));
    const modal = (await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    })) as HTMLElement;
    fireEvent.change(within(modal).getByLabelText('名称'), {
      target: { value: '新网关' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /新\s*增/ }));

    // The instructions dialog opens on the Docker tab with backend markdown.
    expect(
      await screen.findByText('Edge 已创建，请查看安装和连接说明'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(edgeMock.getEdgeInstructionsInstall).toHaveBeenCalledWith(
        'edge-new',
        'docker',
      );
    });
    expect(
      await screen.findByText('sudo apt install tbedge'),
    ).toBeInTheDocument();

    // Checking "不再显示" and closing writes the preference (merge PUT).
    fireEvent.click(screen.getByTestId('edge-instructions-dont-show'));
    // antd inserts a space between two-CJK-char button labels.
    fireEvent.click(
      screen.getAllByRole('button', { name: /关\s*闭/ }).pop() as HTMLElement,
    );
    await waitFor(() => {
      expect(edgeMock.putUserSettings).toHaveBeenCalledWith({
        notDisplayInstructionsAfterAddEdge: true,
      });
    });
  });

  it('does not auto-open instructions when the user preference is set', async () => {
    edgeMock.getUserSettings.mockResolvedValue({
      notDisplayInstructionsAfterAddEdge: true,
    });
    renderPage();
    await screen.findByText('网关A');

    fireEvent.click(screen.getByRole('button', { name: /新增 Edge/ }));
    const modal = (await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    })) as HTMLElement;
    fireEvent.change(within(modal).getByLabelText('名称'), {
      target: { value: '新网关' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: /新\s*增/ }));

    await waitFor(() => {
      expect(edgeMock.saveEdge).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('Edge 已创建，请查看安装和连接说明')).toBeNull();
    expect(edgeMock.getEdgeInstructionsInstall).not.toHaveBeenCalled();
  });

  it('fires sync per row with a started toast and no polling', async () => {
    renderPage();
    await screen.findByText('网关A');

    fireEvent.click(screen.getAllByRole('button', { name: '同步 Edge' })[0]);

    await waitFor(() => {
      expect(edgeMock.syncEdge).toHaveBeenCalledWith('edge-1');
    });
    expect(await screen.findByText('同步进程已成功启动！')).toBeInTheDocument();
    expect(edgeMock.syncEdge).toHaveBeenCalledTimes(1);
  });

  it('deletes an edge only after the danger confirm', async () => {
    renderPage();
    await screen.findByText('网关A');

    // Delete rides the row "more" dropdown (ngx action-matrix parity).
    const row = screen.getByText('网关A').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getAllByRole('button').at(-1) as HTMLElement);
    fireEvent.click(await screen.findByText('删除'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(edgeMock.deleteEdge).toHaveBeenCalledWith('edge-1');
    });
  });

  it('navigates to the five manage sub-pages from the row menu', async () => {
    renderPage();
    await screen.findByText('网关A');

    const row = screen.getByText('网关A').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getAllByRole('button').at(-1) as HTMLElement);
    fireEvent.click(await screen.findByText('管理设备'));
    expect(historyMock.push).toHaveBeenCalledWith('/edges/edge-1/devices');
  });

  it('offers make public / assign only for unassigned edges and make private for public ones', async () => {
    renderPage();
    await screen.findByText('网关A');

    const unassignedRow = screen
      .getByText('网关A')
      .closest('tr') as HTMLElement;
    fireEvent.click(
      within(unassignedRow).getAllByRole('button').at(-1) as HTMLElement,
    );
    expect(await screen.findByText('将 Edge 设为公开')).toBeInTheDocument();
    expect(screen.getByText('分配给客户')).toBeInTheDocument();

    const publicRow = screen.getByText('网关C').closest('tr') as HTMLElement;
    fireEvent.click(
      within(publicRow).getAllByRole('button').at(-1) as HTMLElement,
    );
    expect(await screen.findByText('将 Edge 设为私有')).toBeInTheDocument();
  });

  it('batch-assigns the selected edges to a customer', async () => {
    renderPage();
    await screen.findByText('网关A');

    // Header "select all" checkbox.
    const selectAll = document.querySelector(
      'thead input[type="checkbox"]',
    ) as HTMLInputElement;
    fireEvent.click(selectAll);

    fireEvent.click(screen.getByRole('button', { name: '分配给客户' }));
    const assignModal = (await waitFor(() => {
      const node = document.querySelector('.ant-modal');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    })) as HTMLElement;
    fireEvent.mouseDown(
      assignModal.querySelector('.ant-select') as HTMLElement,
    );
    const option = await waitFor(() => {
      const node = document.querySelector(
        '.ant-select-item-option[title="客户甲"]',
      );
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(option);
    // Confirm the AssignCustomerModal dialog.
    fireEvent.click(
      within(assignModal).getByRole('button', { name: /分\s*配/ }),
    );

    await waitFor(() => {
      expect(edgeMock.assignEdgeToCustomer).toHaveBeenCalledTimes(3);
    });
    expect(edgeMock.assignEdgeToCustomer).toHaveBeenCalledWith(
      'cust-1',
      'edge-1',
    );
    expect(edgeMock.assignEdgeToCustomer).toHaveBeenCalledWith(
      'cust-1',
      'edge-2',
    );
    expect(edgeMock.assignEdgeToCustomer).toHaveBeenCalledWith(
      'cust-1',
      'edge-3',
    );
  });
});
