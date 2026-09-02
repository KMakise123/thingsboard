/**
 * Security page transforms (account domain, brief §2-E): JWT expiration
 * digest, the TOTP authUrl secret extraction, the 2FA row set (platform
 * providers ordered) with per-provider dataInfo interpolation, the
 * BACKUP_CODE lock rule and the change-password server-error grading.
 */
import { describe, expect, it } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import type { AccountTwoFaSettings } from '@/types/tb/two-fa';
import {
  backupCodesLocked,
  changePasswordError,
  defaultProviderType,
  jwtExpirationDate,
  jwtTokenExpired,
  orderedProviderRows,
  parseAuthUrlSecret,
  providerDataInfo,
  settingsHasConfig,
  smsPhoneValid,
  verificationCodeValid,
} from './data';

describe('jwt token card', () => {
  it('parses the stored expiration and flags it expired against now', () => {
    expect(jwtExpirationDate('1700000000000')).toBe(1_700_000_000_000);
    expect(jwtExpirationDate(null)).toBeNull();
    expect(jwtExpirationDate('not-a-number')).toBeNull();

    expect(jwtTokenExpired('1')).toBe(true);
    expect(jwtTokenExpired(null)).toBe(true);
    const future = String(Date.now() + 60_000);
    expect(jwtTokenExpired(future)).toBe(false);
  });

  it('extracts the secret from the otpauth authUrl', () => {
    const authUrl =
      'otpauth://totp/ThingsBoard%3Atenant%40thingsboard.org?secret=ABCDEF234567890&issuer=ThingsBoard';
    expect(parseAuthUrlSecret(authUrl)).toBe('ABCDEF234567890');
    expect(parseAuthUrlSecret('otpauth://totp/x?issuer=ThingsBoard')).toBe('');
    expect(parseAuthUrlSecret('')).toBe('');
    expect(parseAuthUrlSecret('::not a url')).toBe('');
  });
});

describe('two-fa rows', () => {
  it('orders the platform providers into the canonical row order', () => {
    expect(
      orderedProviderRows(
        ['BACKUP_CODE', 'TOTP'],
        ['TOTP', 'SMS', 'EMAIL', 'BACKUP_CODE'],
      ),
    ).toEqual(['TOTP', 'BACKUP_CODE']);
    expect(orderedProviderRows([], ['TOTP'])).toEqual([]);
  });

  it('reads the config presence and interpolates the per-provider info', () => {
    const settings: AccountTwoFaSettings = {
      configs: {
        EMAIL: {
          providerType: 'EMAIL',
          email: 'me@acme.io',
          useByDefault: true,
        },
        SMS: {
          providerType: 'SMS',
          phoneNumber: '+8613800000000',
          useByDefault: false,
        },
        BACKUP_CODE: {
          providerType: 'BACKUP_CODE',
          codesLeft: 7,
          useByDefault: false,
        },
      },
    };
    expect(settingsHasConfig(settings, 'EMAIL')).toBe(true);
    expect(settingsHasConfig(settings, 'TOTP')).toBe(false);
    expect(settingsHasConfig(undefined, 'EMAIL')).toBe(false);

    expect(providerDataInfo('EMAIL', settings)).toBe('me@acme.io');
    expect(providerDataInfo('SMS', settings)).toBe('+8613800000000');
    expect(providerDataInfo('BACKUP_CODE', settings)).toBe(7);
    expect(providerDataInfo('TOTP', settings)).toBeUndefined();
    expect(providerDataInfo('EMAIL', undefined)).toBeUndefined();
  });

  it('picks the default provider and locks BACKUP_CODE without other actives', () => {
    const settings: AccountTwoFaSettings = {
      configs: {
        TOTP: {
          providerType: 'TOTP',
          authUrl: 'otpauth://x',
          useByDefault: true,
        },
        EMAIL: {
          providerType: 'EMAIL',
          email: 'me@acme.io',
          useByDefault: false,
        },
      },
    };
    expect(defaultProviderType(settings)).toBe('TOTP');
    expect(defaultProviderType({ configs: {} })).toBeNull();

    // Only BACKUP_CODE active → locked (cannot stand alone).
    expect(
      backupCodesLocked(['BACKUP_CODE'], settings, ['TOTP', 'BACKUP_CODE']),
    ).toBe(true);
    // BACKUP_CODE + one other active → free.
    expect(
      backupCodesLocked(['TOTP', 'BACKUP_CODE'], settings, [
        'TOTP',
        'BACKUP_CODE',
      ]),
    ).toBe(false);
  });

  it('validates the sms phone and 6-digit codes', () => {
    expect(smsPhoneValid('+8613800000000')).toBe(true);
    expect(smsPhoneValid('8613800')).toBe(false);
    expect(smsPhoneValid('+0123')).toBe(false);
    expect(smsPhoneValid('')).toBe(false);

    expect(verificationCodeValid('123456')).toBe(true);
    expect(verificationCodeValid('12345')).toBe(false);
    expect(verificationCodeValid('abcdef')).toBe(false);
  });
});

describe('change-password error grading (brief §1.5)', () => {
  const error = (status: number, detail: string) =>
    new ServerErrorError({ status, detail, titleKey: 'tb.error.badRequest' });

  it('routes "Current password doesn\'t match!" to the current-password field', () => {
    const outcome = changePasswordError(
      error(400, "Current password doesn't match!"),
    );
    expect(outcome).toEqual({ kind: 'currentPassword' });
  });

  it('routes "Password must..." to a policy reload', () => {
    expect(
      changePasswordError(error(400, 'Password must be 8 characters long')),
    ).toEqual({
      kind: 'policyReload',
    });
  });

  it('routes "Password was already used..." to the new-password field with the verbatim text', () => {
    const detail = 'Password was already used! Please choose a different one.';
    expect(changePasswordError(error(400, detail))).toEqual({
      kind: 'alreadyUsed',
      detail,
    });
  });

  it('grades 429 as rate limited and anything else as a toast', () => {
    expect(changePasswordError(error(429, 'Too many requests'))).toEqual({
      kind: 'rateLimited',
    });
    const other = error(500, 'Boom');
    expect(changePasswordError(other)).toEqual({ kind: 'toast', error: other });
  });
});
