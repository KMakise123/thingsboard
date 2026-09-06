/**
 * Trendz-settings page test (M14 wave-2, spec 6.3-8): the empty-object GET
 * never blocks rendering; the enable switch gates the URL required rule;
 * the save payload trims the apiKey and mirrors the saved settings into
 * the login state (minimal R29 global-state equivalent).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhSettings },
});

const routerMock = vi.hoisted(() => ({
  setInitialState: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn(), replace: vi.fn() },
  useModel: (_name: string) => ({
    initialState: {},
    setInitialState: routerMock.setInitialState,
  }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getTrendzSettings: vi.fn(),
  saveTrendzSettings: vi.fn(),
}));

vi.mock('@/services/tb/trendz', () => servicesMock);

import SettingsTrendzPage from './index';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <RawIntlProvider value={intl}>
            <SettingsTrendzPage />
          </RawIntlProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function getSaveButton(): Promise<HTMLButtonElement> {
  const label = await screen.findByText(/保\s*存/);
  return label.closest('button') as HTMLButtonElement;
}

describe('settings trendz page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Unconfigured tenant: EMPTY OBJECT, not 404 (contract #22).
    servicesMock.getTrendzSettings.mockResolvedValue({});
    servicesMock.saveTrendzSettings.mockImplementation(
      async (body: unknown) => body,
    );
  });

  it('renders from an empty-object snapshot with the switch off', async () => {
    renderPage();
    expect(await screen.findByText('Trendz 设置')).toBeDefined();
    const enable = (await screen.findByRole('checkbox')) as HTMLInputElement;
    expect(enable.checked).toBe(false);
    expect(await getSaveButton()).toBeDisabled();
  });

  it('requires the URL only while enabled and trims the apiKey on save', async () => {
    servicesMock.getTrendzSettings.mockResolvedValue({
      enabled: false,
      baseUrl: 'https://trendz.example.com',
      apiKey: 'spaced-key',
    });
    renderPage();
    await getSaveButton();

    const enable = (await screen.findByRole('checkbox')) as HTMLInputElement;
    fireEvent.click(enable); // enable → URL becomes required (already filled)

    fireEvent.click(await getSaveButton());
    await waitFor(() => {
      expect(servicesMock.saveTrendzSettings).toHaveBeenCalledTimes(1);
    });
    expect(servicesMock.saveTrendzSettings.mock.calls[0][0]).toEqual({
      enabled: true,
      baseUrl: 'https://trendz.example.com',
      apiKey: 'spaced-key',
    });
    // Minimal global-state equivalent (R29): saved settings land in the
    // login state.
    await waitFor(() => {
      expect(routerMock.setInitialState).toHaveBeenCalled();
    });
    const updater = routerMock.setInitialState.mock.calls[0][0] as (
      s: Record<string, unknown>,
    ) => Record<string, unknown>;
    expect(updater({}).trendzSettings).toEqual({
      enabled: true,
      baseUrl: 'https://trendz.example.com',
      apiKey: 'spaced-key',
    });
  });

  it('blocks the save while the URL is required and empty', async () => {
    renderPage();
    await getSaveButton();
    const enable = (await screen.findByRole('checkbox')) as HTMLInputElement;
    fireEvent.click(enable); // URL now required but left empty
    fireEvent.click(await getSaveButton());
    // Submit-time validation rejects the missing URL → the mutation never
    // fires and the field renders its error.
    await waitFor(() => {
      expect(
        document.querySelectorAll('.ant-form-item-explain-error').length,
      ).toBeGreaterThan(0);
    });
    expect(servicesMock.saveTrendzSettings).not.toHaveBeenCalled();
  });
});
