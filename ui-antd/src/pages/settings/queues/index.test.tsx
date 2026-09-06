/**
 * Queues list page test (M14 wave-3, R33-3): Main row is unselectable and
 * carries no delete action; row title navigates to the detail route.
 * ProTable renders through antd's Table (vite-node pro-components locale
 * workaround) and the page's own PageContainer goes with it.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';
import type { Queue } from '@/types/tb/queue';

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
  getQueues: vi.fn(),
  getQueueById: vi.fn(),
  saveQueue: vi.fn(),
  deleteQueue: vi.fn(),
}));
vi.mock('@/services/tb/queue', () => servicesMock);

// pro-components cannot resolve under vite-node — render via antd Table.
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
  // Thin passthrough: the page header renders extra + children (ADR 0008).
  const PageContainer = (props: {
    extra?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {props.extra}
      {props.children}
    </div>
  );
  return { ProTable, PageContainer };
});

import QueueListPage from './index';

function queueRow(id: string, name: string): Queue {
  return {
    id: { entityType: 'QUEUE', id },
    createdTime: 1,
    name,
    topic: `tb_rule_engine.${name}`,
    pollInterval: 25,
    partitions: 10,
    consumerPerPartition: false,
    packProcessingTimeout: 2000,
    submitStrategy: { type: 'BURST', batchSize: 1000 },
    processingStrategy: {
      type: 'RETRY_FAILED_AND_TIMED_OUT',
      retries: 3,
      failurePercentage: 0,
      pauseBetweenRetries: 3,
      maxPauseBetweenRetries: 3,
    },
  } as Queue;
}

const PAGE_DATA = {
  data: [queueRow('q-main', 'Main'), queueRow('q-high', 'HighPriority')],
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
          <QueueListPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('settings queues list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getQueues.mockResolvedValue(PAGE_DATA);
  });

  it('renders both rows with the strategy columns translated', async () => {
    renderPage();
    expect(await screen.findByText('Main')).toBeDefined();
    expect(await screen.findByText('HighPriority')).toBeDefined();
    expect(screen.getAllByText('突发').length).toBe(2);
    expect(screen.getAllByText('重试失败和超时').length).toBe(2);
  });

  it('keeps the Main row unselectable and without a delete action', async () => {
    renderPage();
    await screen.findByText('Main');
    await waitFor(() => {
      const checkboxes = document.querySelectorAll(
        'input[type="checkbox"]',
      ) as NodeListOf<HTMLInputElement>;
      expect(checkboxes.length).toBeGreaterThan(2);
    });
    const checkboxes = document.querySelectorAll(
      'input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    // First row checkbox (Main) disabled, second enabled.
    expect(checkboxes[1]).toBeDisabled();
    expect(checkboxes[2]).not.toBeDisabled();
    // Delete buttons: one per non-Main row only.
    const deleteButtons = screen.getAllByRole('button', { name: '删除' });
    expect(deleteButtons).toHaveLength(1);
  });

  it('navigates to the detail route on row-name click', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('HighPriority'));
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/settings/queues/q-high');
    });
  });
});
