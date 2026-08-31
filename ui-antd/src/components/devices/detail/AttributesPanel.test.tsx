/**
 * Attributes panel tests: REST seed feeding the WS subscription, scope
 * gating (CLIENT read-only), add/edit via saveEntityAttributes and delete
 * (single + batch) with confirm, client-side key search.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';

import AttributesPanel from './AttributesPanel';

const servicesMock = vi.hoisted(() => ({
  getAttributes: vi.fn(),
  saveEntityAttributes: vi.fn(),
  deleteEntityAttributes: vi.fn(),
}));

const wsMock = vi.hoisted(() => ({
  useAttributeSubscription: vi.fn(),
}));

vi.mock('@/services/tb/attributes', () => servicesMock);
vi.mock('@/core/ws/hooks', () => wsMock);

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

function renderPanel(readOnly = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <AttributesPanel deviceId="dev-1" readOnly={readOnly} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

/** Seed the REST snapshot + let the WS subscription echo it. */
function primeRows(rows: Array<{ key: string; value: unknown }>) {
  servicesMock.getAttributes.mockResolvedValue(rows);
  wsMock.useAttributeSubscription.mockImplementation(({ seed }) => ({
    data: seed ?? [],
    status: 'open',
  }));
}

describe('attributes panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.saveEntityAttributes.mockResolvedValue(undefined);
    servicesMock.deleteEntityAttributes.mockResolvedValue(undefined);
  });

  it('renders the REST seed through the WS subscription', async () => {
    primeRows([
      { key: 'target', value: 21.5 },
      { key: 'firmware', value: 'v1.2.0' },
    ]);
    renderPanel();
    expect(await screen.findByText('firmware')).toBeTruthy();
    expect(screen.getByText('21.5')).toBeTruthy();
    expect(screen.getByText('v1.2.0')).toBeTruthy();
    expect(servicesMock.getAttributes).toHaveBeenCalledWith(
      { entityType: 'DEVICE', id: 'dev-1' },
      'CLIENT_SCOPE',
    );
  });

  it('marks CLIENT scope read-only and offers editing on SERVER scope', async () => {
    primeRows([]);
    renderPanel();
    // Default scope = CLIENT: no add/edit surface, info alert instead.
    expect(screen.getByText('客户端属性由设备上报，在此为只读。')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /新增属性/ })).toBeNull();

    fireEvent.click(screen.getByText('服务端属性'));
    await waitFor(() =>
      expect(servicesMock.getAttributes).toHaveBeenCalledWith(
        { entityType: 'DEVICE', id: 'dev-1' },
        'SERVER_SCOPE',
      ),
    );
    expect(
      await screen.findByRole('button', { name: /新增属性/ }),
    ).toBeTruthy();
    expect(screen.queryByText('客户端属性由设备上报，在此为只读。')).toBeNull();
  });

  it('adds a SERVER attribute through saveEntityAttributes', async () => {
    primeRows([]);
    renderPanel();
    fireEvent.click(screen.getByText('服务端属性'));
    fireEvent.click(await screen.findByRole('button', { name: /新增属性/ }));

    fireEvent.change(await screen.findByLabelText('键'), {
      target: { value: 'threshold' },
    });
    fireEvent.change(await screen.findByLabelText('值'), {
      target: { value: '42' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));

    await waitFor(() =>
      expect(servicesMock.saveEntityAttributes).toHaveBeenCalledWith(
        { entityType: 'DEVICE', id: 'dev-1' },
        'SERVER_SCOPE',
        [{ key: 'threshold', value: '42' }],
      ),
    );
  });

  it('filters rows by key search', async () => {
    primeRows([
      { key: 'alpha', value: 1 },
      { key: 'beta', value: 2 },
    ]);
    renderPanel();
    expect(await screen.findByText('alpha')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('搜索键'), {
      target: { value: 'alph' },
    });
    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.queryByText('beta')).toBeNull();
  });

  it('deletes a row after confirmation', async () => {
    primeRows([{ key: 'stale', value: 0 }]);
    renderPanel();
    fireEvent.click(screen.getByText('服务端属性'));
    await screen.findByText('stale');
    fireEvent.click(screen.getByTitle('删除'));
    // Popconfirm portals to body end: its OK button is the last 删除 button.
    const confirmButtons = await screen.findAllByRole('button', {
      name: '删 除',
    });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() =>
      expect(servicesMock.deleteEntityAttributes).toHaveBeenCalledWith(
        { entityType: 'DEVICE', id: 'dev-1' },
        'SERVER_SCOPE',
        ['stale'],
      ),
    );
  });

  it('hides every editing entry for read-only users', async () => {
    primeRows([{ key: 'x', value: 1 }]);
    renderPanel(true);
    await screen.findByText('x');
    expect(screen.queryByTitle('删除')).toBeNull();
    fireEvent.click(screen.getByText('服务端属性'));
    await waitFor(() =>
      expect(servicesMock.getAttributes).toHaveBeenCalledWith(
        { entityType: 'DEVICE', id: 'dev-1' },
        'SERVER_SCOPE',
      ),
    );
    expect(screen.queryByRole('button', { name: /新增属性/ })).toBeNull();
    expect(screen.queryByTitle('删除')).toBeNull();
  });
});
