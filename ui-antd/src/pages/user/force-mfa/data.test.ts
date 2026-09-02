/**
 * Force-MFA enrollment transforms: the SETUP provider list, the otpauth
 * secret parse, the first-activation default rule, the phone pattern and
 * the backup-codes export text.
 */
import { describe, expect, it } from 'vitest';
import type {
  AccountTwoFaSettings,
  TwoFaProviderType,
} from '@/types/tb/two-fa';

import {
  backupCodesText,
  firstActivationIsDefault,
  forceMfaProviderList,
  moreProvidersAvailable,
  PHONE_PATTERN,
  parseTotpSecret,
} from './data';

describe('force-mfa transforms', () => {
  it('filters BACKUP_CODE for fresh accounts and keeps it once a config exists', () => {
    const available: TwoFaProviderType[] = [
      'BACKUP_CODE',
      'EMAIL',
      'TOTP',
      'SMS',
    ];
    expect(forceMfaProviderList(available, false)).toEqual([
      'TOTP',
      'SMS',
      'EMAIL',
    ]);
    expect(forceMfaProviderList(available, true)).toEqual([
      'TOTP',
      'SMS',
      'EMAIL',
      'BACKUP_CODE',
    ]);
  });

  it('keeps only platform-enabled providers in canonical order', () => {
    expect(forceMfaProviderList(['TOTP'], true)).toEqual(['TOTP']);
    expect(forceMfaProviderList([], true)).toEqual([]);
    expect(forceMfaProviderList(['EMAIL', 'TOTP'], false)).toEqual([
      'TOTP',
      'EMAIL',
    ]);
  });

  it('parses the secret from the otpauth authUrl', () => {
    expect(
      parseTotpSecret(
        'otpauth://totp/ThingsBoard:tenant%40thingsboard.org?secret=ABC234DEF567&issuer=ThingsBoard',
      ),
    ).toBe('ABC234DEF567');
    expect(parseTotpSecret('otpauth://totp/x?issuer=ThingsBoard')).toBeNull();
    expect(parseTotpSecret('not a url')).toBeNull();
  });

  it('marks the first activation as the default only while nothing is configured', () => {
    expect(firstActivationIsDefault(null)).toBe(true);
    expect(firstActivationIsDefault(undefined)).toBe(true);
    const fresh: AccountTwoFaSettings = { configs: {} };
    expect(firstActivationIsDefault(fresh)).toBe(true);
    const configured: AccountTwoFaSettings = {
      configs: {
        TOTP: {
          providerType: 'TOTP',
          authUrl: 'otpauth://x',
          useByDefault: true,
        },
      },
    };
    expect(firstActivationIsDefault(configured)).toBe(false);
  });

  it('reports spare providers against the configured count', () => {
    const allowed: TwoFaProviderType[] = ['TOTP', 'SMS', 'EMAIL'];
    expect(moreProvidersAvailable(allowed, null)).toBe(true);
    expect(
      moreProvidersAvailable(allowed, {
        configs: {
          TOTP: {
            providerType: 'TOTP',
            authUrl: 'otpauth://x',
            useByDefault: true,
          },
        },
      }),
    ).toBe(true);
    expect(
      moreProvidersAvailable(allowed, {
        configs: {
          TOTP: {
            providerType: 'TOTP',
            authUrl: 'otpauth://x',
            useByDefault: true,
          },
          SMS: {
            providerType: 'SMS',
            phoneNumber: '+123',
            useByDefault: false,
          },
          EMAIL: { providerType: 'EMAIL', email: 'a@b.c', useByDefault: false },
        },
      }),
    ).toBe(false);
  });

  it('accepts only strict E.164 phone numbers', () => {
    expect(PHONE_PATTERN.test('+12133734253')).toBe(true);
    expect(PHONE_PATTERN.test('+8613800138000')).toBe(true);
    expect(PHONE_PATTERN.test('13800138000')).toBe(false);
    expect(PHONE_PATTERN.test('+0123')).toBe(false);
    expect(PHONE_PATTERN.test('+1 (213) 373-4253')).toBe(false);
    expect(PHONE_PATTERN.test('+1234567890123456')).toBe(false);
  });

  it('joins backup codes one per line for the txt export', () => {
    expect(backupCodesText(['ab12cd34', 'ef56ab78'])).toBe(
      'ab12cd34\nef56ab78',
    );
    expect(backupCodesText([])).toBe('');
  });
});
