/**
 * Anonymous public-dashboard gate decision table (M15 R42) — a pure function
 * so every branch is unit-testable without a router or network.
 *
 * The `/dashboard/:dashboardId` route carries no access key; the page gates
 * itself over four states (brief §2.B):
 *   ① no valid token + URL publicId  → `public-login`   (exchange via
 *     POST /api/auth/login/public, then render)
 *   ② no valid token, no publicId    → `login-redirect` (equivalent of the
 *     old access interception: bounce to /user/login?redirect=…)
 *   ③ valid public token, claims.sub === URL publicId → `render`
 *     (F5 refresh keeps the session — no second exchange)
 *   ④ valid non-public token (logged-in user) → `render`, publicId is
 *     ignored and visibility is the backend checker's job (403/404 surface
 *     the page's error empty states)
 *   +  isPublic but sub !== publicId → `relogin-public` (a public session
 *     opened on a different link re-exchanges; ngx logout+reload parity)
 *
 * An isPublic token with NO publicId in the URL renders on its current
 * ticket (ngx's guard only checks consistency when the route carries one);
 * backend visibility still applies.
 */

import type { TokenClaims } from '@/core/auth/token-store';

export type PublicGateDecision =
  | 'login-redirect'
  | 'public-login'
  | 'render'
  | 'relogin-public';

export interface PublicGateInput {
  /** Local JWT validity (tokenStore.isTokenValid('jwt')). */
  hasValidToken: boolean;
  /** Decoded claims of the current token (null when absent/corrupt). */
  claims: TokenClaims | null;
  /** `publicId` query param of the current URL (null when absent). */
  publicId: string | null;
}

export function resolvePublicGate({
  hasValidToken,
  claims,
  publicId,
}: PublicGateInput): PublicGateDecision {
  if (!hasValidToken) {
    return publicId ? 'public-login' : 'login-redirect';
  }
  if (claims?.isPublic === true) {
    return publicId !== null && claims.sub !== publicId
      ? 'relogin-public'
      : 'render';
  }
  // Logged-in user: ignore publicId, render as themselves.
  return 'render';
}

/**
 * Query string with the `publicId` param stripped (the other params —
 * `?state=`, `?reload=` — survive). Input is a raw `location.search`
 * (leading `?` optional); the leading `?` is kept iff params remain.
 */
export function stripPublicIdParam(search: string): string {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  params.delete('publicId');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * The login redirect target for an anonymous visitor (old access-gate exit
 * and dead publicId link parity): the current path with publicId stripped,
 * carried through `?redirect=` for the post-login bounce.
 */
export function loginRedirectUrl(
  pathname: string,
  search: string,
  hash: string,
): string {
  const target = `${pathname}${stripPublicIdParam(search)}${hash}`;
  return `/user/login?redirect=${encodeURIComponent(target)}`;
}
