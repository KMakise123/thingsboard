/**
 * Login-family helpers: redirect sanitization, role landing path and the
 * ServerError narrowing used by every auth page.
 */
import { type ServerError, ServerErrorError } from '@/core/http/server-error';
import { Authority, type User } from '@/types/tb';

/** Narrow anything thrown by services/tb into the normalized ServerError. */
export function toServerError(error: unknown): ServerError {
  if (error instanceof ServerErrorError) {
    return error;
  }
  return {
    status: 0,
    detail: error instanceof Error ? error.message : String(error),
    titleKey: 'tb.error.generic',
  };
}

/** Read one query param off the current URL (login links arrive as ?token). */
export function getQueryParam(name: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Validate the `redirect` query param to prevent open-redirect attacks:
 * only same-origin relative paths starting with a single '/' pass. Returns
 * null when absent, unsafe or plain '/' (caller falls back to the role
 * default landing page).
 */
export function getSafeRedirectUrl(redirect: string | null): string | null {
  if (!redirect?.startsWith('/') || redirect.startsWith('//')) {
    return null;
  }
  try {
    const parsed = new URL(redirect, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path === '/' ? null : path;
  } catch {
    return null;
  }
}

/**
 * Role landing page (spec §3.2). TA / CU land on the device list; SA lands
 * on the tenants list (sys-domain pages since M3).
 */
export function roleDefaultPath(user?: User | null): string {
  return user?.authority === Authority.SYS_ADMIN ? '/tenants' : '/devices';
}
