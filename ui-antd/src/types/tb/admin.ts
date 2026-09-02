/**
 * Admin-settings wire types (handwritten) — /api/admin/settings family and
 * the mail OAuth2 templates. Shapes pinned against the Java models
 * (AdminController / settings.models of ui-ngx parity):
 * AdminSettings = { key, jsonValue } — the payload lives in jsonValue.
 */

/** Generic envelope: POST /api/admin/settings returns the same shape. */
export interface AdminSettings<T> {
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
