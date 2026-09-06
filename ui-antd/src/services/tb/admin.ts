/**
 * Admin-settings transport (handwritten) — settings domain (spec 3.7) +
 * the M14 security/JWT/SMS family (wave-1).
 *
 * Endpoints (AdminController.java, SA only):
 *   GET  /api/admin/settings/{key}        → AdminSettings<T> (key general |
 *       connectivity | mail | ...; the mail read strips the password)
 *   POST /api/admin/settings              → AdminSettings<T> (create/update)
 *   POST /api/admin/settings/testMail     → void (sends to the current SA user)
 *   POST /api/admin/settings/testSms      → void (sends from the given
 *       provider configuration, no save)
 *   GET/POST /api/admin/securitySettings  → SecuritySettings (GET never 404s)
 *   GET/POST /api/admin/jwtSettings       → JwtSettings / fresh JwtPair
 *   GET  /api/admin/mail/oauth2/loginProcessingUrl → string (path suffix)
 *   GET  /api/admin/mail/oauth2/authorize → string (external IdP redirect URI;
 *       the browser follows it, ui-ngx mail-server generateAccessToken)
 *   GET  /api/mail/config/template        → MailConfigTemplate[]
 */

import type {
  AdminSettings,
  JwtPair,
  JwtSettings,
  MailConfigTemplate,
  MailServerSettings,
  SecuritySettings,
  TestSmsRequest,
} from '@/types/tb/admin';

import { tbHttp } from './http';

/** Read one settings bucket by key (e.g. `general`, `connectivity`, `mail`). */
export async function getAdminSettings<T>(
  key: string,
): Promise<AdminSettings<T>> {
  return tbHttp.get<AdminSettings<T>>(`/api/admin/settings/${key}`);
}

/**
 * Create or update one settings bucket.
 *
 * SAVE CONTRACT (M14 wave-1, contract #2): the server treats a body
 * WITHOUT `id` as "create this key" — and every well-known bucket
 * (general/mail/connectivity) is pre-created at bootstrap, so a save
 * without the snapshot id 400s with "Admin settings with such name
 * already exists!". ALWAYS merge changes into the GET snapshot and send
 * the whole AdminSettings object back — `id` included. Never fabricate a
 * fresh `{key, jsonValue}` payload.
 */
export async function saveAdminSettings<T>(
  settings: AdminSettings<T>,
): Promise<AdminSettings<T>> {
  return tbHttp.post<AdminSettings<T>>('/api/admin/settings', settings);
}

/** Send a test mail built from the given mail settings (SA user's inbox). */
export async function sendTestMail(
  settings: AdminSettings<MailServerSettings>,
): Promise<void> {
  await tbHttp.post<void>('/api/admin/settings/testMail', settings);
}

/** Path suffix the mail provider must redirect back to (no host prefix). */
export async function getMailOauth2LoginProcessingUrl(): Promise<string> {
  return tbHttp.get<string>('/api/admin/mail/oauth2/loginProcessingUrl');
}

/**
 * External authorize URI for the mail OAuth2 token flow — navigating the
 * browser to it starts the provider consent (ui-ngx sets window.location).
 */
export async function generateMailOauth2AccessToken(): Promise<string> {
  return tbHttp.get<string>('/api/admin/mail/oauth2/authorize');
}

/** Provider presets (Office 365, Sendgrid, ...) for the SMTP provider select. */
export async function getMailConfigTemplates(): Promise<
  MailConfigTemplate[]
> {
  return tbHttp.get<MailConfigTemplate[]>('/api/mail/config/template');
}

/**
 * GET /api/admin/securitySettings — password policy + lockout knobs.
 * NEVER 404s: unconfigured tenants get the server defaults (contract #6).
 */
export async function getSecuritySettings(): Promise<SecuritySettings> {
  return tbHttp.get<SecuritySettings>('/api/admin/securitySettings');
}

/**
 * POST /api/admin/securitySettings. passwordPolicy fields have NO
 * server-side range validation — max ≤ min silently disables the upper
 * bound — so the caller validates (front-end validation is the only
 * defense, contract #6).
 */
export async function saveSecuritySettings(
  settings: SecuritySettings,
): Promise<SecuritySettings> {
  return tbHttp.post<SecuritySettings>(
    '/api/admin/securitySettings',
    settings,
  );
}

/** GET /api/admin/jwtSettings — current token policy. */
export async function getJwtSettings(): Promise<JwtSettings> {
  return tbHttp.get<JwtSettings>('/api/admin/jwtSettings');
}

/**
 * POST /api/admin/jwtSettings — the response is a FRESH JwtPair for the
 * CURRENT user, issued unconditionally (whether or not issuer/key
 * changed). Callers must swap it into the token store and refresh the
 * session; whether OLD tokens keep working depends only on the signing
 * key being unchanged (contract #5).
 */
export async function saveJwtSettings(
  settings: JwtSettings,
): Promise<JwtPair> {
  return tbHttp.post<JwtPair>('/api/admin/jwtSettings', settings);
}

/**
 * POST /api/admin/settings/testSms — sends from the given provider
 * configuration WITHOUT saving it (SA only). Failures throw with the
 * underlying cause embedded in the error message.
 */
export async function sendTestSms(request: TestSmsRequest): Promise<void> {
  await tbHttp.post<void>('/api/admin/settings/testSms', request);
}
