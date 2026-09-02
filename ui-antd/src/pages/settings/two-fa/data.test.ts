/**
 * Two-FA settings form transforms: wire ⇄ form round trips, the
 * `"attempts:seconds"` rate-limit split/join, and the ui-ngx constraints
 * (BACKUP_CODE never the only provider; SMS template carries ${code}).
 */
import { describe, expect, it } from 'vitest';

import type { PlatformTwoFaSettings } from '@/types/tb/two-fa';
import {
  anyProviderEnabled,
  backupCodeSwitchDisabled,
  smsTemplateValid,
  splitRateLimit,
  toTwoFaFormValue,
  toTwoFaSettingsPayload,
} from './data';

describe('two-fa settings transforms', () => {
  it('splits the rate-limit string and defaults the disabled form fields', () => {
    expect(splitRateLimit('3:900')).toEqual([3, 900]);
    expect(splitRateLimit(undefined)).toEqual([0, 0]);
    expect(splitRateLimit(null)).toEqual([0, 0]);
  });

  it('maps wire settings onto the form with enabled providers flagged', () => {
    const settings: PlatformTwoFaSettings = {
      providers: [
        { providerType: 'TOTP', issuerName: 'Corp' },
        { providerType: 'BACKUP_CODE', codesQuantity: 5 },
      ],
      minVerificationCodeSendPeriod: 10,
      verificationCodeCheckRateLimit: '7:120',
      maxVerificationFailuresBeforeUserLockout: 3,
      totalAllowedTimeForVerification: 120,
      enforceTwoFa: true,
      enforcedUsersFilter: {
        type: 'TENANT_ADMINISTRATORS',
        tenantProfilesIds: ['p-1'],
      },
    };
    const form = toTwoFaFormValue(settings);
    expect(form.verificationCodeCheckRateLimitEnable).toBe(true);
    expect(form.verificationCodeCheckRateLimitNumber).toBe(7);
    expect(form.verificationCodeCheckRateLimitTime).toBe(120);
    const totp = form.providers.find((p) => p.providerType === 'TOTP');
    expect(totp).toMatchObject({ enable: true, issuerName: 'Corp' });
    const sms = form.providers.find((p) => p.providerType === 'SMS');
    expect(sms?.enable).toBe(false);
    expect(sms?.verificationCodeLifetime).toBe(120);
    expect(form.enforcedUsersFilter.tenantProfilesIds).toEqual(['p-1']);
    expect(form.enforcedUsersFilter.filterByTenants).toBe(false);
  });

  it('falls back to defaults when nothing is configured yet', () => {
    const form = toTwoFaFormValue(null);
    expect(form.maxVerificationFailuresBeforeUserLockout).toBe(30);
    expect(form.totalAllowedTimeForVerification).toBe(3600);
    expect(form.minVerificationCodeSendPeriod).toBe(30);
    expect(form.providers).toHaveLength(4);
    expect(form.providers.every((p) => !p.enable)).toBe(true);
  });

  it('joins the rate limit, strips disabled providers and the filterByTenants flag', () => {
    const form = toTwoFaFormValue(null);
    form.verificationCodeCheckRateLimitEnable = true;
    form.verificationCodeCheckRateLimitNumber = 5;
    form.verificationCodeCheckRateLimitTime = 60;
    form.enforceTwoFa = true;
    form.enforcedUsersFilter = {
      type: 'TENANT_ADMINISTRATORS',
      filterByTenants: true,
      tenantsIds: ['t-1', 't-2'],
      tenantProfilesIds: ['stale'],
    };
    form.providers = [
      { providerType: 'TOTP', enable: true, issuerName: 'ThingsBoard' },
      { providerType: 'SMS', enable: false },
      { providerType: 'BACKUP_CODE', enable: true, codesQuantity: 10 },
    ];
    const payload = toTwoFaSettingsPayload(form);
    expect(payload.verificationCodeCheckRateLimit).toBe('5:60');
    expect(payload.providers).toEqual([
      { providerType: 'TOTP', issuerName: 'ThingsBoard' },
      { providerType: 'BACKUP_CODE', codesQuantity: 10 },
    ]);
    expect(payload.enforcedUsersFilter).toEqual({
      type: 'TENANT_ADMINISTRATORS',
      tenantsIds: ['t-1', 't-2'],
    });
  });

  it('ALL_USERS filter ships without id lists', () => {
    const form = toTwoFaFormValue(null);
    form.enforcedUsersFilter = {
      type: 'ALL_USERS',
      filterByTenants: true,
      tenantsIds: ['stale'],
    };
    const payload = toTwoFaSettingsPayload(form);
    expect(payload.enforcedUsersFilter).toEqual({ type: 'ALL_USERS' });
  });

  it('locks the BACKUP_CODE switch when it would be the only provider', () => {
    expect(backupCodeSwitchDisabled(undefined)).toBe(true);
    expect(
      backupCodeSwitchDisabled([
        { providerType: 'TOTP', enable: false },
        { providerType: 'BACKUP_CODE', enable: true },
      ]),
    ).toBe(true);
    expect(
      backupCodeSwitchDisabled([
        { providerType: 'TOTP', enable: true },
        { providerType: 'BACKUP_CODE', enable: true },
      ]),
    ).toBe(false);
  });

  it('validates the SMS template and the provider-presence rule', () => {
    expect(smsTemplateValid(`Code: ${'$'}{code}`)).toBe(true);
    expect(smsTemplateValid('Code: CODE')).toBe(false);
    expect(smsTemplateValid(undefined)).toBe(false);
    expect(anyProviderEnabled([{ providerType: 'SMS', enable: true }])).toBe(
      true,
    );
    expect(anyProviderEnabled([{ providerType: 'SMS', enable: false }])).toBe(
      false,
    );
  });
});
