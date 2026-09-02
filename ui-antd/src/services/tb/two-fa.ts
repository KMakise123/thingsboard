/**
 * Platform two-factor-auth settings transport (handwritten) — settings
 * domain (spec 3.7). Endpoints (TwoFactorAuthConfigController.java, SA only):
 *
 *   GET  /api/2fa/settings → PlatformTwoFaSettings
 *   POST /api/2fa/settings → PlatformTwoFaSettings
 */

import type { PlatformTwoFaSettings } from '@/types/tb/two-fa';

import { tbHttp } from './http';

export async function getTwoFaSettings(): Promise<PlatformTwoFaSettings> {
  return tbHttp.get<PlatformTwoFaSettings>('/api/2fa/settings');
}

export async function saveTwoFaSettings(
  settings: PlatformTwoFaSettings,
): Promise<PlatformTwoFaSettings> {
  return tbHttp.post<PlatformTwoFaSettings>('/api/2fa/settings', settings);
}
