import { describe, expect, it } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import { Authority } from '@/types/tb';
import { getSafeRedirectUrl, roleDefaultPath, toServerError } from './utils';

describe('getSafeRedirectUrl', () => {
  it('accepts same-origin relative paths with query and hash', () => {
    expect(getSafeRedirectUrl('/devices?page=2#row')).toBe(
      '/devices?page=2#row',
    );
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(getSafeRedirectUrl('//evil.example.com')).toBeNull();
    expect(getSafeRedirectUrl('https://evil.example.com')).toBeNull();
    expect(getSafeRedirectUrl('javascript:alert(1)')).toBeNull();
  });

  it('keeps query strings that merely contain absolute URLs', () => {
    expect(getSafeRedirectUrl('/redirect?to=https://evil.example.com')).toBe(
      '/redirect?to=https://evil.example.com',
    );
  });

  it('returns null for absent or bare-root redirects', () => {
    expect(getSafeRedirectUrl(null)).toBeNull();
    expect(getSafeRedirectUrl('')).toBeNull();
    expect(getSafeRedirectUrl('/')).toBeNull();
  });
});

describe('roleDefaultPath', () => {
  it('sends tenant and customer users to the device list', () => {
    expect(
      roleDefaultPath({ authority: Authority.TENANT_ADMIN } as never),
    ).toBe('/devices');
    expect(
      roleDefaultPath({ authority: Authority.CUSTOMER_USER } as never),
    ).toBe('/devices');
  });

  it('sends sys admins to the tenants list', () => {
    expect(roleDefaultPath({ authority: Authority.SYS_ADMIN } as never)).toBe(
      '/tenants',
    );
  });

  it('defaults to the device list without a user', () => {
    expect(roleDefaultPath(null)).toBe('/devices');
    expect(roleDefaultPath(undefined)).toBe('/devices');
  });
});

describe('toServerError', () => {
  it('passes ServerErrorError instances through', () => {
    const error = new ServerErrorError({
      status: 401,
      detail: 'bad credentials',
      titleKey: 'tb.error.unauthorized',
    });
    expect(toServerError(error)).toBe(error);
  });

  it('wraps unknown throwables with a zero status', () => {
    const wrapped = toServerError(new Error('boom'));
    expect(wrapped.status).toBe(0);
    expect(wrapped.detail).toBe('boom');
    expect(wrapped.titleKey).toBe('tb.error.generic');
    expect(toServerError('plain').detail).toBe('plain');
  });
});
