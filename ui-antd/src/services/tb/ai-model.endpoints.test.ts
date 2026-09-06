/**
 * AI-model transport endpoints (M14 wave-1): delete-false semantics and
 * the chat envelope are the load-bearing contract points.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));

import {
  checkAiModelConnectivity,
  deleteAiModel,
  getAiModelById,
  getAiModels,
  saveAiModel,
} from './ai-model';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const del = vi.mocked(tbHttp.delete);
const request = vi.mocked(tbHttp.request);

describe('ai-model transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    del.mockResolvedValue(true as never);
  });

  it('lists ai models with an explicit createdTime DESC default', async () => {
    await getAiModels({ pageSize: 10, page: 0 });
    expect(get).toHaveBeenCalledWith('/api/ai/model', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });

    await getAiModels({
      pageSize: 10,
      page: 0,
      sortOrder: { property: 'provider', direction: 'ASC' },
    });
    expect(get).toHaveBeenLastCalledWith('/api/ai/model', {
      pageSize: 10,
      page: 0,
      textSearch: undefined,
      sortProperty: 'provider',
      sortOrder: 'ASC',
    });
  });

  it('reads and saves through /api/ai/model', async () => {
    await getAiModelById('m-1');
    expect(get).toHaveBeenCalledWith('/api/ai/model/m-1');

    const model = {
      name: 'fast',
      configuration: {
        provider: 'OPENAI',
        providerConfig: { apiKey: 'k' },
        modelId: 'gpt-4o-mini',
      },
    };
    await saveAiModel(model as never);
    expect(post).toHaveBeenCalledWith('/api/ai/model', model);
  });

  it('deletes even when the model is already gone (false, not 404)', async () => {
    del.mockResolvedValue(false as never);
    await expect(deleteAiModel('m-gone')).resolves.toBe(false);
    expect(del).toHaveBeenCalledWith('/api/ai/model/m-gone');
  });

  it('posts the chat probe and surfaces the 200 envelope (client timeout exceeds the 20s backend window)', async () => {
    request.mockResolvedValue({
      status: 'FAILURE',
      errorDetails: 'connect ECONNREFUSED',
    } as never);
    const probe = {
      userMessage: {
        contents: [{ contentType: 'TEXT', text: 'What is the capital of Ukraine?' }],
      },
      chatModelConfig: {
        provider: 'OPENAI',
        providerConfig: { apiKey: 'k' },
        modelId: 'gpt-4o-mini',
        maxRetries: 0,
        timeoutSeconds: 20,
      },
    };
    const response = await checkAiModelConnectivity(probe as never);
    // The probe rides request() (NOT post) with a 25s client timeout —
    // the shared 10s default aborts probes the backend is still waiting
    // on (its DeferredResult runs up to timeoutSeconds = 20s).
    expect(request).toHaveBeenCalledWith('/api/ai/model/chat', {
      method: 'POST',
      body: probe,
      timeoutMs: 25_000,
    });
    expect(response).toEqual({
      status: 'FAILURE',
      errorDetails: 'connect ECONNREFUSED',
    });
  });
});
