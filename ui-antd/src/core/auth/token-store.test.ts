import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTokenStore, TOKEN_STORAGE_KEYS } from './token-store';

/** Base64url JWT factory — mirrors backend-issued shape { sub, iat, exp }. */
function makeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${enc({ alg: 'HS512', typ: 'JWT' })}.${enc(payload)}.${'sig'}`;
}

describe('token-store', () => {
  let storage: Map<string, string>;
  let store: ReturnType<typeof createTokenStore>;

  beforeEach(() => {
    storage = new Map();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime());
    store = createTokenStore({
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the ui-ngx four localStorage keys verbatim', () => {
    expect(TOKEN_STORAGE_KEYS).toEqual({
      jwtToken: 'jwt_token',
      jwtTokenExpiration: 'jwt_token_expiration',
      refreshToken: 'refresh_token',
      refreshTokenExpiration: 'refresh_token_expiration',
    });
  });

  it('stores both tokens and client-clock expirations', () => {
    const iat = Math.floor(Date.now() / 1000);
    const jwt = makeJwt({ sub: 'tenant@tb', iat, exp: iat + 600 });
    const refresh = makeJwt({ sub: 'tenant@tb', iat, exp: iat + 604800 });
    store.setTokens(jwt, refresh);

    expect(storage.get('jwt_token')).toBe(jwt);
    expect(storage.get('refresh_token')).toBe(refresh);
    // ui-ngx semantics: expiration = store-time + (exp - iat) * 1000
    expect(Number(storage.get('jwt_token_expiration'))).toBe(Date.now() + 600_000);
    expect(Number(storage.get('refresh_token_expiration'))).toBe(Date.now() + 604_800_000);
  });

  it('rejects tokens without a positive ttl (no partial writes)', () => {
    const iat = Math.floor(Date.now() / 1000);
    const expired = makeJwt({ sub: 'x', iat, exp: iat }); // ttl 0
    expect(() => store.setTokens(expired, expired)).toThrow();
    expect(storage.has('jwt_token')).toBe(false);
    expect(storage.has('jwt_token_expiration')).toBe(false);
  });

  it('getToken/getRefreshToken read back stored values', () => {
    const iat = Math.floor(Date.now() / 1000);
    const jwt = makeJwt({ sub: 'a', iat, exp: iat + 600 });
    const refresh = makeJwt({ sub: 'a', iat, exp: iat + 3600 });
    store.setTokens(jwt, refresh);
    expect(store.getToken()).toBe(jwt);
    expect(store.getRefreshToken()).toBe(refresh);
  });

  it('isTokenValid honours the 2s skew guard from ui-ngx', () => {
    const iat = Math.floor(Date.now() / 1000);
    store.setTokens(
      makeJwt({ sub: 'a', iat, exp: iat + 3 }),
      makeJwt({ sub: 'a', iat, exp: iat + 3600 }),
    );
    // ttl 3s > 2s guard → valid now
    expect(store.isTokenValid('jwt')).toBe(true);
    vi.advanceTimersByTime(1500); // remaining 1.5s < 2s guard
    expect(store.isTokenValid('jwt')).toBe(false);
    expect(store.isTokenValid('refresh')).toBe(true);
  });

  it('missing tokens are invalid, not errors', () => {
    expect(store.getToken()).toBeNull();
    expect(store.isTokenValid('jwt')).toBe(false);
    expect(store.isTokenValid('refresh')).toBe(false);
  });

  it('corrupted expiration entry is treated as invalid', () => {
    const iat = Math.floor(Date.now() / 1000);
    store.setTokens(
      makeJwt({ sub: 'a', iat, exp: iat + 600 }),
      makeJwt({ sub: 'a', iat, exp: iat + 3600 }),
    );
    storage.set('jwt_token_expiration', 'not-a-number');
    expect(store.isTokenValid('jwt')).toBe(false);
  });

  it('clear removes all four keys', () => {
    const iat = Math.floor(Date.now() / 1000);
    store.setTokens(
      makeJwt({ sub: 'a', iat, exp: iat + 600 }),
      makeJwt({ sub: 'a', iat, exp: iat + 3600 }),
    );
    store.clear();
    expect([...storage.keys()]).toEqual([]);
    expect(store.getToken()).toBeNull();
  });

  it('decodeJwt exposes claims for authority checks', () => {
    const iat = Math.floor(Date.now() / 1000);
    const jwt = makeJwt({ sub: 'tenant@tb', userId: 'uuid-1', scopes: ['TENANT_ADMIN'], iat, exp: iat + 60 });
    store.setTokens(jwt, jwt);
    expect(store.decodeTokenClaims()).toMatchObject({
      sub: 'tenant@tb',
      userId: 'uuid-1',
      scopes: ['TENANT_ADMIN'],
    });
    expect(store.decodeTokenClaims('refresh')).toMatchObject({ sub: 'tenant@tb' });
  });

  it('decodeJwt returns null for garbage', () => {
    expect(store.decodeTokenClaims()).toBeNull();
    storage.set('jwt_token', 'garbage.notjwt');
    expect(store.decodeTokenClaims()).toBeNull();
  });
});
