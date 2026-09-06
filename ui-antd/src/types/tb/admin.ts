/**
 * Admin-settings wire types (handwritten) — /api/admin/settings family,
 * security/JWT settings, SMS provider configs and the mail OAuth2
 * templates. Shapes pinned against the Java models (AdminController /
 * settings.models of ui-ngx parity).
 */

import type { Authority } from './user';

/**
 * Generic envelope: POST /api/admin/settings returns the same shape.
 *
 * SAVE CONTRACT (wave-1, contract #2): the POST is "no id → create,
 * with id → update". System bootstrap pre-creates the well-known buckets
 * (general/mail/connectivity), so saving a bucket WITHOUT its snapshot id
 * 400s with "Admin settings with such name already exists!". Always merge
 * changes into the GET snapshot and echo the whole object — id included —
 * back through saveAdminSettings.
 */
export interface AdminSettings<T> {
  /** Snapshot id from GET; REQUIRED on save (see the save contract above). */
  id?: string;
  key: string;
  jsonValue: T;
}

/** key=`general` payload. */
export interface GeneralSettings {
  baseUrl: string;
  prohibitDifferentUrl: boolean;
}

export type DeviceConnectivityProtocol =
  | 'http'
  | 'https'
  | 'mqtt'
  | 'mqtts'
  | 'coap'
  | 'coaps';

/** One protocol row: enable switch + host/port (port 1..65535). */
export interface DeviceConnectivityInfo {
  enabled: boolean;
  host: string;
  port?: number;
}

/** key=`connectivity` payload: six protocol rows. */
export type DeviceConnectivitySettings = Record<
  DeviceConnectivityProtocol,
  DeviceConnectivityInfo
>;

/** key=`mail` payload (server strips password on read). */
export interface MailServerSettings {
  mailFrom: string;
  smtpProtocol: 'SMTP' | 'SMTPS';
  smtpHost: string;
  smtpPort: number;
  timeout: number;
  enableTls: boolean;
  tlsVersion?: string;
  enableProxy: boolean;
  proxyHost?: string;
  proxyPort?: number;
  proxyUser?: string;
  proxyPassword?: string;
  username?: string;
  password?: string;
  enableOauth2: boolean;
  providerId: string;
  clientId?: string;
  clientSecret?: string;
  providerTenantId?: string;
  authUri?: string;
  tokenUri?: string;
  scope?: string[];
  redirectUri?: string;
  /** Server-only flag mirrored back: password field was/can be shown. */
  tokenGenerated?: boolean;
}

/** GET /api/mail/config/template row (provider preset; not a full entity). */
export interface MailConfigTemplate {
  providerId: string;
  name: string;
  smtpProtocol: 'SMTP' | 'SMTPS';
  smtpHost: string;
  smtpPort: number;
  timeout: number;
  enableTls: boolean;
  tlsVersion?: string;
  authorizationUri: string;
  accessTokenUri: string;
  scope: string[];
  helpLink?: string;
}

// ---------------------------------------------------------------------------
// Security / JWT settings (M14 wave-1; moved here from services/tb/auth.ts
// per panel-arch R10 — UserPasswordPolicy keeps its canonical home below
// and auth.ts re-exports it).
// ---------------------------------------------------------------------------

/**
 * Password policy (openapi UserPasswordPolicy; moved verbatim from
 * services/tb/auth.ts:22-34). Every field optional on the wire. The server
 * validates NOTHING here — the two TTLs on SecuritySettings are the only
 * constrained knobs — so `maximumLength ≤ minimumLength` silently disables
 * the upper bound server-side (passay treats max ≤ min as unlimited).
 * Front-end validation is the only defense (contract #6).
 */
export interface UserPasswordPolicy {
  minimumLength?: number;
  maximumLength?: number;
  minimumUppercaseLetters?: number;
  minimumLowercaseLetters?: number;
  minimumDigits?: number;
  minimumSpecialCharacters?: number;
  allowWhitespaces?: boolean;
  forceUserToResetPasswordIfNotValid?: boolean;
  /** Force expiration after N days (absent when disabled). */
  passwordExpirationPeriodDays?: number;
  /** Disallow reuse within N days (absent when disabled). */
  passwordReuseFrequencyDays?: number;
}

/** GET/POST /api/admin/securitySettings (openapi SecuritySettings). */
export interface SecuritySettings {
  passwordPolicy?: UserPasswordPolicy;
  /** Locked account after N failed logins. */
  maxFailedLoginAttempts?: number;
  /** Notification address about locked users. */
  userLockoutNotificationEmail?: string;
  mobileSecretKeyLength?: number;
  /** Activation-link TTL in hours; server-validated 1..24. */
  userActivationTokenTtl: number;
  /** Password-reset-link TTL in hours; server-validated 1..24. */
  passwordResetTokenTtl: number;
}

/** GET/POST /api/admin/jwtSettings (openapi JwtSettings). */
export interface JwtSettings {
  /** Access-token TTL in seconds. */
  tokenExpirationTime?: number;
  /** Refresh-token TTL in seconds (≥900 and > tokenExpirationTime). */
  refreshTokenExpTime?: number;
  tokenIssuer?: string;
  /** Base64-encoded signing key; decoded length ≥64 bytes. */
  tokenSigningKey?: string;
}

/**
 * Token pair — POST /api/admin/jwtSettings responds with a FRESH pair for
 * the CURRENT user (regardless of whether issuer/key changed), so callers
 * must swap it into the token store. Same shape as LoginResponse
 * (types/tb/user.ts); kept separate to keep auth and settings domains
 * decoupled.
 */
export interface JwtPair {
  token?: string;
  refreshToken?: string;
  scope?: Authority;
}

// ---------------------------------------------------------------------------
// SMS provider configurations (M14 wave-1; notifications settings R25).
// ---------------------------------------------------------------------------

export type SmsProviderType = 'AWS_SNS' | 'TWILIO' | 'SMPP';

export interface AwsSnsSmsProviderConfiguration {
  type: 'AWS_SNS';
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface TwilioSmsProviderConfiguration {
  type: 'TWILIO';
  accountSid: string;
  accountToken: string;
  numberFrom: string;
}

export interface SmppSmsProviderConfiguration {
  type: 'SMPP';
  /** SMPP version — "3.3" / "3.4" (Java @Schema allowableValues; ngx sends numbers, the server stores strings). */
  protocolVersion: '3.3' | '3.4';
  host: string;
  port: number;
  systemId: string;
  password: string;
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

export type SmsProviderConfiguration =
  | AwsSnsSmsProviderConfiguration
  | TwilioSmsProviderConfiguration
  | SmppSmsProviderConfiguration;

/** POST /api/admin/settings/testSms body — sends from the given config without saving it (SA only). */
export interface TestSmsRequest {
  providerConfiguration: SmsProviderConfiguration;
  numberTo: string;
  message: string;
}
