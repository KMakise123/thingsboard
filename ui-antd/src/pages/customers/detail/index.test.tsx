/**
 * Customer detail page tests: 7-tab registry (no details tab, default
 * attributes), `?tab=` restore + TA-only fallback for CU, the header-area
 * form edit/save flow and the dirty guard on tab switches. Services are
 * mocked at the module boundary (Wave1 rule: no HTTP in pages).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhCustomers from '@/locales/zh-CN/customers';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhCustomers },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({ id: 'cust-1' }),
  useSelectedRoutes: () => [
    { route: {}, pathname: '/' },
    { route: { name: 'customers.detail' }, pathname: '/customers/cust-1' },
  ],
  useAppData: () => ({
    clientRoutes: [{ name: 'customers', path: '/customers' }],
  }),
}));

import { EntityType } from '@/types/tb';

import CustomerDetailPage from './index';

const servicesMock = vi.hoisted(() => ({
  getCustomerById: vi.fn(),
  saveCustomer: vi.fn(),
  getCustomerDashboards: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/customer', () => servicesMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));
vi.mock('@/core/ws/hooks', () => ({
  useAttributeSubscription: () => ({ data: [], status: 'connected' }),
  useLatestTelemetrySubscription: () => ({ data: [], status: 'connected' }),
}));

// pro-components cannot resolve antd locale imports under vite-node (M1
// known issue) — stub PageContainer while keeping the wrapper's contract
// visible (title / extra / content / guarded onBack).
vi.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: {
    title?: React.ReactNode;
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
      <div data-testid="pc-extra">{props.extra}</div>
      <div data-testid="pc-content">{props.content}</div>
      {props.children}
    </div>
  ),
}));

const CUSTOMER = {
  id: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
  createdTime: 1_700_000_000_000,
  tenantId: { entityType: EntityType.TENANT, id: 't-1' },
  title: '工厂 A',
  email: 'a@corp.io',
  phone: '+86 555 0100',
  country: '中国',
  city: '上海',
  additionalInfo: { description: '华东基地' },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <CustomerDetailPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('customer detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/customers/cust-1');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getCustomerById.mockResolvedValue(CUSTOMER);
    servicesMock.saveCustomer.mockResolvedValue(CUSTOMER);
    servicesMock.getCustomerDashboards.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/customers/cust-1');
  });

  it('renders the header from the customer and defaults to the attributes tab', async () => {
    renderPage();

    expect((await screen.findAllByText('工厂 A')).length).toBeGreaterThan(0);
    expect(servicesMock.getCustomerById).toHaveBeenCalledWith('cust-1');
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '属性',
    );
    // Read-mode header summary carries the contact digest.
    expect(screen.getByText(/a@corp\.io/)).toBeInTheDocument();
  });

  it('exposes exactly the seven tabs in ui-ngx order', async () => {
    renderPage();
    await screen.findAllByText('工厂 A');

    const labels = screen.getAllByRole('tab').map((node) => node.textContent);
    expect(labels).toEqual([
      '属性',
      '最新遥测',
      '告警规则',
      '告警',
      '关联',
      '审计日志',
      '版本控制',
    ]);
  });

  it('restores the active tab from ?tab=', async () => {
    window.history.replaceState({}, '', '/customers/cust-1?tab=relations');
    renderPage();

    await screen.findAllByText('工厂 A');
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '关联',
    );
  });

  it('falls back to attributes for a hand-typed TA-only tab under CU', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
    });
    window.history.replaceState(
      {},
      '',
      '/customers/cust-1?tab=version-control',
    );
    renderPage();

    await screen.findAllByText('工厂 A');
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '属性',
    );
    // The TA-only trio never renders for CU.
    expect(screen.queryByRole('tab', { name: '告警规则' })).toBeNull();
    expect(screen.queryByRole('tab', { name: '审计日志' })).toBeNull();
    expect(screen.queryByRole('tab', { name: '版本控制' })).toBeNull();
  });

  it('edits and saves the customer through the header form', async () => {
    renderPage();
    await screen.findAllByText('工厂 A');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const titleInput = await screen.findByDisplayValue('工厂 A');
    fireEvent.change(titleInput, { target: { value: '工厂 A2' } });

    fireEvent.click(screen.getByRole('button', { name: '保 存' }));

    await waitFor(() => {
      expect(servicesMock.saveCustomer).toHaveBeenCalled();
    });
    const payload = servicesMock.saveCustomer.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(payload.title).toBe('工厂 A2');
    // Existing identity + untouched contact fields ride along.
    expect(payload.id).toEqual(CUSTOMER.id);
    expect(payload.email).toBe('a@corp.io');
    expect(payload.additionalInfo).toEqual(
      expect.objectContaining({ description: '华东基地' }),
    );
  });

  it('blocks saving when the title is cleared', async () => {
    renderPage();
    await screen.findAllByText('工厂 A');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const titleInput = await screen.findByDisplayValue('工厂 A');
    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));

    expect(await screen.findByText('客户名称必填。')).toBeInTheDocument();
    expect(servicesMock.saveCustomer).not.toHaveBeenCalled();
  });

  it('confirms before switching tabs with unsaved header edits', async () => {
    renderPage();
    await screen.findAllByText('工厂 A');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const titleInput = await screen.findByDisplayValue('工厂 A');
    fireEvent.change(titleInput, { target: { value: '工厂 A 脏' } });

    fireEvent.click(screen.getByRole('tab', { name: '最新遥测' }));
    // antd renders the confirm title twice (visible + announced copy).
    const confirms = await screen.findAllByText('未保存的更改');
    expect(confirms.length).toBeGreaterThan(0);

    // Leaving discards the edits and lands on the requested tab.
    fireEvent.click(screen.getByRole('button', { name: /离\s*开/ }));
    await waitFor(() => {
      expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
        '最新遥测',
      );
    });
    expect(servicesMock.saveCustomer).not.toHaveBeenCalled();
  });
});
