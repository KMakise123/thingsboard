/**
 * Account two-factor-auth transport (handwritten) — per-user 2FA config
 * domain (spec 3.9 security card + the force-mfa flow). Endpoints
 * (TwoFactorAuthConfigController.java, /api/2fa; generate / submit / POST /
 * GET also accept the MFA_CONFIGURATION_TOKEN, PUT/DELETE need a session):
 *
 *   GET    /api/2fa/account/settings                  → AccountTwoFaSettings
 *   GET    /api/2fa/providers                         → TwoFaProviderType[]
 *   POST   /api/2fa/account/config/generate?providerType= → TwoFaAccountConfig (template)
 *   POST   /api/2fa/account/config/submit             → void (SMS/EMAIL; sends a code)
 *   POST   /api/2fa/account/config?verificationCode=  → AccountTwoFaSettings
 *   PUT    /api/2fa/account/config?providerType=      → void (body {useByDefault})
 *   DELETE /api/2fa/account/config?providerType=      → AccountTwoFaSettings
 *
 * No token side effects here — only services/tb/auth.ts touches tokenStore.
 */

import type {
  AccountTwoFaSettings,
  TwoFaAccountConfig,
  TwoFaProviderType,
} from '@/types/tb/two-fa';

import { tbHttp } from './http';

/** GET /api/2fa/account/settings */
export async function getAccountTwoFaSettings(): Promise<AccountTwoFaSettings> {
  return tbHttp.get<AccountTwoFaSettings>('/api/2fa/account/settings');
}

/** GET /api/2fa/providers — types enabled platform-wide (empty = 2FA off). */
export async function getAvailableTwoFaProviderTypes(): Promise<TwoFaProviderType[]> {
  return tbHttp.get<TwoFaProviderType[]>('/api/2fa/providers');
}

/**
 * POST /api/2fa/account/config/generate?providerType= — config template:
 * TOTP returns the otpauth:// authUrl, BACKUP_CODE returns fresh codes[];
 * SMS/EMAIL don't need a generate step.
 */
export async function generateTwoFaAccountConfig(
  providerType: TwoFaProviderType,
): Promise<TwoFaAccountConfig> {
  return tbHttp.post<TwoFaAccountConfig>(
    '/api/2fa/account/config/generate',
    undefined,
    { providerType },
  );
}

/** POST /api/2fa/account/config/submit — SMS/EMAIL submission; triggers a code. */
export async function submitTwoFaAccountConfig(
  config: TwoFaAccountConfig,
): Promise<void> {
  await tbHttp.post('/api/2fa/account/config/submit', config);
}

/**
 * POST /api/2fa/account/config?verificationCode= — verify + activate, fresh
 * settings back. `verificationCode` is undefined only for BACKUP_CODE (no
 * code step). 409 = "2FA provider is already configured".
 */
export async function verifyAndSaveTwoFaAccountConfig(
  config: TwoFaAccountConfig,
  verificationCode?: string,
): Promise<AccountTwoFaSettings> {
  return tbHttp.post<AccountTwoFaSettings>('/api/2fa/account/config', config, {
    verificationCode,
  });
}

/** PUT /api/2fa/account/config?providerType= — flip the default provider. */
export async function updateTwoFaAccountConfig(
  providerType: TwoFaProviderType,
  useByDefault: boolean,
): Promise<void> {
  await tbHttp.put(
    '/api/2fa/account/config',
    { useByDefault },
    { providerType },
  );
}

/** DELETE /api/2fa/account/config?providerType= — deactivate; fresh settings back. */
export async function deleteTwoFaAccountConfig(
  providerType: TwoFaProviderType,
): Promise<AccountTwoFaSettings> {
  return tbHttp.delete<AccountTwoFaSettings>('/api/2fa/account/config', {
    providerType,
  });
}
