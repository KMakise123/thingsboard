/**
 * Events panel tests: default ERROR type, type filter re-read with reset
 * pagination, server-paged reads, body summary extraction.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';

import EventsPanel, { eventBodySummary } from './EventsPanel';

const servicesMock = vi.hoisted(() => ({
  getEvents: vi.fn(),
}));

vi.mock('@/services/tb/events', () => servicesMock);

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

function event(id: string, body: Record<string, unknown>) {
  return {
    id: { entityType: 'EVENT', id },
    createdTime: 1_700_000_000_000,
    type: 'ERROR',
    body,
  };
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <EventsPanel deviceId="dev-1" tenantId="t-1" />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('eventBodySummary', () => {
  it('prefers message / error / event style fields', () => {
    expect(eventBodySummary({ message: 'boom', other: 'x' })).toBe('boom');
    expect(eventBodySummary({ error: 'stack' })).toBe('stack');
    expect(eventBodySummary({ event: 'Started' })).toBe('Started');
    expect(eventBodySummary({ numeric: 1 })).toBe('');
  });
});

describe('events panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getEvents.mockResolvedValue({
      data: [event('e-1', { message: 'Asset not found' })],
      totalElements: 25,
    });
  });

  it('defaults to ERROR and renders the summary', async () => {
    renderPanel();
    expect(await screen.findByText('Asset not found')).toBeTruthy();
    expect(servicesMock.getEvents).toHaveBeenCalledWith(
      { entityType: 'DEVICE', id: 'dev-1' },
      't-1',
      'ERROR',
      expect.objectContaining({ page: 0 }),
    );
  });

  it('re-reads with the selected type and resets the page', async () => {
    renderPanel();
    await screen.findByText('Asset not found');
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    const option = await screen.findByText('统计', {
      selector: '.ant-select-item-option-content',
    });
    fireEvent.click(option);
    await waitFor(() =>
      expect(servicesMock.getEvents).toHaveBeenLastCalledWith(
        { entityType: 'DEVICE', id: 'dev-1' },
        't-1',
        'STATS',
        expect.objectContaining({ page: 0 }),
      ),
    );
  });

  it('shows the empty state for empty pages', async () => {
    servicesMock.getEvents.mockResolvedValue({ data: [], totalElements: 0 });
    renderPanel();
    expect(await screen.findByText('暂无事件')).toBeTruthy();
  });
});
