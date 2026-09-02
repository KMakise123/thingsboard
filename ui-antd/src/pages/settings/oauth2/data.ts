/**
 * OAuth2 client dialog form transforms (settings domain, spec 3.7) — pure
 * mapping between the wire Oauth2Client (mapperConfig = basic|custom
 * variant per mapper type) and the flat antd form shape, plus the ui-ngx
 * template-preset application (setProviderDefaultValue semantics: presets
 * overwrite everything except the title; Custom resets to defaults).
 */
import type {
  Oauth2Client,
  Oauth2ClientRegistrationTemplate,
  Oauth2MapperType,
  PlatformType,
} from '@/types/tb/oauth2';

export const MAPPER_TYPES: Oauth2MapperType[] = [
  'BASIC',
  'GITHUB',
  'APPLE',
  'CUSTOM',
];

export const PLATFORM_TYPES: PlatformType[] = ['WEB', 'ANDROID', 'IOS'];

export interface ClientFormValues {
  title: string;
  providerName: string;
  platforms: PlatformType[];
  clientId: string;
  clientSecret: string;
  accessTokenUri: string;
  authorizationUri: string;
  jwkSetUri?: string;
  userInfoUri?: string;
  clientAuthenticationMethod: 'NONE' | 'BASIC' | 'POST';
  loginButtonLabel: string;
  loginButtonIcon?: string;
  scope: string[];
  userNameAttributeName: string;
  allowUserCreation: boolean;
  activateUser: boolean;
  mapperType: Oauth2MapperType;
  emailAttributeKey?: string;
  firstNameAttributeKey?: string;
  lastNameAttributeKey?: string;
  tenantNameStrategy: 'DOMAIN' | 'EMAIL' | 'CUSTOM';
  tenantNamePattern?: string;
  customerNamePattern?: string;
  defaultDashboardName?: string;
  alwaysFullScreen: boolean;
  customUrl?: string;
  customUsername?: string;
  customPassword?: string;
  sendToken: boolean;
}

/** ui-ngx defaultProvider (the Custom preset). */
export function defaultClientFormValues(): ClientFormValues {
  return {
    title: '',
    providerName: 'Custom',
    platforms: [],
    clientId: '',
    clientSecret: '',
    accessTokenUri: '',
    authorizationUri: '',
    jwkSetUri: undefined,
    userInfoUri: undefined,
    clientAuthenticationMethod: 'POST',
    loginButtonLabel: '',
    loginButtonIcon: undefined,
    scope: [],
    userNameAttributeName: 'email',
    allowUserCreation: true,
    activateUser: false,
    mapperType: 'BASIC',
    emailAttributeKey: 'email',
    firstNameAttributeKey: undefined,
    lastNameAttributeKey: undefined,
    tenantNameStrategy: 'DOMAIN',
    tenantNamePattern: undefined,
    customerNamePattern: undefined,
    defaultDashboardName: undefined,
    alwaysFullScreen: false,
    customUrl: undefined,
    customUsername: undefined,
    customPassword: undefined,
    sendToken: false,
  };
}

/** Wire client → flat form value (edit dialog initial state). */
export function toClientFormValue(
  client: Oauth2Client | null | undefined,
): ClientFormValues {
  const base = defaultClientFormValues();
  if (!client) {
    return base;
  }
  const mapper = client.mapperConfig;
  return {
    ...base,
    title: client.title ?? '',
    providerName: client.additionalInfo?.providerName ?? 'Custom',
    platforms: client.platforms ?? [],
    clientId: client.clientId ?? '',
    clientSecret: client.clientSecret ?? '',
    accessTokenUri: client.accessTokenUri ?? '',
    authorizationUri: client.authorizationUri ?? '',
    jwkSetUri: client.jwkSetUri,
    userInfoUri: client.userInfoUri,
    clientAuthenticationMethod: client.clientAuthenticationMethod ?? 'POST',
    loginButtonLabel: client.loginButtonLabel ?? '',
    loginButtonIcon: client.loginButtonIcon,
    scope: client.scope ?? [],
    userNameAttributeName: client.userNameAttributeName ?? 'email',
    allowUserCreation: mapper?.allowUserCreation ?? true,
    activateUser: mapper?.activateUser ?? false,
    mapperType: mapper?.type ?? 'BASIC',
    emailAttributeKey: mapper?.basic?.emailAttributeKey,
    firstNameAttributeKey: mapper?.basic?.firstNameAttributeKey,
    lastNameAttributeKey: mapper?.basic?.lastNameAttributeKey,
    tenantNameStrategy: mapper?.basic?.tenantNameStrategy ?? 'DOMAIN',
    tenantNamePattern: mapper?.basic?.tenantNamePattern,
    customerNamePattern: mapper?.basic?.customerNamePattern,
    defaultDashboardName: mapper?.basic?.defaultDashboardName,
    alwaysFullScreen: mapper?.basic?.alwaysFullScreen ?? false,
    customUrl: mapper?.custom?.url,
    customUsername: mapper?.custom?.username,
    customPassword: mapper?.custom?.password,
    sendToken: mapper?.custom?.sendToken ?? false,
  };
}

/** Flat form value → wire client body (create keeps no id/createdTime). */
export function toClientPayload(
  values: ClientFormValues,
  entity?: Oauth2Client | null,
): Oauth2Client {
  const basic =
    values.mapperType === 'CUSTOM'
      ? undefined
      : {
          emailAttributeKey: values.emailAttributeKey,
          firstNameAttributeKey: values.firstNameAttributeKey || undefined,
          lastNameAttributeKey: values.lastNameAttributeKey || undefined,
          tenantNameStrategy: values.tenantNameStrategy,
          tenantNamePattern:
            values.tenantNameStrategy === 'CUSTOM'
              ? values.tenantNamePattern
              : undefined,
          customerNamePattern: values.customerNamePattern || undefined,
          defaultDashboardName: values.defaultDashboardName || undefined,
          alwaysFullScreen: values.alwaysFullScreen,
        };
  return {
    ...(entity ?? ({} as Partial<Oauth2Client>)),
    title: values.title.trim(),
    clientId: values.clientId,
    clientSecret: values.clientSecret,
    accessTokenUri: values.accessTokenUri,
    authorizationUri: values.authorizationUri,
    jwkSetUri: values.jwkSetUri || undefined,
    userInfoUri: values.userInfoUri || undefined,
    clientAuthenticationMethod: values.clientAuthenticationMethod,
    loginButtonLabel: values.loginButtonLabel,
    loginButtonIcon: values.loginButtonIcon || undefined,
    platforms: values.platforms,
    scope: values.scope,
    userNameAttributeName: values.userNameAttributeName,
    mapperConfig: {
      allowUserCreation: values.allowUserCreation,
      activateUser: values.activateUser,
      type: values.mapperType,
      ...(values.mapperType === 'CUSTOM'
        ? {
            custom: {
              url: values.customUrl,
              username: values.customUsername || undefined,
              password: values.customPassword || undefined,
              sendToken: values.sendToken,
            },
          }
        : { basic }),
    },
    additionalInfo: {
      ...(entity?.additionalInfo ?? {}),
      providerName: values.providerName,
    },
  } as Oauth2Client;
}

/**
 * ui-ngx providerName change: a preset overwrites every field except the
 * title; Custom resets to the defaults. clientId/clientSecret never come
 * from a preset (ui-ngx clears them).
 */
export function applyClientTemplate(
  template: Oauth2ClientRegistrationTemplate | null,
  previousTitle: string,
): ClientFormValues {
  const base = defaultClientFormValues();
  base.title = previousTitle;
  if (!template) {
    return base;
  }
  return {
    ...base,
    providerName: template.name,
    accessTokenUri: template.accessTokenUri ?? '',
    authorizationUri: template.authorizationUri ?? '',
    jwkSetUri: template.jwkSetUri,
    userInfoUri: template.userInfoUri,
    clientAuthenticationMethod: template.clientAuthenticationMethod ?? 'POST',
    loginButtonLabel: template.loginButtonLabel ?? '',
    loginButtonIcon: template.loginButtonIcon,
    scope: template.scope ?? [],
    platforms: template.platforms ?? [],
    userNameAttributeName: template.userNameAttributeName ?? 'email',
    allowUserCreation: template.mapperConfig?.allowUserCreation ?? true,
    activateUser: template.mapperConfig?.activateUser ?? false,
    mapperType: template.mapperConfig?.type ?? 'BASIC',
    emailAttributeKey: template.mapperConfig?.basic?.emailAttributeKey,
    firstNameAttributeKey: template.mapperConfig?.basic?.firstNameAttributeKey,
    lastNameAttributeKey: template.mapperConfig?.basic?.lastNameAttributeKey,
    tenantNameStrategy:
      template.mapperConfig?.basic?.tenantNameStrategy ?? 'DOMAIN',
    tenantNamePattern: template.mapperConfig?.basic?.tenantNamePattern,
    customerNamePattern: template.mapperConfig?.basic?.customerNamePattern,
    defaultDashboardName: template.mapperConfig?.basic?.defaultDashboardName,
    alwaysFullScreen: template.mapperConfig?.basic?.alwaysFullScreen ?? false,
    customUrl: template.mapperConfig?.custom?.url,
    customUsername: template.mapperConfig?.custom?.username,
    customPassword: template.mapperConfig?.custom?.password,
    sendToken: template.mapperConfig?.custom?.sendToken ?? false,
  };
}
