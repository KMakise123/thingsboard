/**
 * Platform two-factor-auth settings wire types (handwritten) —
 * GET/POST /api/2fa/settings. Shapes pinned against PlatformTwoFaSettings.java
 * and the TwoFaProviderConfig family (TOTP/SMS/EMAIL/BACKUP_CODE).
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
