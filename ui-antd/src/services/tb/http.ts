/**
 * Shared HTTP client for the TB transport layer (services/tb/*).
 *
 * Every function in this directory goes through `tbHttp` — the single
 * HTTP exit seam owned by core/http. This module only owns instance
 * configuration (Accept-Language source, unauthorized exit) so the app
 * can retarget them without recreating services.
 */

import { createTbHttpClient, type TbHttpClient, type UnauthorizedEvent } from '@/core/http/client';

let languageSource: () => string = () =>
  typeof navigator !== 'undefined' ? navigator.language : 'en';

/** Redirect Accept-Language (call from the locale bootstrap). */
export function setTbLanguage(source: () => string): void {
  languageSource = source;
}

let unauthorizedHandler: ((event: UnauthorizedEvent) => void) | undefined;

/**
 * Register the app-layer exit for a failed token refresh (issue #7/#8:
 * clear + redirect belongs to the composition root, e.g. app.tsx).
 * Fires exactly once per failed refresh flight.
 */
export function setTbUnauthorizedHandler(
  handler: (event: UnauthorizedEvent) => void,
): void {
  unauthorizedHandler = handler;
}

export const tbHttp: TbHttpClient = createTbHttpClient({
  language: () => languageSource(),
  onUnauthorized: (event) => unauthorizedHandler?.(event),
});
