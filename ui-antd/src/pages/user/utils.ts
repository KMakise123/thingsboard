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
 *
 * M15 handover (brief wave-1/2, arch R39): this pre-M15 lookup still feeds
 * the five landing consumers (login / entry / mfa / impersonation / 404).
 * Wave 2 switches them to `resolveDefaultPath` below together with the
 * /home route — switching earlier would bounce users onto a /home that does
 * not exist yet. This function retires once the last consumer moves.
 */
export function roleDefaultPath(user?: User | null): string {
  return user?.authority === Authority.SYS_ADMIN ? '/tenants' : '/devices';
}

/**
 * M15 landing decision, priority below `?redirect` (callers keep
 * `getSafeRedirectUrl` first): TA/CU holding a user-level
 * `additionalInfo.defaultDashboardId` land straight on the shell-less
 * dashboard route (`/dashboard/{id}` — no separate fullscreen form: the
 * shell-less page IS the fullscreen semantics, arch R39); everyone else —
 * SA always, and any unconfigured user — lands on `/home`.
 *
 * `defaultDashboardId` is a plain UUID string in the `/api/auth/user`
 * response and arrives server-sanitized (BaseController.checkDashboardInfo
 * deletes the key when the dashboard is gone), so a hit needs no second
 * probe; the `defaultDashboardFullscreen` flag collapses into the same
 * single form. The string type-guard narrows `additionalInfo`'s declared
 * `Record<string, unknown>`.
 */
export function resolveDefaultPath(user?: User | null): string {
  const authority = user?.authority;
  if (
    authority !== Authority.TENANT_ADMIN &&
    authority !== Authority.CUSTOMER_USER
  ) {
    // SA never takes the defaultDashboard branch (ngx defaultUrl parity).
    return '/home';
  }
  const dashboardId = user?.additionalInfo?.defaultDashboardId;
  if (typeof dashboardId === 'string' && dashboardId) {
    return `/dashboard/${dashboardId}`;
  }
  return '/home';
}
