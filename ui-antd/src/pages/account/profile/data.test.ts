/**
 * Profile page transforms: the language preference lives in
 * `additionalInfo.lang` (empty/follow must DELETE the key, ui-ngx
 * profile.component parity), form ⇄ user round trips, and the
 * last-login digest.
 */
import { describe, expect, it } from 'vitest';
import { Authority, type User } from '@/types/tb';
import {
  applyLanguagePreference,
  localeForPreference,
  mergeProfileForm,
  profileFormValue,
  userLanguagePreference,
  userLastLoginTs,
} from './data';

function user(additionalInfo?: Record<string, unknown>): User {
  return {
    id: { entityType: 'USER', id: 'u-1' },
    createdTime: 0,
    email: 'tenant@thingsboard.org',
    authority: Authority.TENANT_ADMIN,
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: '+8613800000000',
    additionalInfo,
  } as User;
}

describe('profile language preference', () => {
  it('reads additionalInfo.lang and normalizes unknown values to follow', () => {
    expect(userLanguagePreference(user({ lang: 'zh_CN' }))).toBe('zh_CN');
    expect(userLanguagePreference(user({ lang: 'en_US' }))).toBe('en_US');
    expect(userLanguagePreference(user({ lang: 'ru_RU' }))).toBe('');
    expect(userLanguagePreference(user({}))).toBe('');
    expect(userLanguagePreference(user())).toBe('');
    expect(userLanguagePreference(null)).toBe('');
  });

  it('deletes the lang key when the preference is follow (empty)', () => {
    const base = user({ lang: 'zh_CN', lastLoginTs: 123 });
    const saved = applyLanguagePreference(base, '');
    expect(saved.additionalInfo).toEqual({ lastLoginTs: 123 });
    // and again when the key is absent already
    expect(applyLanguagePreference(base, '').additionalInfo).toEqual({
      lastLoginTs: 123,
    });
  });

  it('writes the lang key while keeping the other additionalInfo entries', () => {
    const base = user({ lastLoginTs: 123 });
    const saved = applyLanguagePreference(base, 'en_US');
    expect(saved.additionalInfo).toEqual({ lastLoginTs: 123, lang: 'en_US' });
  });

  it('does not mutate the input user', () => {
    const base = user({ lang: 'zh_CN' });
    applyLanguagePreference(base, 'en_US');
    applyLanguagePreference(base, '');
    expect(base.additionalInfo).toEqual({ lang: 'zh_CN' });
  });

  it('creates an additionalInfo object when the user had none', () => {
    const saved = applyLanguagePreference(user(undefined), 'zh_CN');
    expect(saved.additionalInfo).toEqual({ lang: 'zh_CN' });
    expect(applyLanguagePreference(user(undefined), '').additionalInfo).toEqual(
      {},
    );
  });

  it('maps the preference to an app locale (null = follow, no switch)', () => {
    expect(localeForPreference('zh_CN')).toBe('zh-CN');
    expect(localeForPreference('en_US')).toBe('en-US');
    expect(localeForPreference('')).toBeNull();
  });
});

describe('profile form round trip', () => {
  it('builds the form value from the user (language follows when unset)', () => {
    const value = profileFormValue(user({ lang: 'zh_CN', lastLoginTs: 5 }));
    expect(value).toEqual({
      email: 'tenant@thingsboard.org',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+8613800000000',
      language: 'zh_CN',
    });
    expect(profileFormValue(user()).language).toBe('');
    // A bare user without optional fields maps them to empty strings.
    const bare = {
      id: { entityType: 'USER', id: 'u-2' },
      createdTime: 0,
      email: 'bare@thingsboard.org',
      authority: Authority.TENANT_ADMIN,
    } as User;
    expect(profileFormValue(bare)).toEqual({
      email: 'bare@thingsboard.org',
      firstName: '',
      lastName: '',
      phone: '',
      language: '',
    });
  });

  it('merges the form back onto the user through the language transform', () => {
    const base = user({ lang: 'zh_CN', lastLoginTs: 5 });
    const saved = mergeProfileForm(base, {
      email: 'new@thingsboard.org',
      firstName: 'Grace',
      lastName: 'Hopper',
      phone: '',
      language: '',
    });
    expect(saved.email).toBe('new@thingsboard.org');
    expect(saved.firstName).toBe('Grace');
    expect(saved.phone).toBe('');
    expect(saved.additionalInfo).toEqual({ lastLoginTs: 5 });
    expect(base.email).toBe('tenant@thingsboard.org');
  });
});

describe('last login digest', () => {
  it('returns the timestamp only when it is a positive number', () => {
    expect(userLastLoginTs(user({ lastLoginTs: 1_700_000_000_000 }))).toBe(
      1_700_000_000_000,
    );
    expect(userLastLoginTs(user({}))).toBeUndefined();
    expect(userLastLoginTs(user())).toBeUndefined();
    expect(userLastLoginTs(null)).toBeUndefined();
  });
});
