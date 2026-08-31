/**
 * The single HTTP exit seam of src/core — every REST call in the app goes
 * through a client created here (services/tb/*). Nothing else in core/http
 * or services may issue network requests.
 *
 * Built on native fetch (not @umijs/max request):
 *   - core must be usable before the umi runtime boots (getInitialState)
 *     and inside vitest without app context;
 *   - we need exact control over timeout (AbortController), the 401
 *     single-flight refresh + queue replay, 429 random backoff and
 *     Accept-Language injection; the umi request wrapper hides these behind
 *     its own interceptor config owned by the app layer.
 *
 * Auth policy (issue #7/#8):
 *   - `Authorization: Bearer <jwt>` (X-Authorization dropped).
 *   - 401 → POST /api/auth/token refresh, single-flight (shared promise,
 *     concurrent callers queue and replay with the new token).
 *   - /api/auth/login, /api/auth/token, /api/noauth/** are exempt: no bearer,
 *     no refresh (prevents login/token dead loops); a 401 on refresh itself
 *     never recurses.
 *   - 429 → random backoff retry (default 3).
 *   - 10s timeout per attempt.
 */

import { tokenStore } from '../auth/token-store';
import {
  networkServerError,
  type ServerError,
  ServerErrorError,
  serverErrorFromResponse,
} from './server-error';

/** Unified auth event — WS close and HTTP 401 converge on this shape. */
export interface UnauthorizedEvent {
  source: 'http' | 'ws';
  reason?: string;
}

export interface TbHttpClientOptions {
  /** Prepended to every path; '' (same-origin) by default. */
  baseUrl?: string;
  /** Per-attempt timeout. Default 10_000. */
  timeoutMs?: number;
  /** Max 429 retries after the initial attempt. Default 3. */
  maxRateLimitRetries?: number;
  /** Base delay for 429 backoff (ms, doubled per attempt + jitter). Default 500. */
  rateLimitBaseDelayMs?: number;
  /** Accept-Language source, evaluated per request. */
  language?: () => string;
  /** Fired once per failed refresh flight (logout/redirect belongs to app layer). */
  onUnauthorized?: (event: UnauthorizedEvent) => void;
  /** DI seams for tests. */
  fetchImpl?: typeof fetch;
  random?: () => number;
}

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Plain object → JSON body; FormData/Blob/string passed through untouched. */
  body?: unknown;
  query?: QueryParams;
  headers?: Record<string, string>;
  /** Skip bearer injection and 401 refresh handling (login/token/noauth). */
  authExempt?: boolean;
}

export interface TbHttpClient {
  request<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  get<T = unknown>(path: string, query?: QueryParams): Promise<T>;
  post<T = unknown>(
    path: string,
    body?: unknown,
    query?: QueryParams,
  ): Promise<T>;
  put<T = unknown>(
    path: string,
    body?: unknown,
    query?: QueryParams,
  ): Promise<T>;
  delete<T = unknown>(path: string, query?: QueryParams): Promise<T>;
}

const AUTH_EXEMPT_PATHS = ['/api/auth/login', '/api/auth/token'];
const AUTH_EXEMPT_PREFIXES = ['/api/noauth/'];
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_429_RETRIES = 3;
const DEFAULT_429_BASE_DELAY_MS = 500;

function isAuthExempt(path: string): boolean {
  return (
    AUTH_EXEMPT_PATHS.includes(path) ||
    AUTH_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface RefreshSuccess {
  token: string;
  refreshToken: string;
}

/**
 * Standalone single-flight token refresher, so the WS manager and the HTTP
 * client can SHARE one refresh flight (composition root wires both to the
 * same instance). Uses /api/auth/token with no bearer and no recursion.
 */
export function createTokenRefresher(
  deps: { baseUrl?: string; timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): () => Promise<boolean> {
  const {
    baseUrl = '',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = (...args) => fetch(...args),
  } = deps;

  const runRefresh = async (): Promise<boolean> => {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken || !tokenStore.isTokenValid('refresh')) {
      return false;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
      if (!response.ok) {
        return false;
      }
      const refreshed = (await response.json()) as RefreshSuccess;
      tokenStore.setTokens(refreshed.token, refreshed.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  let inFlight: Promise<boolean> | null = null;
  return () => {
    if (!inFlight) {
      inFlight = runRefresh().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}

export function createTbHttpClient(
  options: TbHttpClientOptions = {},
): TbHttpClient {
  const {
    baseUrl = '',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRateLimitRetries = DEFAULT_MAX_429_RETRIES,
    rateLimitBaseDelayMs = DEFAULT_429_BASE_DELAY_MS,
    language = () =>
      typeof navigator !== 'undefined' ? navigator.language : 'en',
    onUnauthorized,
    fetchImpl = (...args) => fetch(...args),
    random = Math.random,
  } = options;

  const doFetch: typeof fetch = (input, init) => fetchImpl(input, init);

  /** Plain fetch with per-attempt timeout; rejects AbortError-style on timeout. */
  const fetchWithTimeout = async (
    url: string,
    init: RequestInit,
  ): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abortRace = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        const err = new Error('Request timed out');
        err.name = 'AbortError';
        reject(err);
      });
    });
    try {
      return await Promise.race([
        doFetch(url, { ...init, signal: controller.signal }),
        abortRace,
      ]);
    } finally {
      clearTimeout(timer);
    }
  };

  /** Refresh against /api/auth/token with no bearer and no recursion. */
  const runRefresh = async (): Promise<boolean> => {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken || !tokenStore.isTokenValid('refresh')) {
      return false;
    }
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        return false;
      }
      const refreshed = (await response.json()) as RefreshSuccess;
      tokenStore.setTokens(refreshed.token, refreshed.refreshToken);
      return true;
    } catch {
      return false;
    }
  };

  let refreshInFlight: Promise<boolean> | null = null;

  /**
   * Single-flight refresh: the first 401 launches the POST; every concurrent
   * 401 awaits the same promise. On failure, tokens are cleared and the
   * unauthorized event fires exactly once per flight (not per queued caller).
   */
  const refreshTokens = (): Promise<boolean> => {
    if (!refreshInFlight) {
      refreshInFlight = runRefresh().finally(() => {
        refreshInFlight = null;
      });
      refreshInFlight.then((ok) => {
        if (!ok) {
          tokenStore.clear();
          onUnauthorized?.({ source: 'http', reason: 'refresh-failed' });
        }
      });
    }
    return refreshInFlight;
  };

  const toServerError = async (
    response: Response,
  ): Promise<ServerErrorError> => {
    let raw: unknown;
    try {
      raw = await response.text();
    } catch {
      raw = undefined;
    }
    return new ServerErrorError(serverErrorFromResponse(response, raw), raw);
  };

  const buildUrl = (path: string, query?: QueryParams): string => {
    const url = `${baseUrl}${path}`;
    if (!query) {
      return url;
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  };

  const buildInit = (
    requestOptions: RequestOptions,
    exempt: boolean,
  ): RequestInit => {
    const headers = new Headers(requestOptions.headers);
    headers.set('Accept-Language', language());
    const { body } = requestOptions;
    let serializedBody: BodyInit | undefined;
    if (body !== undefined && body !== null) {
      if (
        typeof body === 'string' ||
        body instanceof FormData ||
        body instanceof Blob ||
        body instanceof URLSearchParams
      ) {
        serializedBody = body;
      } else {
        headers.set('Content-Type', 'application/json');
        serializedBody = JSON.stringify(body);
      }
    }
    if (!exempt) {
      const token = tokenStore.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    const init: RequestInit = {
      method: requestOptions.method ?? 'GET',
      headers,
    };
    if (serializedBody !== undefined) {
      init.body = serializedBody;
    }
    return init;
  };

  const parseBody = async (response: Response): Promise<unknown> => {
    if (response.status === 204) {
      return undefined;
    }
    const text = await response.text();
    if (!text) {
      return undefined;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const request = async <T>(
    path: string,
    requestOptions: RequestOptions = {},
  ): Promise<T> => {
    const exempt = requestOptions.authExempt === true || isAuthExempt(path);
    const url = buildUrl(path, requestOptions.query);
    let replayedAfterRefresh = false;
    let rateLimitRetries = 0;

    for (;;) {
      let response: Response;
      try {
        response = await fetchWithTimeout(
          url,
          buildInit(requestOptions, exempt),
        );
      } catch (reason) {
        throw new ServerErrorError(networkServerError(reason));
      }

      if (response.status === 401 && !exempt && !replayedAfterRefresh) {
        replayedAfterRefresh = true;
        const refreshed = await refreshTokens();
        if (!refreshed) {
          // Session is gone: surface the original 401, already notified.
          throw await toServerError(response);
        }
        continue;
      }

      if (response.status === 429 && rateLimitRetries < maxRateLimitRetries) {
        rateLimitRetries += 1;
        // Full jitter: uniform in [0, base * 2^attempt).
        const ceiling = rateLimitBaseDelayMs * 2 ** rateLimitRetries;
        await sleep(Math.floor(random() * ceiling));
        continue;
      }

      if (!response.ok) {
        throw await toServerError(response);
      }
      return (await parseBody(response)) as T;
    }
  };

  return {
    request,
    get: <T2>(path: string, query?: QueryParams) =>
      request<T2>(path, { method: 'GET', query }),
    post: <T2>(path: string, body?: unknown, query?: QueryParams) =>
      request<T2>(path, { method: 'POST', body, query }),
    put: <T2>(path: string, body?: unknown, query?: QueryParams) =>
      request<T2>(path, { method: 'PUT', body, query }),
    delete: <T2>(path: string, query?: QueryParams) =>
      request<T2>(path, { method: 'DELETE', query }),
  };
}

export type { ServerError };
