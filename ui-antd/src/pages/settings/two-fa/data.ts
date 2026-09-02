/**
 * Two-FA settings form transforms (settings domain, spec 3.7) — pure
 * functions extracted from the ui-ngx two-factor-auth-settings component:
 * the wire rate-limit string splits into enable/number/time form fields,
 * enabled providers detach their `enable` flag, and the enforced-users
 * filter drops its UI-only `filterByTenants` discriminator.
 */
import type {
  PlatformTwoFaSettings,
  TwoFaProviderConfig,
  TwoFaProviderType,
} from '@/types/tb/two-fa';

export const TWO_FA_PROVIDER_TYPES: TwoFaProviderType[] = [
  'TOTP',
  'SMS',
  'EMAIL',
  'BACKUP_CODE',
];

/**
 * The literal `${code}` placeholder the SMS template must carry — spelled
 * as interpolation so the source is not mistaken for one.
 */
const SMS_CODE_PLACEHOLDER = `${'$'}{code}`;

export const TWO_FA_DEFAULTS = {
  maxVerificationFailuresBeforeUserLockout: 30,
  totalAllowedTimeForVerification: 3600,
  minVerificationCodeSendPeriod: 30,
  rateLimitNumber: 3,
  rateLimitTime: 900,
  issuerName: 'ThingsBoard',
  smsVerificationMessageTemplate: `Verification code: ${SMS_CODE_PLACEHOLDER}`,
  verificationCodeLifetime: 120,
  codesQuantity: 10,
} as const;

export interface ProviderFormValue {
  providerType: TwoFaProviderType;
  enable: boolean;
  issuerName?: string;
  smsVerificationMessageTemplate?: string;
  verificationCodeLifetime?: number;
  codesQuantity?: number;
}

export interface TwoFaFormValues {
  enforceTwoFa: boolean;
  enforcedUsersFilter: {
    type: 'ALL_USERS' | 'TENANT_ADMINISTRATORS' | 'SYSTEM_ADMINISTRATORS';
    /** UI-only: pick which id list the TENANT_ADMINISTRATORS branch uses. */
    filterByTenants: boolean;
    tenantsIds?: string[];
    tenantProfilesIds?: string[];
  };
  maxVerificationFailuresBeforeUserLockout?: number;
  totalAllowedTimeForVerification: number;
  minVerificationCodeSendPeriod: number;
  verificationCodeCheckRateLimitEnable: boolean;
  verificationCodeCheckRateLimitNumber: number;
  verificationCodeCheckRateLimitTime: number;
  providers: Array<ProviderFormValue>;
}

/** `"3:900"` → `[3, 900]`; absent/off → `[0, 0]` (ui-ngx splitRateLimit). */
export function splitRateLimit(value?: string | null): [number, number] {
  if (value?.includes(':')) {
    const [attempts, seconds] = value.split(':');
    const parsedAttempts = Number.parseInt(attempts, 10);
    const parsedSeconds = Number.parseInt(seconds, 10);
    return [
      Number.isNaN(parsedAttempts) ? 0 : parsedAttempts,
      Number.isNaN(parsedSeconds) ? 0 : parsedSeconds,
    ];
  }
  return [0, 0];
}

function providerDefaults(providerType: TwoFaProviderType): ProviderFormValue {
  switch (providerType) {
    case 'TOTP':
      return {
        providerType,
        enable: false,
        issuerName: TWO_FA_DEFAULTS.issuerName,
      };
    case 'SMS':
      return {
        providerType,
        enable: false,
        smsVerificationMessageTemplate:
          TWO_FA_DEFAULTS.smsVerificationMessageTemplate,
        verificationCodeLifetime: TWO_FA_DEFAULTS.verificationCodeLifetime,
      };
    case 'EMAIL':
      return {
        providerType,
        enable: false,
        verificationCodeLifetime: TWO_FA_DEFAULTS.verificationCodeLifetime,
      };
    case 'BACKUP_CODE':
      return {
        providerType,
        enable: false,
        codesQuantity: TWO_FA_DEFAULTS.codesQuantity,
      };
  }
}

/** Wire settings → form value (ui-ngx setAuthConfigFormValue). */
export function toTwoFaFormValue(
  settings?: PlatformTwoFaSettings | null,
): TwoFaFormValues {
  const [limitNumber, limitTime] = splitRateLimit(
    settings?.verificationCodeCheckRateLimit,
  );
  const configured = new Map<TwoFaProviderType, TwoFaProviderConfig>();
  for (const provider of settings?.providers ?? []) {
    configured.set(provider.providerType, provider);
  }
  const filter = settings?.enforcedUsersFilter;
  const tenantsIds =
    filter?.type === 'TENANT_ADMINISTRATORS' ? (filter.tenantsIds ?? []) : [];
  const tenantProfilesIds =
    filter?.type === 'TENANT_ADMINISTRATORS'
      ? (filter.tenantProfilesIds ?? [])
      : [];
  return {
    enforceTwoFa: settings?.enforceTwoFa ?? false,
    enforcedUsersFilter: {
      type: filter?.type ?? 'ALL_USERS',
      // ui-ngx: tenants branch unless the wire carried profile ids.
      filterByTenants: !(
        filter?.type === 'TENANT_ADMINISTRATORS' &&
        Array.isArray(filter.tenantProfilesIds)
      ),
      tenantsIds,
      tenantProfilesIds,
    },
    maxVerificationFailuresBeforeUserLockout:
      settings?.maxVerificationFailuresBeforeUserLockout ??
      TWO_FA_DEFAULTS.maxVerificationFailuresBeforeUserLockout,
    totalAllowedTimeForVerification:
      settings?.totalAllowedTimeForVerification ??
      TWO_FA_DEFAULTS.totalAllowedTimeForVerification,
    minVerificationCodeSendPeriod:
      settings?.minVerificationCodeSendPeriod ??
      TWO_FA_DEFAULTS.minVerificationCodeSendPeriod,
    verificationCodeCheckRateLimitEnable: limitNumber > 0,
    verificationCodeCheckRateLimitNumber:
      limitNumber || TWO_FA_DEFAULTS.rateLimitNumber,
    verificationCodeCheckRateLimitTime:
      limitTime || TWO_FA_DEFAULTS.rateLimitTime,
    providers: TWO_FA_PROVIDER_TYPES.map((providerType) => {
      const found = configured.get(providerType);
      if (!found) {
        return providerDefaults(providerType);
      }
      return { ...providerDefaults(providerType), ...found, enable: true };
    }),
  };
}

/** Form value → wire settings (ui-ngx save(): join + strip UI-only flags). */
export function toTwoFaSettingsPayload(
  values: TwoFaFormValues,
): PlatformTwoFaSettings {
  const { verificationCodeCheckRateLimitEnable: enable, ...rest } = values;
  const rateLimit = enable
    ? `${rest.verificationCodeCheckRateLimitNumber}:${rest.verificationCodeCheckRateLimitTime}`
    : undefined;
  // The filter block unmounts when enforce is off, so callers reading
  // validateFields() output lose it — fall back to the all-users default.
  const filter =
    rest.enforcedUsersFilter ??
    ({
      type: 'ALL_USERS',
    } as TwoFaFormValues['enforcedUsersFilter']);
  const filterType = filter.type;
  let enforcedUsersFilter: PlatformTwoFaSettings['enforcedUsersFilter'];
  if (filterType === 'TENANT_ADMINISTRATORS') {
    enforcedUsersFilter =
      filter.filterByTenants === true
        ? {
            type: filterType,
            tenantsIds: filter.tenantsIds ?? [],
            tenantProfilesIds: undefined,
          }
        : {
            type: filterType,
            tenantsIds: undefined,
            tenantProfilesIds: filter.tenantProfilesIds ?? [],
          };
  } else {
    enforcedUsersFilter = { type: filterType };
  }
  return {
    providers: rest.providers
      .filter((provider) => provider.enable)
      .map((provider): TwoFaProviderConfig => {
        const { enable: _ignored, ...config } = provider;
        return config as TwoFaProviderConfig;
      }),
    minVerificationCodeSendPeriod: rest.minVerificationCodeSendPeriod,
    verificationCodeCheckRateLimit: rateLimit,
    maxVerificationFailuresBeforeUserLockout:
      rest.maxVerificationFailuresBeforeUserLockout,
    totalAllowedTimeForVerification: rest.totalAllowedTimeForVerification,
    enforceTwoFa: rest.enforceTwoFa,
    enforcedUsersFilter,
  };
}

/**
 * ui-ngx constraint: BACKUP_CODE cannot be the ONLY enabled provider —
 * its switch locks when nothing else is active.
 */
export function backupCodeSwitchDisabled(
  providers: Array<ProviderFormValue> | undefined,
): boolean {
  if (!providers) {
    return true;
  }
  const active = providers.filter((provider) => provider.enable);
  return (
    active.length === 0 ||
    (active.length === 1 && active[0].providerType === 'BACKUP_CODE')
  );
}

/** The SMS template must carry the ${code} placeholder. */
export function smsTemplateValid(template: string | undefined): boolean {
  return typeof template === 'string' && /\$\{code\}/.test(template);
}

/** Enforce-2FA requires at least one enabled provider. */
export function anyProviderEnabled(
  providers: Array<ProviderFormValue> | undefined,
): boolean {
  return (providers ?? []).some((provider) => provider.enable);
}
