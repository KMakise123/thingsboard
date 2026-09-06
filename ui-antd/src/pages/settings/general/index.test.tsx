/**
 * Settings-general page smoke test: renders both cards from the mocked
 * settings buckets and the per-card undo/save footer reacts to edits.
 * Services are mocked at the module boundary (list-test convention).
 *
 * M14 wave-2: the save mock REPLICATES the server save contract (contract
 * #2) — a payload without the snapshot id is treated as "create" and
 * rejected with 400 "Admin settings with such name already exists!". The
 * consecutive-saves test asserts both round-trips carry the id.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
            id: 'snapshot-general-id',
            key: 'general',
            jsonValue: {
              baseUrl: 'http://localhost:8080',
              prohibitDifferentUrl: false,
            },
          })
        : Promise.resolve({
            id: 'snapshot-connectivity-id',
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
    // Server save contract (contract #2): a body WITHOUT id is "create"
    // and 400s because the bucket already exists.
    saveAdminSettings.mockImplementation((body: { id?: string }) =>
      body.id
        ? Promise.resolve(body)
        : Promise.reject(
            new Error('Admin settings with such name already exists!'),
          ),
    );
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

  it('saves twice in a row with the snapshot id in every payload', async () => {
    renderPage();
    // Wait for the general snapshot to hydrate the form.
    const baseUrlInput = (await screen.findByLabelText(
      '基础 URL',
    )) as HTMLInputElement;
    expect(baseUrlInput.value).toBe('http://localhost:8080');

    // First edit + save.
    fireEvent.change(baseUrlInput, {
      target: { value: 'http://thingboard.local' },
    });
    await waitFor(() => {
      const generalCard = baseUrlInput.closest('.ant-card');
      const save = generalCard?.querySelector(
        'button[type="button"].ant-btn-primary',
      );
      expect(save?.hasAttribute('disabled')).toBe(false);
    });
    fireEvent.click(screen.getAllByText(/保\s*存/)[0]);
    await waitFor(() => {
      expect(saveAdminSettings).toHaveBeenCalledTimes(1);
    });
    expect(saveAdminSettings.mock.calls[0][0]).toMatchObject({
      id: 'snapshot-general-id',
      key: 'general',
    });

    // Second edit + save — the "second save must still be 200" regression
    // (a payload without id would be rejected by the save mock above).
    await waitFor(() => {
      expect(
        screen.getAllByText(/保\s*存/)[0].closest('button'),
      ).toBeDisabled();
    });
    fireEvent.change(screen.getByLabelText('基础 URL') as HTMLInputElement, {
      target: { value: 'http://thingboard-2.local' },
    });
    fireEvent.click(screen.getAllByText(/保\s*存/)[0]);
    await waitFor(() => {
      expect(saveAdminSettings).toHaveBeenCalledTimes(2);
    });
    expect(saveAdminSettings.mock.calls[1][0]).toMatchObject({
      id: 'snapshot-general-id',
      key: 'general',
      jsonValue: { baseUrl: 'http://thingboard-2.local' },
    });
  });
});
