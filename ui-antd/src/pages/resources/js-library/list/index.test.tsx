/**
 * JS library page tests: JS_MODULE-pinned server params, subType filter
 * plumbing, the MODULE create flow (.js file-name derivation) and the
 * referenced-delete flow. Services are mocked at the module boundary; the
 * CodeMirror wrapper is swapped for a textarea so typing content is
 * testable.
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
import zhJsLibrary from '@/locales/zh-CN/resources/js-library';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhJsLibrary },
});

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

vi.mock('@/components/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange?: (value: string) => void;
  }) => (
    <textarea
      data-testid="code-editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

import { EntityType } from '@/types/tb';
import { ResourceSubType } from '@/types/tb/resource';

import JsLibraryListPage from './index';

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
  jsModuleFileName: (title: string) => `${title}.js`,
  // Mirrors the real builder (service tests pin it against TbResource).
  jsModuleSaveRequest: (title: string, data: string) => ({
    title,
    resourceType: 'JS_MODULE',
    resourceSubType: 'MODULE',
    fileName: `${title}.js`,
    data,
    descriptor: { mediaType: 'application/javascript' },
  }),
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

const TENANT_ID = { entityType: EntityType.TENANT, id: 'tenant-1' };

function script(
  id: string,
  title: string,
  subType: ResourceSubType = ResourceSubType.EXTENSION,
  extra: Record<string, unknown> = {},
) {
  return {
    id: { entityType: EntityType.TB_RESOURCE, id },
    createdTime: 1_700_000_000_000,
    tenantId: TENANT_ID,
    title,
    resourceType: 'JS_MODULE',
    resourceSubType: subType,
    fileName: `${title}.js`,
    ...extra,
  };
}

const PAGE = {
  data: [
    script('js-1', 'extension-a'),
    script('js-2', 'module-b', ResourceSubType.MODULE),
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
          <JsLibraryListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('JS library page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/resources/js-library');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getResources.mockResolvedValue(PAGE);
    servicesMock.deleteResource.mockResolvedValue({ success: true });
    servicesMock.uploadResource.mockResolvedValue({});
    servicesMock.updateResourceInfo.mockResolvedValue({});
    servicesMock.getResourceById.mockResolvedValue({
      ...PAGE.data[1],
      data: 'ZXhwb3J0IGNvbnN0IHggPSAxOw==',
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/resources/js-library');
  });

  it('queries JS_MODULE resources with the default sort and renders rows', async () => {
    renderPage();

    expect(await screen.findByText('extension-a')).toBeInTheDocument();
    expect(screen.getByText('module-b')).toBeInTheDocument();
    expect(screen.getByText('脚本类型')).toBeInTheDocument();
    expect(servicesMock.getResources).toHaveBeenCalledWith(
      {
        pageSize: 10,
        page: 0,
        textSearch: undefined,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      },
      { resourceType: 'JS_MODULE', resourceSubType: undefined },
    );
  });

  it('moves the subType filter through the URL into the server query', async () => {
    renderPage();
    await screen.findByText('extension-a');

    fireEvent.mouseDown(document.querySelector('.ant-select') as HTMLElement);
    fireEvent.click(
      await screen.findByText('模块', {
        selector: '.ant-select-item-option-content',
      }),
    );

    await waitFor(() => {
      expect(servicesMock.getResources).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0 }),
        { resourceType: 'JS_MODULE', resourceSubType: 'MODULE' },
      );
    });
    expect(window.location.search).toContain('resourceSubType=MODULE');
  });

  // V8-1: MODULE saves ride the JSON channel (POST /api/resource) — the
  // multipart upload endpoint answered 400 "Resource data should be
  // specified" (walkthrough 2026-09-05, step 8).
  it('creates a MODULE over the JSON channel with base64 content', async () => {
    renderPage();
    await screen.findByText('extension-a');

    // The toolbar button's accessible name prefixes the icon aria-label.
    fireEvent.click(screen.getByRole('button', { name: /新建脚本/ }));

    // Scope to the modal: the toolbar subType filter is also a Select.
    const modal = document.querySelector('.ant-modal') as HTMLElement;
    const titleInput = within(modal).getByLabelText('标题');
    fireEvent.change(titleInput, { target: { value: 'myLib' } });

    fireEvent.mouseDown(modal.querySelector('.ant-select') as HTMLElement);
    fireEvent.click(
      await screen.findByText('模块', {
        selector: '.ant-select-item-option-content',
      }),
    );

    fireEvent.change(screen.getByTestId('code-editor'), {
      target: { value: 'export const x = 1;' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: '保 存' }));

    await waitFor(() => {
      expect(servicesMock.saveResource).toHaveBeenCalledTimes(1);
    });
    expect(servicesMock.uploadResource).not.toHaveBeenCalled();
    const request = servicesMock.saveResource.mock.calls[0][0];
    expect(request.id).toBeUndefined();
    expect(request.title).toBe('myLib');
    expect(request.fileName).toBe('myLib.js');
    expect(request.resourceType).toBe('JS_MODULE');
    expect(request.resourceSubType).toBe('MODULE');
    expect(request.data).toBe('ZXhwb3J0IGNvbnN0IHggPSAxOw==');
  });

  it('saves MODULE edits over the JSON channel with the editor content', async () => {
    renderPage();
    await screen.findByText('module-b');

    // Open the module-b row's more menu and pick 编辑脚本.
    const row = screen
      .getByText('module-b')
      .closest('tr') as HTMLElement;
    fireEvent.click(
      row.querySelector('.ant-dropdown-trigger') as HTMLElement,
    );
    fireEvent.click(await screen.findByText('编辑脚本'));

    const modal = document.querySelector('.ant-modal') as HTMLElement;
    await waitFor(() => {
      expect(
        (screen.getByTestId('code-editor') as HTMLTextAreaElement).value,
      ).toBe('export const x = 1;');
    });
    fireEvent.change(screen.getByTestId('code-editor'), {
      target: { value: 'export const x = 2;' },
    });
    // Regex: the ok button keeps the jsdom-stuck loading icon span
    // (aria-label="loading") in its accessible name after editorLoading.
    fireEvent.click(
      within(modal).getByRole('button', { name: /保 存/ }),
    );

    await waitFor(() => {
      expect(servicesMock.saveResource).toHaveBeenCalledTimes(1);
    });
    expect(servicesMock.updateResourceInfo).not.toHaveBeenCalled();
    expect(servicesMock.updateResourceData).not.toHaveBeenCalled();
    const request = servicesMock.saveResource.mock.calls[0][0];
    expect(request.id).toEqual({ entityType: 'TB_RESOURCE', id: 'js-2' });
    expect(request.data).toBe('ZXhwb3J0IGNvbnN0IHggPSAyOw==');
  });

  it('runs the referenced-delete flow: confirm, in-use modal, force delete', async () => {
    servicesMock.deleteResource.mockImplementation((_id: string, force) => {
      if (!force) {
        return Promise.reject(
          new servicesMock.ResourceReferencedError({
            RULE_CHAIN: [
              { id: { entityType: 'RULE_CHAIN', id: 'rc-1' }, name: 'Root' },
            ],
          }),
        );
      }
      return Promise.resolve({ success: true });
    });
    renderPage();
    await screen.findByText('extension-a');

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

    await waitFor(() => {
      expect(servicesMock.deleteResource).toHaveBeenCalledWith('js-1', false);
    });
    expect(await screen.findByText('脚本正被引用')).toBeInTheDocument();
    expect(screen.getByText('Root')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '仍要删除' }));
    await waitFor(() => {
      expect(servicesMock.deleteResource).toHaveBeenCalledWith('js-1', true);
    });
  });

  it('keeps system rows read-only for tenant admins', async () => {
    const withSystem = {
      ...PAGE,
      data: [
        script('js-1', 'mine'),
        script('js-sys', 'platform', ResourceSubType.EXTENSION, {
          tenantId: {
            entityType: EntityType.TENANT,
            id: '13814000-1dd2-11b2-8080-808080808080',
          },
        }),
      ],
    };
    servicesMock.getResources.mockResolvedValue(withSystem);
    renderPage();
    await screen.findByText('mine');

    await waitFor(() => {
      const triggers = document.querySelectorAll('.ant-dropdown-trigger');
      expect(triggers).toHaveLength(1);
    });
    expect(screen.getByText('platform')).toBeInTheDocument();
  });
});
