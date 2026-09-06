/**
 * Notification-settings conversion unit tests — the save-chain cleanup is
 * the load-bearing part (ngx sms-provider saveNotification parity): an
 * empty-string field deletes the WHOLE method, a complete method gets the
 * `method` discriminator stamped in.
 */
import { describe, expect, it } from 'vitest';
import type { SmsProviderConfiguration } from '@/types/tb/admin';
import type { NotificationSettings } from '@/types/tb/notification';
import { NotificationDeliveryMethod } from '@/types/tb/notification';
import {
  cleanDeliveryMethodsConfigs,
  createSmsProviderConfiguration,
  deepTrim,
  isSmsProviderConfigurationComplete,
  toNotificationSettingsPayload,
  toSmsFormValue,
  toSmsProviderConfiguration,
} from './data';

/** Pre-cleanup configs never carry the `method` discriminator — cast. */
const configs = (
  value: Record<string, Record<string, unknown>>,
): NotificationSettings['deliveryMethodsConfigs'] =>
  value as NotificationSettings['deliveryMethodsConfigs'];

describe('deepTrim', () => {
  it('trims every string leaf in nested objects', () => {
    expect(
      deepTrim({
        botToken: '  xoxb-123  ',
        nested: { name: ' a ', count: 5, flag: false },
      }),
    ).toEqual({
      botToken: 'xoxb-123',
      nested: { name: 'a', count: 5, flag: false },
    });
  });

  it('trims blank strings to empty strings (the cleanup trigger)', () => {
    expect(deepTrim({ botToken: '   ' })).toEqual({ botToken: '' });
  });
});

describe('cleanDeliveryMethodsConfigs', () => {
  it('deletes the whole method when ANY field is an empty string', () => {
    const result = cleanDeliveryMethodsConfigs(
      configs({
        SLACK: { botToken: '' },
        MOBILE_APP: {
          firebaseServiceAccountCredentialsFileName: 'sa.json',
          firebaseServiceAccountCredentials: '',
        },
      }),
    );
    expect(result).toEqual({});
  });

  it('stamps the method field on complete configs', () => {
    const result = cleanDeliveryMethodsConfigs(
      configs({ SLACK: { botToken: 'xoxb-123' } }),
    );
    expect(result).toEqual({
      SLACK: { botToken: 'xoxb-123', method: 'SLACK' },
    });
  });

  it('does not count the method discriminator as a payload field', () => {
    const result = cleanDeliveryMethodsConfigs(
      configs({ SLACK: { method: 'SLACK', botToken: 'token-1' } }),
    );
    expect(result).toEqual({
      SLACK: { method: 'SLACK', botToken: 'token-1' },
    });
  });

  it('tolerates an absent map', () => {
    expect(cleanDeliveryMethodsConfigs(undefined as never)).toEqual({});
  });
});

describe('toNotificationSettingsPayload', () => {
  it('merges the form over the snapshot and cleans once', () => {
    const snapshot: NotificationSettings = {
      deliveryMethodsConfigs: {
        SLACK: {
          method: 'SLACK',
          botToken: 'xoxb-old',
        } as NotificationSettings['deliveryMethodsConfigs']['SLACK'],
      },
    };
    const payload = toNotificationSettingsPayload(snapshot, {
      deliveryMethodsConfigs: configs({
        SLACK: { botToken: '  xoxb-new  ' },
        // Hidden (SA-only) mobile group left empty → whole method dropped.
        MOBILE_APP: {
          firebaseServiceAccountCredentialsFileName: '',
          firebaseServiceAccountCredentials: '',
        },
      }),
    });
    expect(payload).toEqual({
      deliveryMethodsConfigs: {
        SLACK: { botToken: 'xoxb-new', method: 'SLACK' },
      },
    });
  });

  it('replaces the snapshot map wholesale (ngx shallow-spread parity)', () => {
    const snapshot: NotificationSettings = {
      deliveryMethodsConfigs: {
        SLACK: {
          method: NotificationDeliveryMethod.SLACK,
          botToken: 'old',
        },
      },
    };
    const payload = toNotificationSettingsPayload(snapshot, {
      deliveryMethodsConfigs: configs({ SLACK: { botToken: '' } }),
    });
    // Clearing the token deletes the method instead of storing an empty one.
    expect(payload).toEqual({ deliveryMethodsConfigs: {} });
  });
});

describe('sms provider configuration helpers', () => {
  it('seeds per-type defaults (AWS region default, SMPP protocol default)', () => {
    expect(createSmsProviderConfiguration('AWS_SNS')).toEqual({
      type: 'AWS_SNS',
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
    });
    expect(createSmsProviderConfiguration('SMPP')).toMatchObject({
      protocolVersion: '3.3',
    });
  });

  it('validates the completeness matrix per type', () => {
    expect(isSmsProviderConfigurationComplete(null)).toBe(false);
    expect(
      isSmsProviderConfigurationComplete(
        createSmsProviderConfiguration('AWS_SNS'),
      ),
    ).toBe(false);
    const aws = createSmsProviderConfiguration('AWS_SNS') as Extract<
      SmsProviderConfiguration,
      { type: 'AWS_SNS' }
    >;
    const completeAws = { ...aws, accessKeyId: 'k', secretAccessKey: 's' };
    expect(isSmsProviderConfigurationComplete(completeAws)).toBe(true);
    const smpp = createSmsProviderConfiguration('SMPP') as Extract<
      SmsProviderConfiguration,
      { type: 'SMPP' }
    >;
    // SMPP needs port > 0 too.
    expect(
      isSmsProviderConfigurationComplete({
        ...smpp,
        host: 'h',
        port: 0,
        systemId: 'i',
        password: 'p',
      }),
    ).toBe(false);
    expect(
      isSmsProviderConfigurationComplete({
        ...smpp,
        host: 'h',
        port: 2775,
        systemId: 'i',
        password: 'p',
      }),
    ).toBe(true);
  });

  it('picks only the active type fields into the payload', () => {
    const configuration = toSmsProviderConfiguration({
      type: 'TWILIO',
      accountSid: 'AC',
      accountToken: 'tok',
      numberFrom: '+12345678901',
      // Stray fields from a previously selected type never travel.
      accessKeyId: 'leftover',
      host: 'leftover-host',
    });
    expect(configuration).toEqual({
      type: 'TWILIO',
      accountSid: 'AC',
      accountToken: 'tok',
      numberFrom: '+12345678901',
    });
  });

  it('round-trips a stored SMPP config through the form values', () => {
    const stored = {
      ...createSmsProviderConfiguration('SMPP'),
      host: 'smpp.example.com',
      port: 2775,
      systemId: 'sys',
      password: 'pw',
    };
    const formValue = toSmsFormValue(stored);
    expect(formValue.type).toBe('SMPP');
    expect(toSmsProviderConfiguration(formValue)).toEqual(stored);
  });

  it('answers undefined without a type (form still pristine)', () => {
    expect(toSmsProviderConfiguration({})).toBeUndefined();
  });
});
