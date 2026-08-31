/**
 * Token storage — the ONLY module in src/core allowed to touch the auth
 * localStorage keys.
 *
 * Key names are ui-ngx verbatim (`jwt_token`, `jwt_token_expiration`,
 * `refresh_token`, `refresh_token_expiration`) so sessions created by the
 * legacy UI keep working after the one-step switchover.
 *
 * Expiration semantics copied from ui-ngx auth.service:
 *   - stored value = store-time + (exp - iat) * 1000  (client-clock adjusted)
 *   - valid        = Number(stored) > Date.now() + 2000 (skew guard)
 */

/** Decoded JWT claims relevant to the client. */
export interface TokenClaims {
  sub: string;
  iat?: number;
  exp?: number;
  userId?: string;
  scopes?: Array<string>;
  isPublic?: boolean;
  [claim: string]: unknown;
}

export interface TokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** ui-ngx-compatible localStorage keys. Do not rename. */
export const TOKEN_STORAGE_KEYS = {
  jwtToken: 'jwt_token',
  jwtTokenExpiration: 'jwt_token_expiration',
  refreshToken: 'refresh_token',
  refreshTokenExpiration: 'refresh_token_expiration',
} as const;

export type TokenKind = 'jwt' | 'refresh';

/** ui-ngx validity guard: treat tokens expiring within 2s as expired. */
const CLOCK_SKEW_MS = 2000;

function decodeSegment(segment: string): unknown {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function decodeJwt(token: string): TokenClaims | null {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  const payload = decodeSegment(parts[1]);
  if (payload === null || typeof payload !== 'object') {
    return null;
  }
  return payload as TokenClaims;
}

export interface TokenStore {
  getToken(): string | null;
  getRefreshToken(): string | null;
  /** Store a token pair; derives client-clock expirations from iat/exp. */
  setTokens(jwtToken: string, refreshToken: string): void;
  clear(): void;
  isTokenValid(kind: TokenKind): boolean;
  /** Decoded claims of the current token (null when absent/corrupt). */
  decodeTokenClaims(kind?: TokenKind): TokenClaims | null;
}

export function createTokenStore(storage: TokenStorage): TokenStore {
  const keyFor = (kind: TokenKind) =>
    kind === 'jwt'
      ? TOKEN_STORAGE_KEYS.jwtToken
      : TOKEN_STORAGE_KEYS.refreshToken;
  const expirationKeyFor = (kind: TokenKind) =>
    kind === 'jwt'
      ? TOKEN_STORAGE_KEYS.jwtTokenExpiration
      : TOKEN_STORAGE_KEYS.refreshTokenExpiration;

  const storeToken = (kind: TokenKind, token: string): boolean => {
    const claims = decodeJwt(token);
    const issuedAt = claims?.iat;
    const expiresAt = claims?.exp;
    if (!issuedAt || !expiresAt) {
      return false;
    }
    const ttl = expiresAt - issuedAt;
    if (ttl <= 0) {
      return false;
    }
    // Same formula as ui-ngx updateAndValidateToken: rebase the TTL onto the
    // local clock so an off-by-N server clock does not leak through.
    const clientExpiration = Date.now() + ttl * 1000;
    storage.setItem(keyFor(kind), token);
    storage.setItem(expirationKeyFor(kind), String(clientExpiration));
    return true;
  };

  return {
    getToken: () => storage.getItem(TOKEN_STORAGE_KEYS.jwtToken),
    getRefreshToken: () => storage.getItem(TOKEN_STORAGE_KEYS.refreshToken),
    setTokens(jwtToken: string, refreshToken: string): void {
      if (
        !storeToken('jwt', jwtToken) ||
        !storeToken('refresh', refreshToken)
      ) {
        // Reject the whole pair — a half-stored session is worse than none.
        throw new Error('Invalid token pair: missing or non-positive ttl');
      }
    },
    clear(): void {
      storage.removeItem(TOKEN_STORAGE_KEYS.jwtToken);
      storage.removeItem(TOKEN_STORAGE_KEYS.jwtTokenExpiration);
      storage.removeItem(TOKEN_STORAGE_KEYS.refreshToken);
      storage.removeItem(TOKEN_STORAGE_KEYS.refreshTokenExpiration);
    },
    isTokenValid(kind: TokenKind): boolean {
      const raw = storage.getItem(expirationKeyFor(kind));
      if (!raw) {
        return false;
      }
      const clientExpiration = Number(raw);
      if (!Number.isFinite(clientExpiration)) {
        return false;
      }
      return clientExpiration > Date.now() + CLOCK_SKEW_MS;
    },
    decodeTokenClaims(kind: TokenKind = 'jwt'): TokenClaims | null {
      return decodeJwt(storage.getItem(keyFor(kind)) ?? '');
    },
  };
}

/** Process-wide store backed by window.localStorage. */
export const tokenStore: TokenStore = createTokenStore(
  typeof localStorage === 'undefined'
    ? {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      }
    : localStorage,
);
