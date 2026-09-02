/**
 * Entity-view detail page tests: header form wiring (fields from
 * EntityViewInfo), the edit/save flow with the payload contract, validation,
 * the six-tab registry (default attributes, TA-only clamping for CU) and the
 * read-only surface. Services are mocked at the module boundary.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhEntityViews from '@/locales/zh-CN/entityViews';
import { EntityType } from '@/types/tb';

import EntityViewDetailPage from './index';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhEntityViews },
});

const servicesMock = vi.hoisted(() => ({
  getEntityViewInfoById: vi.fn(),
  saveEntityView: vi.fn(),
  getEntityViewTypes: vi.fn(),
}));

const attributesMock = vi.hoisted(() => ({
  getAttributes: vi.fn(),
  getLatestTelemetry: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({ id: 'ev-1' }),
  useSelectedRoutes: () => [
    { route: {}, pathname: '/' },
    { route: { name: 'entityViews.detail' }, pathname: '/entityViews/ev-1' },
  ],
  useAppData: () => ({
    clientRoutes: [{ name: 'entityViews', path: '/entityViews' }],
  }),
}));

vi.mock('@/services/tb/entity-view', () => servicesMock);
vi.mock('@/services/tb/attributes', () => attributesMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));
vi.mock('@/core/ws/hooks', () => ({
  useAttributeSubscription: () => ({ data: [], status: 'connected' }),
  useLatestTelemetrySubscription: () => ({ data: [], status: 'connected' }),
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

const ENTITY_VIEW = {
  id: { entityType: EntityType.ENTITY_VIEW, id: 'ev-1' },
  createdTime: 1_700_000_000_000,
  tenantId: { entityType: EntityType.TENANT, id: 't-1' },
  customerId: {
    entityType: EntityType.CUSTOMER,
    id: '13814000-1dd2-11b2-8080-808080808080',
  },
  entityId: { entityType: EntityType.DEVICE, id: 'dev-9' },
  name: 'Room view',
  type: 'Thermometer',
  keys: {
    timeseries: ['temperature'],
    attributes: { cs: ['alive'], sh: [], ss: ['firmware'] },
  },
  startTimeMs: 1_700_000_000_000,
  endTimeMs: 1_700_086_400_000,
  additionalInfo: { description: '初始描述' },
  customerTitle: '',
  customerIsPublic: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <EntityViewDetailPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('entity-view detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/entityViews/ev-1');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getEntityViewInfoById.mockResolvedValue(ENTITY_VIEW);
    servicesMock.saveEntityView.mockResolvedValue(ENTITY_VIEW);
    servicesMock.getEntityViewTypes.mockResolvedValue([
      { type: 'Thermometer' },
    ]);
    attributesMock.getAttributes.mockResolvedValue([]);
    attributesMock.getLatestTelemetry.mockResolvedValue({});
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/entityViews/ev-1');
  });

  it('renders the header from EntityViewInfo and defaults to the attributes tab', async () => {
    renderPage();
    expect((await screen.findAllByText('Room view')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Thermometer').length).toBeGreaterThan(0);
    expect(servicesMock.getEntityViewInfoById).toHaveBeenCalledWith('ev-1');
    // Six-tab registry: default tab is attributes (no details tab here).
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '属性',
    );
    // The TA-only tabs are visible for TENANT_ADMIN.
    expect(screen.getByRole('tab', { name: /审计日志/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /版本控制/ })).toBeTruthy();
    // ...and the rest of the six.
    expect(screen.getByRole('tab', { name: /最新遥测/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /告警/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /关联/ })).toBeTruthy();
  });

  it('edits and saves via the header form with the full payload', async () => {
    renderPage();
    await screen.findAllByText('Room view');

    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const nameInput = await screen.findByDisplayValue('Room view');
    fireEvent.change(nameInput, { target: { value: 'Renamed view' } });

    const save = await screen.findByRole('button', { name: '保 存' });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);

    await waitFor(() => expect(servicesMock.saveEntityView).toHaveBeenCalled());
    const payload = servicesMock.saveEntityView.mock.calls[0][0];
    expect(payload.id).toEqual(ENTITY_VIEW.id);
    expect(payload.name).toBe('Renamed view');
    expect(payload.type).toBe('Thermometer');
    expect(payload.entityId).toEqual({
      entityType: EntityType.DEVICE,
      id: 'dev-9',
    });
    expect(payload.keys).toEqual({
      timeseries: ['temperature'],
      attributes: { cs: ['alive'], sh: [], ss: ['firmware'] },
    });
    expect(payload.startTimeMs).toBe(1_700_000_000_000);
    expect(payload.additionalInfo.description).toBe('初始描述');
  });

  it('keeps the save button disabled until the form is dirty and blocks an empty name', async () => {
    renderPage();
    await screen.findAllByText('Room view');
    fireEvent.click(screen.getByRole('button', { name: /编辑/ }));
    const save = await screen.findByRole('button', { name: '保 存' });
    expect(save).toBeDisabled();

    const nameInput = await screen.findByDisplayValue('Room view');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(save);
    // Required rule keeps the payload untouched.
    expect(await screen.findByText('名称为必填项。')).toBeTruthy();
    expect(servicesMock.saveEntityView).not.toHaveBeenCalled();
  });

  it('hides the edit entry for a customer user', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
    });
    renderPage();
    await screen.findAllByText('Room view');
    expect(screen.queryByRole('button', { name: /编辑/ })).toBeNull();
  });

  it('clamps a hand-typed TA-only ?tab= to attributes for a customer user', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
    });
    window.history.replaceState(
      {},
      '',
      '/entityViews/ev-1?tab=version-control',
    );
    renderPage();
    await screen.findAllByText('Room view');
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '属性',
    );
    // The TA-only tabs are not even registered for CU.
    expect(screen.queryByRole('tab', { name: /版本控制/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /审计日志/ })).toBeNull();
    window.history.replaceState({}, '', '/entityViews/ev-1');
  });

  it('restores a bookmarked tab for TENANT_ADMIN', async () => {
    window.history.replaceState({}, '', '/entityViews/ev-1?tab=relations');
    renderPage();
    await screen.findAllByText('Room view');
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '关联',
    );
    window.history.replaceState({}, '', '/entityViews/ev-1');
  });
});
