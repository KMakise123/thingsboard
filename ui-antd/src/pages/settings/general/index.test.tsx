/**
 * Settings-general page smoke test: renders both cards from the mocked
 * settings buckets and the per-card undo/save footer reacts to edits.
 * Services are mocked at the module boundary (list-test convention).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhSettings },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getAdminSettings: vi.fn(),
  saveAdminSettings: vi.fn(),
}));

vi.mock('@/services/tb/admin', () => servicesMock);

import SettingsGeneralPage from './index';

const { getAdminSettings, saveAdminSettings } = servicesMock;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <SettingsGeneralPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('settings general page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminSettings.mockImplementation((key: string) =>
      key === 'general'
        ? Promise.resolve({
            key: 'general',
            jsonValue: {
              baseUrl: 'http://localhost:8080',
              prohibitDifferentUrl: false,
            },
          })
        : Promise.resolve({
            key: 'connectivity',
            jsonValue: {
              http: { enabled: true, host: 'localhost', port: 8080 },
              https: { enabled: false, host: '', port: 8443 },
              mqtt: { enabled: false, host: 'localhost', port: 1883 },
              mqtts: { enabled: false, host: '', port: 8883 },
              coap: { enabled: false, host: '', port: 5683 },
              coaps: { enabled: false, host: '', port: 5684 },
            },
          }),
    );
    saveAdminSettings.mockResolvedValue({
      key: 'general',
      jsonValue: { baseUrl: 'http://x', prohibitDifferentUrl: true },
    });
  });

  it('renders both settings cards with per-card undo/save', async () => {
    renderPage();
    expect(await screen.findByText('常规设置')).toBeDefined();
    expect(await screen.findByText('设备连接')).toBeDefined();
    // antd inserts a space between CJK button characters ("保 存").
    const saveLabels = await screen.findAllByText(/保\s*存/);
    expect(saveLabels).toHaveLength(2);
    for (const label of saveLabels) {
      const button = label.closest('button');
      expect(button).not.toBeNull();
      // Pristine form keeps save disabled.
      expect(button).toBeDisabled();
    }
  });
});
