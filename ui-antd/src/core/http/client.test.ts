import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../auth/token-store';
import { createTbHttpClient } from './client';

/** JWT factory with valid iat/exp so the token store accepts it. */
function makeJwt(sub: string, ttlSeconds = 3600): string {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const iat = Math.floor(Date.now() / 1000);
  return `${enc({ typ: 'JWT' })}.${enc({ sub, iat, exp: iat + ttlSeconds })}.sig`;
}

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('tb http client', () => {
  let calls: Call[];
  let responses: Array<Response | ((call: Call) => Response)>;
  let onUnauthorized: ReturnType<typeof vi.fn>;
  let client: ReturnType<typeof createTbHttpClient>;

  beforeEach(() => {
    calls = [];
    responses = [];
    onUnauthorized = vi.fn();
    client = createTbHttpClient({
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : String(input);
        calls.push({ url, init });
        const next = responses.shift();
        return typeof next === 'function'
          ? next(calls[calls.length - 1])
          : (next ?? jsonResponse(200, {}));
      }) as typeof fetch,
      language: () => 'zh-CN',
    });
    tokenStore.setTokens(makeJwt('tenant@tb'), makeJwt('tenant@tb', 604800));
  });

  afterEach(() => {
    tokenStore.clear();
  });

  it('injects Authorization Bearer and Accept-Language', async () => {
    responses.push(jsonResponse(200, { ok: true }));
    const data = await client.request<{ ok: boolean }>('/api/auth/user');
    expect(data).toEqual({ ok: true });
    expect(calls[0].url).toBe('/api/auth/user');
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get('Authorization')).toBe(
      `Bearer ${tokenStore.getToken()}`,
    );
    expect(headers.get('Accept-Language')).toBe('zh-CN');
  });

  it('serializes query params and JSON body', async () => {
    responses.push(jsonResponse(200, {}));
    await client.request('/api/tenant/deviceInfos', {
      method: 'GET',
      query: { pageSize: 10, page: 0, active: true, textSearch: undefined },
    });
    expect(calls[0].url).toBe(
      '/api/tenant/deviceInfos?pageSize=10&page=0&active=true',
    );
    responses.push(jsonResponse(200, {}));
    await client.request('/api/device', {
      method: 'POST',
      body: { name: 'd1' },
    });
    const headers = new Headers(calls[1].init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(calls[1].init?.body).toBe(JSON.stringify({ name: 'd1' }));
  });

  it('login and token endpoints are exempt from auth header and refresh', async () => {
    responses.push(
      jsonResponse(401, {
        status: 401,
        message: 'Invalid username or password',
        errorCode: 10,
      }),
    );
    await expect(
      client.request('/api/auth/login', {
        method: 'POST',
        body: { username: 'a', password: 'b' },
      }),
    ).rejects.toMatchObject({
      status: 401,
      detail: 'Invalid username or password',
    });
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get('Authorization')).toBeNull();
    // only the login call itself — no refresh, no retry
    expect(calls).toHaveLength(1);
  });

  it('401 triggers refresh once and replays with the new token', async () => {
    const expired401 = jsonResponse(401, {
      status: 401,
      message: 'Token has expired',
      errorCode: 11,
    });
    const newToken = makeJwt('tenant@tb');
    responses.push(
      expired401,
      jsonResponse(200, {
        token: newToken,
        refreshToken: makeJwt('tenant@tb', 604800),
      }),
      jsonResponse(200, { email: 'tenant@tb' }),
    );
    const data = await client.request<{ email: string }>('/api/auth/user');
    expect(data.email).toBe('tenant@tb');
    // refresh call shape
    expect(calls[1].url).toBe('/api/auth/token');
    const refreshBody = JSON.parse(String(calls[1].init?.body));
    expect(refreshBody).toHaveProperty('refreshToken');
    const refreshHeaders = new Headers(calls[1].init?.headers);
    expect(refreshHeaders.get('Authorization')).toBeNull(); // refresh itself exempt
    // replay used the NEW token
    const replayHeaders = new Headers(calls[2].init?.headers);
    expect(replayHeaders.get('Authorization')).toBe(`Bearer ${newToken}`);
    expect(tokenStore.getToken()).toBe(newToken);
  });

  it('concurrent 401s share one refresh (single-flight) and each replays', async () => {
    const newToken = makeJwt('tenant@tb');
    responses.push(
      jsonResponse(401, { status: 401, message: 'expired', errorCode: 11 }),
      jsonResponse(401, { status: 401, message: 'expired', errorCode: 11 }),
      jsonResponse(200, {
        token: newToken,
        refreshToken: makeJwt('tenant@tb', 604800),
      }),
      jsonResponse(200, { n: 1 }),
      jsonResponse(200, { n: 2 }),
    );
    const [a, b] = await Promise.all([
      client.request<{ n: number }>('/api/a'),
      client.request<{ n: number }>('/api/b'),
    ]);
    expect(a.n + b.n).toBe(3);
    // exactly: 2 originals + 1 refresh + 2 replays = 5 fetches, 1 of which is /api/auth/token
    expect(calls).toHaveLength(5);
    expect(calls.filter((c) => c.url === '/api/auth/token')).toHaveLength(1);
    const auths = calls
      .slice(3)
      .map((c) => new Headers(c.init?.headers).get('Authorization'));
    expect(auths).toEqual([`Bearer ${newToken}`, `Bearer ${newToken}`]);
  });

  it('refresh failure clears tokens and fires onUnauthorized', async () => {
    const failing = createTbHttpClient({
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init });
        const next = responses.shift();
        return typeof next === 'function'
          ? next(calls[calls.length - 1])
          : (next ?? jsonResponse(200, {}));
      }) as typeof fetch,
      language: () => 'zh-CN',
      onUnauthorized,
    });
    responses.push(
      jsonResponse(401, { status: 401, message: 'expired', errorCode: 11 }),
      jsonResponse(401, {
        status: 401,
        message: 'Invalid refresh token',
        errorCode: 10,
      }),
    );
    await expect(failing.request('/api/auth/user')).rejects.toMatchObject({
      status: 401,
    });
    expect(calls.filter((c) => c.url === '/api/auth/token')).toHaveLength(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'http' }),
    );
    expect(tokenStore.getToken()).toBeNull();
  });

  it('refresh endpoint own-401 does not recurse', async () => {
    responses.push(
      jsonResponse(401, { status: 401, message: 'expired', errorCode: 11 }),
      jsonResponse(401, {
        status: 401,
        message: 'refresh expired',
        errorCode: 11,
      }),
    );
    await expect(client.request('/api/auth/user')).rejects.toMatchObject({
      status: 401,
    });
    // 1 original + 1 refresh (which 401s and must NOT trigger another refresh)
    expect(calls).toHaveLength(2);
  });

  it('429 retries with random backoff and succeeds', async () => {
    vi.useFakeTimers();
    try {
      responses.push(
        jsonResponse(429, {
          status: 429,
          message: 'Too many requests for current tenant!',
          errorCode: 33,
        }),
        jsonResponse(429, {
          status: 429,
          message: 'Too many requests for current tenant!',
          errorCode: 33,
        }),
        jsonResponse(200, { ok: true }),
      );
      const promise = client.request<{ ok: boolean }>('/api/devices');
      // advance past both backoff waits
      await vi.advanceTimersByTimeAsync(60_000);
      const data = await promise;
      expect(data.ok).toBe(true);
      expect(calls).toHaveLength(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('429 gives up after max retries and normalizes the error', async () => {
    vi.useFakeTimers();
    try {
      for (let i = 0; i < 5; i++) {
        responses.push(
          jsonResponse(429, {
            status: 429,
            message: 'rate limited',
            errorCode: 33,
          }),
        );
      }
      const promise = client.request('/api/devices');
      const assertion = expect(promise).rejects.toMatchObject({
        status: 429,
        titleKey: 'tb.error.tooManyRequests',
      });
      await vi.advanceTimersByTimeAsync(120_000);
      await assertion;
      expect(calls).toHaveLength(4); // 1 original + 3 retries
    } finally {
      vi.useRealTimers();
    }
  });

  it('times out after 10s and surfaces a timeout error', async () => {
    vi.useFakeTimers();
    try {
      const never = new Promise<Response>(() => {});
      responses.push(never as Response);
      const promise = client.request('/api/devices');
      const assertion = expect(promise).rejects.toMatchObject({
        status: 0,
        titleKey: 'tb.error.timeout',
      });
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('204/empty body resolves to undefined', async () => {
    responses.push(new Response(null, { status: 204 }));
    await expect(
      client.request('/api/device/some-id', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });

  it('normalizes error body into ServerError fields', async () => {
    responses.push(
      jsonResponse(403, {
        status: 403,
        message: "You don't have permission",
        errorCode: 20,
      }),
    );
    await expect(
      client.request('/api/device/x', { method: 'DELETE' }),
    ).rejects.toMatchObject({
      status: 403,
      errorCode: 20,
      detail: "You don't have permission",
      titleKey: 'tb.error.forbidden',
    });
  });

  it('network rejection maps to status 0 network error', async () => {
    const offline = createTbHttpClient({
      fetchImpl: (async () => {
        throw new TypeError('Failed to fetch');
      }) as typeof fetch,
      language: () => 'zh-CN',
    });
    await expect(offline.request('/api/devices')).rejects.toMatchObject({
      status: 0,
      titleKey: 'tb.error.network',
    });
  });
});
