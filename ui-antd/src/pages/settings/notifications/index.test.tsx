/**
 * Notifications settings page test (M14 wave-3, R25): the SA variant
 * renders the SMS-provider + Slack/mobile cards, the TENANT variant only
 * the Slack card; the notification save runs the cleanup chain ONCE (an
 * empty token deletes the method, a filled one gets the discriminator).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';
import { NotificationDeliveryMethod } from '@/types/tb/notification';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhSettings },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
const umiMock = vi.hoisted(() => ({
  history: historyMock,
  useModel: vi.fn(),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

vi.mock('@umijs/max', () => umiMock);

const adminMock = vi.hoisted(() => ({
  getAdminSettings: vi.fn(),
  saveAdminSettings: vi.fn(),
}));
vi.mock('@/services/tb/admin', () => adminMock);

const notificationMock = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  saveNotificationSettings: vi.fn(),
  getAvailableDeliveryMethods: vi.fn(),
}));
vi.mock('@/services/tb/notification', () => notificationMock);

import NotificationsSettingsPage from './index';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <NotificationsSettingsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('notifications settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    umiMock.useModel.mockReturnValue({
      initialState: { currentUser: { authority: 'SYS_ADMIN' } },
    });
    adminMock.getAdminSettings.mockRejectedValue(
      Object.assign(new Error('Not found'), { status: 404 }),
    );
    adminMock.saveAdminSettings.mockResolvedValue({
      id: 'sms-id',
      key: 'sms',
      jsonValue: {},
    });
    notificationMock.getNotificationSettings.mockResolvedValue({
      deliveryMethodsConfigs: {},
    });
    notificationMock.saveNotificationSettings.mockImplementation(
      async (payload) => payload,
    );
  });

  it('renders the SMS-provider and Slack cards for SYS_ADMIN', async () => {
    renderPage();
    expect(await screen.findByText('短信服务商设置')).toBeDefined();
    expect(await screen.findByText('Slack 设置')).toBeDefined();
    expect(await screen.findByText('发送测试短信')).toBeDefined();
    expect(await screen.findByText('移动应用设置')).toBeDefined();
  });

  it('renders only the Slack card for TENANT_ADMIN', async () => {
    umiMock.useModel.mockReturnValue({
      initialState: { currentUser: { authority: 'TENANT_ADMIN' } },
    });
    renderPage();
    expect(await screen.findByText('Slack 设置')).toBeDefined();
    expect(screen.queryByText('短信服务商设置')).toBeNull();
    expect(screen.queryByText('移动应用设置')).toBeNull();
  });

  it('cleans the delivery-method map once on save (empty token deletes the method)', async () => {
    umiMock.useModel.mockReturnValue({
      initialState: { currentUser: { authority: 'TENANT_ADMIN' } },
    });
    renderPage();
    // The Slack token input appears (empty on the tenant store).
    const token = (await screen.findByLabelText(
      'Slack API 令牌',
    )) as HTMLInputElement;
    fireEvent.change(token, { target: { value: 'xoxb-ta-token' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => {
      expect(notificationMock.saveNotificationSettings).toHaveBeenCalledTimes(
        1,
      );
    });
    expect(notificationMock.saveNotificationSettings.mock.calls[0][0]).toEqual({
      deliveryMethodsConfigs: {
        SLACK: {
          method: NotificationDeliveryMethod.SLACK,
          botToken: 'xoxb-ta-token',
        },
      },
    });
  });

  it('falls back to a blank sms form when the sms bucket 404s (SA)', async () => {
    renderPage();
    await screen.findByText('短信服务商设置');
    await waitFor(() => {
      expect(adminMock.getAdminSettings).toHaveBeenCalledWith('sms');
    });
    // The save button stays disabled without a provider type selected.
    const saveButtons = screen.getAllByRole('button', { name: /保\s*存/ });
    expect(saveButtons[0]).toBeDisabled();
  });
});
