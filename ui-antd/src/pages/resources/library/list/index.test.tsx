/**
 * Resources library page tests: server-parameter plumbing (page/type
 * filter via the URL state), the referenced-delete flow (force=false →
 * in-use modal → force=true) and TENANT read-only on system rows.
 * Services are mocked at the module boundary.
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
import zhLibrary from '@/locales/zh-CN/resources/library';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhLibrary },
});

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

import { EntityType } from '@/types/tb';
import { ResourceType } from '@/types/tb/resource';

import LibraryListPage from './index';

const servicesMock = vi.hoisted(() => ({
  getResources: vi.fn(),
  getTenantResources: vi.fn(),
  getResourceInfoById: vi.fn(),
  getResourceById: vi.fn(),
  getResourceInfo: vi.fn(),
  downloadResource: vi.fn(),
  saveResource: vi.fn(),
  uploadResource: vi.fn(),
  uploadResources: vi.fn(),
  updateResourceInfo: vi.fn(),
  updateResourceData: vi.fn(),
  deleteResource: vi.fn(),
  referencesFromBody: vi.fn(),
  RESOURCE_UPLOAD_BATCH_SIZE: 100,
  // Page branches on this class (instanceof) to open the in-use modal.
  ResourceReferencedError: class ResourceReferencedError extends Error {
    readonly references: unknown;
    constructor(references: unknown) {
      super('Resource is referenced by other entities');
      this.name = 'ResourceReferencedError';
      this.references = references;
    }
  },
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

vi.mock('@/services/tb/resource', () => servicesMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));
// vite-node cannot resolve antd's extensionless internal locale imports
// through pro-components' bundle — render through antd's Table (same
// workaround as the devices list tests).
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
    // Thin passthrough: the page header (ADR 0008) renders extra + children.
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

const NULL_TENANT = {
  entityType: EntityType.TENANT,
  id: '13814000-1dd2-11b2-8080-808080808080',
};

function resource(
  id: string,
  title: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: { entityType: EntityType.TB_RESOURCE, id },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
    title,
    resourceType: ResourceType.GENERAL,
    fileName: `${title}.xml`,
    ...extra,
  };
}

const PAGE = {
  data: [
    resource('res-1', 'model-a'),
    resource('res-2', 'keystore-b', {
      resourceType: ResourceType.JKS,
      fileName: 'keystore-b.jks',
    }),
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
          <LibraryListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

const DEFAULT_PAGE_LINK = {
  pageSize: 10,
  page: 0,
  textSearch: undefined,
  sortOrder: { property: 'createdTime', direction: 'DESC' },
};

describe('resources library page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/resources/library');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getResources.mockResolvedValue(PAGE);
    servicesMock.deleteResource.mockResolvedValue({ success: true });
    servicesMock.updateResourceInfo.mockResolvedValue({});
    servicesMock.uploadResources.mockResolvedValue([]);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/resources/library');
  });

  it('loads page 1 with the default sort and renders columns and rows', async () => {
    renderPage();

    expect(await screen.findByText('model-a')).toBeInTheDocument();
    expect(screen.getByText('keystore-b')).toBeInTheDocument();
    expect(screen.getByText('资源类型')).toBeInTheDocument();
    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.getByText('系统').closest('th')).not.toBeNull();
    expect(servicesMock.getResources).toHaveBeenCalledWith(DEFAULT_PAGE_LINK, {
      resourceType: undefined,
    });
  });

  it('moves the type filter through the URL into the server query', async () => {
    renderPage();
    await screen.findByText('model-a');

    const selector = document.querySelector('.ant-select') as HTMLElement;
    fireEvent.mouseDown(selector);
    fireEvent.click(
      await screen.findByText('JKS', {
        selector: '.ant-select-item-option-content',
      }),
    );

    await waitFor(() => {
      expect(servicesMock.getResources).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0 }),
        { resourceType: 'JKS' },
      );
    });
    expect(window.location.search).toContain('resourceType=JKS');
  });

  it('restores the type filter from the URL', async () => {
    window.history.replaceState(
      {},
      '',
      '/resources/library?resourceType=PKCS_12',
    );
    renderPage();

    await screen.findByText('model-a');
    expect(servicesMock.getResources).toHaveBeenCalledWith(
      expect.objectContaining(DEFAULT_PAGE_LINK),
      { resourceType: 'PKCS_12' },
    );
  });

  it('moves pagination into the URL and the 0-based server call', async () => {
    const manyPage = {
      ...PAGE,
      data: Array.from({ length: 10 }, (_, index) =>
        resource(`res-${index}`, `model-${index}`),
      ),
      totalElements: 25,
      totalPages: 3,
      hasNext: true,
    };
    servicesMock.getResources.mockResolvedValue(manyPage);
    renderPage();
    await screen.findByText('model-0');

    fireEvent.click(screen.getByTitle('2'));

    await waitFor(() => {
      expect(servicesMock.getResources).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 10 }),
        { resourceType: undefined },
      );
    });
    expect(window.location.search).toContain('page=2');
  });

  it('runs the referenced-delete flow: confirm, in-use modal, force delete', async () => {
    servicesMock.deleteResource.mockImplementation((_id: string, force) => {
      if (!force) {
        return Promise.reject(
          new servicesMock.ResourceReferencedError({
            WIDGET_TYPE: [
              {
                id: { entityType: 'WIDGET_TYPE', id: 'wt-1' },
                name: 'Thermometer',
              },
            ],
          }),
        );
      }
      return Promise.resolve({ success: true });
    });
    renderPage();
    await screen.findByText('model-a');

    // Row dropdown → delete → confirm dialog.
    fireEvent.click(
      document.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('删除'));

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(within(confirm).getByRole('button', { name: /删\s*除/ }));

    // First attempt runs with force=false and lands in the in-use modal.
    await waitFor(() => {
      expect(servicesMock.deleteResource).toHaveBeenCalledWith('res-1', false);
    });
    expect(await screen.findByText('资源正被引用')).toBeInTheDocument();
    expect(screen.getByText('Thermometer')).toBeInTheDocument();

    // Confirming the modal re-runs the delete with force=true.
    fireEvent.click(screen.getByRole('button', { name: '仍要删除' }));
    await waitFor(() => {
      expect(servicesMock.deleteResource).toHaveBeenCalledWith('res-1', true);
    });
  });

  it('keeps system rows read-only for tenant admins', async () => {
    const withSystem = {
      ...PAGE,
      data: [
        resource('res-1', 'mine'),
        resource('sys-1', 'platform-model', { tenantId: NULL_TENANT }),
      ],
    };
    servicesMock.getResources.mockResolvedValue(withSystem);
    renderPage();
    await screen.findByText('mine');

    await waitFor(() => {
      // Only the tenant-owned row exposes the action dropdown.
      const triggers = document.querySelectorAll('.ant-dropdown-trigger');
      expect(triggers).toHaveLength(1);
    });
    // The system row still renders its title and the System tag.
    expect(screen.getByText('platform-model')).toBeInTheDocument();
    expect(screen.getByText('系统', { selector: 'span' })).toBeInTheDocument();
  });
});
