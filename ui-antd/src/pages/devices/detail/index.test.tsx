/**
 * Device detail page tests: shell wiring (header fields from DeviceInfo),
 * URL tab restore, the details-tab edit/save flow, validation and the dirty
 * guard. Services are mocked at the module boundary (Wave1 rule: no HTTP in
 * pages).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhDetail from '@/locales/zh-CN/devices/detail';
import { EntityType } from '@/types/tb';

const panelsMock = vi.hoisted(() => ({
  CalculatedFieldsTable: vi.fn(({ entityId, mode }) => (
    <div data-testid="cf-table">{`${mode}:${entityId.id}`}</div>
  )),
}));

vi.mock('@/pages/calculated-fields/components/calculated-fields-table', () => ({
  default: panelsMock.CalculatedFieldsTable,
}));

import DeviceDetailPage from './index';

const servicesMock = vi.hoisted(() => ({
  getDeviceInfoById: vi.fn(),
  getDeviceProfiles: vi.fn(),
  saveDevice: vi.fn(),
}));

const profileServiceMock = vi.hoisted(() => ({
  getOtaPackagesByDeviceProfile: vi.fn(),
}));

const eventsMock = vi.hoisted(() => ({
  getEvents: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn(),
}));

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhDetail },
});

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: () => ({ id: 'dev-1' }),
  useSelectedRoutes: () => [
    { route: {}, pathname: '/' },
    { route: { name: 'devices.detail' }, pathname: '/devices/dev-1' },
  ],
  useAppData: () => ({
    clientRoutes: [{ name: 'devices', path: '/devices' }],
  }),
}));

vi.mock('@/services/tb/events', () => eventsMock);

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
vi.mock('@/services/tb/device', () => servicesMock);
vi.mock('@/services/tb/device-profile', () => profileServiceMock);
vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));

const DEVICE = {
  id: { entityType: EntityType.DEVICE, id: 'dev-1' },
  createdTime: 1_700_000_000_000,
  tenantId: { entityType: EntityType.TENANT, id: 't-1' },
  name: 'm1-test-detail-alpha',
  label: '温室一号',
  deviceProfileId: { entityType: EntityType.DEVICE_PROFILE, id: 'p-1' },
  deviceProfileName: '默认配置',
  active: true,
  customerTitle: '',
  customerIsPublic: false,
  additionalInfo: { gateway: false, description: '初始描述' },
};

const PROFILES_PAGE = {
  data: [{ id: { id: 'p-1' }, name: '默认配置' }],
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
          <DeviceDetailPage />
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

describe('device detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/devices/dev-1');
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });
    servicesMock.getDeviceInfoById.mockResolvedValue(DEVICE);
    servicesMock.getDeviceProfiles.mockResolvedValue(PROFILES_PAGE);
    servicesMock.saveDevice.mockResolvedValue(DEVICE);
    profileServiceMock.getOtaPackagesByDeviceProfile.mockResolvedValue({
      data: [],
      totalElements: 0,
    });
    eventsMock.getEvents.mockResolvedValue({ data: [], totalElements: 0 });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/devices/dev-1');
  });

  it('renders the header from DeviceInfo and defaults to the details tab', async () => {
    renderPage();
    expect(
      (await screen.findAllByText('m1-test-detail-alpha')).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('温室一号').length).toBeGreaterThan(0);
    expect(screen.getByText('在线')).toBeTruthy();
    expect(servicesMock.getDeviceInfoById).toHaveBeenCalledWith('dev-1');
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain(
      '详情',
    );
  });

  it('edits and saves device fields via saveDevice', async () => {
    renderPage();
    await screen.findAllByText('m1-test-detail-alpha');

    fireEvent.click(editButton());
    const nameInput = await screen.findByDisplayValue('m1-test-detail-alpha');
    fireEvent.change(nameInput, {
      target: { value: 'm1-test-detail-renamed' },
    });

    await waitFor(() => expect(saveButton()).not.toBeDisabled());
    fireEvent.click(saveButton());

    await waitFor(() => expect(servicesMock.saveDevice).toHaveBeenCalled());
    const payload = servicesMock.saveDevice.mock.calls[0][0];
    expect(payload.name).toBe('m1-test-detail-renamed');
    expect(payload.deviceProfileId).toEqual({
      entityType: EntityType.DEVICE_PROFILE,
      id: 'p-1',
    });
    expect(payload.additionalInfo.gateway).toBe(false);
    expect(payload.additionalInfo.description).toBe('初始描述');
  });

  it('keeps the save button disabled until the form is dirty', async () => {
    renderPage();
    await screen.findAllByText('m1-test-detail-alpha');
    fireEvent.click(editButton());
    const save = await screen.findByRole('button', { name: '保 存' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByDisplayValue('m1-test-detail-alpha'), {
      target: { value: '另一个名字' },
    });
    await waitFor(() => expect(save).not.toBeDisabled());
  });

  it('blocks saving when the name is empty', async () => {
    renderPage();
    await screen.findAllByText('m1-test-detail-alpha');
    fireEvent.click(editButton());
    fireEvent.change(await screen.findByDisplayValue('m1-test-detail-alpha'), {
      target: { value: '' },
    });
    const save = await screen.findByRole('button', { name: '保 存' });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);
    expect(await screen.findByText('名称为必填项。')).toBeTruthy();
    expect(servicesMock.saveDevice).not.toHaveBeenCalled();
  });

  it('hides the edit entry for customer users', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['CUSTOMER_USER'],
    });
    renderPage();
    await screen.findAllByText('m1-test-detail-alpha');
    expect(screen.queryByRole('button', { name: /编辑/ })).toBeNull();
  });

  // M13 R04 parameterization regression: the events tab feeds the shared
  // panel the polymorphic entityId (not a bare deviceId).
  it('loads events with the polymorphic entityId when the tab opens', async () => {
    renderPage();
    await screen.findAllByText('m1-test-detail-alpha');
    fireEvent.click(screen.getByRole('tab', { name: '事件' }));
    await waitFor(() => {
      expect(eventsMock.getEvents).toHaveBeenCalledWith(
        { entityType: EntityType.DEVICE, id: 'dev-1' },
        't-1',
        'ERROR',
        expect.objectContaining({ page: 0 }),
      );
    });
  });

  it('confirms before discarding unsaved edits', async () => {
    renderPage();
    await screen.findAllByText('m1-test-detail-alpha');
    fireEvent.click(editButton());
    const nameInput = await screen.findByDisplayValue('m1-test-detail-alpha');
    fireEvent.change(nameInput, {
      target: { value: 'm1-test-detail-dirty' },
    });
    // The dirty flag propagates through Form.useWatch + an effect: wait for
    // the save button to unlock (its disabled state mirrors `dirty`).
    const save = await screen.findByRole('button', { name: '保 存' });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /取消编辑/ }));
    expect((await screen.findAllByText('未保存的修改')).length).toBeGreaterThan(
      0,
    );
  });

  it('confirms before leaving via the back button with unsaved edits', async () => {
    renderPage();
    await screen.findAllByText('m1-test-detail-alpha');
    fireEvent.click(editButton());
    const nameInput = await screen.findByDisplayValue('m1-test-detail-alpha');
    fireEvent.change(nameInput, {
      target: { value: 'm1-test-detail-dirty' },
    });
    const save = await screen.findByRole('button', { name: '保 存' });
    await waitFor(() => expect(save).not.toBeDisabled());
    // The back arrow must be guarded the same way as tab switches (guard
    // lives in the shared PageContainer wrapper, ADR 0008 — generic copy).
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect((await screen.findAllByText('未保存的更改')).length).toBeGreaterThan(
      0,
    );
    expect(historyMock.push).not.toHaveBeenCalled();
  });

  // M14 wave-5 R17: the calculated-fields tab mounts the SHARED table
  // (entity mode) — the v1 CalculatedFieldsPanel is retired.
  it('mounts the shared calculated-fields table in entity mode', async () => {
    renderPage();
    await screen.findAllByText('m1-test-detail-alpha');
    fireEvent.click(screen.getByRole('tab', { name: '计算字段' }));
    await waitFor(() => {
      expect(screen.getByTestId('cf-table')).toBeTruthy();
    });
    expect(screen.getByTestId('cf-table').textContent).toBe('entity:dev-1');
  });
});
