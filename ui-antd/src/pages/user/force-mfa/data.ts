/**
 * Force-MFA enrollment transforms (login line, brief §2-C) — pure helpers
 * for /user/force-mfa: the SETUP provider list, the otpauth secret parse,
 * the first-activation default flag, the SMS phone pattern and the
 * backup-codes export text. Transport and DOM effects stay in the component.
 */
import type {
  AccountTwoFaSettings,
  TwoFaProviderType,
} from '@/types/tb/two-fa';

/** Canonical SETUP order (ui-ngx provider iteration order). */
export const FORCE_MFA_PROVIDER_ORDER: TwoFaProviderType[] = [
  'TOTP',
  'SMS',
  'EMAIL',
  'BACKUP_CODE',
];

/**
 * The SETUP list: platform-enabled providers in canonical order.
 * BACKUP_CODE joins only when the account already keeps at least one
 * config — a fresh account must activate a real provider first (ui-ngx
 * allowedProviders parity).
 */
export function forceMfaProviderList(
  available: TwoFaProviderType[],
  hasExistingConfig: boolean,
): TwoFaProviderType[] {
  const enabled = new Set(available);
  return FORCE_MFA_PROVIDER_ORDER.filter(
    (type) =>
      enabled.has(type) && (type !== 'BACKUP_CODE' || hasExistingConfig),
  );
}

/** Parse the plain secret out of the otpauth:// authUrl (null if absent). */
export function parseTotpSecret(authUrl: string): string | null {
  try {
    return new URL(authUrl).searchParams.get('secret');
  } catch {
    return null;
  }
}

/**
 * True while the account still has NO activated provider: the first
 * activation is stamped useByDefault=true, every later one false
 * (brief §2-C). An absent settings body counts as empty.
 */
export function firstActivationIsDefault(
  settings?: AccountTwoFaSettings | null,
): boolean {
  const configs = settings?.configs;
  return !configs || Object.keys(configs).length === 0;
}

/** Whether SETUP can still offer providers beyond the configured ones. */
export function moreProvidersAvailable(
  allowed: TwoFaProviderType[],
  settings?: AccountTwoFaSettings | null,
): boolean {
  const configured = settings?.configs
    ? Object.keys(settings.configs).length
    : 0;
  return allowed.length > configured;
}

/** ui-ngx phone-input pattern: strict E.164 (+, country code 1-9, ≤15 digits). */
export const PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

/** Backup codes export: one code per line (ui-ngx exportText parity). */
export function backupCodesText(codes: string[]): string {
  return codes.join('\n');
}
