/**
 * Bundle widgets manager smoke tests (M11 wave 1B): membership rendering
 * with fqn, add via the server-searched select, remove, reordering and the
 * save contract — the whole ordered id list posts to the set-replacement
 * endpoint. Tenant read-only gating on a system bundle.
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
import zhBundles from '@/locales/zh-CN/resources/widgets-bundles';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhBundles },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
const paramsMock = vi.hoisted(() => ({ bundleId: 'b-1' }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => paramsMock,
}));

const servicesMock = vi.hoisted(() => ({
  getWidgetsBundleById: vi.fn(),
  getBundleWidgetTypeInfoList: vi.fn(),
  updateWidgetsBundleWidgetTypes: vi.fn(),
  getWidgetTypes: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/widgets-bundle', () => servicesMock);
vi.mock('@/services/tb/widget-type', () => servicesMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));

vi.mock('@/components/layout/page-container', () => ({
  default: (props: {
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
}));

import BundleWidgetsPage from './index';

const SYSTEM_TENANT = {
  entityType: 'TENANT',
  id: '13814000-1dd2-11b2-8080-808080808080',
};

const BUNDLE = {
  id: { entityType: 'WIDGETS_BUNDLE', id: 'b-1' },
  title: '卡片包',
  tenantId: { entityType: 'TENANT', id: 'tenant-1' },
  description: '测试包',
};

function member(id: string, name: string, fqn = `tenant.${name}`) {
  return {
    id: { entityType: 'WIDGET_TYPE', id },
    name,
    fqn,
    widgetType: 'latest',
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <BundleWidgetsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('bundle widgets manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getWidgetsBundleById.mockResolvedValue(BUNDLE);
    servicesMock.getBundleWidgetTypeInfoList.mockResolvedValue([
      member('wt-1', 'first'),
      member('wt-2', 'second'),
    ]);
    servicesMock.updateWidgetsBundleWidgetTypes.mockResolvedValue(undefined);
    servicesMock.getWidgetTypes.mockResolvedValue({
      data: [member('wt-3', 'third'), member('wt-1', 'first')],
      totalElements: 2,
      totalPages: 1,
      hasNext: false,
    });
  });

  it('renders the bundle and its membership with fqns', async () => {
    renderPage();

    expect(await screen.findByText('卡片包')).toBeInTheDocument();
    expect(screen.getByText('tenant.first')).toBeInTheDocument();
    expect(screen.getByText('tenant.second')).toBeInTheDocument();
    // view mode: no save/edit toggles per row
    expect(screen.getByTestId('bundle-widgets-edit')).toBeInTheDocument();
  });

  it('adds a member through the search dialog and saves the ordered id list', async () => {
    renderPage();
    await screen.findByText('卡片包');

    fireEvent.click(screen.getByTestId('bundle-widgets-edit'));
    fireEvent.click(screen.getByTestId('bundle-widgets-add'));
    await screen.findByTestId('bundle-widgets-add-dialog');

    // server-searched options exclude current members (wt-1 filtered out)
    fireEvent.mouseDown(
      document.querySelector(
        '[data-testid="bundle-widgets-add-dialog"] .ant-select',
      ) as HTMLElement,
    );
    const option = await screen.findByText('third', {
      selector: '.ant-select-item-option-content',
    });
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByText('tenant.third')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('bundle-widgets-save'));

    await waitFor(() => {
      expect(servicesMock.updateWidgetsBundleWidgetTypes).toHaveBeenCalledWith(
        'b-1',
        ['wt-1', 'wt-2', 'wt-3'],
      );
    });
  });

  // V1-1 (upstream semantics, walkthrough 2026-09-05): the backend accepts
  // only tenant-owned widget types into a tenant bundle — system ids are
  // dropped silently (WidgetsBundleController.java:145-151 filters by
  // tenant-strict existence). The picker must request tenant-owned rows
  // only and say why system types are absent.
  it('offers only tenant-owned widget types in the add picker', async () => {
    renderPage();
    await screen.findByText('tenant.first');

    fireEvent.click(screen.getByTestId('bundle-widgets-edit'));
    fireEvent.click(screen.getByTestId('bundle-widgets-add'));
    await screen.findByTestId('bundle-widgets-add-dialog');

    await waitFor(() => {
      expect(servicesMock.getWidgetTypes).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantOnly: true }),
      );
    });
    expect(
      screen.getByText(
        '系统部件类型不能加入自有部件包：选择器仅列出本租户自有的部件类型。',
      ),
    ).toBeInTheDocument();
  });

  it('removes a member and reflects it in the save payload', async () => {
    renderPage();
    await screen.findByText('tenant.first');

    fireEvent.click(screen.getByTestId('bundle-widgets-edit'));
    fireEvent.click(screen.getByTestId('bundle-widgets-remove-wt-1'));
    expect(screen.queryByText('tenant.first')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('bundle-widgets-save'));
    await waitFor(() => {
      expect(servicesMock.updateWidgetsBundleWidgetTypes).toHaveBeenCalledWith(
        'b-1',
        ['wt-2'],
      );
    });
  });

  it('moves a member up and saves the new order', async () => {
    renderPage();
    await screen.findByText('tenant.second');

    fireEvent.click(screen.getByTestId('bundle-widgets-edit'));
    const secondRow = screen.getByText('tenant.second').closest('div');
    fireEvent.click(
      within(secondRow as HTMLElement).getByRole('button', {
        name: '上移',
      }),
    );

    fireEvent.click(screen.getByTestId('bundle-widgets-save'));
    await waitFor(() => {
      expect(servicesMock.updateWidgetsBundleWidgetTypes).toHaveBeenCalledWith(
        'b-1',
        ['wt-2', 'wt-1'],
      );
    });
  });

  it('renders the read-only face for a system bundle under a tenant session', async () => {
    servicesMock.getWidgetsBundleById.mockResolvedValue({
      ...BUNDLE,
      tenantId: SYSTEM_TENANT,
    });
    renderPage();

    expect(await screen.findByText('卡片包')).toBeInTheDocument();
    expect(
      screen.getByText('该部件包为系统资源——当前会话只读。'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('bundle-widgets-edit')).not.toBeInTheDocument();
  });
});
