/**
 * Admin-settings transport (handwritten) — settings domain (spec 3.7).
 *
 * Endpoints (AdminController.java, SA only):
 *   GET  /api/admin/settings/{key}        → AdminSettings<T> (key general |
 *       connectivity | mail | ...; the mail read strips the password)
 *   POST /api/admin/settings              → AdminSettings<T> (create/update)
 *   POST /api/admin/settings/testMail     → void (sends to the current SA user)
 *   GET  /api/admin/mail/oauth2/loginProcessingUrl → string (path suffix)
 *   GET  /api/admin/mail/oauth2/authorize → string (external IdP redirect URI;
 *       the browser follows it, ui-ngx mail-server generateAccessToken)
 *   GET  /api/mail/config/template        → MailConfigTemplate[]
 */

import type {
  AdminSettings,
  MailConfigTemplate,
  MailServerSettings,
} from '@/types/tb/admin';

import { tbHttp } from './http';

/** Read one settings bucket by key (e.g. `general`, `connectivity`, `mail`). */
export async function getAdminSettings<T>(
  key: string,
): Promise<AdminSettings<T>> {
  return tbHttp.get<AdminSettings<T>>(`/api/admin/settings/${key}`);
}

/** Create or update one settings bucket (the body carries key + jsonValue). */
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
