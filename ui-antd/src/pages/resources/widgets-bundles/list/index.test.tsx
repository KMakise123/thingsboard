/**
 * Widgets bundles list page smoke tests (M11 wave 1B): row rendering,
 * create flow (title required → POST → navigate to the manager), delete
 * confirmation, export-dialog wiring with the include-widgets choice and
 * the tenant read-only gating. Services are mocked at the module boundary.
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
import zhBundles from '@/locales/zh-CN/resources/widgets-bundles';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhBundles },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getWidgetsBundles: vi.fn(),
  saveWidgetsBundle: vi.fn(),
  deleteWidgetsBundle: vi.fn(),
}));

const importExportMock = vi.hoisted(() => ({
  exportWidgetsBundleToFile: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/widgets-bundle', () => servicesMock);
vi.mock('./import-export', () => importExportMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));

import WidgetsBundlesListPage from './index';

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

const SYSTEM_TENANT = {
  entityType: 'TENANT',
  id: '13814000-1dd2-11b2-8080-808080808080',
};
const OWN_TENANT = { entityType: 'TENANT', id: 'tenant-1' };

const PAGE = {
  data: [
    {
      id: { entityType: 'WIDGETS_BUNDLE', id: 'b-1' },
      createdTime: 1_700_000_000_000,
      title: '卡片包',
      tenantId: OWN_TENANT,
      description: '',
    },
    {
      id: { entityType: 'WIDGETS_BUNDLE', id: 'b-2' },
      createdTime: 1_700_000_000_001,
      title: '系统包',
      tenantId: SYSTEM_TENANT,
      scada: true,
    },
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
          <WidgetsBundlesListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('widgets bundles list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/resources/widgets-bundles');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getWidgetsBundles.mockResolvedValue(PAGE);
    servicesMock.saveWidgetsBundle.mockImplementation(async (bundle) => ({
      id: { entityType: 'WIDGETS_BUNDLE', id: 'b-new' },
      title: bundle.title,
    }));
    servicesMock.deleteWidgetsBundle.mockResolvedValue(undefined);
    importExportMock.exportWidgetsBundleToFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/resources/widgets-bundles');
  });

  it('renders the rows with the ui-ngx default sort (title ASC)', async () => {
    renderPage();

    expect(await screen.findByText('卡片包')).toBeInTheDocument();
    expect(screen.getByText('系统包')).toBeInTheDocument();
    expect(servicesMock.getWidgetsBundles).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 10,
        page: 0,
        sortOrder: { property: 'title', direction: 'ASC' },
      }),
    );
  });

  it('creates a bundle through the dialog and opens its manager face', async () => {
    renderPage();
    await screen.findByText('卡片包');

    fireEvent.click(screen.getByTestId('widgets-bundles-create'));
    const dialog = document.querySelector(
      '[data-testid="widgets-bundle-edit-dialog"]',
    ) as HTMLElement;
    expect(dialog).toBeTruthy();

    // save with an empty title is blocked by the required rule
    fireEvent.click(within(dialog).getByRole('button', { name: '保 存' }));
    await waitFor(() => {
      expect(screen.getByText('标题为必填项。')).toBeInTheDocument();
    });
    expect(servicesMock.saveWidgetsBundle).not.toHaveBeenCalled();

    fireEvent.change(dialog.querySelector('#title') as HTMLElement, {
      target: { value: '新包' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '保 存' }));

    await waitFor(() => {
      expect(servicesMock.saveWidgetsBundle).toHaveBeenCalledWith(
        expect.objectContaining({ title: '新包' }),
      );
    });
    // upstream entityAdded parity: a fresh bundle opens its manager face
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith(
        '/resources/widgets-bundles/b-new',
      );
    });
  });

  // V1-2 (walkthrough 2026-09-05): the image field was an interim plain
  // URL input — it now mounts the wave-2C gallery picker control.
  it('mounts the gallery image input in the bundle edit dialog', async () => {
    renderPage();
    await screen.findByText('卡片包');

    fireEvent.click(screen.getByTestId('widgets-bundles-create'));
    const dialog = document.querySelector(
      '[data-testid="widgets-bundle-edit-dialog"]',
    ) as HTMLElement;

    expect(
      await within(dialog).findByTestId('gallery-image-input'),
    ).toBeTruthy();
    expect(
      within(dialog).getByTestId('gallery-image-input-browse'),
    ).toBeTruthy();
    // the interim plain-URL hint is gone with the old input
    expect(
      within(dialog).queryByText(/临时的纯 URL|gallery picker lands/),
    ).toBeNull();
  });

  it('confirms before deleting a tenant-owned bundle', async () => {
    renderPage();
    await screen.findByText('卡片包');

    const ownRow = screen.getByText('卡片包').closest('tr');
    fireEvent.click(
      ownRow
        ?.querySelector('.anticon-delete')
        ?.closest('button') as HTMLElement,
    );
    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => {
      expect(servicesMock.deleteWidgetsBundle).toHaveBeenCalledWith('b-1');
    });
  });

  it('exports through the dialog with the include-widgets choice', async () => {
    renderPage();
    await screen.findByText('卡片包');

    const ownRow = screen.getByText('卡片包').closest('tr');
    fireEvent.click(
      ownRow
        ?.querySelector('.anticon-download')
        ?.closest('button') as HTMLElement,
    );
    const dialog = (await screen.findByTestId(
      'widgets-bundle-export-dialog',
    )) as HTMLElement;

    fireEvent.click(within(dialog).getByRole('button', { name: /导\s*出/ }));
    await waitFor(() => {
      expect(importExportMock.exportWidgetsBundleToFile).toHaveBeenCalledWith(
        'b-1',
        '卡片包',
        true,
      );
    });

    // uncheck include-widgets → fqn-reference channel
    fireEvent.click(
      ownRow
        ?.querySelector('.anticon-download')
        ?.closest('button') as HTMLElement,
    );
    const reopened = (await screen.findByTestId(
      'widgets-bundle-export-dialog',
    )) as HTMLElement;
    fireEvent.click(
      within(reopened).getByTestId(
        'widgets-bundle-export-include-widgets',
      ) as HTMLElement,
    );
    fireEvent.click(within(reopened).getByRole('button', { name: /导\s*出/ }));
    await waitFor(() => {
      expect(
        importExportMock.exportWidgetsBundleToFile,
      ).toHaveBeenLastCalledWith('b-1', '卡片包', false);
    });
  });

  it('gates tenant edit/delete actions on the system bundle', async () => {
    renderPage();
    await screen.findByText('系统包');

    const systemRow = screen.getByText('系统包').closest('tr');
    expect(systemRow?.querySelector('.anticon-edit')).toBeNull();
    expect(systemRow?.querySelector('.anticon-delete')).toBeNull();
    // export stays available (§1: visible + downloadable)
    expect(systemRow?.querySelector('.anticon-download')).not.toBeNull();
  });
});
