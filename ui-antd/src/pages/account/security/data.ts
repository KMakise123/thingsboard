/**
 * Security page transforms (account domain, brief §2-E) — pure functions
 * behind the ui-ngx security.component: the JWT-token card reads the ui-ngx
 * verbatim localStorage keys, the 2FA card joins the platform-enabled
 * providers with the account settings configs, and the change-password
 * failure is graded off the server `detail` (brief §1.5).
 */
import { ServerErrorError } from '@/core/http/server-error';
import type {
  AccountTwoFaSettings,
  TwoFaAccountConfig,
  TwoFaProviderType,
} from '@/types/tb/two-fa';

/** Canonical display order of the provider rows (ui-ngx provider order). */
export const PROVIDER_ROW_ORDER: Array<TwoFaProviderType> = [
  'TOTP',
  'SMS',
  'EMAIL',
  'BACKUP_CODE',
];

// ---- JWT token card ----

/** `jwt_token_expiration` → epoch ms; null when absent/corrupt. */
export function jwtExpirationDate(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * ui-ngx copyToken rule: `+expiration < Date.now()` means the copied
 * `Bearer` string is already dead.
 */
export function jwtTokenExpired(raw: string | null): boolean {
  const expiration = jwtExpirationDate(raw);
  return expiration === null || expiration < Date.now();
}

/** otpauth:// URL → the `secret` query param (plain-text key display). */
export function parseAuthUrlSecret(authUrl: string): string {
  try {
    return new URL(authUrl).searchParams.get('secret') ?? '';
  } catch {
    return '';
  }
}

// ---- 2FA rows ----

/** Platform-enabled types in canonical row order. */
export function orderedProviderRows(
  providerTypes: Array<TwoFaProviderType>,
  order: Array<TwoFaProviderType> = PROVIDER_ROW_ORDER,
): Array<TwoFaProviderType> {
  return order.filter((type) => providerTypes.includes(type));
}

function configOf(
  settings: AccountTwoFaSettings | undefined,
  providerType: TwoFaProviderType,
): TwoFaAccountConfig | undefined {
  return settings?.configs?.[providerType];
}

/** The row counts as enabled when the account settings carry the config. */
export function settingsHasConfig(
  settings: AccountTwoFaSettings | undefined,
  providerType: TwoFaProviderType,
): boolean {
  return configOf(settings, providerType) !== undefined;
}

/**
 * The activated-row interpolation (ui-ngx providerDataInfo): EMAIL → email,
 * SMS → phoneNumber, BACKUP_CODE → codesLeft. TOTP has no dataInfo.
 */
export function providerDataInfo(
  providerType: TwoFaProviderType,
  settings: AccountTwoFaSettings | undefined,
): string | number | undefined {
  const config = configOf(settings, providerType);
  if (!config) {
    return undefined;
  }
  switch (config.providerType) {
    case 'EMAIL':
      return config.email;
    case 'SMS':
      return config.phoneNumber;
    case 'BACKUP_CODE':
      return config.codesLeft;
    default:
      return undefined;
  }
}

/** The config flagged `useByDefault`, or null when none is. */
export function defaultProviderType(
  settings: AccountTwoFaSettings | undefined,
): TwoFaProviderType | null {
  for (const [type, config] of Object.entries(settings?.configs ?? {})) {
    if (config?.useByDefault) {
      return type as TwoFaProviderType;
    }
  }
  return null;
}

/**
 * ui-ngx rule: BACKUP_CODE cannot stand alone — its switch locks while no
 * OTHER provider is active (row set = platform providers, actives read from
 * the account settings).
 */
export function backupCodesLocked(
  activeTypes: Array<TwoFaProviderType>,
  _settings: AccountTwoFaSettings | undefined,
  providerRows: Array<TwoFaProviderType> = PROVIDER_ROW_ORDER,
): boolean {
  const othersActive = providerRows.some(
    (type) => type !== 'BACKUP_CODE' && activeTypes.includes(type),
  );
  return !othersActive;
}

/** E.164-ish phone gate for the SMS dialog (ui-ngx phoneNumberPattern). */
export function smsPhoneValid(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/** TOTP/SMS/EMAIL verification codes are exactly 6 digits. */
export function verificationCodeValid(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Non-BACKUP_CODE actives — ui-ngx counts only these when deciding whether
 * the "main method" selector shows.
 */
export function mainMethodCandidates(
  activeTypes: Array<TwoFaProviderType>,
): Array<TwoFaProviderType> {
  return PROVIDER_ROW_ORDER.filter(
    (type) => type !== 'BACKUP_CODE' && activeTypes.includes(type),
  );
}

// ---- change password error grading (brief §1.5, ui-ngx onChangePassword) ----

export type ChangePasswordError =
  | { kind: 'currentPassword' }
  | { kind: 'policyReload' }
  | { kind: 'alreadyUsed'; detail: string }
  | { kind: 'rateLimited' }
  | { kind: 'toast'; error: unknown };

export function changePasswordError(error: unknown): ChangePasswordError {
  const detail =
    error instanceof ServerErrorError ? error.detail : String(error);
  const status = error instanceof ServerErrorError ? error.status : 0;
  if (detail === "Current password doesn't match!") {
    return { kind: 'currentPassword' };
  }
  if (detail.startsWith('Password must')) {
    return { kind: 'policyReload' };
  }
  if (detail.startsWith('Password was already used')) {
    return { kind: 'alreadyUsed', detail };
  }
  if (status === 429) {
    return { kind: 'rateLimited' };
  }
  return { kind: 'toast', error };
}
