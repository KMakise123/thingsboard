/**
 * MFA login-step transforms: per-provider code input specs, the typed-input
 * mask, provider defaulting and the resend cooldown floor.
 */
import { describe, expect, it } from 'vitest';

import type { TwoFaProviderInfo } from '@/types/tb/two-fa';

import {
  codeSpecFor,
  maskVerificationCode,
  pickDefaultProvider,
  providerReceivesCode,
  resendCooldown,
} from './data';

describe('mfa verification code transforms', () => {
  it('uses a 6-digit numeric spec for SMS/EMAIL/TOTP and 8-char hex text for backup codes', () => {
    expect(codeSpecFor('SMS')).toMatchObject({
      maxLength: 6,
      inputMode: 'numeric',
    });
    expect(codeSpecFor('EMAIL')).toMatchObject({
      maxLength: 6,
      inputMode: 'numeric',
    });
    expect(codeSpecFor('TOTP')).toMatchObject({
      maxLength: 6,
      inputMode: 'numeric',
    });
    expect(codeSpecFor('BACKUP_CODE')).toMatchObject({
      maxLength: 8,
      inputMode: 'text',
    });
    expect(codeSpecFor('BACKUP_CODE').pattern.test('0a9f')).toBe(true);
    expect(codeSpecFor('BACKUP_CODE').pattern.test('0A9F')).toBe(false);
    expect(codeSpecFor('BACKUP_CODE').pattern.test('0a9g')).toBe(false);
  });

  it('masks typed input per provider and clamps to the code length', () => {
    expect(maskVerificationCode('12ab34', 'SMS')).toBe('1234');
    expect(maskVerificationCode('1234567', 'SMS')).toBe('123456');
    expect(maskVerificationCode('1A2b', 'TOTP')).toBe('12');
    expect(maskVerificationCode('abcdef12', 'BACKUP_CODE')).toBe('abcdef12');
    expect(maskVerificationCode('ABCDEF12', 'BACKUP_CODE')).toBe('12');
    expect(maskVerificationCode('abcdef123', 'BACKUP_CODE')).toBe('abcdef12');
  });

  it('picks the provider flagged default and none otherwise', () => {
    const providers: TwoFaProviderInfo[] = [
      {
        type: 'SMS',
        default: false,
        contact: '+47****89',
        minVerificationCodeSendPeriod: 30,
      },
      {
        type: 'TOTP',
        default: true,
        contact: '',
        minVerificationCodeSendPeriod: 0,
      },
    ];
    expect(pickDefaultProvider(providers)?.type).toBe('TOTP');
    expect(pickDefaultProvider(providers.slice(0, 1))).toBeNull();
    expect(pickDefaultProvider([])).toBeNull();
  });

  it('floors the resend cooldown at 30 seconds', () => {
    expect(resendCooldown(0)).toBe(30);
    expect(resendCooldown(undefined)).toBe(30);
    expect(resendCooldown(45)).toBe(45);
  });

  it('only SMS and EMAIL get codes pushed to them', () => {
    expect(providerReceivesCode('SMS')).toBe(true);
    expect(providerReceivesCode('EMAIL')).toBe(true);
    expect(providerReceivesCode('TOTP')).toBe(false);
    expect(providerReceivesCode('BACKUP_CODE')).toBe(false);
  });
});
