/**
 * Two-factor-auth wire types (handwritten).
 *
 * Platform settings domain — GET/POST /api/2fa/settings, pinned against
 * PlatformTwoFaSettings.java and the TwoFaProviderConfig family
 * (TOTP/SMS/EMAIL/BACKUP_CODE).
 *
 * Account + login-line domain — /api/auth/2fa (TwoFactorAuthController) and
 * /api/2fa (TwoFactorAuthConfigController), pinned against TwoFaProviderInfo
 * and the TwoFaAccountConfig family in the openapi snapshot.
 */

export type TwoFaProviderType = 'TOTP' | 'SMS' | 'EMAIL' | 'BACKUP_CODE';

export interface TotpTwoFaProviderConfig {
  providerType: 'TOTP';
  issuerName: string;
}

export interface SmsTwoFaProviderConfig {
  providerType: 'SMS';
  smsVerificationMessageTemplate: string;
  verificationCodeLifetime: number;
}

export interface EmailTwoFaProviderConfig {
  providerType: 'EMAIL';
  verificationCodeLifetime: number;
}

export interface BackupCodeTwoFaProviderConfig {
  providerType: 'BACKUP_CODE';
  codesQuantity: number;
}

export type TwoFaProviderConfig =
  | TotpTwoFaProviderConfig
  | SmsTwoFaProviderConfig
  | EmailTwoFaProviderConfig
  | BackupCodeTwoFaProviderConfig;

/** Wire form of `enforcedUsersFilter` (SystemLevelUsersFilter family). */
export type SystemLevelUsersFilter =
  | { type: 'ALL_USERS' }
  | { type: 'SYSTEM_ADMINISTRATORS' }
  | {
      type: 'TENANT_ADMINISTRATORS';
      tenantsIds?: string[];
      tenantProfilesIds?: string[];
    };

/** GET/POST /api/2fa/settings body (PlatformTwoFaSettings). */
export interface PlatformTwoFaSettings {
  providers: TwoFaProviderConfig[];
  minVerificationCodeSendPeriod: number;
  /** `"<attempts>:<seconds>"` or null/undefined when the limit is off. */
  verificationCodeCheckRateLimit?: string;
  maxVerificationFailuresBeforeUserLockout?: number;
  totalAllowedTimeForVerification: number;
  enforceTwoFa: boolean;
  enforcedUsersFilter?: SystemLevelUsersFilter;
}

/** GET /api/auth/2fa/providers row — login-line choice card (`contact` is masked). */
export interface TwoFaProviderInfo {
  type: TwoFaProviderType;
  default: boolean;
  contact: string;
  /** Resend cooldown in seconds (server may send 0). */
  minVerificationCodeSendPeriod: number;
}

/** GET /api/2fa/account/settings body (TwoFactorAuthConfigController). */
export interface AccountTwoFaSettings {
  configs: Partial<Record<TwoFaProviderType, TwoFaAccountConfig>>;
}

export interface TotpTwoFaAccountConfig {
  providerType: 'TOTP';
  /** otpauth:// URL — rendered as a QR code client-side. */
  authUrl: string;
  useByDefault: boolean;
}

export interface SmsTwoFaAccountConfig {
  providerType: 'SMS';
  phoneNumber: string;
  useByDefault: boolean;
}

export interface EmailTwoFaAccountConfig {
  providerType: 'EMAIL';
  email: string;
  useByDefault: boolean;
}

export interface BackupCodeTwoFaAccountConfig {
  providerType: 'BACKUP_CODE';
  /** Present right after generate; settings reads only report `codesLeft`. */
  codes?: string[];
  codesLeft: number;
  useByDefault: boolean;
}

/** Per-user 2FA config, discriminated by `providerType`. */
export type TwoFaAccountConfig =
  | TotpTwoFaAccountConfig
  | SmsTwoFaAccountConfig
  | EmailTwoFaAccountConfig
  | BackupCodeTwoFaAccountConfig;
