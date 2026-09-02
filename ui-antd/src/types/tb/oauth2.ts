/**
 * OAuth2 client / login-domain wire types (handwritten) — /api/oauth2/**
 * and /api/domain/**. Shapes pinned against OAuth2Client.java,
 * OAuth2ClientInfo.java, Domain.java / DomainInfo.java and the ui-ngx
 * oauth2.models parity (template presets ride GET /api/oauth2/config/template).
 */

import type { BaseData, EntityIdOf, EntityType } from './entity';

export type Oauth2ClientId = EntityIdOf<EntityType.OAUTH2_CLIENT>;
export type DomainEntityId = EntityIdOf<EntityType.DOMAIN>;

export type ClientAuthenticationMethod = 'NONE' | 'BASIC' | 'POST';

export type PlatformType = 'WEB' | 'ANDROID' | 'IOS';

export type Oauth2MapperType = 'BASIC' | 'GITHUB' | 'APPLE' | 'CUSTOM';

export type TenantNameStrategy = 'DOMAIN' | 'EMAIL' | 'CUSTOM';

export interface Oauth2BasicMapperConfig {
  emailAttributeKey?: string;
  firstNameAttributeKey?: string;
  lastNameAttributeKey?: string;
  tenantNameStrategy?: TenantNameStrategy;
  tenantNamePattern?: string;
  customerNamePattern?: string;
  defaultDashboardName?: string;
  alwaysFullScreen?: boolean;
}

export interface Oauth2CustomMapperConfig {
  url?: string;
  username?: string;
  password?: string;
  sendToken: boolean;
}

export interface Oauth2MapperConfig {
  allowUserCreation: boolean;
  activateUser: boolean;
  type: Oauth2MapperType;
  basic?: Oauth2BasicMapperConfig;
  custom?: Oauth2CustomMapperConfig;
}

/** POST /api/oauth2/client body (save = create or update). */
export interface Oauth2Client extends BaseData<Oauth2ClientId> {
  title: string;
  clientId: string;
  clientSecret: string;
  accessTokenUri: string;
  authorizationUri: string;
  scope: string[];
  userNameAttributeName: string;
  clientAuthenticationMethod: ClientAuthenticationMethod;
  loginButtonLabel: string;
  loginButtonIcon?: string;
  jwkSetUri?: string;
  userInfoUri?: string;
  platforms?: PlatformType[];
  mapperConfig: Oauth2MapperConfig;
  additionalInfo?: { providerName?: string } & Record<string, unknown>;
}

/** GET /api/oauth2/client/infos row (list view). */
export interface Oauth2ClientInfo extends BaseData<Oauth2ClientId> {
  title: string;
  providerName: string;
  platforms?: PlatformType[];
}

/** GET /api/oauth2/config/template row (provider preset, not a full entity). */
export interface Oauth2ClientRegistrationTemplate {
  name: string;
  providerId: string;
  clientId?: string;
  clientSecret?: string;
  accessTokenUri: string;
  authorizationUri: string;
  scope: string[];
  platforms?: PlatformType[];
  jwkSetUri?: string;
  userInfoUri?: string;
  clientAuthenticationMethod: ClientAuthenticationMethod;
  userNameAttributeName: string;
  loginButtonLabel: string;
  loginButtonIcon?: string;
  mapperConfig: Oauth2MapperConfig;
  helpLink?: string;
  comment?: string;
}

/**
 * POST /api/noauth/oauth2Clients row — login-page button data. `url` is the
 * backend-relative authorize path the button navigates to natively.
 */
export interface Oauth2ClientLoginInfo {
  name: string;
  icon?: string;
  url: string;
}

export interface Domain extends BaseData<DomainEntityId> {
  name: string;
  oauth2Enabled: boolean;
  propagateToEdge: boolean;
}

/** GET /api/domain/infos row: domain + its attached client summaries. */
export interface DomainInfo extends Domain {
  oauth2ClientInfos?: Array<Oauth2ClientInfo>;
}
