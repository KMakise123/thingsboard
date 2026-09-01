/**
 * Asset detail page tests: header form wiring (fields from AssetInfo), the
 * attributes default tab, URL tab restore with CU fallback, edit/save flow,
 * validation, the unassign header action and the dirty guard. Services are
 * mocked at the module boundary (Wave1 rule: no HTTP in pages).
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
import zhAssets from '@/locales/zh-CN/assets';
import zhCommon from '@/locales/zh-CN/common';
import { EntityType } from '@/types/tb';

import AssetDetailPage from './index';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhAssets },
});

const assetServiceMock = vi.hoisted(() => ({
  getAssetInfoById: vi.fn(),
  getAssetProfiles: vi.fn(),
  saveAsset: vi.fn(),
  unassignAssetFromCustomer: vi.fn(),
}));

const attributesServiceMock = vi.hoisted(() => ({
  getAttributes: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({ id: 'ast-1' }),
  useSelectedRoutes: () => [
    { route: {}, pathname: '/' },
    { route: { name: 'assets.detail' }, pathname: '/assets/ast-1' },
  ],
  useAppData: () => ({
    clientRoutes: [{ name: 'assets', path: '/assets' }],
  }),
}));

// pro-components cannot resolve antd locale imports under vite-node (M1
// known issue) — stub PageContainer while keeping the wrapper's contract
// visible (title / tags / extra / content / guarded onBack).
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
vi.mock('@/services/tb/asset', () => assetServiceMock);
vi.mock('@/services/tb/attributes', () => attributesServiceMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));
vi.mock('@/core/ws/hooks', () => ({
  useAttributeSubscription: () => ({ data: [], status: 'connected' }),
  useLatestTelemetrySubscription: () => ({ data: [], status: 'connected' }),
}));

const ASSET = {
  id: { entityType: EntityType.ASSET, id: 'ast-1' },
  createdTime: 1_700_000_000_000,
  tenantId: { entityType: EntityType.TENANT, id: 't-1' },
  name: 'm2-test-asset-alpha',
  label: '一楼配电间',
  type: '默认资产配置',
  assetProfileId: { entityType: EntityType.ASSET_PROFILE, id: 'ap-1' },
  assetProfileName: '默认资产配置',
  customerTitle: '',
  customerIsPublic: false,
  customerId: {
    entityType: EntityType.CUSTOMER,
    id: '13814000-1dd2-11b2-8080-808080808080',
  },
  additionalInfo: { description: '初始描述' },
};

const PROFILES_PAGE = {
  data: [{ id: { id: 'ap-1' }, name: '默认资产配置' }],
  totalElements: 1,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <AssetDetailPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

function editButton(): HTMLElement {
  return screen.getByRole('button', { name: /编辑/ });
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: '保 存' });
}

describe('asset detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/assets/ast-1');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    assetServiceMock.getAssetInfoById.mockResolvedValue(ASSET);
    assetServiceMock.getAssetProfiles.mockResolvedValue(PROFILES_PAGE);
    assetServiceMock.saveAsset.mockResolvedValue(ASSET);
    assetServiceMock.unassignAssetFromCustomer.mockResolvedValue(undefined);
    attributesServiceMock.getAttributes.mockResolvedValue([]);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/assets/ast-1');
  });

  it('renders the header form from AssetInfo and defaults to the attributes tab', async () => {
    renderPage();
    expect(
      (await screen.findAllByText('m2-test-asset-alpha')).length,
    ).toBeGreaterThan(0);
    // Read-only view of the entity fields in the header area.
    expect(screen.getAllByText('默认资产配置').length).toBeGreaterThan(0);
    expect(screen.getByText('一楼配电间')).toBeInTheDocument();
    expect(screen.getByText('初始描述')).toBeInTheDocument();
    expect(assetServiceMock.getAssetInfoById).toHaveBeenCalledWith('ast-1');
    // 8 tabs, no details tab; attributes is the default selection.
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '属性',
    );
    expect(screen.queryByRole('tab', { name: '详情' })).toBeNull();
    expect(screen.getByRole('tab', { name: '告警' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '关联' })).toBeTruthy();
  });

  it('edits and saves asset fields via saveAsset', async () => {
    renderPage();
    await screen.findAllByText('m2-test-asset-alpha');

    fireEvent.click(editButton());
    const nameInput = await screen.findByDisplayValue('m2-test-asset-alpha');
    fireEvent.change(nameInput, { target: { value: 'm2-test-asset-renamed' } });

    await waitFor(() => expect(saveButton()).not.toBeDisabled());
    fireEvent.click(saveButton());

    await waitFor(() => expect(assetServiceMock.saveAsset).toHaveBeenCalled());
    const payload = assetServiceMock.saveAsset.mock.calls[0][0];
    expect(payload.name).toBe('m2-test-asset-renamed');
    expect(payload.assetProfileId).toEqual({
      entityType: EntityType.ASSET_PROFILE,
      id: 'ap-1',
    });
    expect(payload.label).toBe('一楼配电间');
    expect(payload.additionalInfo.description).toBe('初始描述');
  });

  it('keeps the save button disabled until the form is dirty', async () => {
    renderPage();
    await screen.findAllByText('m2-test-asset-alpha');
    fireEvent.click(editButton());
    const save = await screen.findByRole('button', { name: '保 存' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByDisplayValue('m2-test-asset-alpha'), {
      target: { value: '另一个名字' },
    });
    await waitFor(() => expect(save).not.toBeDisabled());
  });

  it('blocks saving when the name is empty', async () => {
    renderPage();
    await screen.findAllByText('m2-test-asset-alpha');
    fireEvent.click(editButton());
    fireEvent.change(await screen.findByDisplayValue('m2-test-asset-alpha'), {
      target: { value: '' },
    });
    const save = await screen.findByRole('button', { name: '保 存' });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);
    expect(await screen.findByText('名称为必填项。')).toBeTruthy();
    expect(assetServiceMock.saveAsset).not.toHaveBeenCalled();
  });

  it('shows no unassign action while the asset has no customer', async () => {
    renderPage();
    await screen.findAllByText('m2-test-asset-alpha');
    expect(screen.queryByRole('button', { name: /从客户取消分配/ })).toBeNull();
  });

  it('unassigns the asset from its customer after confirmation', async () => {
    const assigned = {
      ...ASSET,
      customerTitle: '工厂 A',
      customerId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
    };
    assetServiceMock.getAssetInfoById.mockResolvedValue(assigned);
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: /从客户取消分配/ }),
    );

    const confirm = await waitFor(() => {
      const node = document.querySelector('.ant-modal-confirm');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    fireEvent.click(
      within(confirm).getByRole('button', { name: /从客户取消分配/ }),
    );
    await waitFor(() => {
      expect(assetServiceMock.unassignAssetFromCustomer).toHaveBeenCalledWith(
        'ast-1',
      );
    });
  });

  it('hides edit entries and TA-only tabs for customer users, even via ?tab=', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
    });
    window.history.replaceState({}, '', '/assets/ast-1?tab=calculated-fields');
    renderPage();

    await screen.findAllByText('m2-test-asset-alpha');
    expect(screen.queryByRole('button', { name: /编辑/ })).toBeNull();
    // The hand-typed TA-only tab falls back to the default attributes tab.
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '属性',
    );
    expect(screen.queryByRole('tab', { name: '计算字段' })).toBeNull();
    expect(screen.queryByRole('tab', { name: '审计日志' })).toBeNull();
    expect(screen.queryByRole('tab', { name: '版本控制' })).toBeNull();
    window.history.replaceState({}, '', '/assets/ast-1');
  });

  it('confirms before leaving via the back button with unsaved edits', async () => {
    renderPage();
    await screen.findAllByText('m2-test-asset-alpha');
    fireEvent.click(editButton());
    const nameInput = await screen.findByDisplayValue('m2-test-asset-alpha');
    fireEvent.change(nameInput, { target: { value: 'm2-test-asset-dirty' } });
    const save = await screen.findByRole('button', { name: '保 存' });
    await waitFor(() => expect(save).not.toBeDisabled());
    // The back arrow must be guarded the same way as tab switches (guard
    // lives in the shared PageContainer wrapper, ADR 0008 — generic copy;
    // its copy comes from pages.common, not the domain file).
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect((await screen.findAllByText('未保存的更改')).length).toBeGreaterThan(
      0,
    );
    expect(historyMock.push).not.toHaveBeenCalled();
  });
});
