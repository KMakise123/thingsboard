/**
 * OAuth2 client dialog transforms: wire ⇄ flat-form round trip, the
 * mapperConfig basic/custom variant split, and ui-ngx template semantics
 * (presets overwrite all but the title; Custom resets to defaults).
 */
import { describe, expect, it } from 'vitest';

import { EntityType } from '@/types/tb';
import type { Oauth2Client } from '@/types/tb/oauth2';
import {
  applyClientTemplate,
  toClientFormValue,
  toClientPayload,
} from './data';

/** Literal `${…}` tenant pattern — spelled as interpolation for the linter. */
const TENANT_PATTERN = `${'$'}{email#*@.}`;

const client: Oauth2Client = {
  id: { entityType: EntityType.OAUTH2_CLIENT, id: 'c-1' },
  createdTime: 1,
  title: 'Work SSO',
  clientId: 'id',
  clientSecret: 'secret',
  accessTokenUri: 'https://sso/token',
  authorizationUri: 'https://sso/authorize',
  scope: ['email'],
  userNameAttributeName: 'email',
  clientAuthenticationMethod: 'POST',
  loginButtonLabel: 'SSO',
  platforms: ['WEB'],
  mapperConfig: {
    allowUserCreation: true,
    activateUser: false,
    type: 'BASIC',
    basic: {
      emailAttributeKey: 'email',
      tenantNameStrategy: 'CUSTOM',
      tenantNamePattern: TENANT_PATTERN,
      alwaysFullScreen: false,
    },
  },
  additionalInfo: { providerName: 'Github' },
};

describe('oauth2 client transforms', () => {
  it('maps a wire client to form values and back', () => {
    const form = toClientFormValue(client);
    expect(form).toMatchObject({
      title: 'Work SSO',
      providerName: 'Github',
      mapperType: 'BASIC',
      tenantNameStrategy: 'CUSTOM',
      tenantNamePattern: TENANT_PATTERN,
    });
    const payload = toClientPayload(form, client);
    expect(payload.title).toBe('Work SSO');
    expect(payload.mapperConfig.type).toBe('BASIC');
    expect(payload.mapperConfig.basic?.tenantNamePattern).toBe(TENANT_PATTERN);
    expect(payload.mapperConfig.custom).toBeUndefined();
    expect(payload.additionalInfo?.providerName).toBe('Github');
    // Update keeps the identity fields.
    expect(payload.id).toEqual(client.id);
    expect(payload.createdTime).toBe(1);
  });

  it('sends the custom mapper for CUSTOM and drops basic', () => {
    const form = toClientFormValue(null);
    form.mapperType = 'CUSTOM';
    form.customUrl = 'https://sso/userinfo';
    form.sendToken = true;
    const payload = toClientPayload(form);
    expect(payload.mapperConfig.custom).toEqual({
      url: 'https://sso/userinfo',
      username: undefined,
      password: undefined,
      sendToken: true,
    });
    expect(payload.mapperConfig.basic).toBeUndefined();
    // Create: no identity fields travel.
    expect(payload.id).toBeUndefined();
  });

  it('template presets overwrite everything except the title', () => {
    const preset = applyClientTemplate(
      {
        name: 'Google',
        providerId: 'GOOGLE',
        accessTokenUri: 'https://google/token',
        authorizationUri: 'https://google/auth',
        scope: ['openid'],
        clientAuthenticationMethod: 'POST',
        userNameAttributeName: 'sub',
        loginButtonLabel: 'Google',
        mapperConfig: {
          allowUserCreation: true,
          activateUser: true,
          type: 'BASIC',
          basic: { emailAttributeKey: 'email', alwaysFullScreen: false },
        },
      },
      'Work SSO',
    );
    expect(preset.title).toBe('Work SSO');
    expect(preset.accessTokenUri).toBe('https://google/token');
    expect(preset.clientId).toBe('');
    expect(preset.userNameAttributeName).toBe('sub');
    // Custom preset (null) resets to defaults, keeping the title.
    const custom = applyClientTemplate(null, 'Work SSO');
    expect(custom.title).toBe('Work SSO');
    expect(custom).toMatchObject({
      mapperType: 'BASIC',
      clientAuthenticationMethod: 'POST',
      userNameAttributeName: 'email',
    });
  });
});
