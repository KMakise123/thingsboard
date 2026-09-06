/**
 * AI-models list page test (M14 wave-3, R27): rows render with the
 * provider/modelId cells, the edit dialog opens from a row click and the
 * Check-connectivity probe surfaces the HTTP-200 FAILURE envelope's
 * errorDetails (contract #24 — errors are NOT HTTP catches).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhAiModel from '@/locales/zh-CN/ai-model';
import zhCommon from '@/locales/zh-CN/common';
import type { AiModel } from '@/types/tb/ai-model';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhAiModel },
});

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn(), replace: vi.fn() },
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getAiModels: vi.fn(),
  getAiModelById: vi.fn(),
  saveAiModel: vi.fn(),
  deleteAiModel: vi.fn(),
  checkAiModelConnectivity: vi.fn(),
}));
vi.mock('@/services/tb/ai-model', () => servicesMock);

// pro-components cannot resolve under vite-node — render via antd Table.
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = (props: React.ComponentProps<typeof Table>) => (
    <Table {...props} />
  );
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

import AiModelsPage from './index';

function modelRow(id: string, name: string): AiModel {
  return {
    id: { entityType: 'AI_MODEL', id },
    createdTime: 1_700_000_000_000,
    name,
    configuration: {
      provider: 'OPENAI',
      modelId: 'gpt-5',
      providerConfig: { apiKey: 'sk-test' },
    },
  } as unknown as AiModel;
}

const PAGE_DATA = {
  data: [modelRow('m-1', 'prod-model')],
  totalElements: 1,
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
          <AiModelsPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('settings ai-models page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getAiModels.mockResolvedValue(PAGE_DATA);
  });

  it('renders the row with the translated provider and model id', async () => {
    renderPage();
    expect(await screen.findByText('prod-model')).toBeDefined();
    expect(screen.getByText('OpenAI')).toBeDefined();
    expect(screen.getByText('gpt-5')).toBeDefined();
  });

  it('opens the edit dialog from a row click', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('prod-model'));
    expect(await screen.findByText('编辑 AI 模型')).toBeDefined();
  });

  it('shows the 200-envelope errorDetails when the probe fails', async () => {
    // Contract #24: /chat ALWAYS answers HTTP 200; failures ride a
    // FAILURE envelope — the service resolves, it never throws.
    servicesMock.checkAiModelConnectivity.mockResolvedValue({
      status: 'FAILURE',
      errorDetails: '{"error":"Incorrect API key"}',
    });
    renderPage();
    fireEvent.click(await screen.findByText('prod-model'));
    // The edit dialog opens; press Check connectivity.
    fireEvent.click(await screen.findByText('检查连通性'));
    expect(await screen.findByText('测试请求失败')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Incorrect API key/)).toBeDefined();
    });
    expect(servicesMock.checkAiModelConnectivity).toHaveBeenCalledTimes(1);
    const request = servicesMock.checkAiModelConnectivity.mock.calls[0][0];
    expect(request.chatModelConfig.modelId).toBe('gpt-5');
    expect(request.chatModelConfig.maxRetries).toBe(0);
    expect(request.userMessage.contents[0].text).toBe(
      'What is the capital of Ukraine?',
    );
  });
});
