/**
 * Shared HTTP client for the TB transport layer (services/tb/*).
 *
 * Every function in this directory goes through `tbHttp` — the single
 * HTTP exit seam owned by core/http. This module only owns instance
 * configuration (Accept-Language source) so the app can retarget locale
 * without recreating services.
 */

import { createTbHttpClient, type TbHttpClient } from '@/core/http/client';

let languageSource: () => string = () =>
  typeof navigator !== 'undefined' ? navigator.language : 'en';

/** Redirect Accept-Language (call from the locale bootstrap). */
export function setTbLanguage(source: () => string): void {
  languageSource = source;
}

export const tbHttp: TbHttpClient = createTbHttpClient({
  language: () => languageSource(),
});
