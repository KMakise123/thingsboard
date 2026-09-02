/**
 * MFA login-step transforms (login line, brief §2-B) — pure helpers for the
 * /user/mfa verification page: provider defaulting, the per-provider code
 * input spec and the typed-input mask. Transport and DOM effects stay in
 * the component.
 */
import type { TwoFaProviderInfo, TwoFaProviderType } from '@/types/tb/two-fa';

export interface VerificationCodeSpec {
  maxLength: number;
  inputMode: 'numeric' | 'text';
  /** Accepted characters (used for the input mask and the final check). */
  pattern: RegExp;
}

/** SMS / EMAIL / TOTP: exactly 6 digits. */
export const DIGIT_CODE_SPEC: VerificationCodeSpec = {
  maxLength: 6,
  inputMode: 'numeric',
  pattern: /^\d*$/,
};

/** ui-ngx backup-code shape: exactly 8 lowercase hex characters. */
export const BACKUP_CODE_SPEC: VerificationCodeSpec = {
  maxLength: 8,
  inputMode: 'text',
  pattern: /^[0-9a-f]*$/,
};

export function codeSpecFor(provider: TwoFaProviderType): VerificationCodeSpec {
  return provider === 'BACKUP_CODE' ? BACKUP_CODE_SPEC : DIGIT_CODE_SPEC;
}

/**
 * Input mask: keep only the characters the provider accepts (a typed
 * uppercase hex letter is dropped, parity with the ngx `/^[\dabcdef]*$/`
 * pattern) and clamp to the code length.
 */
export function maskVerificationCode(
  value: string,
  provider: TwoFaProviderType,
): string {
  const spec = codeSpecFor(provider);
  return Array.from(value)
    .filter((char) => spec.pattern.test(char))
    .join('')
    .slice(0, spec.maxLength);
}

/**
 * The provider preselected on page entry: the one flagged `default:true`,
 * otherwise null (ui-ngx parity — with no default the page opens on the
 * "select a way to verify" list).
 */
export function pickDefaultProvider(
  providers: TwoFaProviderInfo[],
): TwoFaProviderInfo | null {
  return providers.find((provider) => provider.default) ?? null;
}

/** Resend cooldown floor — the server may send 0 (brief §2-B: `|| 30`). */
export function resendCooldown(period: number | undefined): number {
  return period && period > 0 ? period : 30;
}

/**
 * Providers that get a code pushed to them. TOTP codes come from the
 * authenticator app and backup codes are pre-issued, so neither is ever
 * "sent" (ui-ngx only ever sends for SMS/EMAIL).
 */
export function providerReceivesCode(provider: TwoFaProviderType): boolean {
  return provider === 'SMS' || provider === 'EMAIL';
}
