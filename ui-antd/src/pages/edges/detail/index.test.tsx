/**
 * Edge detail page tests (M13 wave-4): tab assembly (details + seven, TA
 * view), the TA-only snap-back and the CU read-only collapse (five tabs,
 * action area hidden), the details edit/save flow, the copy trio, sync,
 * delete-back-to-list, the two-state instructions button and the
 * parameterized events panel wired to the Edge event-type trio. Services
 * are mocked at the module boundary; pro-components is replaced the same
 * way as the device detail tests.
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
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
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
  useParams: () => ({ id: 'edge-1' }),
  useSelectedRoutes: () => [
    { route: {}, pathname: '/' },
    { route: { name: 'edges.detail' }, pathname: '/edges/edge-1' },
  ],
  useAppData: () => ({
    clientRoutes: [{ name: 'edge', path: '/edges' }],
  }),
}));

// Same workaround as the device detail tests: stub the pro PageContainer the
// shared wrapper delegates to, keeping the wrapper's contract visible.
vi.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: {
    title?: React.ReactNode;
    tags?: React.ReactNode;
    extra?: React.ReactNode;
    content?: React.ReactNode;
    onBack?: () => void;
    children?: React.ReactNode;
  }) => (
    <div>
      {props.onBack ? (
        <button type="button" aria-label="back" onClick={props.onBack}>
          back-icon
        </button>
      ) : null}
      <h1 data-testid="pc-title">{props.title}</h1>
      <div data-testid="pc-tags">{props.tags}</div>
      <div data-testid="pc-extra">{props.extra}</div>
      <div data-testid="pc-content">{props.content}</div>
      {props.children}
    </div>
  ),
}));

const edgeMock = vi.hoisted(() => ({
  getEdgeInfo: vi.fn(),
  saveEdge: vi.fn(),
  deleteEdge: vi.fn(),
  syncEdge: vi.fn(),
  getEdgeUpgradeAvailable: vi.fn(),
  assignEdgeToCustomer: vi.fn(),
  unassignEdgeFromCustomer: vi.fn(),
  makeEdgePublic: vi.fn(),
  getEdgeEvents: vi.fn(),
  getEdgeInstructionsInstall: vi.fn(),
  getEdgeInstructionsUpgrade: vi.fn(),
  getUserSettings: vi.fn(),
  putUserSettings: vi.fn(),
}));

const eventsMock = vi.hoisted(() => ({
  getEvents: vi.fn(),
}));

const attributesMock = vi.hoisted(() => ({
  getAttributes: vi.fn(),
}));

const customerMock = vi.hoisted(() => ({
  getCustomers: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/edge', () => edgeMock);
vi.mock('@/services/tb/events', () => eventsMock);
vi.mock('@/services/tb/attributes', () => attributesMock);
vi.mock('@/services/tb/customer', () => customerMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));

import EdgeDetailPage from './index';

const EDGE: EdgeInfo = {
  id: { entityType: EntityType.EDGE, id: 'edge-1' },
  createdTime: 1_700_000_000_000,
  tenantId: { entityType: EntityType.TENANT, id: 't-1' },
  name: '网关甲',
  type: 'default',
  label: '标签甲',
  routingKey: 'rk-edge-1',
  secret: 'sec-edge-1',
  customerTitle: '',
  customerIsPublic: false,
  version: 3,
  additionalInfo: { description: '初始描述' },
} as EdgeInfo;

const QUEUE_START_TS = 1_700_000_000_000;

function edgeEvent(seqId: number, createdTime: number) {
  return {
    seqId,
    edgeId: { entityType: EntityType.EDGE, id: 'edge-1' },
    action: 'ADDED',
    type: 'DEVICE',
    entityId: 'dev-1',
    uid: 'u-1',
    body: { name: 'dev' },
    createdTime,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <EdgeDetailPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
  return { unmount: view.unmount };
}

function selectedTab(): string {
  return (screen.getByRole('tab', { selected: true }).textContent ?? '').trim();
}

function tabNames(): Array<string> {
  return screen
    .getAllByRole('tab')
    .map((tab) => (tab.textContent ?? '').trim());
}

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

describe('edge detail page (TENANT_ADMIN)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/edges/edge-1');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    edgeMock.getEdgeInfo.mockResolvedValue(EDGE);
    edgeMock.getEdgeUpgradeAvailable.mockResolvedValue(false);
    edgeMock.getEdgeEvents.mockResolvedValue({
      data: [
        edgeEvent(1, QUEUE_START_TS - 1_000),
        edgeEvent(2, QUEUE_START_TS + 1_000),
      ],
      totalElements: 2,
    });
    edgeMock.getEdgeInstructionsInstall.mockResolvedValue({
      instructions: '#### step',
    });
    edgeMock.getEdgeInstructionsUpgrade.mockResolvedValue({
      instructions: '#### upgrade',
    });
    edgeMock.syncEdge.mockResolvedValue(undefined);
    edgeMock.deleteEdge.mockResolvedValue(undefined);
    edgeMock.saveEdge.mockResolvedValue(EDGE);
    eventsMock.getEvents.mockResolvedValue({ data: [], totalElements: 0 });
    attributesMock.getAttributes.mockResolvedValue([
      { key: 'queueStartTs', value: QUEUE_START_TS },
    ]);
    customerMock.getCustomers.mockResolvedValue({
      data: [],
      totalElements: 0,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/edges/edge-1');
  });

  it('renders the header from EdgeInfo, defaults to the details tab and loads via getEdgeInfo', async () => {
    renderPage();
    expect((await screen.findAllByText('网关甲')).length).toBeGreaterThan(0);
    expect(edgeMock.getEdgeInfo).toHaveBeenCalledWith('edge-1');
    expect(selectedTab()).toContain('详情');
  });

  it('assembles details plus the seven ngx tabs for TENANT_ADMIN', async () => {
    renderPage();
    await screen.findAllByText('网关甲');
    expect(tabNames()).toEqual([
      '详情',
      '属性',
      '最新遥测',
      '告警',
      '事件',
      '下行',
      '关联',
      '审计日志',
    ]);
  });

  it('keeps hand-typed TA-only tabs mounted for TENANT_ADMIN', async () => {
    window.history.replaceState({}, '', '/edges/edge-1?tab=downlinks');
    const first = renderPage();
    await screen.findAllByText('网关甲');
    expect(selectedTab()).toContain('下行');
    first.unmount();

    window.history.replaceState({}, '', '/edges/edge-1?tab=audit-logs');
    renderPage();
    await screen.findAllByText('网关甲');
    expect(selectedTab()).toContain('审计日志');
  });

  it('mounts downlinks with the two-stage pipeline and the derived status column', async () => {
    window.history.replaceState({}, '', '/edges/edge-1?tab=downlinks');
    renderPage();
    await screen.findAllByText('网关甲');

    // Stage 1: the SERVER_SCOPE queueStartTs attribute.
    await waitFor(() =>
      expect(attributesMock.getAttributes).toHaveBeenCalledWith(
        { entityType: EntityType.EDGE, id: 'edge-1' },
        'SERVER_SCOPE',
        ['queueStartTs'],
      ),
    );
    // Stage 2: the events page — server order verbatim, no sort params.
    await waitFor(() => expect(edgeMock.getEdgeEvents).toHaveBeenCalled());
    expect(edgeMock.getEdgeEvents).toHaveBeenCalledWith('edge-1', {
      pageSize: 10,
      page: 0,
    });

    // createdTime == watermark boundary → Deployed; after it → Pending.
    expect(await screen.findByText('已下发')).toBeInTheDocument();
    expect(screen.getByText('待下发')).toBeInTheDocument();
  });

  it('feeds the shared events panel the Edge entity and the three-type set', async () => {
    window.history.replaceState({}, '', '/edges/edge-1?tab=events');
    renderPage();
    await screen.findAllByText('网关甲');
    await waitFor(() =>
      expect(eventsMock.getEvents).toHaveBeenCalledWith(
        { entityType: EntityType.EDGE, id: 'edge-1' },
        't-1',
        'ERROR',
        expect.objectContaining({ page: 0 }),
      ),
    );
  });

  it('copies the id, key and secret with success toasts', async () => {
    renderPage();
    await screen.findAllByText('网关甲');

    fireEvent.click(screen.getByRole('button', { name: /复制 ID/ }));
    expect(
      await screen.findByText('Edge ID 已复制到剪贴板'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /复制 Edge key/ }));
    expect(
      await screen.findByText('Edge key 已复制到剪贴板'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /复制 Edge secret/ }));
    expect(
      await screen.findByText('Edge secret 已复制到剪贴板'),
    ).toBeInTheDocument();

    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      expect(writeText.mock.calls.map(([text]) => text)).toEqual([
        'edge-1',
        'rk-edge-1',
        'sec-edge-1',
      ]);
    });
  });

  it('fires sync with a started toast and no polling', async () => {
    renderPage();
    await screen.findAllByText('网关甲');

    fireEvent.click(screen.getByRole('button', { name: /同步 Edge/ }));
    await waitFor(() =>
      expect(edgeMock.syncEdge).toHaveBeenCalledWith('edge-1'),
    );
    expect(await screen.findByText('同步进程已成功启动！')).toBeInTheDocument();
    expect(edgeMock.syncEdge).toHaveBeenCalledTimes(1);
  });

  it('deletes and returns to the instances list after the danger confirm', async () => {
    renderPage();
    await screen.findAllByText('网关甲');

    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(edgeMock.deleteEdge).toHaveBeenCalledWith('edge-1');
    });
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/edges/instances');
    });
  });

  it('edits the four editable fields and saves through saveEdge with credentials intact', async () => {
    renderPage();
    await screen.findAllByText('网关甲');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const nameInput = await screen.findByLabelText('名称');
    fireEvent.change(nameInput, { target: { value: '网关甲改' } });

    const save = await screen.findByRole('button', { name: /保\s*存/ });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(edgeMock.saveEdge).toHaveBeenCalled());
    const payload = edgeMock.saveEdge.mock.calls[0][0];
    expect(payload.name).toBe('网关甲改');
    expect(payload.type).toBe('default');
    expect(payload.label).toBe('标签甲');
    expect(payload.additionalInfo.description).toBe('初始描述');
    expect(payload.routingKey).toBe('rk-edge-1');
    expect(payload.secret).toBe('sec-edge-1');
  });

  it('offers install instructions by default and upgrade instructions when the backend says so', async () => {
    const first = renderPage();
    await screen.findAllByText('网关甲');

    fireEvent.click(screen.getByRole('button', { name: '安装指引' }));
    expect(await screen.findByText('安装和连接说明')).toBeInTheDocument();
    await waitFor(() =>
      expect(edgeMock.getEdgeInstructionsInstall).toHaveBeenCalledWith(
        'edge-1',
        'docker',
      ),
    );
    first.unmount();

    // Re-render with upgrade available: the button flips its flavor.
    window.history.replaceState({}, '', '/edges/edge-1');
    edgeMock.getEdgeUpgradeAvailable.mockResolvedValue(true);
    renderPage();
    await screen.findAllByText('网关甲');
    fireEvent.click(screen.getByRole('button', { name: '升级指引' }));
    expect(await screen.findByText('升级说明')).toBeInTheDocument();
    await waitFor(() =>
      expect(edgeMock.getEdgeInstructionsUpgrade).toHaveBeenCalledWith(
        '3',
        'docker',
      ),
    );
  });
});

describe('edge detail page (CUSTOMER_USER)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/edges/edge-1');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
    });
    edgeMock.getEdgeInfo.mockResolvedValue(EDGE);
    eventsMock.getEvents.mockResolvedValue({ data: [], totalElements: 0 });
    attributesMock.getAttributes.mockResolvedValue([]);
    customerMock.getCustomers.mockResolvedValue({
      data: [],
      totalElements: 0,
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/edges/edge-1');
  });

  it('hides the whole action area', async () => {
    renderPage();
    await screen.findAllByText('网关甲');
    expect(screen.queryByRole('button', { name: /同步 Edge/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '复制 ID' })).toBeNull();
    expect(screen.queryByRole('button', { name: /编辑/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /删\s*除/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '安装指引' })).toBeNull();
  });

  it('collapses to the five read-only tabs and pulls details/TA-only tabs back to attributes', async () => {
    const first = renderPage();
    await screen.findAllByText('网关甲');
    expect(tabNames()).toEqual(['属性', '最新遥测', '告警', '事件', '关联']);
    expect(selectedTab()).toContain('属性');
    first.unmount();

    window.history.replaceState({}, '', '/edges/edge-1?tab=details');
    const second = renderPage();
    await screen.findAllByText('网关甲');
    expect(selectedTab()).toContain('属性');
    second.unmount();

    window.history.replaceState({}, '', '/edges/edge-1?tab=downlinks');
    renderPage();
    await screen.findAllByText('网关甲');
    expect(selectedTab()).toContain('属性');
  });
});
