/**
 * Trendz settings transport endpoints (M14 wave-1).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { getTrendzSettings, saveTrendzSettings } from './trendz';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);

describe('trendz transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
  });

  it('reads settings (unconfigured = empty object, never 404)', async () => {
    get.mockResolvedValue({} as never);
    await expect(getTrendzSettings()).resolves.toEqual({});
    expect(get).toHaveBeenCalledWith('/api/trendz/settings');
  });

  it('saves and the response echoes the body', async () => {
    const settings = {
      enabled: true,
      baseUrl: 'https://trendz.example.com',
      apiKey: 'k1',
    };
    post.mockResolvedValue(settings as never);
    await expect(saveTrendzSettings(settings)).resolves.toEqual(settings);
    expect(post).toHaveBeenCalledWith('/api/trendz/settings', settings);
  });
});
