/**
 * Notification-settings conversion helpers (M14 wave-3, R25).
 *
 * The save chain mirrors ui-ngx sms-provider.component.ts saveNotification()
 * (:111-148): deepTrim the merged settings, then walk each delivery-method
 * config — if ANY field is an empty string the WHOLE method is deleted,
 * otherwise the `method` discriminator is stamped in. Like two-fa, the
 * transform runs ONCE in the save handler (single-transform lesson): the
 * pure functions here never run twice over the same payload.
 *
 * The SMS-provider half backs the sysadmin-only `sms` admin-settings bucket:
 * type discriminator + per-type defaults (ngx createSmsProviderConfiguration)
 * + the completeness matrix (ngx smsProviderConfigurationValidator).
 */
import type {
  SmsProviderConfiguration,
  SmsProviderType,
} from '@/types/tb/admin';
import type { NotificationSettings } from '@/types/tb/notification';

/** Recursive ngx deepTrim parity: trim every string leaf in a clone. */
export function deepTrim<T>(value: T): T {
  if (
    typeof value !== 'object' ||
    value === null ||
    value instanceof File ||
    value instanceof Date
  ) {
    return (typeof value === 'string' ? value.trim() : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepTrim(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] =
      typeof item === 'string'
        ? item.trim()
        : typeof item === 'object' && item !== null
          ? deepTrim(item)
          : item;
  }
  return result as T;
}

function isNotEmptyStr(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

type DeliveryMethodConfigs = NotificationSettings['deliveryMethodsConfigs'];

/**
 * Per-method cleanup (ngx saveNotification loop): a method whose config has
 * ANY empty-string field is dropped entirely; otherwise the `method`
 * discriminator is stamped in (the server requires it to pick the class).
 */
export function cleanDeliveryMethodsConfigs(
  configs: DeliveryMethodConfigs,
): DeliveryMethodConfigs {
  const result: Record<string, Record<string, unknown>> = {};
  const source = (configs ?? {}) as Record<string, Record<string, unknown>>;
  for (const method of Object.keys(source)) {
    const config = { ...source[method] };
    const fields = Object.keys(config).filter((key) => key !== 'method');
    if (fields.some((key) => !isNotEmptyStr(config[key]))) {
      continue;
    }
    config.method = method;
    result[method] = config;
  }
  return result as DeliveryMethodConfigs;
}

/**
 * Save payload of the notification-settings card (SLACK + MOBILE_APP):
 * the form value REPLACES the snapshot's deliveryMethodsConfigs wholesale
 * (ngx shallow-spread parity — both roles always carry both method groups,
 * so an untouched-but-hidden MOBILE_APP group degrades to "delete method"
 * instead of corrupting the stored config).
 */
export function toNotificationSettingsPayload(
  snapshot: NotificationSettings | undefined,
  formValue: { deliveryMethodsConfigs: DeliveryMethodConfigs },
): NotificationSettings {
  const merged = deepTrim({
    ...snapshot,
    ...formValue,
  }) as NotificationSettings;
  return {
    deliveryMethodsConfigs: cleanDeliveryMethodsConfigs(
      merged.deliveryMethodsConfigs,
    ),
  };
}

// ---------------------------------------------------------------------------
// SMS provider (sysadmin-only `sms` admin-settings bucket)
// ---------------------------------------------------------------------------

export const SMS_PROVIDER_TYPES: Array<SmsProviderType> = [
  'AWS_SNS',
  'TWILIO',
  'SMPP',
];

/** Per-type blank config (ngx createSmsProviderConfiguration defaults). */
export function createSmsProviderConfiguration(
  type: SmsProviderType,
): SmsProviderConfiguration {
  if (type === 'AWS_SNS') {
    return {
      type,
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
    };
  }
  if (type === 'TWILIO') {
    return {
      type,
      accountSid: '',
      accountToken: '',
      numberFrom: '',
    };
  }
  return {
    type: 'SMPP',
    protocolVersion: '3.3',
    host: '',
    port: 0,
    systemId: '',
    password: '',
    systemType: '',
    bindType: 'TX',
    serviceType: '',
    sourceAddress: '',
    sourceTon: 5,
    sourceNpi: 0,
    destinationTon: 5,
    destinationNpi: 0,
    addressRange: '',
    codingScheme: 0,
  };
}

/**
 * Completeness matrix (ngx smsProviderConfigurationValidator): AWS_SNS
 * needs the key pair + region, TWILIO the SID/token/sender, SMPP the
 * host/port/systemId/password quartet.
 */
export function isSmsProviderConfigurationComplete(
  configuration: SmsProviderConfiguration | null | undefined,
): boolean {
  if (!configuration) {
    return false;
  }
  if (configuration.type === 'AWS_SNS') {
    return (
      isNotEmptyStr(configuration.accessKeyId) &&
      isNotEmptyStr(configuration.secretAccessKey) &&
      isNotEmptyStr(configuration.region)
    );
  }
  if (configuration.type === 'TWILIO') {
    return (
      isNotEmptyStr(configuration.numberFrom) &&
      isNotEmptyStr(configuration.accountSid) &&
      isNotEmptyStr(configuration.accountToken)
    );
  }
  return (
    isNotEmptyStr(configuration.host) &&
    typeof configuration.port === 'number' &&
    configuration.port > 0 &&
    isNotEmptyStr(configuration.systemId) &&
    isNotEmptyStr(configuration.password)
  );
}

/** Test-SMS phone pattern (ngx phoneNumberPattern, E.164 without spaces). */
export const PHONE_NUMBER_PATTERN = /^\+[1-9]\d{1,14}$/;

/**
 * Twilio sender pattern (ngx phoneNumberPatternTwilio): E.164 number or a
 * Messaging/Phone-number SID (MG…/PN…).
 */
export const PHONE_NUMBER_PATTERN_TWILIO = /^\+[1-9]\d{1,14}$|^(MG|PN).*$/;

/**
 * Flat form shape of the SMS-provider card: `type` picks the active
 * sub-form, the config fields ride flat on the form (only the fields of
 * the active type travel into the payload — see toSmsProviderConfiguration).
 */
export interface SmsProviderFormValues {
  type?: SmsProviderType;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  accountSid?: string;
  accountToken?: string;
  numberFrom?: string;
  protocolVersion?: '3.3' | '3.4';
  host?: string;
  port?: number;
  systemId?: string;
  password?: string;
  systemType?: string;
  bindType?: 'TX' | 'RX' | 'TRX';
  serviceType?: string;
  sourceAddress?: string;
  sourceTon?: number;
  sourceNpi?: number;
  destinationTon?: number;
  destinationNpi?: number;
  addressRange?: string;
  codingScheme?: number;
}

/** Stored config → flat form values (form round-trips type + fields). */
export function toSmsFormValue(
  configuration?: SmsProviderConfiguration | null,
): SmsProviderFormValues {
  if (!configuration) {
    return {};
  }
  const { type, ...fields } = configuration;
  return { type, ...fields } as SmsProviderFormValues;
}

/**
 * Flat form values → wire configuration of the ACTIVE type only (stray
 * fields from a previously selected type never travel).
 */
export function toSmsProviderConfiguration(
  values: SmsProviderFormValues,
): SmsProviderConfiguration | undefined {
  if (!values.type) {
    return undefined;
  }
  if (values.type === 'AWS_SNS') {
    return {
      type: 'AWS_SNS',
      accessKeyId: values.accessKeyId ?? '',
      secretAccessKey: values.secretAccessKey ?? '',
      region: values.region ?? '',
    };
  }
  if (values.type === 'TWILIO') {
    return {
      type: 'TWILIO',
      accountSid: values.accountSid ?? '',
      accountToken: values.accountToken ?? '',
      numberFrom: values.numberFrom ?? '',
    };
  }
  return {
    type: 'SMPP',
    protocolVersion: values.protocolVersion ?? '3.3',
    host: values.host ?? '',
    port: values.port ?? 0,
    systemId: values.systemId ?? '',
    password: values.password ?? '',
    systemType: values.systemType,
    bindType: values.bindType,
    serviceType: values.serviceType,
    sourceAddress: values.sourceAddress,
    sourceTon: values.sourceTon,
    sourceNpi: values.sourceNpi,
    destinationTon: values.destinationTon,
    destinationNpi: values.destinationNpi,
    addressRange: values.addressRange,
    codingScheme: values.codingScheme,
  };
}
